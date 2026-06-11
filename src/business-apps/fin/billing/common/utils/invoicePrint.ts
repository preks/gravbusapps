/**
 * Render an invoice PDF model to a printable HTML document and open the browser
 * print dialog (which can "Save as PDF"). This keeps document generation
 * dependency-light for the MVP; a server-side template/pdfkit renderer can later
 * consume the same InvoicePdfModel for pixel-perfect output.
 */
import type { InvoicePdfModel } from './invoicePdf'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderInvoiceHtml(model: InvoicePdfModel): string {
  const lineRows = model.lines
    .map(
      line => `<tr>
        <td>${escapeHtml(line.description)}</td>
        <td style="text-align:right">${line.quantity}</td>
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
<html lang="${model.locale}">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(model.invoiceNumber)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 40px; }
  h1 { font-size: 20px; }
  .meta { display:flex; justify-content:space-between; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
  th { text-align: left; color: #555; }
  .totals { margin-top: 16px; width: 50%; margin-left: auto; }
  .footer { margin-top: 40px; font-size: 11px; color: #666; }
</style>
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

export function printInvoiceDocument(model: InvoicePdfModel): void {
  if (typeof window === 'undefined') {
    return
  }
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return
  }
  printWindow.document.write(renderInvoiceHtml(model))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
