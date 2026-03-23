import {
  collectPageChromeRegions,
  parkChromeRegion,
  restoreChromeRegion
} from '../hooks/useApplyDocumentLayoutWindowedChrome'

function createChromeRegion(className: string, pageNumber: number, contentHtml: string) {
  const region = document.createElement('div')
  region.className = className
  region.dataset.rmPageNumber = String(pageNumber)
  region.dataset.rmEditorType = className.includes('footer') ? 'footer' : 'header'

  const shell = document.createElement('div')
  shell.className = className.includes('footer') ? 'rm-page-footer' : 'rm-page-header'
  const layout = document.createElement('div')
  layout.className = 'rm-page-region-layout'
  layout.dataset.rmPageNumberLayout = 'true'

  const content = document.createElement('div')
  content.className = className.includes('footer') ? 'rm-page-footer-content' : 'rm-page-header-content'
  content.innerHTML = contentHtml

  const slot = document.createElement('div')
  slot.dataset.rmPageNumberSlot = 'true'
  slot.textContent = '1'

  layout.append(content, slot)
  shell.append(layout)
  region.append(shell)
  return { region, content, slot }
}

function createPageBreak(pageNumber: number) {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const footer = createChromeRegion('rm-page-footer-region', pageNumber, `<p>Footer ${pageNumber}</p>`)
  const nextHeader = createChromeRegion('rm-page-header-region', pageNumber + 1, `<p>Header ${pageNumber + 1}</p>`)
  const breaker = document.createElement('div')
  breaker.className = 'breaker'
  breaker.append(footer.region, nextHeader.region)

  pageBreak.append(page, breaker)
  return { pageBreak, footer, nextHeader }
}

describe('collectPageChromeRegions', () => {
  it('indexes footer, next-page header, and first page header by logical page number', () => {
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const firstPageHeader = createChromeRegion('rm-first-page-header', 1, '<p>First page header</p>')

    const result = collectPageChromeRegions([first.pageBreak, second.pageBreak], firstPageHeader.region)

    expect(result.get(1)).toEqual([first.footer.region, firstPageHeader.region])
    expect(result.get(2)).toEqual([first.nextHeader.region, second.footer.region])
    expect(result.get(3)).toEqual([second.nextHeader.region])
  })
})

describe('parkChromeRegion and restoreChromeRegion', () => {
  it('detaches heavy content and restores it later', () => {
    const parkedRegions = new WeakMap()
    const { region, content, slot } = createChromeRegion('rm-page-header-region', 2, '<p>Header 2</p>')
    Object.defineProperty(region, 'offsetHeight', {
      configurable: true,
      value: 48
    })

    parkChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBe('false')
    expect(region.style.height).toBe('48px')
    expect(content.childNodes).toHaveLength(0)
    expect(slot.isConnected).toBe(false)

    restoreChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBeUndefined()
    expect(region.style.height).toBe('')
    expect(content.innerHTML).toContain('Header 2')
    expect(region.querySelector('[data-rm-page-number-slot="true"]')).toBe(slot)
  })

  it('does not park an active overlay region', () => {
    const parkedRegions = new WeakMap()
    const { region, content } = createChromeRegion('rm-page-footer-region', 2, '<p>Footer 2</p>')
    region.dataset.rmOverlayActive = 'true'

    parkChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBeUndefined()
    expect(content.innerHTML).toContain('Footer 2')
  })
})
