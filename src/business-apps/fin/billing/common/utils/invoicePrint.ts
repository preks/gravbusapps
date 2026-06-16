/**
 * Render an invoice PDF model to a printable HTML document and open the browser
 * print dialog (which can "Save as PDF"). This keeps document generation
 * dependency-light for the MVP; a server-side template/pdfkit renderer can later
 * consume the same InvoicePdfModel for pixel-perfect output.
 */
import type { InvoicePdfModel } from './invoicePdf'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeLocale(locale: string): string {
  return /^[a-zA-Z0-9-]+$/.test(locale) ? locale : 'en'
}

const PRINT_DOCUMENT_CSP = "default-src 'none'; style-src 'unsafe-inline';"
const PRINT_DOCUMENT_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 40px; }
  h1 { font-size: 20px; }
  .meta { display:flex; justify-content:space-between; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
  th { text-align: left; color: #555; }
  .totals { margin-top: 16px; width: 50%; margin-left: auto; }
  .footer { margin-top: 40px; font-size: 11px; color: #666; }
`

export function renderInvoiceHtml(model: InvoicePdfModel): string {
  const lineRows = model.lines
    .map(
      line => `<tr>
        <td>${escapeHtml(line.description)}</td>
        <td style="text-align:right">${escapeHtml(String(line.quantity))}</td>
        <td style="text-align:right">${escapeHtml(line.unitPrice)}</td>
        <td style="text-align:right">${escapeHtml(line.discount)}</td>
        <td style="text-align:right">${escapeHtml(line.taxRate)}</td>
        <td style="text-align:right">${escapeHtml(line.net)}</td>
        <td style="text-align:right">${escapeHtml(line.gross)}</td>
      </tr>`
    )
    .join('')

  const taxRows = model.taxRows
    .map(
      row =>
        `<tr><td>${escapeHtml(row.label)}</td><td style="text-align:right">${escapeHtml(row.net)}</td><td style="text-align:right">${escapeHtml(row.tax)}</td></tr>`
    )
    .join('')

  return `<!doctype html>
<html lang="${sanitizeLocale(model.locale)}">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${PRINT_DOCUMENT_CSP}" />
<title>Invoice ${escapeHtml(model.invoiceNumber)}</title>
<style>${PRINT_DOCUMENT_STYLES}</style>
</head>
<body>
  <h1>Invoice ${escapeHtml(model.invoiceNumber)}</h1>
  <div class="meta">
    <div>
      <strong>${escapeHtml(model.seller.name)}</strong><br/>
      ${model.seller.addressLines.map(escapeHtml).join('<br/>')}<br/>
      ${model.seller.vatId ? 'VAT: ' + escapeHtml(model.seller.vatId) : ''}
    </div>
    <div>
      <strong>${escapeHtml(model.buyer.name)}</strong><br/>
      ${model.buyer.addressLines.map(escapeHtml).join('<br/>')}<br/>
      ${model.buyer.vatId ? 'VAT: ' + escapeHtml(model.buyer.vatId) : ''}
    </div>
  </div>
  <div>Issue date: ${escapeHtml(model.issueDate)} &nbsp; Due date: ${escapeHtml(model.dueDate)}</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Disc.</th><th style="text-align:right">Tax</th><th style="text-align:right">Net</th><th style="text-align:right">Gross</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="totals">
    <tbody>
      ${taxRows}
      <tr><td><strong>Net total</strong></td><td colspan="2" style="text-align:right">${escapeHtml(model.netTotal)}</td></tr>
      <tr><td><strong>Tax total</strong></td><td colspan="2" style="text-align:right">${escapeHtml(model.taxTotal)}</td></tr>
      <tr><td><strong>Gross total</strong></td><td colspan="2" style="text-align:right"><strong>${escapeHtml(model.grossTotal)}</strong></td></tr>
    </tbody>
  </table>
  ${model.footer ? `<div class="footer">${escapeHtml(model.footer)}${model.seller.bankIban ? '<br/>IBAN: ' + escapeHtml(model.seller.bankIban) : ''}</div>` : ''}
</body>
</html>`
}

function setText(element: HTMLElement, value: string): HTMLElement {
  element.textContent = value
  return element
}

function appendText(parent: HTMLElement, value: string): void {
  parent.appendChild(parent.ownerDocument.createTextNode(value))
}

function appendBreak(parent: HTMLElement): void {
  parent.appendChild(parent.ownerDocument.createElement('br'))
}

function appendRightAlignedCell(row: HTMLTableRowElement, value: string): void {
  const cell = row.ownerDocument.createElement('td')
  cell.style.textAlign = 'right'
  setText(cell, value)
  row.appendChild(cell)
}

function appendHeaderCell(row: HTMLTableRowElement, value: string, alignRight = false): void {
  const cell = row.ownerDocument.createElement('th')
  if (alignRight) {
    cell.style.textAlign = 'right'
  }
  setText(cell, value)
  row.appendChild(cell)
}

function appendTotalsRow(tbody: HTMLTableSectionElement, label: string, value: string, bold = false): void {
  const row = tbody.ownerDocument.createElement('tr')
  const labelCell = tbody.ownerDocument.createElement('td')
  const valueCell = tbody.ownerDocument.createElement('td')
  valueCell.colSpan = 2
  valueCell.style.textAlign = 'right'

  if (bold) {
    const labelStrong = tbody.ownerDocument.createElement('strong')
    const valueStrong = tbody.ownerDocument.createElement('strong')
    setText(labelStrong, label)
    setText(valueStrong, value)
    labelCell.appendChild(labelStrong)
    valueCell.appendChild(valueStrong)
  } else {
    setText(labelCell, label)
    setText(valueCell, value)
  }

  row.append(labelCell, valueCell)
  tbody.appendChild(row)
}

function populateInvoiceDocument(doc: Document, model: InvoicePdfModel): void {
  doc.documentElement.lang = sanitizeLocale(model.locale)
  doc.title = `Invoice ${model.invoiceNumber}`

  const charset = doc.createElement('meta')
  charset.setAttribute('charset', 'utf-8')
  const csp = doc.createElement('meta')
  csp.setAttribute('http-equiv', 'Content-Security-Policy')
  csp.setAttribute('content', PRINT_DOCUMENT_CSP)
  const style = doc.createElement('style')
  style.textContent = PRINT_DOCUMENT_STYLES
  doc.head.replaceChildren(charset, csp, style)

  const title = setText(doc.createElement('h1'), `Invoice ${model.invoiceNumber}`)
  const meta = doc.createElement('div')
  meta.className = 'meta'

  const seller = doc.createElement('div')
  seller.appendChild(setText(doc.createElement('strong'), model.seller.name))
  appendBreak(seller)
  model.seller.addressLines.forEach(line => {
    appendText(seller, line)
    appendBreak(seller)
  })
  if (model.seller.vatId) {
    appendText(seller, `VAT: ${model.seller.vatId}`)
  }

  const buyer = doc.createElement('div')
  buyer.appendChild(setText(doc.createElement('strong'), model.buyer.name))
  appendBreak(buyer)
  model.buyer.addressLines.forEach(line => {
    appendText(buyer, line)
    appendBreak(buyer)
  })
  if (model.buyer.vatId) {
    appendText(buyer, `VAT: ${model.buyer.vatId}`)
  }
  meta.append(seller, buyer)

  const dates = doc.createElement('div')
  appendText(dates, `Issue date: ${model.issueDate} \u00a0 Due date: ${model.dueDate}`)

  const lineTable = doc.createElement('table')
  const lineHead = doc.createElement('thead')
  const lineHeadRow = doc.createElement('tr')
  appendHeaderCell(lineHeadRow, 'Description')
  const rightAlignedLineHeaders = ['Qty', 'Unit', 'Disc.', 'Tax', 'Net', 'Gross']
  rightAlignedLineHeaders.forEach(label => appendHeaderCell(lineHeadRow, label, true))
  lineHead.appendChild(lineHeadRow)
  const lineBody = doc.createElement('tbody')
  model.lines.forEach(line => {
    const row = doc.createElement('tr')
    row.appendChild(setText(doc.createElement('td'), line.description))
    appendRightAlignedCell(row, String(line.quantity))
    appendRightAlignedCell(row, line.unitPrice)
    appendRightAlignedCell(row, line.discount)
    appendRightAlignedCell(row, line.taxRate)
    appendRightAlignedCell(row, line.net)
    appendRightAlignedCell(row, line.gross)
    lineBody.appendChild(row)
  })
  lineTable.append(lineHead, lineBody)

  const totalsTable = doc.createElement('table')
  totalsTable.className = 'totals'
  const totalsBody = doc.createElement('tbody')
  model.taxRows.forEach(taxRow => {
    const row = doc.createElement('tr')
    row.appendChild(setText(doc.createElement('td'), taxRow.label))
    appendRightAlignedCell(row, taxRow.net)
    appendRightAlignedCell(row, taxRow.tax)
    totalsBody.appendChild(row)
  })
  appendTotalsRow(totalsBody, 'Net total', model.netTotal)
  appendTotalsRow(totalsBody, 'Tax total', model.taxTotal)
  appendTotalsRow(totalsBody, 'Gross total', model.grossTotal, true)
  totalsTable.appendChild(totalsBody)

  const children: Node[] = [title, meta, dates, lineTable, totalsTable]
  if (model.footer) {
    const footer = doc.createElement('div')
    footer.className = 'footer'
    appendText(footer, model.footer)
    if (model.seller.bankIban) {
      appendBreak(footer)
      appendText(footer, `IBAN: ${model.seller.bankIban}`)
    }
    children.push(footer)
  }

  doc.body.replaceChildren(...children)
}

export function printInvoiceDocument(model: InvoicePdfModel): void {
  if (typeof window === 'undefined') {
    return
  }
  const printWindow = window.open('about:blank', '_blank')
  if (!printWindow) {
    return
  }
  populateInvoiceDocument(printWindow.document, model)
  printWindow.focus()
  printWindow.print()
}
