/**
 * Unload/visibility persistence risk probe (headed-capable).
 *
 * Focus: what happens when page is closed quickly while save is in flight.
 * This approximates unload-timing persistence risk paths.
 *
 * Usage:
 * PLAYWRIGHT_HEADED=1 \
 * PLAYWRIGHT_STORAGE_STATE=.playwright-auth/newwork-local.json \
 * node scripts/run-spreadsheet-unload-risk-scenarios.mjs \
 * "http://localhost:3001/platform/every-office/spreadsheets?appId=<APP_ID>&view=viewer"
 */
import { chromium, request as playwrightRequest } from 'playwright'

const viewerUrl =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=47af74ef-3688-4318-8cd2-f555247d9852&view=viewer'
const apiBase = process.env.DOC_API_BASE || 'http://localhost:3002/api/v1'
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE
const headed = process.env.PLAYWRIGHT_HEADED === '1'
const trials = Number(process.env.UNLOAD_TRIALS || 6)
const holdMs = Number(process.env.PLAYWRIGHT_HOLD_MS || (headed ? 8000 : 0))
const stressMode = process.env.UNLOAD_STRESS === '1'
const crashAfterFire = process.env.UNLOAD_CRASH_AFTER_FIRE === '1'
const cpuSlowRate = Number(process.env.UNLOAD_CPU_SLOW_RATE || (stressMode ? 6 : 1))
const trialNavTimeoutMs = Number(process.env.UNLOAD_TRIAL_NAV_TIMEOUT_MS || (stressMode ? 30000 : 120000))

const appId = new URL(viewerUrl).searchParams.get('appId')
if (!appId) {
  console.error(JSON.stringify({ ok: false, error: 'missing_app_id_in_url', viewerUrl }, null, 2))
  process.exit(1)
}

function sanitizeRowId(row) {
  return String(row?._id || row?.id || row?._rowUuid || '')
}

function getCellValue(row, columnName) {
  if (!row || !columnName) return null
  if (Object.prototype.hasOwnProperty.call(row, columnName)) return row[columnName]
  if (row.data && Object.prototype.hasOwnProperty.call(row.data, columnName)) return row.data[columnName]
  return null
}

function pickEditableColumn(sheet) {
  const cols = Array.isArray(sheet?.columns) ? sheet.columns : []
  return (
    cols.find(
      c =>
        c &&
        c.isVisible !== false &&
        c.isEditable !== false &&
        ['text', 'email', 'url', 'phone'].includes(String(c.type || 'text'))
    ) || cols.find(c => c && c.isVisible !== false && c.isEditable !== false)
  )
}

