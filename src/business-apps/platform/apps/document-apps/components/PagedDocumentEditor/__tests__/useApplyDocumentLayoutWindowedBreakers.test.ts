import {
  collectPageBreakers,
  isPlaceholderPageBreaker,
  parkPageBreaker,
  restorePageBreaker,
  shouldMountPageBreaker
} from '../hooks/useApplyDocumentLayoutWindowedBreakers'

function createPageBreak(pageNumber: number) {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const breaker = document.createElement('div')
  breaker.className = 'breaker'

  const footer = document.createElement('div')
  footer.className = 'rm-page-footer-region'
  footer.dataset.rmPageNumber = String(pageNumber)
  footer.textContent = `Footer ${pageNumber}`

  const gap = document.createElement('div')
  gap.className = 'rm-page-gap'

  const header = document.createElement('div')
  header.className = 'rm-page-header-region'
  header.dataset.rmPageNumber = String(pageNumber + 1)
  header.textContent = `Header ${pageNumber + 1}`

  breaker.append(footer, gap, header)
  pageBreak.append(page, breaker)

  return { pageBreak, breaker, footer, gap, header }
}

describe('collectPageBreakers', () => {
  it('indexes page break elements by their page number', () => {
    const first = createPageBreak(1)
    const second = createPageBreak(2)

    const result = collectPageBreakers([first.pageBreak, second.pageBreak])

    expect(result.get(1)).toBe(first.pageBreak)
    expect(result.get(2)).toBe(second.pageBreak)
  })
})

describe('shouldMountPageBreaker', () => {
  it('keeps a breaker mounted when its next page is active', () => {
    expect(shouldMountPageBreaker(1, new Set([2, 3]))).toBe(true)
  })

  it('parks a breaker only when both its current and next pages are inactive', () => {
    expect(shouldMountPageBreaker(1, new Set([3, 4]))).toBe(false)
  })
})

describe('parkPageBreaker and restorePageBreaker', () => {
  it('parks breaker children and restores them later', () => {
    const parkedBreakers = new WeakMap()
    const { pageBreak, breaker, footer, gap, header } = createPageBreak(3)
    Object.defineProperty(breaker, 'offsetHeight', {
      configurable: true,
      value: 96
    })

    parkPageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBe('false')
    expect(breaker.style.height).toBe('96px')
    expect(breaker.childNodes).toHaveLength(0)

    restorePageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(breaker.style.height).toBe('')
    expect(Array.from(breaker.childNodes)).toEqual([footer, gap, header])
  })

  it('does not park a breaker containing an active overlay region', () => {
    const parkedBreakers = new WeakMap()
    const { pageBreak, breaker } = createPageBreak(3)
    const activeRegion = breaker.querySelector('.rm-page-footer-region') as HTMLElement
    activeRegion.dataset.rmOverlayActive = 'true'

    parkPageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(breaker.childNodes.length).toBe(3)
  })
})

describe('isPlaceholderPageBreaker', () => {
  it('detects lightweight placeholder breakers', () => {
    const { pageBreak, breaker } = createPageBreak(4)
    breaker.dataset.rmBreakerMode = 'placeholder'

    expect(isPlaceholderPageBreaker(pageBreak)).toBe(true)
  })
})
