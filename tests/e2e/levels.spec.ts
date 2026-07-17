/**
 * B1/C1/D1 smoke: each domain level teaches its rule (violation toast) and is
 * winnable once the right DEVICE STATE is set — chain alone is not enough.
 * Everything drives through the same intent dispatcher the UI uses.
 */
import { expect, test } from '@playwright/test'

const scenarios = [
  {
    level: 'b1',
    chain: 5,
    teaches: 'Monitor mute on open mic (feedback)',
    fix: { instance: 'iq-1', control: 'monitor-mute', value: true },
  },
  {
    level: 'c1',
    chain: 6,
    teaches: 'Mix-minus / N-1 return echo',
    fix: { instance: 'iq-1', control: 'route-in-line-1-to-out-n1', value: false },
  },
  {
    level: 'd1',
    chain: 8,
    teaches: 'Phantom power (+48 V)',
    fix: { instance: 'isa-1', control: 'phantom-48v', value: true },
  },
] as const

for (const s of scenarios) {
  test(`${s.level}: chain + state lesson (${s.fix.control}) → win`, async ({ page }) => {
    await page.goto(`/?level=${s.level}`)
    await page.waitForFunction(() => !!window.__audioSim)
    await page.evaluate(() => window.localStorage.clear())

    await expect(page.locator('#hud-checklist li')).toHaveCount(s.chain)
    await expect(page.locator('#hud-levels a.current')).toHaveText(s.level.toUpperCase())

    // Build the full required chain.
    await page.evaluate(() => {
      const sim = window.__audioSim!
      for (const conn of sim.level.requiredChain)
        sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
    })
    await expect(page.locator('#hud-checklist li.done')).toHaveCount(s.chain)

    // Chain complete but NOT won: the domain rule is violated and teaches.
    let state = await page.evaluate(() => window.__audioSim!.state())
    expect(state.chainComplete).toBe(true)
    expect(state.won).toBe(false)
    expect(state.violations.map((v: { title: string }) => v.title)).toContain(s.teaches)

    // Fix the device state through the same intent path the ControlsPanel uses.
    await page.evaluate((fix) => {
      window.__audioSim!.dispatch({ type: 'SET_CONTROL', ...fix })
    }, s.fix)

    state = await page.evaluate(() => window.__audioSim!.state())
    expect(state.won).toBe(true)
    await expect(page.locator('#hud-win .win-card')).toBeVisible()
  })
}

test('controls panel renders and toggles device state (b1)', async ({ page }) => {
  await page.goto('/?level=b1')
  await page.waitForFunction(() => !!window.__audioSim)

  const mute = page.locator('.cp-toggle[data-control="monitor-mute"]')
  await expect(mute).toBeVisible()
  await expect(mute).toHaveAttribute('aria-pressed', 'false')
  await mute.click()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')

  // fader default OPEN (b1 starts on-air) — rendered as pressed
  await expect(page.locator('.cp-toggle[data-control="fader-in-mic-1"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('routing matrix renders for c1 and reflects the pre-wired echo mistake', async ({ page }) => {
  await page.goto('/?level=c1')
  await page.waitForFunction(() => !!window.__audioSim)

  const badRoute = page.locator('.cp-cell[data-control="route-in-line-1-to-out-n1"]')
  await expect(badRoute).toBeVisible()
  await expect(badRoute).toHaveAttribute('aria-pressed', 'true')
  await badRoute.click()
  await expect(badRoute).toHaveAttribute('aria-pressed', 'false')
})

/**
 * Multi-stage arcs: the enriched levels teach their lessons in sequence, not
 * all-at-once. Each drives the SAME intent path the pointer and controls panel
 * use — pure content depth, zero engine change.
 */

// Wire a subset of the required chain by index (a player builds progressively).
async function wireExcept(page: import('@playwright/test').Page, skip: number[]) {
  await page.evaluate((skipped) => {
    const sim = window.__audioSim!
    sim.level.requiredChain.forEach((conn, i) => {
      if (skipped.includes(i)) return
      sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
    })
  }, skip)
}
async function wireIndex(page: import('@playwright/test').Page, i: number) {
  await page.evaluate((idx) => {
    const sim = window.__audioSim!
    const conn = sim.level.requiredChain[idx]
    sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  }, i)
}
const titles = (state: { violations: { title: string }[] }) => state.violations.map((v) => v.title)

test('b1 two-lesson arc: open mic → tally missing (R5) + feedback (R6) → wire tally → mute → win', async ({
  page,
}) => {
  await page.goto('/?level=b1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())

  // Stage 1 — build the signal path but NOT the GPIO tally (requiredChain[3]).
  await wireExcept(page, [3])
  let state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.chainComplete).toBe(false)
  // The mic fader is open by default: BOTH broadcast lessons are live.
  expect(titles(state)).toContain('ON-AIR tally light')
  expect(titles(state)).toContain('Monitor mute on open mic (feedback)')

  // Stage 2 — wire the ON-AIR light: R5 clears, R6 remains.
  await wireIndex(page, 3)
  state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.chainComplete).toBe(true)
  expect(titles(state)).not.toContain('ON-AIR tally light')
  expect(titles(state)).toContain('Monitor mute on open mic (feedback)')

  // Stage 3 — mute the control-room monitors: R6 clears → win.
  await page.evaluate(() =>
    window.__audioSim!.dispatch({ type: 'SET_CONTROL', instance: 'iq-1', control: 'monitor-mute', value: true }),
  )
  state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.won).toBe(true)
})

test('c1 four-stage duplex: partial build has no echo → close the N-1 send → echo (R7) → mix-minus → win', async ({
  page,
}) => {
  await page.goto('/?level=c1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())

  await expect(page.locator('#hud-checklist li')).toHaveCount(6)

  // Stage 1 — field + IP link + studio return + control-room monitors, but the
  // N-1 send (requiredChain[3]) is still open: no loop yet, so no echo.
  await wireExcept(page, [3])
  let state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.chainComplete).toBe(false)
  expect(titles(state)).not.toContain('Mix-minus / N-1 return echo')

  // Stage 2 — close the send: the codec return now rides its own send bus → echo.
  await wireIndex(page, 3)
  state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.chainComplete).toBe(true)
  expect(state.won).toBe(false)
  expect(titles(state)).toContain('Mix-minus / N-1 return echo')

  // Stage 3 — drop the return off the N-1 bus (a true mix-minus) → win.
  await page.evaluate(() =>
    window.__audioSim!.dispatch({
      type: 'SET_CONTROL',
      instance: 'iq-1',
      control: 'route-in-line-1-to-out-n1',
      value: false,
    }),
  )
  state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.won).toBe(true)
})
