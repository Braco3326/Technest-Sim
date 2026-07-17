/**
 * Sandbox v1 (Beat 3, ADR-0004): guided shelves for a fresh learner, dynamic
 * spawn through SPAWN intents, live rules that still teach, mistakes feeding
 * the readiness store, named rig save.
 */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/?level=sandbox')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim)
})

test('fresh learner gets the GUIDED palette (3 items + brief)', async ({ page }) => {
  await expect(page.locator('#hud-shelf')).toBeVisible()
  await expect(page.locator('.shelf-brief')).toContainText('Palette guidée')
  await expect(page.locator('.shelf-item')).toHaveCount(3)
})

test('spawn via shelves → wire → the rules still teach → readiness records it', async ({ page }) => {
  await page.locator('.shelf-item[data-device="shure-sm58"]').click()
  await page.locator('.shelf-item[data-device="yamaha-rio3224-d2"]').click()
  await page.locator('.shelf-item[data-device="yamaha-ql1"]').click()

  // Deterministic sandbox ids: <deviceId>-s<n> in click order.
  const good = await page.evaluate(() =>
    window.__audioSim!.canConnect(
      { instance: 'shure-sm58-s1', port: 'out-xlr' },
      { instance: 'yamaha-rio3224-d2-s2', port: 'in-mic-1' },
    ),
  )
  expect(good.ok).toBe(true)

  // A wrong drop still teaches (sandbox = same rules, hints ON)
  await page.evaluate(() => {
    window.__audioSim!.dispatch({
      type: 'CONNECT',
      a: { instance: 'shure-sm58-s1', port: 'out-xlr' },
      b: { instance: 'yamaha-ql1-s3', port: 'out-main-l' },
    })
  })
  await expect(page.locator('.toast-error strong')).toHaveText('Direction mismatch')

  // …and the mistake lands in the store under "sandbox" (play = assessment)
  const recorded = await page.evaluate(() => {
    const raw = window.localStorage.getItem('audio-sim/progress')
    return raw ? JSON.parse(raw).levels.sandbox?.mistakes?.length : 0
  })
  expect(recorded).toBeGreaterThanOrEqual(1)
})

test('a named rig can be saved', async ({ page }) => {
  await page.locator('.shelf-item[data-device="shure-sm58"]').click()
  await page.locator('#rig-name').fill('Mon premier rig')
  await page.locator('#rig-save').click()
  await expect(page.locator('#rig-saved')).toBeVisible()
  const rigs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('audio-sim/rigs')!))
  expect(rigs.rigs[0].name).toBe('Mon premier rig')
  expect(rigs.rigs[0].instances[0].deviceId).toBe('shure-sm58')
})