async function main() {
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 100 : 0 })
  const context = await browser.newContext(storageState ? { storageState } : {})
  let page = await context.newPage({ viewport: { width: 1440, height: 900 } })

  const report = {
    ok: false,
    viewerUrl,
    appId,
    trials,
    scenarios: [],
    notes: []
  }

  let authHeader = null
  const responseErrors = []
  page.on('request', req => {
    if (!req.url().includes('localhost:3002')) return
    const header = req.headers()['authorization']
    if (header && !authHeader) authHeader = header
  })
  page.on('response', res => {
    if (!res.url().includes('localhost:3002')) return
    if (res.status() >= 400 && !res.url().includes('/token')) {
      responseErrors.push({ url: res.url(), status: res.status() })
    }
  })

  async function showStep(text) {
    if (!headed) return
    await page
      .evaluate(label => {
        const id = '__unload_probe_overlay__'
        let el = document.getElementById(id)
        if (!el) {
          el = document.createElement('div')
          el.id = id
          Object.assign(el.style, {
            position: 'fixed',
            bottom: '12px',
            left: '12px',
            zIndex: '2147483647',
            background: 'rgba(8,47,73,0.92)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '12px',
            maxWidth: '60vw',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
          })
          document.body.appendChild(el)
        }
        el.textContent = `[Unload Risk Probe] ${label}`
      }, text)
      .catch(() => {})
    await page.waitForTimeout(650)
  }

  let apiContext = null
  let sheetId = ''
  let rowId = ''
  let columnName = ''
  let originalValue = null

  async function loadCurrentRowValue() {
    const snapshotRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/snapshot`)
    const snapshot = await snapshotRes.json()
    const row = (snapshot?.rows || []).find(r => sanitizeRowId(r) === rowId)
    return getCellValue(row, columnName)
  }

  async function runFireAndCloseTrial({ value, keepalive, trialTag }) {
    await page.goto(viewerUrl + `&trial=${encodeURIComponent(trialTag)}`, {
      waitUntil: 'domcontentloaded',
      timeout: trialNavTimeoutMs
    })
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(300)

    let cdp = null
    if (stressMode) {
      try {
        cdp = await context.newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 900,
          downloadThroughput: 40 * 1024,
          uploadThroughput: 16 * 1024,
          connectionType: 'cellular3g'
        })
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowRate })
      } catch {
        // Ignore CDP setup failures and continue without throttle for this trial
      }
    }

    const payload = {
      url: `${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`,
      val: value,
      auth: authHeader,
      col: columnName,
      keepalive
    }

    const fireFetch = async () =>
      page.evaluate(({ url, val, auth, col, keepalive: keepAliveFlag }) => {
        fetch(url, {
          method: 'PATCH',
          keepalive: Boolean(keepAliveFlag),
          headers: {
            'Content-Type': 'application/json',
            Authorization: auth
          },
          body: JSON.stringify({ [col]: val })
        }).catch(() => {})
      }, payload)

    try {
      await fireFetch()
    } catch {
      await page.waitForTimeout(250)
      await fireFetch().catch(() => {})
    }

    if (crashAfterFire && cdp) {
      try {
        await cdp.send('Page.crash')
      } catch {
        // Fallback to hard-close if crash command is unavailable
      }
    }

    await page.close({ runBeforeUnload: false }).catch(() => {})
    page = await context.newPage({ viewport: { width: 1440, height: 900 } })
    await page.waitForTimeout(220)
  }

  try {
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await showStep('Opened viewer and waiting for grid')
    await page
      .locator('[data-testid="univer-sheet-grid-container"]')
      .first()
      .waitFor({ state: 'attached', timeout: 90000 })

    if (!authHeader) await page.waitForTimeout(2500)
    if (!authHeader) throw new Error('Could not capture Authorization header from browser session.')

    apiContext = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: authHeader } })
    const appRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}`)
    if (!appRes.ok()) throw new Error(`Failed to load app: ${appRes.status()}`)
    const app = await appRes.json()
    const sheet = (app?.sheets || [])[0]
    const col = pickEditableColumn(sheet)
    if (!sheet?.id || !col?.name) throw new Error('Missing sheet or editable column.')

    sheetId = String(sheet.id)
    columnName = String(col.name)

    const createRowRes = await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows`, {
      data: { [columnName]: `unload-seed-${Date.now()}` }
    })
    const createRowJson = await createRowRes.json().catch(() => null)
    rowId = sanitizeRowId(createRowJson)
    if (!createRowRes.ok() || !rowId) throw new Error(`Failed to create probe row: ${createRowRes.status()}`)
    originalValue = getCellValue(createRowJson, columnName)
    report.scenarios.push({
      name: 'setup_create_probe_row',
      pass: true,
      details: { sheetId, rowId, columnName }
    })

    await showStep('Scenario 1: control (awaited save then verify)')
    const controlValue = `control-${Date.now()}`
    const controlRes = await apiContext.patch(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, {
      data: { [columnName]: controlValue }
    })
    const controlObserved = await loadCurrentRowValue()
    report.scenarios.push({
      name: 'control_awaited_save_persists',
      pass: controlRes.ok() && controlObserved === controlValue,
      details: { status: controlRes.status(), expected: controlValue, observed: controlObserved }
    })

    await showStep('Scenario 2: fire-and-close without keepalive')
    let nonKeepaliveSuccess = 0
    for (let i = 0; i < trials; i++) {
      const value = `nk-${Date.now()}-${i + 1}`
      let trialError = null
      await runFireAndCloseTrial({ value, keepalive: false, trialTag: `nk-${i + 1}` }).catch(e => {
        trialError = String(e)
      })
      const observed = await loadCurrentRowValue()
      if (observed === value) nonKeepaliveSuccess += 1
      if (trialError) {
        report.notes.push(`Non-keepalive trial ${i + 1} navigation error: ${trialError}`)
      }
      if (headed) await showStep(`Non-keepalive trial ${i + 1}/${trials}: ${observed === value ? 'persisted' : 'lost'}`)
    }
    report.scenarios.push({
      name: 'fire_and_close_without_keepalive_success_rate',
      pass: true,
      details: {
        stressMode,
        crashAfterFire,
        cpuSlowRate,
        trials,
        persistedCount: nonKeepaliveSuccess,
        lostCount: trials - nonKeepaliveSuccess,
        successRate: Number((nonKeepaliveSuccess / trials).toFixed(3))
      }
    })

    await showStep('Scenario 3: fire-and-close with keepalive=true')
    let keepaliveSuccess = 0
    for (let i = 0; i < trials; i++) {
      const value = `ka-${Date.now()}-${i + 1}`
      let trialError = null
      await runFireAndCloseTrial({ value, keepalive: true, trialTag: `ka-${i + 1}` }).catch(e => {
        trialError = String(e)
      })
      const observed = await loadCurrentRowValue()
      if (observed === value) keepaliveSuccess += 1
      if (trialError) {
        report.notes.push(`Keepalive trial ${i + 1} navigation error: ${trialError}`)
      }
      if (headed) await showStep(`Keepalive trial ${i + 1}/${trials}: ${observed === value ? 'persisted' : 'lost'}`)
    }
    report.scenarios.push({
      name: 'fire_and_close_with_keepalive_success_rate',
      pass: true,
      details: {
        stressMode,
        crashAfterFire,
        cpuSlowRate,
        trials,
        persistedCount: keepaliveSuccess,
        lostCount: trials - keepaliveSuccess,
        successRate: Number((keepaliveSuccess / trials).toFixed(3))
      }
    })

    report.scenarios.push({
      name: 'unload_risk_signal_detected',
      pass: nonKeepaliveSuccess < trials,
      details: {
        nonKeepaliveSuccess,
        trials,
        signal: nonKeepaliveSuccess < trials ? 'possible_loss_under_abrupt_close' : 'not_reproduced_in_this_run'
      }
    })

    report.ok = true
    if (holdMs > 0) {
      await page.goto(viewerUrl + '&finalHold=1', { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
      await showStep('Completed unload risk suite. Holding browser open for inspection.')
      await page.waitForTimeout(holdMs)
    }
  } catch (error) {
    report.ok = false
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (apiContext && rowId && sheetId) {
      if (originalValue !== null) {
        await apiContext
          .patch(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, {
            data: { [columnName]: originalValue }
          })
          .catch(() => {})
      }
      await apiContext.delete(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`).catch(() => {})
    }

    if (responseErrors.length > 0) {
      report.notes.push(`Observed ${responseErrors.length} backend responses >=400 during browser trials.`)
      report.responseErrorsSample = responseErrors.slice(0, 12)
    }

    await apiContext?.dispose().catch(() => {})
    await context.close()
    await browser.close()
  }

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
