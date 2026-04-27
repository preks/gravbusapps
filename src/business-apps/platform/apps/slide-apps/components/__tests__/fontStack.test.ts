import { FONT_FALLBACK_STACKS, resolveFontStack } from '../fontStack'

describe('resolveFontStack', () => {
  it('returns the default sans stack when no font is provided', () => {
    expect(resolveFontStack(undefined)).toBe(FONT_FALLBACK_STACKS.sans)
    expect(resolveFontStack('')).toBe(FONT_FALLBACK_STACKS.sans)
    expect(resolveFontStack('   ')).toBe(FONT_FALLBACK_STACKS.sans)
  })

  it('passes through a value that already contains a fallback stack', () => {
    const stack = "'Roboto', Arial, sans-serif"
    expect(resolveFontStack(stack)).toBe(stack)
  })

  it('quotes multi-word fonts and appends the sans fallback for Calibri', () => {
    const result = resolveFontStack('Calibri Light')
    expect(result.startsWith("'Calibri Light', ")).toBe(true)
    expect(result.endsWith(FONT_FALLBACK_STACKS.sans)).toBe(true)
  })

  it('recognizes Cambria as serif so it does not land on Arial', () => {
    expect(resolveFontStack('Cambria')).toBe(`Cambria, ${FONT_FALLBACK_STACKS.serif}`)
  })

  it('recognizes Consolas as monospace', () => {
    expect(resolveFontStack('Consolas')).toBe(`Consolas, ${FONT_FALLBACK_STACKS.mono}`)
  })

  it('treats unknown serif-adjacent names heuristically', () => {
    const result = resolveFontStack('Garamond Pro')
    expect(result).toBe(`'Garamond Pro', ${FONT_FALLBACK_STACKS.serif}`)
  })

  it('treats unknown names with monospace signals heuristically', () => {
    expect(resolveFontStack('Custom Mono')).toBe(`'Custom Mono', ${FONT_FALLBACK_STACKS.mono}`)
  })

  it('strips surrounding quotes from the primary name', () => {
    const result = resolveFontStack("'Calibri'")
    expect(result).toBe(`Calibri, ${FONT_FALLBACK_STACKS.sans}`)
  })
})
