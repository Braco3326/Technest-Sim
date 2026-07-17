import { chromium } from '@playwright/test'
const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://localhost:3001/?level=a1')
  await page.waitForFunction(() => !!window.__audioSim)
  await page.evaluate(() => {
    const sim = window.__audioSim!
    const [c1, c2] = sim.level.requiredChain
    sim.dispatch({ type: 'CONNECT', a: c1.from, b: c1.to })
    sim.dispatch({ type: 'CONNECT', a: c2.from, b: c2.to })
  })
  await page.waitForTimeout(1400) // pulses mid-travel
  await page.screenshot({ path: 'test-results/motion.png' })
  await browser.close()
  console.log('motion shot done')
}
main().catch((e) => { console.error(e); process.exit(1) })
