import type { InvoicePdfModel } from '../invoicePdf'
import { printInvoiceDocument, renderInvoiceHtml } from '../invoicePrint'

function makeModel(overrides: Partial<InvoicePdfModel> = {}): InvoicePdfModel {
  return {
    invoiceNumber: 'INV-2026-0001',
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    seller: {
      name: 'New Work SE',
      addressLines: ['Am Strandkai 1'],
      vatId: 'DE123',
      bankIban: 'DE02120300000000202051'
    },
    buyer: {
      name: 'ACME GmbH',
      addressLines: ['Main Street 1'],
      vatId: 'DE456'
    },
    currency: 'EUR',
    lines: [
      {
        description: 'Subscription',
        quantity: 1,
        unitPrice: '100.00 EUR',
        discount: '0%',
        taxRate: '19%',
        net: '100.00 EUR',
        gross: '119.00 EUR'
      }
    ],
    taxRows: [{ label: '19% (STANDARD)', net: '100.00 EUR', tax: '19.00 EUR' }],
    netTotal: '100.00 EUR',
    taxTotal: '19.00 EUR',
    grossTotal: '119.00 EUR',
    footer: 'Thank you',
    locale: 'en-US',
    ...overrides
  }
}

describe('renderInvoiceHtml', () => {
  it('escapes invoice data and includes a restrictive CSP', () => {
    const html = renderInvoiceHtml(
      makeModel({
        invoiceNumber: '<img src=x onerror=alert(1)>',
        buyer: {
          name: '<script>alert(1)</script>',
          addressLines: ['"><svg onload=alert(1)>'],
          vatId: null
        },
        locale: 'en" onload="alert(1)'
      })
    )

    expect(html).toContain('Content-Security-Policy')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&quot;&gt;&lt;svg onload=alert(1)&gt;')
    expect(html).toContain('<html lang="en">')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})

describe('printInvoiceDocument', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('opens a blank window and renders invoice data through safe DOM text nodes', () => {
    const printDocument = document.implementation.createHTMLDocument('')
    const write = jest.spyOn(printDocument, 'write')
    const fakePrintWindow = {
      document: printDocument,
      focus: jest.fn(),
      print: jest.fn()
    }
    jest.spyOn(window, 'open').mockReturnValue(fakePrintWindow as unknown as Window)

    printInvoiceDocument(makeModel({ buyer: { name: '<script>alert(1)</script>', addressLines: [], vatId: null } }))

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(write).not.toHaveBeenCalled()
    expect(printDocument.body.textContent).toContain('<script>alert(1)</script>')
    expect(printDocument.body.innerHTML).not.toContain('<script>alert(1)</script>')
    expect(fakePrintWindow.focus).toHaveBeenCalledTimes(1)
    expect(fakePrintWindow.print).toHaveBeenCalledTimes(1)
  })
})
