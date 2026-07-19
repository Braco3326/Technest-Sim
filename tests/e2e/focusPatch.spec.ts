/**
 * Focus & Patch gates (ADR-0008, spec §8):
 *  1. Wire the FULL A1 chain with ONLY real mouse input — double-click to
 *     focus, click ports to patch, right-click to return. ZERO manual zoom
 *     (no wheel event is ever sent), zero programmatic dispatch.
 *  2. Exam mode: no port, no device ever glows (3D and 2D) — you locate the
 *     I/O yourself, exactly like the jury table.
 */
import { expect, test, type Page } from '@playwright/test'

const FLY_SETTLE_MS = 500 // fly is 300ms eased — wait for the frame to be stable

/**
 * Wait until every device resolved its .glb (or fell back to the placeholder):
 * models load async and RE-ANCHOR their ports when they land — interacting
 * mid-landing is a race a test must not depend on. Falls through after 5s
 * (placeholder fallback is a valid state, never a test failure).
 */
async function assetsSettled(page: Page): Promise<void> {
  await page
    .waitForFunction(() => window.__audioSim!.assets().every((a) => a.status === 'glb'), undefined, {
      timeout: 5000,
    })
    .catch(() => undefined)
  await page.waitForTimeout(300) // re-anchor + portPoints resync
}

/**
 * Double-click a device into focus, with Esc-recovery: if the double-click
 * landed on a port pick-sphere (accidental cable pickup — exactly what can
 * happen to a real user), cancel with Esc and re-aim slightly higher.
 */
async function focusDevice(page: Page, instanceId: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const pos = await page.evaluate((id) => window.__audioSim!.deviceScreen(id), instanceId)
    if (!pos) throw new Error(`no screen position for ${instanceId}`)
    await page.mouse.dblclick(pos.x, pos.y - attempt * 14)
    const focused = await page
      .waitForFunction(
        (id) => {
          const v = window.__audioSim!.view()
          return v.mode === 'focus' && v.focused === id
        },
        instanceId,
        { timeout: 1000 },
      )
      .catch(() => null)
    if (focused) {
      await page.waitForTimeout(FLY_SETTLE_MS)
      return
    }
    await page.keyboard.press('Escape') // drop any accidental pickup, retry
  }
  throw new Error(`could not focus ${instanceId}`)
}

async function clickPort(page: Page, ref: { instance: string; port: string }): Promise<void> {
  const pos = await page.evaluate((r) => window.__audioSim!.portScreen(r), ref)
  if (!pos) throw new Error(`no screen position for ${ref.instance}.${ref.port}`)
  await page.mouse.click(pos.x, pos.y)
}

async function backToEnsemble(page: Page): Promise<void> {
  // Right-click returns to Ensemble WITH the cable in hand (ADR-0008).
  const size = page.viewportSize()!
  await page.mouse.click(size.width / 2, size.height / 2, { button: 'right' })
  await page.waitForFunction(() => window.__audioSim!.view().mode === 'ensemble')
  await page.waitForTimeout(FLY_SETTLE_MS)
}

test('A1 wired ONLY via double-click + focus + port clicks, zero manual zoom → win (spec §8)', async ({
  page,
}) => {
  test.setTimeout(120_000) // 5 connections × several eased camera flights
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)
  await page.evaluate(() => window.localStorage.clear())

  const chain = await page.evaluate(() => window.__audioSim!.level.requiredChain)

  let done = 0
  for (const conn of chain) {
    // 1. dive on the source device, pick the cable up at its port
    await focusDevice(page, conn.from.instance)
    await clickPort(page, conn.from)
    await page.waitForFunction(() => window.__audioSim!.view().held !== null)

    // 2. back to Ensemble — cable still in hand, compatible devices glow
    await backToEnsemble(page)
    expect((await page.evaluate(() => window.__audioSim!.view())).held).not.toBeNull()
    expect(await page.evaluate(() => window.__audioSim!.glowCount())).toBeGreaterThan(0)

    // 3. dive on the target device, click the destination port → connected
    await focusDevice(page, conn.to.instance)
    await clickPort(page, conn.to)
    done += 1
    await expect
      .poll(async () => page.evaluate(() => window.__audioSim!.state().connectedRequired))
      .toBe(done)

    // After the LAST connection the win overlay owns the screen — stay put.
    if (done < chain.length) await backToEnsemble(page)
  }

  // Won — through the camera, the clicks and the engine, nothing else.
  const state = await page.evaluate(() => window.__audioSim!.state())
  expect(state.won).toBe(true)
  await expect(page.locator('#hud-win .win-card')).toBeVisible()
})

