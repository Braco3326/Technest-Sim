/**
 * gate5-proof — drives the REAL pointer interaction in headless Chromium to
 * prove the step-5 gate: placeholders spawn with ports, a cable drags, snaps
 * ≤15 cm, shows green on a compatible port / red on an incompatible one, and
 * dropping green actually connects (LevelState progresses).
 * Screenshots land in test-results/gate5/.
 * Usage: npx tsx tools/gate5-proof.ts  (dev server must be up on :3000)
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results/gate5')
mkdirSync(outDir, { recursive: true })

type Ref = { instance: string; port: string }

const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const logs: string[] = []
  page.on('console', (m) => logs.push(m.text()))

  await page.goto('http://localhost:3000')
  await page.waitForFunction(() => !!window.__audioSim, undefined, { timeout: 15000 })
  await page.waitForTimeout(800) // a few rendered frames

  const screen = (ref: Ref) =>
    page.evaluate((r) => window.__audioSim!.portScreen(r), ref) as Promise<{ x: number; y: number }>

  await page.screenshot({ path: `${outDir}/01-scene-placeholders.png` })

  // ── drag 1: SM58 out → Rio in-mic-1 (compatible → GREEN, then drop) ───────
  const sm58 = await screen({ instance: 'sm58-1', port: 'out-xlr' })
  const rioMic = await screen({ instance: 'rio-1', port: 'in-mic-1' })
  await page.mouse.move(sm58.x, sm58.y)
  await page.mouse.down()
  await page.mouse.move((sm58.x + rioMic.x) / 2, (sm58.y + rioMic.y) / 2 - 60, { steps: 12 })
  await page.screenshot({ path: `${outDir}/02-drag-neutral.png` })
  await page.mouse.move(rioMic.x + 4, rioMic.y + 2, { steps: 12 }) // inside snap radius
  await page.waitForTimeout(150)
  const candGreen = await page.evaluate(() => window.__audioSim!.canConnect(
    { instance: 'sm58-1', port: 'out-xlr' },
    { instance: 'rio-1', port: 'in-mic-1' },
  ))
  await page.screenshot({ path: `${outDir}/03-snap-green.png` })
  await page.mouse.up()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${outDir}/04-connected.png` })
  const stateAfter = await page.evaluate(() => window.__audioSim!.state())

  // ── drag 2: SM57 out → QL1 out-main-l (out→out → RED, drop aborts) ────────
  const sm57 = await screen({ instance: 'sm57-1', port: 'out-xlr' })
  const qlOut = await screen({ instance: 'ql1-1', port: 'out-main-l' })
  await page.mouse.move(sm57.x, sm57.y)
  await page.mouse.down()
  await page.mouse.move(qlOut.x + 4, qlOut.y + 2, { steps: 18 })
  await page.waitForTimeout(150)
  const candRed = await page.evaluate(() => window.__audioSim!.canConnect(
    { instance: 'sm57-1', port: 'out-xlr' },
    { instance: 'ql1-1', port: 'out-main-l' },
  ))
  await page.screenshot({ path: `${outDir}/05-snap-red.png` })
  await page.mouse.up()
  await page.waitForTimeout(150)
  const stateFinal = await page.evaluate(() => window.__audioSim!.state())

  await browser.close()

  // ── verdict ────────────────────────────────────────────────────────────────
  const checks: [string, boolean][] = [
    ['green candidate is engine-approved (canConnect.ok)', candGreen.ok === true],
    ['red candidate is engine-rejected (R3 out→out)', candRed.ok === false && (candRed as { ruleId?: string }).ruleId === 'R3'],
    ['drop on green connected 1/5 required', stateAfter.connectedRequired === 1],
    ['drop on red did NOT connect (still 1/5)', stateFinal.connectedRequired === 1],
    ['level in progress, not won', stateFinal.won === false],
  ]
  let pass = true
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`)
    if (!ok) pass = false
  }
  console.log(`\nlevel log tail: ${logs.filter((l) => l.startsWith('[a1]')).slice(-3).join(' | ')}`)
  console.log(pass ? '\nGATE 5: PASS' : '\nGATE 5: FAIL')
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
