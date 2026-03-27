import { chromium } from 'playwright'

const url =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=47af74ef-3688-4318-8cd2-f555247d9852&view=viewer'
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext(storageState ? { storageState } : {})
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(1500)

  const report = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="univer-sheet-grid-container"]')
    if (!host) return { host: null }
    const ancestry = []
    let el = host
    for (let i = 0; i < 10 && el; i++) {
      const rect = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      ancestry.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute('data-testid'),
        className: el.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        position: cs.position,
        display: cs.display,
        minHeight: cs.minHeight,
        heightStyle: cs.height,
        overflow: cs.overflow
      })
      el = el.parentElement
    }
    return {
      hostRect: host.getBoundingClientRect(),
      canvasCount: host.querySelectorAll('canvas').length,
      ancestry
    }
  })

  console.log(JSON.stringify(report, null, 2))
  await page.screenshot({ path: 'spreadsheet-grid-layout-inspect.png', fullPage: true })
  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
