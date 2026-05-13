import {
  getRibbonAccountingCurrencyPatternFromRowElement,
  hideRibbonNumfmtCurrencyQuickSplit,
  patchRibbonAccountingCurrencyMenus,
  RIBBON_ACCOUNTING_CURRENCY_PRESETS
} from '../univerGridRibbonCurrencyPresets'
import { NUMFMT_MENU_ITEM_ROW_SELECTOR } from '../univerGridLocaleChrome'

describe('univerGridRibbonCurrencyPresets', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.position = 'relative'
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('exposes five Excel-style presets with EUR first (English ribbon copy, US-style previews)', () => {
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS).toHaveLength(5)
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[0].label).toContain('€ Euro')
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[0].preview).toBe('€1,220.00')
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[0].pattern).toContain('€')
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[1].label).toBe('$ English (United States)')
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[1].preview).toBe('$1,220.00')
    expect(RIBBON_ACCOUNTING_CURRENCY_PRESETS[1].pattern).toContain('$')
  })

  it('reads pattern data attribute from a ribbon row element', () => {
    const row = document.createElement('div')
    row.setAttribute('data-gravity-currency-row', '1')
    row.setAttribute('data-gravity-currency-pattern', '"CHF"#,##0.00')
    expect(getRibbonAccountingCurrencyPatternFromRowElement(row)).toBe('"CHF"#,##0.00')
  })

  it('patchRibbonAccountingCurrencyMenus replaces a built-in accounting currency menu', () => {
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.style.position = 'fixed'
    menu.style.top = '0'
    menu.style.left = '0'
    document.body.appendChild(menu)

    for (let i = 0; i < 6; i += 1) {
      const row = document.createElement('div')
      row.className = 'univer-flex univer-h-7'
      const label = document.createElement('span')
      label.textContent = '($1,235.00)'
      const preview = document.createElement('span')
      preview.className = 'univer-text-xs'
      preview.textContent = '1,235.00'
      row.appendChild(label)
      row.appendChild(preview)
      menu.appendChild(row)
    }

    patchRibbonAccountingCurrencyMenus()

    const injected = menu.querySelectorAll('[data-gravity-currency-row]')
    expect(injected.length).toBe(5)
    expect(injected[0].querySelector('span')?.textContent).toContain('€ Euro')

    const allRows = menu.querySelectorAll(NUMFMT_MENU_ITEM_ROW_SELECTOR)
    expect(allRows.length).toBeGreaterThanOrEqual(5)
  })

  it('patchRibbonAccountingCurrencyMenus targets Radix popper hosts (Start ribbon Currency split)', () => {
    const wrap = document.createElement('div')
    wrap.setAttribute('data-radix-popper-content-wrapper', '')
    wrap.style.position = 'fixed'
    wrap.style.top = '0'
    wrap.style.left = '0'
    document.body.appendChild(wrap)

    const col = document.createElement('div')
    wrap.appendChild(col)

    for (let i = 0; i < 6; i += 1) {
      const row = document.createElement('div')
      row.className = 'univer-flex univer-h-7'
      const label = document.createElement('span')
      label.textContent = '($1,235.00)'
      const preview = document.createElement('span')
      preview.className = 'univer-text-xs'
      preview.textContent = '1,235.00'
      row.appendChild(label)
      row.appendChild(preview)
      col.appendChild(row)
    }

    patchRibbonAccountingCurrencyMenus()

    const injected = col.querySelectorAll('[data-gravity-currency-row]')
    expect(injected.length).toBe(5)
    expect(injected[0].querySelector('span')?.textContent).toContain('€ Euro')
  })

  it('hideRibbonNumfmtCurrencyQuickSplit hides only the currency split (€ + chevron), not % or decimals', () => {
    const row = document.createElement('div')
    row.style.display = 'flex'

    const percent = document.createElement('button')
    percent.type = 'button'
    percent.textContent = '%'
    row.appendChild(percent)

    const split = document.createElement('div')
    split.style.display = 'flex'
    const main = document.createElement('button')
    main.type = 'button'
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'univerjs-icon univerjs-icon-euro-icon')
    main.appendChild(svg)
    const chevron = document.createElement('button')
    chevron.type = 'button'
    chevron.textContent = 'v'
    split.appendChild(main)
    split.appendChild(chevron)
    row.appendChild(split)

    const decimals = document.createElement('button')
    decimals.type = 'button'
    decimals.textContent = '.00'
    row.appendChild(decimals)

    document.body.appendChild(row)

    hideRibbonNumfmtCurrencyQuickSplit()

    expect(split.style.getPropertyValue('display')).toBe('none')
    expect(percent.style.display).not.toBe('none')
    expect(decimals.style.display).not.toBe('none')
    expect(split.getAttribute('data-gravity-hidden-numfmt-currency-split')).toBe('1')

    hideRibbonNumfmtCurrencyQuickSplit()
    expect(split.style.getPropertyValue('display')).toBe('none')
  })

  it('hideRibbonNumfmtCurrencyQuickSplit does not hide a 2-column ribbon host that also contains % (regression)', () => {
    const outer = document.createElement('div')
    outer.style.display = 'flex'

    const col1 = document.createElement('div')
    col1.style.display = 'flex'

    const percent = document.createElement('button')
    percent.type = 'button'
    const pctSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    pctSvg.setAttribute('class', 'univerjs-icon univerjs-icon-percent-icon')
    percent.appendChild(pctSvg)
    col1.appendChild(percent)

    const split = document.createElement('div')
    split.style.display = 'flex'
    const main = document.createElement('button')
    main.type = 'button'
    const euroSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    euroSvg.setAttribute('class', 'univerjs-icon univerjs-icon-euro-icon')
    main.appendChild(euroSvg)
    split.appendChild(main)
    const chevron = document.createElement('button')
    chevron.type = 'button'
    split.appendChild(chevron)
    col1.appendChild(split)

    outer.appendChild(col1)
    const col2 = document.createElement('div')
    col2.textContent = 'other'
    outer.appendChild(col2)

    document.body.appendChild(outer)

    hideRibbonNumfmtCurrencyQuickSplit()

    expect(outer.style.display).not.toBe('none')
    expect(col1.style.display).not.toBe('none')
    expect(percent.style.display).not.toBe('none')
    expect(split.style.getPropertyValue('display')).toBe('none')
  })
})
