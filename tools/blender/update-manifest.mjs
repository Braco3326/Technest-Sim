// update-manifest.mjs <id> <tris> <note> — BOM-safe manifest entry update.
import { readFileSync, writeFileSync } from 'node:fs'

const [id, tris, note] = process.argv.slice(2)
const path = 'public/assets/ASSET_MANIFEST.json'
const manifest = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''))
const entry = manifest.assets.find((a) => a.id === id)
if (entry) {
  entry.tris = Number(tris)
  entry.status = 'ok'
  entry.note = note
}
writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n')
console.log(entry ? `manifest: ${id} updated` : `manifest: ${id} NOT FOUND`)
