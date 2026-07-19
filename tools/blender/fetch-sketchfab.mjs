/**
 * fetch-sketchfab.mjs — downloads a verified CC-BY candidate into the
 * gitignored assets-source/<cat>/<id>/candidates/ + stores meta.json
 * (license/author read from the official API — the CREDITS source of truth).
 *
 *   node tools/blender/fetch-sketchfab.mjs <device-id>…
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const TOKEN = readFileSync(join(ROOT, '.env'), 'utf8').match(/^SKETCHFAB_API_TOKEN=(.+)$/m)?.[1]?.trim()
if (!TOKEN) throw new Error('SKETCHFAB_API_TOKEN missing from .env')

/** device → verified candidate (assets-source/SOURCING-QUEUE.md, licences API-vérifiées). */
export const CANDIDATES = {
  'shure-sm58': { uid: '89d38b9c53f8496a922ce1199ca57afc', cat: 'Microphones' },
  'shure-sm57': { uid: '68a4fa6898b14f07b3ee9f56b342f469', cat: 'Microphones' },
  'neumann-u87-ai': { uid: '0f0e14eee8fb4f56a9826bae9b061c55', cat: 'Microphones' },
  'ev-re20': { uid: '932fa222f4b14538828cac6da5747eec', cat: 'Microphones' }, // SM7B fallback (débrander)
  'ev-re50': null, // Poly Pizza (pas de token PP) — reste en queue
  'km-210-9': { uid: '9bee76120cd8472b9f68db91d820f5ff', cat: 'Stands-Accessories' },
  'qsc-k12-2': { uid: '42ddb9057e8647dd831e065106630d28', cat: 'Monitors-Speakers' },
  'yamaha-dbr12': { uid: 'be94233262e24cbfa3723b607567afac', cat: 'Monitors-Speakers' },
  'genelec-8030c': { uid: 'ce1bff22430e45bf8e3cc2e4f353f4d9', cat: 'Monitors-Speakers' }, // 8340A même design
  'axia-iq': { uid: 'e28440b16df348dbaffbc7f20d7cb8bf', cat: 'Consoles' },
  'aeta-scoop5-s': { uid: '50ea58413e214a50b16e5bc726291190', cat: 'Codecs' },
  'aeta-scoopy-plus-s': { uid: 'ef5389ec84b248e389c5a70097454159', cat: 'Codecs' },
  'yellowtec-litt': { uid: '3df0b1fc0e0a445c8edcaddf3dd6ceb5', cat: 'Stands-Accessories' },
  'focusrite-isa-one': { uid: 'a6b5c0e1bb9a4a3eba04bbaa66a2f3cb', cat: 'Stageboxes-IO' },
  'avid-hd-io': { uid: '8e96f1582bfa476fb87655d91e66a25c', cat: 'Stageboxes-IO' }, // Midiverb rack
  'antelope-ocx-hd': { uid: '8e96f1582bfa476fb87655d91e66a25c', cat: 'Stageboxes-IO' }, // même rack, retexture
  'avid-protools-hdx': { uid: 'a55286be3fd54058b913d10b935c249e', cat: 'Stageboxes-IO' },
  'playout-pc': { uid: 'a55286be3fd54058b913d10b935c249e', cat: 'Stageboxes-IO' },
  'grace-m905': { uid: 'b0c9d5c992e7416786c4bb5dad416f31', cat: 'Monitors-Speakers' },
}

const api = (path) =>
  JSON.parse(
    execSync(`curl -s --max-time 40 -H "Authorization: Token ${TOKEN}" "https://api.sketchfab.com/v3${path}"`, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  )

for (const id of process.argv.slice(2)) {
  const c = CANDIDATES[id]
  if (!c) {
    console.log(`SKIP ${id} (pas de candidat Sketchfab — queue)`)
    continue
  }
  const dir = join(ROOT, 'assets-source', c.cat, id, 'candidates')
  mkdirSync(dir, { recursive: true })

  const meta = api(`/models/${c.uid}`)
  const dl = api(`/models/${c.uid}/download`)
  const pick = dl.gltf ?? dl.glb ?? dl.source
  if (!pick?.url) throw new Error(`${id}: no downloadable archive (${JSON.stringify(dl).slice(0, 120)})`)
  const kind = dl.gltf ? 'gltf' : dl.glb ? 'glb' : 'source'

  writeFileSync(
    join(dir, 'meta.json'),
    JSON.stringify(
      {
        uid: c.uid,
        name: meta.name,
        author: meta.user?.displayName ?? meta.user?.username,
        authorUrl: meta.user?.profileUrl,
        license: meta.license?.fullName ?? meta.license?.label,
        licenseUrl: meta.license?.url,
        viewerUrl: meta.viewerUrl,
        archive: kind,
        fetchedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  const zip = join(dir, `${c.uid}-${kind}.zip`)
  execSync(`curl -sL --max-time 300 -o "${zip}" "${pick.url.replace(/"/g, '')}"`)
  const outDir = join(dir, kind)
  mkdirSync(outDir, { recursive: true })
  // GNU tar (git-bash) treats "D:" as a remote host — PowerShell unzips reliably.
  execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zip}' -DestinationPath '${outDir}'"`)
  console.log(`FETCHED ${id}: "${meta.name}" par ${meta.user?.displayName} — ${meta.license?.label} (${kind}, ${Math.round(pick.size / 1024)} KB)`)
}
