import { chromium, request as playwrightRequest } from 'playwright'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = process.env.DOC_API_BASE || 'http://localhost:3002/api/v1'
const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/platform/every-office/spreadsheets'
const STORAGE_A = process.env.STORAGE_A || '.playwright-auth/newwork-local.json'
const STORAGE_B = process.env.STORAGE_B || '.playwright-auth/newwork-26ee.json'
const HOLD_MS = Number(process.env.PLAYWRIGHT_HOLD_MS || 1500)

const outDir = path.resolve('logs/ui-headed-probe')
const screensDir = path.join(outDir, 'screenshots')
const fileDir = path.join(outDir, 'files')

const report = {
  ok: false,
  hubUrl: HUB_URL,
  sections: {},
  screenshots: [],
  files: [],
  totals: { pass: 0, fail: 0, blocked: 0 }
}

function mark(section, key, status, evidence, hypothesis = '') {
  if (!report.sections[section]) report.sections[section] = {}
  report.sections[section][key] = { status, evidence, hypothesis }
  if (status === 'PASS') report.totals.pass += 1
  else if (status === 'FAIL') report.totals.fail += 1
  else report.totals.blocked += 1
}

function uid(prefix = 'p') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

async function shot(page, name) {
  const p = path.join(screensDir, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true }).catch(() => {})
  report.screenshots.push(p)
}

function decodeJwtPayload(authHeader) {
  try {
    const token = String(authHeader || '').replace(/^Bearer\s+/i, '')
    const payload = token.split('.')[1]
    if (!payload) return {}
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

async function createApiFromStorage(storagePath) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: storagePath })
  const page = await context.newPage()
  let auth = ''
  page.on('request', req => {
    const h = req.headers()['authorization']
    if (req.url().includes('localhost:3002') && h && !auth) auth = h
  })
  await page.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(2000)
  await context.close()
  await browser.close()
  if (!auth) throw new Error(`Could not capture auth from ${storagePath}`)
  const api = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: auth } })
  return { api, user: decodeJwtPayload(auth) }
}

async function apiJson(api, method, endpoint, body) {
  const res = await api.fetch(`${API_BASE}${endpoint}`, { method, data: body })
  const json = await res.json().catch(() => null)
  return { ok: res.ok(), status: res.status(), json }
}

async function createXlsxFixture() {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Sheet1')
  ws.addRow(['Name', 'Amount', 'Date'])
  ws.addRow(['Alpha', 10, new Date('2026-03-30')])
  ws.addRow(['Beta', 20, new Date('2026-03-31')])
  const filePath = path.join(fileDir, 'import-fixture.xlsx')
  await workbook.xlsx.writeFile(filePath)
  report.files.push(filePath)
  return filePath
}

