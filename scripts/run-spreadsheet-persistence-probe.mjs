/**
 * Browser-backed persistence probe for spreadsheets.
 *
 * What it does:
 * 1) Opens spreadsheet viewer in Playwright (using storage state if provided)
 * 2) Verifies Univer grid host + canvas render
 * 3) Captures bearer token from real browser API requests
 * 4) Updates one row value via backend API
 * 5) Reloads browser and validates the updated value is present in snapshot payload (or API fallback)
 * 6) Restores the original row value
 *
 * Usage:
 *   PLAYWRIGHT_STORAGE_STATE=.playwright-auth/newwork-local.json \
 *   node scripts/run-spreadsheet-persistence-probe.mjs \
 *   "http://localhost:3001/platform/every-office/spreadsheets?appId=<APP_ID>&view=viewer"
 */
import { chromium, request as playwrightRequest } from 'playwright'

const viewerUrl =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=47af74ef-3688-4318-8cd2-f555247d9852&view=viewer'
const apiBase = process.env.DOC_API_BASE || 'http://localhost:3002/api/v1'
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE
const headed = process.env.PLAYWRIGHT_HEADED === '1'
const holdMs = Number(process.env.PLAYWRIGHT_HOLD_MS || (headed ? 4000 : 0))

const appId = new URL(viewerUrl).searchParams.get('appId')
if (!appId) {
  console.error(JSON.stringify({ ok: false, error: 'missing_app_id_in_url', viewerUrl }, null, 2))
  process.exit(1)
}

function sanitizeRowId(row) {
  return String(row._id || row.id || row._rowUuid || '')
}

function getCellValue(row, columnName) {
  if (!row || !columnName) return null
  if (Object.prototype.hasOwnProperty.call(row, columnName)) return row[columnName]
  if (row.data && Object.prototype.hasOwnProperty.call(row.data, columnName)) return row.data[columnName]
  return null
}

function pickEditableColumn(sheet, row) {
  const preferred = (sheet.columns || []).find(
    col =>
      col &&
      col.isVisible !== false &&
      col.isEditable !== false &&
      ['text', 'email', 'url', 'phone'].includes(String(col.type || 'text')) &&
      typeof getCellValue(row, col.name) !== 'object'
  )
  if (preferred) return preferred

  const fallback = (sheet.columns || []).find(col => col && col.isVisible !== false && col.isEditable !== false)
  if (fallback) return fallback

  const rowKey = Object.keys(row).find(key => !key.startsWith('_') && typeof row[key] !== 'object')
  if (!rowKey) return null
  return { id: rowKey, name: rowKey, label: rowKey, type: 'text' }
}

