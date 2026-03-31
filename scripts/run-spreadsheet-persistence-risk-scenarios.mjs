/**
 * Risk-focused persistence scenarios for spreadsheets.
 *
 * Scenarios:
 * 1) Stale Univer snapshot version -> expect 409 conflict
 * 2) Stale operation batch baseVersion -> expect 409 conflict
 * 3) Operation-log compaction vs changes-since gap check
 *
 * Usage:
 *   PLAYWRIGHT_HEADED=1 \
 *   PLAYWRIGHT_STORAGE_STATE=.playwright-auth/newwork-local.json \
 *   node scripts/run-spreadsheet-persistence-risk-scenarios.mjs \
 *   "http://localhost:3001/platform/every-office/spreadsheets?appId=<APP_ID>&view=viewer"
 */
import { chromium, request as playwrightRequest } from 'playwright'

const viewerUrl =
  process.argv[2] ||
  'http://localhost:3001/platform/every-office/spreadsheets?appId=47af74ef-3688-4318-8cd2-f555247d9852&view=viewer'
const apiBase = process.env.DOC_API_BASE || 'http://localhost:3002/api/v1'
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE
const headed = process.env.PLAYWRIGHT_HEADED === '1'
const holdMs = Number(process.env.PLAYWRIGHT_HOLD_MS || (headed ? 10000 : 0))

const appId = new URL(viewerUrl).searchParams.get('appId')
if (!appId) {
  console.error(JSON.stringify({ ok: false, error: 'missing_app_id_in_url', viewerUrl }, null, 2))
  process.exit(1)
}

