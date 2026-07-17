/** Onboarding (Beat 1): 2 questions + date → seeded path → STRAIGHT into a level. */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('first visit shows onboarding, not the dashboard — no signup wall', async ({ page }) => {
  await expect(page.locator('.ob-card')).toBeVisible()
  await expect(page.locator('.db-radar')).toHaveCount(0)
  await expect(page.locator('.ob-card')).not.toContainText(/mot de passe|inscription|email/i)
})

test('declared broadcast fear → dropped straight into B1 (R5 seeded)', async ({ page }) => {
  await page.locator('#ob-exam-date').fill('2027-06')
  await page.locator('input[name="weak-area"][value="broadcast"]').check()
  await page.locator('input[name="self-level"][value="debutant"]').check()
  await page.locator('#ob-go').click()
  await page.waitForFunction(() => !!window.__audioSim)
  expect(page.url()).toContain('level=b1')
  // back home: onboarding done → dashboard with the exam countdown
  await page.goto('/')
  await expect(page.locator('.db-card')).toBeVisible()
  await expect(page.locator('.db-jday')).toContainText('J−')
})

test('skip path still lands in a level (taste first, questions never mandatory)', async ({ page }) => {
  await page.locator('#ob-skip').click()
  await page.waitForFunction(() => !!window.__audioSim)
  expect(page.url()).toContain('level=')
})
