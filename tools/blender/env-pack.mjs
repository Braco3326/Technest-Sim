/**
 * env-pack.mjs — fetch + prep + pack one ROOM environment:
 * Sketchfab download → Blender (decimate/scale meters/ground) → webp 1024 +
 * Draco → public/assets/environments/<space>.glb + manifest + CREDITS.
 *
 *   node tools/blender/env-pack.mjs <space> [--roty deg] [--width m] [--nofetch]
 */
import { execSync, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const BLENDER = 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe'
const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const TOKEN = readFileSync(join(ROOT, '.env'), 'utf8').match(/^SKETCHFAB_API_TOKEN=(.+)$/m)[1].trim()

/** space → chosen candidate (thumbnails judged by eye, licences API-verified CC-BY). */
const CHOSEN = {
  'live-stage': { uid: '89629aceff334b34a76c30d42f8327bd', width: 12, decimate: 100000 },
  'theatre-stage': { uid: '5c53624a0a334242ad04d7a11a2dcf8e', width: 12, decimate: 80000 },
  'radio-booth': { uid: '44a60d726b194b1e87614d7bcedcb074', width: 6, decimate: 80000 },
}

const argv = process.argv.slice(2)
const space = argv[0]
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 ? argv[i + 1] : d
}
const c = CHOSEN[space]
if (!c) throw new Error(`unknown space ${space} (${Object.keys(CHOSEN).join(', ')})`)
const dir = join(ROOT, 'assets-source', 'environments', space, 'candidates')
mkdirSync(dir, { recursive: true })

const api = (p) =>
  JSON.parse(execSync(`curl -s --max-time 40 -H "Authorization: Token ${TOKEN}" "https://api.sketchfab.com/v3${p}"`, { encoding: 'utf8', maxBuffer: 64e6 }))

if (!argv.includes('--nofetch')) {
  const meta = api(`/models/${c.uid}`)
  const dl = api(`/models/${c.uid}/download`)
  const pick = dl.gltf ?? dl.glb ?? dl.source
  writeFileSync(
    join(dir, 'meta.json'),
    JSON.stringify(
      {
        uid: c.uid,
        name: meta.name,
        author: meta.user?.displayName,
        license: meta.license?.fullName ?? meta.license?.label,
        viewerUrl: meta.viewerUrl,
      },
      null,
      2,
    ),
  )
  const zip = join(dir, `${c.uid}.zip`)
  execSync(`curl -sL --max-time 600 -o "${zip}" "${pick.url.replace(/"/g, '')}"`)
  execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zip}' -DestinationPath '${join(dir, 'gltf')}'"`)
  console.log(`FETCHED ${space}: "${meta.name}" — ${meta.license?.label}`)
}

const src = execSync(`bash -lc "find '${join(dir, 'gltf').replace(/\\/g, '/')}' -name 'scene.gltf' -o -name '*.glb' | head -1"`, { encoding: 'utf8' }).trim()
if (!src) throw new Error(`${space}: no gltf found in candidates`)
const tmp = join(dir, `${space}-prepped.glb`)
const out = execFileSync(
  BLENDER,
  ['--background', '--factory-startup', '--python', join(ROOT, 'tools/blender/env_prep.py'), '--',
    '--in', src, '--out', tmp, '--width', flag('width', String(c.width)), '--decimate', String(c.decimate), '--roty', flag('roty', '0')],
  { encoding: 'utf8' },
)
const okLine = out.split('\n').find((l) => l.startsWith('ENV_OK'))
if (!okLine) throw new Error(`${space}: blender prep failed\n${out.slice(-1200)}`)
console.log(okLine)

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
const doc = await io.read(tmp)
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }))
doc.createExtension(KHRDracoMeshCompression).setRequired(true)
mkdirSync(join(ROOT, 'public/assets/environments'), { recursive: true })
const dst = join(ROOT, 'public/assets/environments', `${space}.glb`)
await io.write(dst, doc)

const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'))
const manifestPath = join(ROOT, 'public/assets/ASSET_MANIFEST.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.environments ??= []
const entry = {
  id: space,
  source: 'download-ccby',
  sourceUrl: meta.viewerUrl,
  author: meta.author,
  license: meta.license,
  attributionText: `« ${meta.name} » par ${meta.author} (${meta.viewerUrl}) — ${meta.license} — modifié (échelle, décimation, optimisation)`,
  trademark: 'generic',
}
const i = manifest.environments.findIndex((e) => e.id === space)
if (i >= 0) manifest.environments[i] = entry
else manifest.environments.push(entry)
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

const creditsPath = join(ROOT, 'assets-source', 'CREDITS.md')
const credits = readFileSync(creditsPath, 'utf8')
if (!credits.includes(meta.viewerUrl)) writeFileSync(creditsPath, credits + `- environnement ${space} — ${entry.attributionText}\n`)

console.log(`PACKED ${space}: ${Math.round(statSync(dst).size / 1024)} KB → public/assets/environments/${space}.glb`)
