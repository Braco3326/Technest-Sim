/** env-scan.mjs — Sketchfab candidates for the 4 realistic room environments (CC0/CC-BY only). */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const TOKEN = readFileSync(join(ROOT, '.env'), 'utf8').match(/^SKETCHFAB_API_TOKEN=(.+)$/m)[1].trim()
const SCRATCH = 'C:/Users/iB_K/AppData/Local/Temp/claude/D--teknest-tekpractice/765da01e-9b05-423a-91ef-4a8c1b38fed1/scratchpad'

const SPACES = {
  studio2: ['recording studio interior', 'control room', 'studio booth', 'mixing room'],
}

const seen = new Set()
for (const [space, queries] of Object.entries(SPACES)) {
  const rows = []
  for (const q of queries) {
    const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(q)}&downloadable=true&count=12`
    const d = JSON.parse(execSync(`curl -s --max-time 30 -H "Authorization: Token ${TOKEN}" "${url}"`, { encoding: 'utf8', maxBuffer: 32e6 }))
    for (const r of d.results ?? []) {
      const lic = r.license?.label ?? ''
      if (/NonCommercial|NoDerivs|ShareAlike/i.test(lic)) continue
      if (!/CC Attribution|CC0|Public/i.test(lic)) continue
      if (seen.has(r.uid)) continue
      seen.add(r.uid)
      const thumb = (r.thumbnails?.images ?? []).sort((a, b) => b.width - a.width).find((i) => i.width <= 1280)
      rows.push({ uid: r.uid, lic: lic.replace('CC Attribution', 'CC-BY'), faces: r.faceCount, name: r.name, thumb: thumb?.url ?? '' })
    }
  }
  rows.sort((a, b) => a.faces - b.faces)
  writeFileSync(join(SCRATCH, `env-${space}.json`), JSON.stringify(rows, null, 1))
  console.log(`\n== ${space} (${rows.length} candidats) ==`)
  for (const r of rows) console.log(`${r.uid} | ${r.lic} | ${r.faces} faces | ${r.name}`)
}