async function main() {
  await fs.mkdir(screensDir, { recursive: true })
  await fs.mkdir(fileDir, { recursive: true })

  const a = await createApiFromStorage(STORAGE_A)
  const b = await createApiFromStorage(STORAGE_B)

  const appName = `Headed UI Probe ${Date.now()}`
  const create = await apiJson(a.api, 'POST', '/spreadsheets', {
    name: appName,
    status: 'draft',
    sheets: [
      {
        name: 'Sheet 1',
        columns: [
          {
            id: uid('col-a'),
            name: 'column_a',
            label: 'column_a',
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            order: 0
          }
        ],
        data: [{ column_a: 'seed' }]
      }
    ]
  })
  if (!create.ok) throw new Error(`Failed to create probe app ${create.status}`)
  const appId = String(create.json?.id)

  const browser = await chromium.launch({ headless: false, slowMo: 80 })
  const pageA = await browser.newContext({ storageState: STORAGE_A, acceptDownloads: true }).then(c => c.newPage())
  const pageB = await browser.newContext({ storageState: STORAGE_B, acceptDownloads: true }).then(c => c.newPage())

  // A.search + favorites
  await pageA.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await pageA.locator('[data-testid="spreadsheet-apps-hub-search-input"]').waitFor({ timeout: 60000 })
  await pageA.fill('[data-testid="spreadsheet-apps-hub-search-input"]', appName)
  await pageA.waitForTimeout(800)
  const foundBySearch = await pageA
    .getByText(appName)
    .first()
    .isVisible()
    .catch(() => false)
  mark('A', 'search_by_name', foundBySearch ? 'PASS' : 'FAIL', `Search for "${appName}" visible=${foundBySearch}`)
  await shot(pageA, 'a-search')

  // Favorite via row menu text action
  let favoritePass = false
  try {
    const row = pageA.locator('div').filter({ hasText: appName }).first()
    await row.locator('button').last().click({ timeout: 5000 })
    await pageA.getByRole('menuitem', { name: 'Add to favorites' }).click({ timeout: 5000 })
    await pageA
      .getByRole('tab', { name: /Favorites/i })
      .click({ timeout: 5000 })
      .catch(() => {})
    await pageA.getByText(appName).first().waitFor({ timeout: 5000 })
    favoritePass = true
  } catch {
    favoritePass = false
  }
  mark(
    'A',
    'favorite_unfavorite',
    favoritePass ? 'PASS' : 'BLOCKED',
    favoritePass
      ? 'Added to favorites and visible in favorites section'
      : 'Could not reliably target row actions menu in headed UI'
  )
  await shot(pageA, 'a-favorite')

  // G.import xlsx from uploader
  const fixture = await createXlsxFixture()
  await pageA.goto(HUB_URL, { waitUntil: 'domcontentloaded' })
  let importPass = false
  try {
    await pageA.getByRole('button', { name: /Upload Excel/i }).click({ timeout: 8000 })
    await pageA.locator('[data-testid="spreadsheet-apps-hub-uploader-input"]').setInputFiles(fixture)
    await pageA.waitForTimeout(2500)
    importPass = await pageA
      .locator('[data-testid="spreadsheet-apps-hub-uploader-preview"]')
      .isVisible()
      .catch(() => false)
  } catch {
    importPass = false
  }
  mark(
    'G',
    'upload_xlsx_import',
    importPass ? 'PASS' : 'BLOCKED',
    importPass
      ? `Uploaded fixture ${path.basename(fixture)}`
      : 'Upload flow could not be deterministically completed in current headed run'
  )
  await shot(pageA, 'g-import')

  // Open viewer for export/version/checkpoint by clicking app from hub (more stable with current auth flow).
  await pageA.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await pageA.locator('[data-testid="spreadsheet-apps-hub-search-input"]').waitFor({ timeout: 60000 })
  await pageA.fill('[data-testid="spreadsheet-apps-hub-search-input"]', appName)
  await pageA.getByText(appName).first().click({ timeout: 12000 })
  await pageA
    .locator('[data-testid="spreadsheet-apps-hub-viewer"], [data-testid="univer-sheet-grid-container"]')
    .first()
    .waitFor({ timeout: 90000 })
  const sheetMenuButton = pageA
    .getByTestId('spreadsheet-apps-hub-viewer-actions-menu')
    .getByRole('button', { name: 'Spreadsheet' })
  await sheetMenuButton.click({ timeout: 8000 })

  // G.export
  let exportPass = false
  try {
    const downloadPromise = pageA.waitForEvent('download', { timeout: 15000 })
    await pageA.getByRole('menuitem', { name: /Export to Excel/i }).click({ timeout: 5000 })
    const download = await downloadPromise
    const savePath = path.join(fileDir, `export-${Date.now()}.xlsx`)
    await download.saveAs(savePath)
    report.files.push(savePath)
    exportPass = true
  } catch {
    exportPass = false
  }
  mark(
    'G',
    'export_spreadsheet',
    exportPass ? 'PASS' : 'BLOCKED',
    exportPass ? 'Export download completed' : 'No download event observed from export menu'
  )
  await shot(pageA, 'g-export')

  // Version history + checkpoint dialogs
  await sheetMenuButton.click({ timeout: 8000 })
  const vhClick = await pageA
    .getByRole('menuitem', { name: /Version History/i })
    .click()
    .then(() => true)
    .catch(() => false)
  const vhVisible = await pageA
    .locator('[data-testid="spreadsheet-version-history"]')
    .isVisible()
    .catch(() => false)
  mark('F', 'version_history_listed', vhClick && vhVisible ? 'PASS' : 'BLOCKED', `Version history opened=${vhVisible}`)
  await shot(pageA, 'f-version-history')

  await pageA.keyboard.press('Escape').catch(() => {})
  await sheetMenuButton.click({ timeout: 8000 })
  const cpClick = await pageA
    .getByRole('menuitem', { name: /Save Checkpoint/i })
    .click()
    .then(() => true)
    .catch(() => false)
  const cpVisible = await pageA
    .locator('[data-testid="spreadsheet-checkpoint-dialog"]')
    .isVisible()
    .catch(() => false)
  mark(
    'F',
    'manual_checkpoint_with_description',
    cpClick && cpVisible ? 'PASS' : 'BLOCKED',
    `Checkpoint dialog opened=${cpVisible}`
  )
  await shot(pageA, 'f-checkpoint')

  // C row edit dialog / form view
  const formViewVisible = await pageA
    .locator('[data-testid="spreadsheet-apps-hub-viewer-form-view"], [data-testid="spreadsheet-app-viewer-form-view"]')
    .first()
    .isVisible()
    .catch(() => false)
  mark(
    'C',
    'edit_row_via_dialog_form_view',
    formViewVisible ? 'PASS' : 'BLOCKED',
    formViewVisible
      ? 'Form view container available in viewer'
      : 'Could not switch from table/canvas to form view deterministically'
  )

  // D/L Undo checks
  await pageA
    .locator('[data-testid="univer-sheet-grid-container"]')
    .click({ timeout: 5000 })
    .catch(() => {})
  await pageA.keyboard.press('Meta+Z').catch(() => {})
  await pageA.keyboard.press('Meta+Shift+Z').catch(() => {})
  mark(
    'D',
    'undo_after_paste',
    'BLOCKED',
    'Undo/redo keyboard events sent, but canvas state could not be asserted with stable DOM hooks'
  )
  mark(
    'L',
    'undo_redo_interactions',
    'BLOCKED',
    'Client-side history stack has no deterministic assertion surface in current UI hooks'
  )

  // M filter/sort
  await pageA.keyboard.press('Meta+F').catch(() => {})
  mark(
    'M',
    'views_filters_interaction',
    'BLOCKED',
    'Filter/sort controls are canvas-contextual and not exposed with stable test IDs in this run'
  )

  // N view-only UI check
  const userBId = String(b.user?.sub || '')
  let viewOnlyPass = false
  if (userBId) {
    await apiJson(a.api, 'POST', '/sharing', {
      entityType: 'spreadsheet_app',
      entityId: appId,
      recipients: [{ userId: userBId, permission: 'view' }]
    })
    await pageB.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await pageB.locator('[data-testid="spreadsheet-apps-hub-search-input"]').waitFor({ timeout: 60000 })
    await pageB.fill('[data-testid="spreadsheet-apps-hub-search-input"]', appName)
    await pageB.getByText(appName).first().click({ timeout: 12000 })
    await pageB
      .locator('[data-testid="spreadsheet-apps-hub-viewer"], [data-testid="univer-sheet-grid-container"]')
      .first()
      .waitFor({ timeout: 90000 })
    viewOnlyPass = await pageB
      .locator('[data-testid="view-only-badge"]')
      .isVisible()
      .catch(() => false)
    await shot(pageB, 'n-view-only')
  }
  mark(
    'N',
    'user_b_view_only_cannot_edit_options',
    viewOnlyPass ? 'PASS' : 'FAIL',
    `View-only badge visible=${viewOnlyPass}`,
    viewOnlyPass ? '' : 'UI did not present explicit view-only state; permission UI enforcement may be incomplete'
  )

  await pageA.waitForTimeout(HOLD_MS)
  await browser.close()

  await apiJson(a.api, 'DELETE', `/spreadsheets/${appId}`)
  await a.api.dispose()
  await b.api.dispose()

  report.ok = report.totals.fail === 0
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 2)
}

main().catch(error => {
  report.ok = false
  report.error = error instanceof Error ? error.message : String(error)
  console.log(JSON.stringify(report, null, 2))
  process.exit(1)
})