test('exam 3D: cable in hand but NOTHING glows — no device outline, no port hint', async ({
  page,
}) => {
  await page.goto('/?level=a1&mode=exam')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)

  expect(await page.evaluate(() => window.__audioSim!.hints())).toBe(false)

  const chain = await page.evaluate(() => window.__audioSim!.level.requiredChain)
  await focusDevice(page, chain[0].from.instance)
  await clickPort(page, chain[0].from)
  await page.waitForFunction(() => window.__audioSim!.view().held !== null)

  // In focus with a held cable: zero glow (levels would dim/outline here).
  expect(await page.evaluate(() => window.__audioSim!.glowCount())).toBe(0)

  await backToEnsemble(page)
  // In Ensemble with a held cable: still zero glow (levels would outline targets).
  expect(await page.evaluate(() => window.__audioSim!.view().held)).not.toBeNull()
  expect(await page.evaluate(() => window.__audioSim!.glowCount())).toBe(0)
})

test('levels 3D (control): the same held cable DOES glow compatible devices', async ({ page }) => {
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)

  const chain = await page.evaluate(() => window.__audioSim!.level.requiredChain)
  await focusDevice(page, chain[0].from.instance)
  await clickPort(page, chain[0].from)
  await page.waitForFunction(() => window.__audioSim!.view().held !== null)
  await backToEnsemble(page)

  expect(await page.evaluate(() => window.__audioSim!.glowCount())).toBeGreaterThan(0)
})

test('exam 2D: arming a port shows NO ok/bad hint classes (audited fix)', async ({ page }) => {
  await page.goto('/?level=a1&mode=exam&render=2d')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)

  await page.locator('.b2d-port[data-instance="sm58-1"][data-port="out-xlr"]').click()
  await expect(page.locator('.b2d-port.armed')).toHaveCount(1) // state stays visible
  await expect(page.locator('.b2d-port.ok, .b2d-port.bad')).toHaveCount(0) // hints gone

  // Control: outside exam the same arming DOES show the dry-run glow.
  await page.goto('/?level=a1&render=2d')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)
  await page.locator('.b2d-port[data-instance="sm58-1"][data-port="out-xlr"]').click()
  await expect(page.locator('.b2d-port.ok')).not.toHaveCount(0)
})

test('Esc cancels the held cable first, then leaves focus (ADR-0008 Esc policy)', async ({
  page,
}) => {
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)

  const chain = await page.evaluate(() => window.__audioSim!.level.requiredChain)
  await focusDevice(page, chain[0].from.instance)
  await clickPort(page, chain[0].from)
  await page.waitForFunction(() => window.__audioSim!.view().held !== null)

  await page.keyboard.press('Escape')
  let view = await page.evaluate(() => window.__audioSim!.view())
  expect(view.held).toBeNull() // cable dropped…
  expect(view.mode).toBe('focus') // …but still framing the device

  await page.keyboard.press('Escape')
  await page.waitForFunction(() => window.__audioSim!.view().mode === 'ensemble')
})

test('keyboard path: Tab + Enter focus a device without any mouse (spec §2)', async ({ page }) => {
  await page.goto('/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await assetsSettled(page)
  // Move focus off any HUD element so the canvas shortcuts are live.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.())

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__audioSim!.view().mode === 'focus')
})
