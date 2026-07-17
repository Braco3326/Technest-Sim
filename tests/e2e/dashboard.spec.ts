/**
 * Home dashboard (Beat 2/4/5): readiness radar, ONE next action, streak.
 * The 3D engine must NOT boot on home; levels feed the model; the CTA
 * navigates into the recommended level. A learner WITHOUT onboarding gets the
 * onboarding form instead (see onboarding.spec.ts) — these tests seed it.
 */
import { expect, test, type Page } from '@playwright/test'

const seedOnboarding = (page: Page, examDate: string | null = null) =>
  page.evaluate((date) => {
    window.localStorage.setItem(
      'audio-sim/onboarding',
      JSON.stringify({ version: 1, examDate: date, weakRules: [], choices: {}, completedAt: 'x' }),
    )
  }, examDate)

test('home shows the dashboard, not the game', async ({ page }) => {
  await page.goto('/')
  await seedOnboarding(page)
  await page.reload()
  await expect(page.locator('.db-card')).toBeVisible()
  await expect(page.locator('#renderCanvas')).toBeHidden()
  const hasSim = await page.evaluate(() => !!window.__audioSim)
  expect(hasSim).toBe(false) // no 3D boot on home — calm and instant
})

test('fresh learner: R1 never practised → CTA leads to a level exercising it', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await seedOnboarding(page)
  await page.reload()
  await expect(page.locator('.db-reason')).toContainText('R1')
  await expect(page.locator('.db-tip')).toContainText('connecteur')
  await page.locator('.db-cta').click()
  await page.waitForFunction(() => !!window.__audioSim)
  await expect(page.locator('#hud-checklist li').first()).toBeVisible()
})

test('a win feeds readiness: dashboard reflects it, streak starts, J-day shows', async ({ page }) => {
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

  await seedOnboarding(page, '2030-06')
  await page.goto('/')
  await expect(page.locator('.db-streak-n')).toHaveText('1')
  // R1 was exercised once → 50% chip (ratio 1 × coverage ½, ADR-0003)
  await expect(page.locator('.db-rule').first()).toContainText('R1 50%')
  await expect(page.locator('.db-global strong')).not.toHaveText('0%')
  await expect(page.locator('.db-jday')).toContainText('J−')
})
