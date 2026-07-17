/**
 * Home dashboard (Beat 2/4/5): readiness radar, ONE next action, streak.
 * The 3D engine must NOT boot on home; levels feed the model; the CTA
 * navigates into the recommended level.
 */
import { expect, test } from '@playwright/test'

test('home shows the dashboard, not the game', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.db-card')).toBeVisible()
  await expect(page.locator('#renderCanvas')).toBeHidden()
  const hasSim = await page.evaluate(() => !!window.__audioSim)
  expect(hasSim).toBe(false) // no 3D boot on home — calm and instant
})

test('fresh learner: R1 never practised → CTA leads to a level exercising it', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.locator('.db-reason')).toContainText('R1')
  await expect(page.locator('.db-tip')).toContainText('connecteur')
  await page.locator('.db-cta').click()
  await page.waitForFunction(() => !!window.__audioSim)
  await expect(page.locator('#hud-checklist li').first()).toBeVisible()
})

test('a win feeds readiness: dashboard reflects it and streak starts', async ({ page }) => {
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })
  await expect(page.locator('#hud-win .win-card')).toBeVisible()

  await page.goto('/')
  await expect(page.locator('.db-streak-n')).toHaveText('1')
  // R1 was exercised once → 50% chip (ratio 1 × coverage ½, ADR-0003)
  await expect(page.locator('.db-rule').first()).toContainText('R1 50%')
  // global readiness strictly positive
  await expect(page.locator('.db-global strong')).not.toHaveText('0%')
})
