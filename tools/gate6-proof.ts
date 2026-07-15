/**
 * gate6-proof — step-6 gate in headless Chromium with REAL pointer drags:
 *   1. a wrong drop (mic → line input) → the R2 teaching toast appears
 *   2. the full A1 required chain built by hand → win screen with mistake summary
 * Screenshots land in test-results/gate6/.
 * Usage: npx tsx tools/gate6-proof.ts  (dev server on :3000)
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results/gate6')
mkdirSync(outDir, { recursive: true })

type Ref = { instance: string; port: string }

const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://localhost:3000')
  await page.waitForFunction(() => !!window.__audioSim, undefined, { timeout: 15000 })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim, undefined, { timeout: 15000 })
  await page.waitForTimeout(800)

  const screen = (ref: Ref) =>
    page.evaluate((r) => window.__audioSim!.portScreen(r), ref) as Promise<{ x: number; y: number }>

  const drag = async (from: Ref, to: Ref) => {
    const a = await screen(from)
    const b = await screen(to)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2 - 50, { steps: 10 })
    await page.mouse.move(b.x, b.y, { steps: 10 })
    await page.waitForTimeout(120)
    await page.mouse.up()
    await page.waitForTimeout(120)
  }

  await page.screenshot({ path: `${outDir}/01-hud.png` })
  const checklistCount = await page.locator('#hud-checklist li').count()

  // ── 1) wrong drop by hand: SM57 (mic) → K12 line input → R2 toast ─────────
  await drag({ instance: 'sm57-1', port: 'out-xlr' }, { instance: 'k12-1', port: 'in-line-a' })
  const toastVisible = await page.locator('.toast-error').first().isVisible()
  const toastTitle = await page.locator('.toast-error strong').first().textContent()
  await page.screenshot({ path: `${outDir}/02-toast-r2.png` })

  // ── 2) full A1 chain by hand (5 real drags) ────────────────────────────────
  const chain: [Ref, Ref][] = (await page.evaluate(() => window.__audioSim!.level.requiredChain)).map(
    (c: { from: Ref; to: Ref }) => [c.from, c.to],
  )
  for (const [from, to] of chain) {
    await drag(from, to)
    const s = await page.evaluate(() => window.__audioSim!.state())
    console.log(`  after ${from.instance}.${from.port} → ${to.instance}.${to.port}: ${s.connectedRequired}/5`)
  }
  await page.waitForTimeout(300)

  const state = await page.evaluate(() => window.__audioSim!.state())
  const winVisible = await page.locator('#hud-win .win-card').isVisible()
  const winText = (await page.locator('#hud-win').textContent()) ?? ''
  const doneCount = await page.locator('#hud-checklist li.done').count()
  await page.screenshot({ path: `${outDir}/03-win.png` })

  await browser.close()

  const r2Title = 'Signal type mismatch'
  const checks: [string, boolean][] = [
    ['HUD checklist shows the 5 required connections', checklistCount === 5],
    ['wrong drop raised the R2 teaching toast', toastVisible && toastTitle === r2Title],
    ['all 5 checklist items ticked after manual build', doneCount === 5],
    ['LevelState.won === true', state.won === true],
    ['win screen visible with success message', winVisible && winText.includes('Soundcheck passed')],
    ['win screen lists the R2 mistake', winText.includes('1× Signal type mismatch')],
  ]
  let pass = true
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`)
    if (!ok) pass = false
  }
  console.log(pass ? '\nGATE 6: PASS' : '\nGATE 6: FAIL')
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
