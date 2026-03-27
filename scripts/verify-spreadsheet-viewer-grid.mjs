/**
 * Headless check: spreadsheet viewer route exposes a sized Univer host + canvas.
 * Uses Playwright's bundled Chromium (not system Chrome).
 *
 *   npx playwright install chromium   # once per machine
 *   node scripts/verify-spreadsheet-viewer-grid.mjs [url]
 *
 * Authenticated routes: export PLAYWRIGHT_STORAGE_STATE=/path/to/state.json
 */

import { chromium } from 'playwright'

const url =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=ed32b14d-2a43-423b-ba83-c070e2b68916&view=viewer'

const storageState = process.env.PLAYWRIGHT_STORAGE_STATE

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext(storageState ? { storageState } : {})
  const page = await context.newPage()

  const errors = []
  page.on('pageerror', err => errors.push(String(err)))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })

  try {
    // Prefer `localhost` over 127.0.0.1: on some macOS setups Vite listens on IPv6 only.
    const normalizedUrl = url.replace('http://127.0.0.1:', 'http://localhost:')
    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })
  } catch (e) {
    console.error('NAV_FAIL', e.message)
    process.exitCode = 1
    await browser.close()
    return
  }

  const gridHost = page.locator('[data-testid="univer-sheet-grid-container"]').first()

  try {
    await gridHost.waitFor({ state: 'attached', timeout: 90000 })
  } catch {
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    if (/sign\s*in|log\s*in|authenticate/i.test(text)) {
      console.error('AUTH_REQUIRED: save storage state and set PLAYWRIGHT_STORAGE_STATE, or run logged-in.')
    } else {
      console.error('NO_GRID_HOST: univer-sheet-grid-container not found within timeout.')
    }
    if (errors.length) console.error('PAGE_ERRORS', errors.slice(0, 5))
    process.exitCode = 1
    await browser.close()
    return
  }

  const box = await gridHost.boundingBox()
  if (!box || box.width < 4 || box.height < 4) {
    console.error('BAD_GRID_BOX', box)
    process.exitCode = 1
    await browser.close()
    return
  }

  for (let i = 0; i < 30; i++) {
    const n = await gridHost.locator('canvas').count()
    if (n > 0) {
      console.log(
        JSON.stringify({
          ok: true,
          gridPx: { w: Math.round(box.width), h: Math.round(box.height) },
          canvases: n,
          url
        })
      )
      process.exitCode = 0
      await browser.close()
      return
    }
    await page.waitForTimeout(1000)
  }

  console.error('NO_CANVAS: host visible but Univer did not paint canvas in time.')
  if (errors.length) console.error('PAGE_ERRORS', errors.slice(0, 8))
  process.exitCode = 1
  await browser.close()
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
