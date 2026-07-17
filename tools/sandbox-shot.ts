import { chromium } from '@playwright/test'
const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://localhost:3001/?level=sandbox')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__audioSim)
  for (const id of ['shure-sm58', 'yamaha-rio3224-d2', 'yamaha-ql1'])
    await page.locator(`.shelf-item[data-device="${id}"]`).click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'test-results/sandbox.png' })
  await browser.close()
  console.log('sandbox shot done')
}
main().catch((e) => { console.error(e); process.exit(1) })
