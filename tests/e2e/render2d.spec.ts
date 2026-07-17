/**
 * 2D low-fidelity fallback (VISION: playable on weak PCs). ?render=2d boots the
 * WebGL-free SVG board; it drives the SAME engine — wire the chain, win.
 */
import { expect, test } from '@playwright/test'

test('?render=2d boots the SVG board instead of the canvas', async ({ page }) => {
  await page.goto('/?level=a1&render=2d')
  await page.waitForFunction(() => !!window.__audioSim)

  await expect(page.locator('#board2d .board2d')).toBeVisible()
  await expect(page.locator('#renderCanvas')).toBeHidden()
  // a1 has 7 device instances → 7 boxes on the board
  await expect(page.locator('.b2d-device')).toHaveCount(7)
  // the "Vue 3D" switch is present (the fallback is activable both ways)
  await expect(page.locator('.board2d-toggle')).toBeVisible()
})

test('the board is playable: click two ports → a cable appears', async ({ page }) => {
  await page.goto('/?level=a1&render=2d')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())

  // Click the SM58 output, then the Rio mic-1 input — a real 2D connect.
  await page.locator('.b2d-port[data-instance="sm58-1"][data-port="out-xlr"]').click()
  await page.locator('.b2d-port[data-instance="rio-1"][data-port="in-mic-1"]').click()

  await expect(page.locator('.b2d-cable')).toHaveCount(1)
  const state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.connectedRequired).toBe(1)
})

test('full a1 chain on the 2D board → win', async ({ page }) => {
  await page.goto('/?level=a1&render=2d')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())

  // Build the whole required chain through the same intent path the board uses.
  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain)
      sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })

  await expect(page.locator('.b2d-cable')).toHaveCount(5)
  const state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.won).toBe(true)
  await expect(page.locator('#hud-win .win-card')).toBeVisible()
})
