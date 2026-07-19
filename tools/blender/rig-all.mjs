/**
 * rig-all.mjs — drives the sourcing rig pass (spec §rig) over existing glbs:
 * Blender adds `port_<portId>` empties at FUNCTIONAL I/O positions → verify the
 * nodes survived → Draco-compress → replace public/assets/<id>.glb → extend
 * ASSET_MANIFEST.json. Per-device placements below encode the REAL panel each
 * connector lives on (assets-source/** notes): XLR under a mic body, speaker
 * I/O on the rear, stagebox XLRs on the front, rack I/O on the rear, etc.
 *
 *   node tools/blender/rig-all.mjs <device-id> [<device-id>…]
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const BLENDER = 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe'
const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

/** portId → {f: '-z'|'+z'|'bottom', u, v} — the functional panel per device. */
const PLACEMENTS = {
  'shure-sm58': { 'out-xlr': { f: '+x', u: 0.5, v: 0.5 } },
  'shure-sm57': { 'out-xlr': { f: 'bottom', u: 0.5, v: 0.5 } },
  'ev-re20': { 'out-xlr': { f: 'bottom', u: 0.5, v: 0.5 } },
  'ev-re50': { 'out-xlr': { f: 'bottom', u: 0.5, v: 0.5 } },
  'neumann-u87-ai': { 'out-xlr': { f: 'bottom', u: 0.5, v: 0.5 } },
  'qsc-k12-2': {
    'in-line-a': { f: '+z', u: 0.35, v: 0.45 },
    'thru-out-a': { f: '+z', u: 0.65, v: 0.45 },
    'power-in': { f: '+z', u: 0.5, v: 0.22 },
  },
  'yamaha-dbr12': {
    'in-line': { f: '+z', u: 0.35, v: 0.45 },
    'link-out': { f: '+z', u: 0.65, v: 0.45 },
    'power-in': { f: '+z', u: 0.5, v: 0.22 },
  },
  'genelec-8030c': {
    'in-analog': { f: '+z', u: 0.5, v: 0.55 },
    'power-in': { f: '+z', u: 0.5, v: 0.2 },
  },
  'yamaha-rio3224-d2': {
    // Stagebox: XLR rows live on the FRONT face (rack front), Dante + mains rear-ish kept front for teaching visibility per notes
    'in-mic-1': { f: '-z', u: 0.15, v: 0.72 },
    'in-mic-2': { f: '-z', u: 0.3, v: 0.72 },
    'out-line-1': { f: '-z', u: 0.55, v: 0.72 },
    'out-line-2': { f: '-z', u: 0.7, v: 0.72 },
    'dante-primary': { f: '-z', u: 0.87, v: 0.35 },
    'power-in': { f: '-z', u: 0.12, v: 0.28 },
  },
  'yamaha-ql1': {
    'in-mic-1': { f: '+z', u: 0.18, v: 0.62 },
    'in-mic-2': { f: '+z', u: 0.28, v: 0.62 },
    'out-main-l': { f: '+z', u: 0.52, v: 0.62 },
    'out-main-r': { f: '+z', u: 0.62, v: 0.62 },
    'out-mix-1': { f: '+z', u: 0.72, v: 0.62 },
    'dante-primary': { f: '+z', u: 0.86, v: 0.62 },
    'power-in': { f: '+z', u: 0.1, v: 0.3 },
  },
  'axia-iq': {
    'in-mic-1': { f: '+z', u: 0.12, v: 0.55 },
    'in-line-1': { f: '+z', u: 0.22, v: 0.55 },
    'out-monitor-l': { f: '+z', u: 0.34, v: 0.55 },
    'out-monitor-r': { f: '+z', u: 0.44, v: 0.55 },
    'out-program-aes': { f: '+z', u: 0.56, v: 0.55 },
    'out-n1': { f: '+z', u: 0.66, v: 0.55 },
    gpio: { f: '+z', u: 0.78, v: 0.55 },
    livewire: { f: '+z', u: 0.88, v: 0.55 },
    'power-in': { f: '+z', u: 0.95, v: 0.55 },
  },
  'yellowtec-litt': { 'in-gpio': { f: 'bottom', u: 0.5, v: 0.5 } },
  'playout-pc': {
    aoip: { f: '+z', u: 0.4, v: 0.35 },
    'out-analog-consumer': { f: '+z', u: 0.6, v: 0.35 },
    'power-in': { f: '+z', u: 0.5, v: 0.12 },
  },
  'avid-protools-hdx': {
    digilink: { f: '+z', u: 0.45, v: 0.35 },
    'power-in': { f: '+z', u: 0.55, v: 0.12 },
  },
  'avid-hd-io': {
    digilink: { f: '+z', u: 0.1, v: 0.5 },
    'analog-in-db25': { f: '+z', u: 0.26, v: 0.5 },
    'analog-out-db25': { f: '+z', u: 0.42, v: 0.5 },
    'aes-io-db25': { f: '+z', u: 0.58, v: 0.5 },
    'wordclock-in': { f: '+z', u: 0.72, v: 0.5 },
    'wordclock-out': { f: '+z', u: 0.82, v: 0.5 },
    'power-in': { f: '+z', u: 0.93, v: 0.5 },
  },
  'focusrite-isa-one': {
    'in-mic': { f: '-z', u: 0.25, v: 0.5 }, // real ISA One: mic XLR on the FRONT
    'out-line': { f: '+z', u: 0.5, v: 0.5 },
    'power-in': { f: '+z', u: 0.82, v: 0.5 },
  },
  'grace-m905': {
    'in-analog-l': { f: '+z', u: 0.18, v: 0.5 },
    'in-analog-r': { f: '+z', u: 0.28, v: 0.5 },
    'in-aes3': { f: '+z', u: 0.42, v: 0.5 },
    'out-main-l': { f: '+z', u: 0.58, v: 0.5 },
    'out-main-r': { f: '+z', u: 0.68, v: 0.5 },
    'out-headphone': { f: '-z', u: 0.2, v: 0.5 }, // HP jack on the desktop remote face
    'power-in': { f: '+z', u: 0.88, v: 0.5 },
  },
  'aeta-scoop5-s': {
    'in-send': { f: '+z', u: 0.3, v: 0.5 },
    'out-return': { f: '+z', u: 0.45, v: 0.5 },
    ip: { f: '+z', u: 0.65, v: 0.5 },
    'power-in': { f: '+z', u: 0.85, v: 0.5 },
  },
  'aeta-scoopy-plus-s': {
    'in-mic': { f: '-z', u: 0.3, v: 0.35 },
    'out-headphone': { f: '-z', u: 0.7, v: 0.35 },
    ip: { f: '+z', u: 0.5, v: 0.4 },
  },
  'switchcraft-studiopatch-9625': {
    'front-tt-1': { f: '-z', u: 0.42, v: 0.5 },
    'front-tt-2': { f: '-z', u: 0.58, v: 0.5 },
    'rear-in-db25': { f: '+z', u: 0.35, v: 0.5 },
    'rear-out-db25': { f: '+z', u: 0.65, v: 0.5 },
  },
  'antelope-ocx-hd': {
    'wordclock-out-1': { f: '+z', u: 0.3, v: 0.5 },
    'wordclock-out-2': { f: '+z', u: 0.45, v: 0.5 },
    'power-in': { f: '+z', u: 0.85, v: 0.5 },
  },
  'mogami-gold-db25-xlrm': {
    'in-db25': { f: '-z', u: 0.1, v: 0.5 },
    'out-xlr-1': { f: '-z', u: 0.82, v: 0.65 },
    'out-xlr-2': { f: '-z', u: 0.82, v: 0.35 },
  },
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'content/catalog.json'), 'utf8'))
const manifestPath = join(ROOT, 'public/assets/ASSET_MANIFEST.json')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})