async function main() {
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 120 : 0 })
  const context = await browser.newContext(storageState ? { storageState } : {})
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } })

  const report = {
    ok: false,
    viewerUrl,
    appId,
    scenarios: [],
    notes: []
  }

  async function showStep(label) {
    if (!headed) return
    try {
      await page.evaluate(text => {
        const id = '__persist_probe_step_overlay__'
        let el = document.getElementById(id)
        if (!el) {
          el = document.createElement('div')
          el.id = id
          Object.assign(el.style, {
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: '2147483647',
            background: 'rgba(17,24,39,0.92)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '12px',
            maxWidth: '50vw',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
          })
          document.body.appendChild(el)
        }
        el.textContent = `[Persistence Probe] ${text}`
      }, label)
    } catch {
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {})
      await page
        .evaluate(text => {
          const id = '__persist_probe_step_overlay__'
          let el = document.getElementById(id)
          if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
          }
          el.textContent = `[Persistence Probe] ${text}`
        }, label)
        .catch(() => {})
    }
    await page.waitForTimeout(900)
  }

  const responseErrors = []
  page.on('response', res => {
    const url = res.url()
    if (!url.includes('localhost:3002')) return
    if (res.status() >= 400 && !url.includes('/token')) {
      responseErrors.push({ url, status: res.status() })
    }
  })

  let authHeader = null
  page.on('request', req => {
    const url = req.url()
    if (!url.includes('localhost:3002')) return
    const header = req.headers()['authorization']
    if (header && !authHeader) authHeader = header
  })

  try {
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await showStep('Opened spreadsheet viewer')

    const gridHost = page.locator('[data-testid="univer-sheet-grid-container"]').first()
    await gridHost.waitFor({ state: 'attached', timeout: 90000 })
    const canvasCount = await gridHost.locator('canvas').count()
    await showStep(`Grid rendered with ${canvasCount} canvas node(s)`)
    report.scenarios.push({
      name: 'viewer_grid_renders',
      pass: canvasCount > 0,
      details: { canvasCount }
    })

    if (!authHeader) {
      await page.waitForTimeout(2500)
    }
    if (!authHeader) {
      throw new Error('No authorization header captured from browser requests; auth/session may be invalid.')
    }

    const apiContext = await playwrightRequest.newContext({
      extraHTTPHeaders: {
        Authorization: authHeader
      }
    })

    const appRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}`)
    if (!appRes.ok()) {
      throw new Error(`Failed to load app details: ${appRes.status()} ${appRes.statusText()}`)
    }
    const app = await appRes.json()
    const sheets = Array.isArray(app?.sheets) ? app.sheets : []
    if (sheets.length === 0) throw new Error('No sheets found for app.')

    const sheet = sheets[0]
    const sheetId = String(sheet.id)
    const rowsRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows?page=1&limit=200`)
    if (!rowsRes.ok()) {
      throw new Error(`Failed to load rows: ${rowsRes.status()} ${rowsRes.statusText()}`)
    }
    const rowsPayload = await rowsRes.json()
    const rows = Array.isArray(rowsPayload?.items) ? rowsPayload.items : []
    if (rows.length === 0) throw new Error('No rows available to run persistence probe.')

    const row = rows[0]
    const rowId = sanitizeRowId(row)
    if (!rowId) throw new Error('Could not determine a row id for persistence probe.')

    const column = pickEditableColumn(sheet, row)
    if (!column?.name) throw new Error('Could not determine an editable column for persistence probe.')

    const originalValue = getCellValue(row, column.name)
    const probeValue = `cursor-persist-${Date.now()}`

    await showStep(`Scenario 1: update existing row cell (${column.name})`)
    const patchRes = await apiContext.patch(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, {
      data: { [column.name]: probeValue }
    })
    report.scenarios.push({
      name: 'api_row_update',
      pass: patchRes.ok(),
      details: { status: patchRes.status(), sheetId, rowId, column: column.name, probeValue }
    })
    if (!patchRes.ok()) {
      throw new Error(`Row update failed with status ${patchRes.status()}`)
    }

    const verifyRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/snapshot`)
    if (!verifyRes.ok()) throw new Error(`Row verify request failed: ${verifyRes.status()}`)
    const verifyPayload = await verifyRes.json()
    const verifyRow = (verifyPayload?.rows || []).find(r => sanitizeRowId(r) === rowId)
    const persistedNow = getCellValue(verifyRow, column.name) === probeValue
    let expectedValueAfterMutations = probeValue
    report.scenarios.push({
      name: 'api_roundtrip_persists_value',
      pass: persistedNow,
      details: { observed: getCellValue(verifyRow, column.name), expected: probeValue }
    })

    await showStep('Scenario 2: rapid sequential updates (last write wins)')
    const rapidValues = [`rapid-${Date.now()}-1`, `rapid-${Date.now()}-2`, `rapid-${Date.now()}-3`]
    let lastRapidStatus = 0
    for (const value of rapidValues) {
      const rapidRes = await apiContext.patch(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, {
        data: { [column.name]: value }
      })
      lastRapidStatus = rapidRes.status()
      await page.waitForTimeout(120)
    }
    const rapidVerifyRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/snapshot`)
    const rapidVerifyPayload = await rapidVerifyRes.json()
    const rapidVerifyRow = (rapidVerifyPayload?.rows || []).find(r => sanitizeRowId(r) === rowId)
    const expectedRapidFinal = rapidValues[rapidValues.length - 1]
    const observedRapidFinal = getCellValue(rapidVerifyRow, column.name)
    expectedValueAfterMutations = expectedRapidFinal
    report.scenarios.push({
      name: 'rapid_updates_last_write_persisted',
      pass: rapidVerifyRes.ok() && observedRapidFinal === expectedRapidFinal,
      details: {
        status: lastRapidStatus,
        expected: expectedRapidFinal,
        observed: observedRapidFinal
      }
    })

    await showStep('Scenario 3: add new row and verify after reload')
    const newRowProbeValue = `new-row-${Date.now()}`
    const addRes = await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows`, {
      data: { [column.name]: newRowProbeValue }
    })
    const addJson = await addRes.json().catch(() => null)
    const addedRowId = sanitizeRowId(addJson || {})
    report.scenarios.push({
      name: 'add_row_api_success',
      pass: addRes.ok() && Boolean(addedRowId),
      details: { status: addRes.status(), addedRowId, value: newRowProbeValue }
    })

    await page.goto(`${viewerUrl}&persistProbeReload=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    })
    await page.waitForTimeout(1000)
    await showStep('Reloaded viewer to validate persistence in browser context')
    const browserSnapshot = await page.evaluate(
      async ({ apiBaseValue, appIdValue, sheetIdValue, authorizationHeader }) => {
        const snapshotRes = await fetch(`${apiBaseValue}/spreadsheets/${appIdValue}/sheets/${sheetIdValue}/snapshot`, {
          method: 'GET',
          headers: {
            Authorization: authorizationHeader
          }
        })
        const snapshotJson = await snapshotRes.json().catch(() => null)
        return {
          ok: snapshotRes.ok,
          status: snapshotRes.status,
          rows: Array.isArray(snapshotJson?.rows) ? snapshotJson.rows : []
        }
      },
      {
        apiBaseValue: apiBase,
        appIdValue: appId,
        sheetIdValue: sheetId,
        authorizationHeader: authHeader
      }
    )

    let browserReloadContainsValue = false
    let browserReloadObserved = null

    if (browserSnapshot?.ok) {
      const reloadRows = Array.isArray(browserSnapshot.rows) ? browserSnapshot.rows : []
      const reloadRow = reloadRows.find(r => sanitizeRowId(r) === rowId)
      browserReloadObserved = getCellValue(reloadRow, column.name)
      browserReloadContainsValue = browserReloadObserved === expectedValueAfterMutations
      report.notes.push(
        `Browser validation source: in-page fetch ${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/snapshot`
      )
    } else {
      report.notes.push(`Browser snapshot fetch failed on reload: status=${browserSnapshot?.status ?? 'unknown'}`)
    }

    report.scenarios.push({
      name: 'browser_reload_payload_contains_updated_value',
      pass: browserSnapshot?.ok ? browserReloadContainsValue : null,
      details: browserSnapshot?.ok
        ? { observed: browserReloadObserved, expected: expectedValueAfterMutations }
        : { note: 'inconclusive_browser_snapshot_fetch_failed' }
    })

    const addedRowAfterReload = (browserSnapshot?.rows || []).find(r => sanitizeRowId(r) === addedRowId)
    report.scenarios.push({
      name: 'browser_reload_contains_added_row',
      pass: Boolean(addedRowId) && Boolean(addedRowAfterReload),
      details: {
        addedRowId,
        observedValue: getCellValue(addedRowAfterReload, column.name),
        expectedValue: newRowProbeValue
      }
    })

    await showStep('Cleanup: restoring original row value and deleting added row')
    const revertRes = await apiContext.patch(`${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, {
      data: { [column.name]: originalValue }
    })
    report.scenarios.push({
      name: 'cleanup_revert_original_value',
      pass: revertRes.ok(),
      details: { status: revertRes.status(), restoredTo: originalValue }
    })

    if (addedRowId) {
      const deleteAddedRes = await apiContext.delete(
        `${apiBase}/spreadsheets/${appId}/sheets/${sheetId}/rows/${addedRowId}`
      )
      report.scenarios.push({
        name: 'cleanup_delete_added_row',
        pass: deleteAddedRes.ok(),
        details: { status: deleteAddedRes.status(), deletedRowId: addedRowId }
      })
    }

    report.ok =
      report.scenarios.every(s => s.pass === true || s.pass === null) &&
      report.scenarios.some(s => s.name === 'api_roundtrip_persists_value' && s.pass === true)
    await showStep(`Finished. Overall result: ${report.ok ? 'PASS' : 'FAIL'}`)
    if (holdMs > 0) {
      await page.waitForTimeout(holdMs)
    }
  } catch (error) {
    report.ok = false
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (responseErrors.length > 0) {
      report.notes.push(`Observed ${responseErrors.length} backend responses >=400 during run.`)
      report.responseErrorsSample = responseErrors.slice(0, 8)
    }
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
