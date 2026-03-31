/**
 * Browser-backed probe for German spreadsheet format defaults.
 *
 * What it checks in the opened number-format dropdown:
 * - Currency preview uses Euro formatting
 * - Date preview uses dot-separated German style
 * - Time preview is 24h (no AM/PM)
 * - Date+time preview is German-style date + 24h time
 *
 * Usage:
 *   PLAYWRIGHT_STORAGE_STATE=.playwright-auth/newwork-local.json \
 *   node scripts/run-spreadsheet-german-format-probe.mjs \
 *   "http://localhost:3001/platform/every-office/spreadsheets?appId=<APP_ID>&view=viewer"
 */
const viewerUrl =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=47af74ef-3688-4318-8cd2-f555247d9852&view=viewer'
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE
const headed = process.env.PLAYWRIGHT_HEADED === '1'
const holdMs = Number(process.env.PLAYWRIGHT_HOLD_MS || (headed ? 4000 : 0))

const LABEL_MAP = {
  number: ['Number'],
  currency: ['Currency', 'Financial value', 'Accounting', 'Rounding up the currency'],
  date: ['Date'],
  time: ['Time'],
  dateTime: ['Date and time']
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractPreview(rawText, labels) {
  const text = normalizeText(rawText)
  const label = labels.find(candidate => text.startsWith(candidate))
  if (!label) return ''
  return text.slice(label.length).trim()
}

function evaluateGermanExpectations(previews) {
  const currency = previews.currency || ''
  const date = previews.date || ''
  const time = previews.time || ''
  const dateTime = previews.dateTime || ''

  const hasEuroCurrency = /€|EUR/.test(currency)
  const hasGermanDate = /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(date) && !date.includes('-')
  const has24hTime = /\d{1,2}:\d{2}/.test(time) && !/\bAM\b|\bPM\b/i.test(time)
  const hasGermanDateTime =
    /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(dateTime) && /\d{1,2}:\d{2}/.test(dateTime) && !/\bAM\b|\bPM\b/i.test(dateTime)

  return {
    hasEuroCurrency,
    hasGermanDate,
    has24hTime,
    hasGermanDateTime,
    pass: hasEuroCurrency && hasGermanDate && has24hTime && hasGermanDateTime
  }
}

async function openFormatDropdown(page) {
  const candidateLocators = [
    page.getByRole('button', { name: /^General$/i }).first(),
    page.getByRole('button', { name: /^Date and time$/i }).first(),
    page.locator('button:has-text("General")').first(),
    page.locator('button:has-text("Date and time")').first(),
    page.locator('[role="button"]:has-text("General")').first(),
    page.locator('[role="button"]:has-text("Date and time")').first()
  ]

  for (const candidate of candidateLocators) {
    if ((await candidate.count()) === 0) continue
    if (
      !(await candidate
        .first()
        .isVisible()
        .catch(() => false))
    )
      continue
    await candidate
      .first()
      .click({ timeout: 5000 })
      .catch(() => {})
    const dropdownVisible = await page
      .locator('body')
      .filter({ hasText: 'Date and time' })
      .first()
      .isVisible()
      .catch(() => false)
    if (dropdownVisible) return true
  }

  // Fallback: click near top toolbar where number format dropdown usually lives.
  const gridHost = page.locator('[data-testid="univer-sheet-grid-container"]').first()
  const hostBox = await gridHost.boundingBox().catch(() => null)
  if (!hostBox) return false
  await page.mouse.click(hostBox.x + 220, hostBox.y + 14, { delay: 50 }).catch(() => {})
  return true
}

async function readFormatRows(page) {
  await page.waitForTimeout(600)
  return page.evaluate(labelMap => {
    const entries = Array.from(
      document.querySelectorAll('li, [role="menuitem"], .univer-menu-item, .rc-menu-item, button, div')
    )
      .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter(text =>
        [...Object.values(labelMap).flat()].some(
          label => text.startsWith(label) || text === label || text.includes(label)
        )
      )

    const firstMatch = labels =>
      entries.find(text => labels.some(label => text.startsWith(label) || text === label || text.includes(label))) || ''

    return {
      rawRows: entries,
      number: firstMatch(labelMap.number),
      currency: firstMatch(labelMap.currency),
      date: firstMatch(labelMap.date.filter(label => label === 'Date')),
      time: firstMatch(labelMap.time.filter(label => label === 'Time')),
      dateTime: firstMatch(labelMap.dateTime)
    }
  }, LABEL_MAP)
}

async function main() {
  const { chromium } = await import('playwright').catch(() => {
    throw new Error('Missing "playwright" dependency. Install it with: npm install -D playwright')
  })
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 120 : 0 })
  const context = await browser.newContext(storageState ? { storageState } : {})
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } })

  const report = {
    ok: false,
    viewerUrl,
    checks: [],
    previews: {},
    notes: []
  }

  try {
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page
      .locator('[data-testid="univer-sheet-grid-container"]')
      .first()
      .waitFor({ state: 'attached', timeout: 90000 })
    await page.waitForTimeout(1200)

    const opened = await openFormatDropdown(page)
    report.checks.push({ name: 'open_format_dropdown', pass: opened })
    if (!opened) throw new Error('Could not open number format dropdown in spreadsheet toolbar.')

    const rows = await readFormatRows(page)
    const previews = {
      number: extractPreview(rows.number, LABEL_MAP.number),
      currency: extractPreview(rows.currency, LABEL_MAP.currency),
      date: extractPreview(rows.date, LABEL_MAP.date),
      time: extractPreview(rows.time, LABEL_MAP.time),
      dateTime: extractPreview(rows.dateTime, LABEL_MAP.dateTime)
    }
    report.previews = previews

    const expectations = evaluateGermanExpectations(previews)
    report.checks.push({
      name: 'german_currency_date_time_defaults',
      pass: expectations.pass,
      details: {
        hasEuroCurrency: expectations.hasEuroCurrency,
        hasGermanDate: expectations.hasGermanDate,
        has24hTime: expectations.has24hTime,
        hasGermanDateTime: expectations.hasGermanDateTime
      }
    })

    if (!expectations.pass) {
      report.notes.push('Raw detected format rows:')
      report.notes.push(...rows.rawRows.slice(0, 20))
    }

    report.ok = report.checks.every(check => check.pass === true)
    if (holdMs > 0) {
      await page.waitForTimeout(holdMs)
    }
  } catch (error) {
    report.ok = false
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    await context.close()
    await browser.close()
  }

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
