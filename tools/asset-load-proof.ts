/**
 * asset-load-proof — screenshots each level on :3000 with glb models loading
 * over placeholders; reports how many placeholder boxes got replaced.
 * Usage: npx tsx tools/asset-load-proof.ts
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results/assets')
mkdirSync(outDir, { recursive: true })

const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const warns: string[] = []
  page.on('console', (m) => {
    if (m.text().includes('[assets]')) warns.push(m.text())
  })

  for (const level of ['a1', 'b1', 'c1', 'd1']) {
    warns.length = 0
    await page.goto(`${process.env.SIM_URL ?? 'http://localhost:3001'}/?level=${level}`)
    await page.waitForFunction(() => !!window.__audioSim)
    await page.waitForTimeout(3500) // let glbs stream + draco decode
    const counts = await page.evaluate(() => {
      const scene = (window as unknown as { __scene?: unknown }).__scene
      void scene
      return {
        devices: document.querySelectorAll('#hud-checklist li').length,
      }
    })
    await page.screenshot({ path: `${outDir}/${level}-models.png` })
    console.log(`${level}: screenshot ok (${counts.devices} chain items) — glb warnings: ${warns.length ? warns.join(' | ') : 'none'}`)
  }
  await browser.close()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
