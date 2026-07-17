/** Exam mode (Beat 5): timer, no hints, /20 report wired to readiness. */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/?level=a1&mode=exam')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())
})

test('timer runs and a wrong connect gives NO teaching text', async ({ page }) => {
  await expect(page.locator('#exam-timer')).toBeVisible()
  await expect(page.locator('#exam-timer')).toContainText(':')

  await page.evaluate(() => {
    window.__audioSim!.dispatch({
      type: 'CONNECT',
      a: { instance: 'sm57-1', port: 'out-xlr' },
      b: { instance: 'k12-1', port: 'in-line-a' },
    })
  })
  const toast = page.locator('.toast-error')
  await expect(toast).toBeVisible()
  await expect(toast.locator('strong')).toHaveText('Connexion refusée')
  await expect(toast).not.toContainText('40 dB') // the R2 teach text must NOT leak
})

test('winning ends the exam with a /20 report; intents freeze after', async ({ page }) => {
  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })
  await expect(page.locator('#exam-report')).toBeVisible()
  await expect(page.locator('.exam-card h2')).toContainText('/20')
  await expect(page.locator('.exam-card')).toContainText('Câblage requis : 5/5')

  // Post-exam intents are ignored (the report owns the session)
  const before = await page.evaluate(() => window.__audioSim!.state().connectedRequired)
  await page.evaluate(() => {
    const c = window.__audioSim!.level.requiredChain[0]
    window.__audioSim!.dispatch({ type: 'DISCONNECT', connectionId: 'c1' })
    void c
  })
  const after = await page.evaluate(() => window.__audioSim!.state().connectedRequired)
  expect(after).toBe(before)
})

test('the win screen never appears in exam mode (report replaces it)', async ({ page }) => {
  await page.evaluate(() => {
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })
  await expect(page.locator('#exam-report')).toBeVisible()
  await expect(page.locator('#hud-win')).toBeHidden()
})
