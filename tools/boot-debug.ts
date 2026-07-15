import { chromium } from '@playwright/test'
const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  page.on('response', (r) => {
    if (r.status() >= 400) console.log('[404+]', r.status(), r.url())
  })
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300))
  })
  await page.goto('http://localhost:3000/?level=a1')
  await page.waitForTimeout(6000)
  console.log('__audioSim present:', await page.evaluate(() => !!window.__audioSim))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