const opId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`

function sanitizeRowId(row) {
  return String(row?._id || row?.id || row?._rowUuid || '')
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

  async function showStep(label) {
    if (!headed) return
    await page
      .evaluate(text => {
        const id = '__persist_risk_probe_overlay__'
        let el = document.getElementById(id)
        if (!el) {
          el = document.createElement('div')
          el.id = id
          Object.assign(el.style, {
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: '2147483647',
            background: 'rgba(111,22,22,0.92)',
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
        el.textContent = `[Risk Scenarios] ${text}`
      }, label)
      .catch(() => {})
    await page.waitForTimeout(700)
  }

  let apiContext = null
  let createdRowId = ''
  let createdSheetId = ''
  let createdColumnName = ''

  try {
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await showStep('Opened viewer; collecting auth from browser traffic')

    const gridHost = page.locator('[data-testid="univer-sheet-grid-container"]').first()
    await gridHost.waitFor({ state: 'attached', timeout: 90000 })

    if (!authHeader) {
      await page.waitForTimeout(3000)
    }
    if (!authHeader) throw new Error('Could not capture authorization header from browser requests.')

    apiContext = await playwrightRequest.newContext({
      extraHTTPHeaders: { Authorization: authHeader }
    })

    const appRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}`)
    if (!appRes.ok()) throw new Error(`Failed to load app: ${appRes.status()}`)
    const app = await appRes.json()
    const sheet = (app?.sheets || [])[0]
    if (!sheet?.id) throw new Error('No sheet available for risk scenarios.')
    const column = pickEditableColumn(sheet)
    if (!column?.name) throw new Error('No editable column available for risk scenarios.')

    createdSheetId = String(sheet.id)
    createdColumnName = String(column.name)

    const createRowRes = await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/rows`, {
      data: { [createdColumnName]: `risk-seed-${Date.now()}` }
    })
    const createRowPayload = await createRowRes.json().catch(() => null)
    createdRowId = sanitizeRowId(createRowPayload)
    if (!createRowRes.ok() || !createdRowId) {
      throw new Error(`Failed to create dedicated test row: status=${createRowRes.status()}`)
    }
    report.scenarios.push({
      name: 'setup_create_test_row',
      pass: true,
      details: { sheetId: createdSheetId, rowId: createdRowId, column: createdColumnName }
    })
    await showStep(`Using dedicated row ${createdRowId.slice(0, 8)}...`)

    await showStep('Scenario 1: stale Univer snapshot version conflict')
    const snapshotRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/snapshot`)
    const snapshotPayload = await snapshotRes.json()
    const currentVersion = Number(snapshotPayload?.version ?? 0)
    const staleVersion = Math.max(0, currentVersion - 1)
    const staleSnapRes = await apiContext.post(
      `${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/univer-snapshot`,
      {
        data: {
          version: staleVersion,
          snapshot: {
            scenario: 'stale-version-probe',
            at: new Date().toISOString()
          }
        }
      }
    )
    report.scenarios.push({
      name: 'stale_univer_snapshot_version_returns_409',
      pass: staleSnapRes.status() === 409,
      details: {
        currentVersion,
        sentVersion: staleVersion,
        status: staleSnapRes.status()
      }
    })

    await showStep('Scenario 2: stale batch baseVersion conflict')
    const baseSnapshotRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/snapshot`)
    const baseSnapshotPayload = await baseSnapshotRes.json()
    const baseVersion = Number(baseSnapshotPayload?.version ?? 0)
    const batch1 = await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/operations/batch`, {
      data: {
        baseVersion,
        operations: [
          {
            operationId: opId('risk-b1'),
            type: 'set_cell',
            data: {
              rowId: createdRowId,
              columnName: createdColumnName,
              value: `b1-${Date.now()}`
            }
          }
        ]
      }
    })
    const batch2 = await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/operations/batch`, {
      data: {
        baseVersion,
        operations: [
          {
            operationId: opId('risk-b2'),
            type: 'set_cell',
            data: {
              rowId: createdRowId,
              columnName: createdColumnName,
              value: `b2-${Date.now()}`
            }
          }
        ]
      }
    })
    report.scenarios.push({
      name: 'stale_batch_base_version_returns_409',
      pass: batch1.ok() && batch2.status() === 409,
      details: {
        baseVersion,
        batch1Status: batch1.status(),
        batch2Status: batch2.status()
      }
    })

    await showStep('Scenario 3: compaction vs changes-since gap check (running many ops)')
    const startSnapshotRes = await apiContext.get(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/snapshot`)
    const startSnapshotPayload = await startSnapshotRes.json()
    const startVersion = Number(startSnapshotPayload?.version ?? 0)

    const targetVersion = Math.max(startVersion + 85, 210)
    let workingVersion = startVersion
    let appliedCount = 0
    while (workingVersion < targetVersion) {
      const setValue = `cmp-${workingVersion + 1}-${Date.now()}`
      const batchRes = await apiContext.post(
        `${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/operations/batch`,
        {
          data: {
            baseVersion: workingVersion,
            operations: [
              {
                operationId: opId('cmp'),
                type: 'set_cell',
                data: {
                  rowId: createdRowId,
                  columnName: createdColumnName,
                  value: setValue
                }
              }
            ]
          }
        }
      )
      if (!batchRes.ok()) {
        throw new Error(`Compaction scenario batch failed at version ${workingVersion}: ${batchRes.status()}`)
      }
      const batchPayload = await batchRes.json()
      workingVersion = Number(batchPayload?.newVersion ?? workingVersion + 1)
      appliedCount += 1

      if (workingVersion > 200 && workingVersion % 5 === 0) {
        await apiContext.post(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/univer-snapshot`, {
          data: {
            version: workingVersion,
            snapshot: { scenario: 'compaction-probe', v: workingVersion }
          }
        })
      }
      if (headed && appliedCount % 15 === 0) {
        await showStep(`Compaction probe progress: ${appliedCount} ops applied`)
      }
    }

    const sinceVersion = startVersion + 1
    const changesRes = await apiContext.get(
      `${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/changes?sinceVersion=${sinceVersion}`
    )
    if (!changesRes.ok()) throw new Error(`Failed to load changes: ${changesRes.status()}`)
    const changesPayload = await changesRes.json()
    const currentAfter = Number(changesPayload?.currentVersion ?? workingVersion)
    const expectedChanges = Math.max(0, currentAfter - sinceVersion)
    const actualChanges = Array.isArray(changesPayload?.changes) ? changesPayload.changes.length : 0
    const requiresSnapshot = Boolean(changesPayload?.requiresSnapshot)

    const gapDetected = !requiresSnapshot && actualChanges < expectedChanges
    report.scenarios.push({
      name: 'changes_since_compaction_gap_detected',
      pass: gapDetected,
      details: {
        sinceVersion,
        currentVersion: currentAfter,
        expectedChanges,
        actualChanges,
        requiresSnapshot
      }
    })

    await showStep(gapDetected ? 'Gap detected: possible persistence risk reproduced' : 'No gap detected in this run')

    report.ok = true
    if (holdMs > 0) {
      await showStep('Finished. Holding browser so you can inspect results.')
      await page.waitForTimeout(holdMs)
    }
  } catch (error) {
    report.ok = false
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (apiContext && createdRowId && createdSheetId) {
      await apiContext
        .delete(`${apiBase}/spreadsheets/${appId}/sheets/${createdSheetId}/rows/${createdRowId}`)
        .then(res => {
          report.scenarios.push({
            name: 'cleanup_delete_test_row',
            pass: res.ok(),
            details: { status: res.status(), rowId: createdRowId }
          })
        })
        .catch(e => {
          report.scenarios.push({
            name: 'cleanup_delete_test_row',
            pass: false,
            details: { error: String(e), rowId: createdRowId }
          })
        })
    }

    if (responseErrors.length > 0) {
      report.notes.push(`Observed ${responseErrors.length} backend responses >=400 in browser session.`)
      report.responseErrorsSample = responseErrors.slice(0, 10)
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