// Args: <id>… [--src <file.gltf|glb>] [--decimate <tris>] [--roty <deg>] [--meta <meta.json>]
// With --src the rig consumes a DOWNLOADED candidate (CC-BY): manifest gets the
// download-ccby entry and assets-source/CREDITS.md the attribution line.
const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const ids = argv.filter((a, i) => !a.startsWith('--') && (i === 0 || !argv[i - 1].startsWith('--')))
const SRC = flag('src')
const DECIMATE = flag('decimate') ?? '0'
const ROTY = flag('roty') ?? '0'
const META = flag('meta')
if (!ids.length) {
  console.error('usage: node tools/blender/rig-all.mjs <device-id>… [--src f] [--decimate n] [--roty deg] [--meta meta.json]')
  process.exit(1)
}
if (SRC && ids.length !== 1) throw new Error('--src rigs exactly one device')

for (const id of ids) {
  const device = catalog.devices.find((d) => d.id === id)
  if (!device) throw new Error(`unknown device ${id}`)
  let placement = PLACEMENTS[id]
  if (!placement) {
    if (!SRC) {
      console.log(`SKIP ${id} (no ports / no placement)`)
      continue
    }
    placement = {} // portless prop (stand/arm): model swap only, no empties
  }
  // Every catalog port must have a placement — the empties ARE the contract.
  const missing = device.ports.map((p) => p.portId).filter((p) => !placement[p])
  if (missing.length) throw new Error(`${id}: missing placements for ${missing.join(', ')}`)

  const dst = join(ROOT, 'public/assets', `${id}.glb`)
  const src = SRC ?? dst
  const tmp = join(mkdtempSync(join(tmpdir(), 'rig-')), `${id}.glb`)

  // 1. Blender: import + (roty/decimate) + empties + export (headless, wiped scene).
  const out = execFileSync(
    BLENDER,
    ['--background', '--factory-startup', '--python', join(ROOT, 'tools/blender/rig_empties.py'), '--',
      '--in', src, '--out', tmp, '--spec', JSON.stringify({ ports: placement }),
      '--decimate', DECIMATE, '--roty', ROTY],
    { encoding: 'utf8' },
  )
  if (!out.includes('RIG_OK')) throw new Error(`${id}: blender rig failed\n${out.slice(-1500)}`)

  // 2. Verify + Draco via gltf-transform API (draco-only: `optimize` would
  //    prune mesh-less nodes — i.e. exactly our empties).
  const doc = await io.read(tmp)
  const portNodes = doc.getRoot().listNodes().map((n) => n.getName()).filter((n) => n.startsWith('port_'))
  const expected = device.ports.map((p) => `port_${p.portId}`)
  const absent = expected.filter((e) => !portNodes.includes(e))
  if (absent.length) throw new Error(`${id}: empties lost on export: ${absent.join(', ')}`)
  // Textures from downloaded models are often 2K PBR sets — resize to 1024 webp
  // (budget: a device glb should stay under ~1 MB; procedural glbs have none).
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }))
  doc.createExtension(KHRDracoMeshCompression).setRequired(true)
  await io.write(dst, doc) // replaces public/assets/<id>.glb

  // 3. Manifest entry (spec §License logging schema) — CC-BY when --meta given.
  const meta = META ? JSON.parse(readFileSync(META, 'utf8')) : null
  const attribution = meta
    ? `« ${meta.name} » par ${meta.author} (${meta.viewerUrl}) — ${meta.license} — modifié (rig port_*, échelle, optimisation)`
    : ''
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const entry = manifest.assets.find((a) => a.id === id)
  const patch = meta
    ? {
        source: 'download-ccby',
        sourceUrl: meta.viewerUrl,
        author: meta.author,
        license: meta.license,
        attributionText: attribution,
        trademark: 'branded-internal', // logos texture possibles — débranding = passe commerciale
        portEmpties: expected.length,
        riggedAt: new Date().toISOString().slice(0, 10),
      }
    : {
        source: 'modeled',
        sourceUrl: '',
        author: 'TekPractice (procédural interne, Blender)',
        license: 'internal (own work)',
        attributionText: '',
        trademark: 'generic',
        portEmpties: expected.length,
        riggedAt: new Date().toISOString().slice(0, 10),
      }
  if (entry) Object.assign(entry, patch)
  else manifest.assets.push({ id, kind: 'device', status: 'ok', ...patch })
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  // 4. CREDITS.md (gitignored, source de vérité d'attribution).
  if (meta) {
    const creditsPath = join(ROOT, 'assets-source', 'CREDITS.md')
    const line = `- ${id} — ${attribution}\n`
    const credits = readFileSync(creditsPath, 'utf8')
    if (!credits.includes(meta.viewerUrl) || !credits.includes(`- ${id} `))
      writeFileSync(creditsPath, credits + line)
  }

  const kb = Math.round(statSync(dst).size / 102.4) / 10
  console.log(`RIGGED ${id}: ${expected.length} port empties, ${kb} KB${meta ? ` — CC-BY: ${meta.author}` : ''}`)
}
