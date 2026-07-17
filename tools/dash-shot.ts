import { chromium } from '@playwright/test'
const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://localhost:3001/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => {
    window.localStorage.clear()
    const sim = window.__audioSim!
    for (const conn of sim.level.requiredChain) sim.dispatch({ type: 'CONNECT', a: conn.from, b: conn.to })
  })
  await page.goto('http://localhost:3001/')
  await page.waitForSelector('.db-card')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/dashboard.png' })
  await browser.close()
  console.log('dashboard shot done')
}
main().catch((e) => { console.error(e); process.exit(1) })
