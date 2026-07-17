/**
 * A1 smoke (step-7 gate): load the level, build the correct chain
 * programmatically through the SAME intent dispatcher the pointer uses,
 * expect the win screen. Engine invariants stay live: an invalid connect is
 * rejected and toasts the teaching text.
 */
import { expect, test } from '@playwright/test'

type Ref = { instance: string; port: string }

test.beforeEach(async ({ page }) => {
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim)
})

test('A1 is winnable: correct chain → win screen with success message', async ({ page }) => {
  await expect(page.locator('#hud-checklist li')).toHaveCount(5)

  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) {
      sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
    }
  })

  await expect
    .poll(async () => page.evaluate(() => window.__audioSim!.state().won))
    .toBe(true)
  await expect(page.locator('#hud-checklist li.done')).toHaveCount(5)
  await expect(page.locator('#hud-win .win-card')).toBeVisible()
  await expect(page.locator('#hud-win')).toContainText('Soundcheck passed')
})

test('engine invariants reject a wrong connect and teach (R2)', async ({ page }) => {
  await page.evaluate(() => {
    window.__audioSim!.dispatch({
      type: 'CONNECT',
      a: { instance: 'sm57-1', port: 'out-xlr' } as Ref,
      b: { instance: 'k12-1', port: 'in-line-a' } as Ref,
    })
  })
  await expect(page.locator('.toast-error strong')).toHaveText('Signal type mismatch')
  const state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.connectedRequired).toBe(0)
})

test('progress survives a reload (localStorage, versioned)', async ({ page }) => {
  await page.evaluate(() => {
    window.__audioSim!.dispatch({
      type: 'CONNECT',
      a: { instance: 'sm57-1', port: 'out-xlr' } as Ref,
      b: { instance: 'k12-1', port: 'in-line-a' } as Ref,
    })
  })
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim)
  const raw = await page.evaluate(() => window.localStorage.getItem('audio-sim/progress'))
  expect(JSON.parse(raw!).levels.a1.mistakes).toHaveLength(1)
})
