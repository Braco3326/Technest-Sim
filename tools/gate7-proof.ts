/**
 * gate7-proof — smoke the DEPLOYED Vercel URL: A1 loads, the correct chain
 * (driven through the same intent dispatcher) wins, the win screen shows.
 * Usage: npx tsx tools/gate7-proof.ts [url]   (default: production URL)
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.argv[2] ?? 'https://teknest-simu.vercel.app/'
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results/gate7')
mkdirSync(outDir, { recursive: true })

const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__audioSim, undefined, { timeout: 30000 })
  const loadMs = Date.now() - t0
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${outDir}/01-prod-loaded.png` })

  const checklist = await page.locator('#hud-checklist li').count()
  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })
  await page.waitForTimeout(300)
  const state = await page.evaluate(() => window.__audioSim!.state())
  const winVisible = await page.locator('#hud-win .win-card').isVisible()
  await page.screenshot({ path: `${outDir}/02-prod-win.png` })
  await browser.close()

  const checks: [string, boolean][] = [
    [`app booted on ${url} (${loadMs} ms to interactive hook)`, true],
    ['no uncaught page errors', errors.length === 0],
    ['HUD checklist rendered (5 required)', checklist === 5],
    ['A1 chain → won', state.won === true],
    ['win screen visible', winVisible],
  ]
  let pass = true
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`)
    if (!ok) pass = false
  }
  if (errors.length) console.log('page errors:', errors.join(' | '))
  console.log(pass ? '\nGATE 7 (prod URL): PASS' : '\nGATE 7 (prod URL): FAIL')
  process.exit(pass ? 0 : 1)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
