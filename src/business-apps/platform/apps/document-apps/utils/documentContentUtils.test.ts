import { isEffectivelyEmptyDocumentHtml } from './documentContentUtils'

describe('documentContentUtils', () => {
  it('treats empty paragraph content as effectively empty', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p></p>')).toBe(true)
    expect(isEffectivelyEmptyDocumentHtml('<p><br></p>')).toBe(true)
  })

  it('ignores zero-width spaces and whitespace-only text', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p>\u200B</p>')).toBe(true)
    expect(isEffectivelyEmptyDocumentHtml('<p>   </p>')).toBe(true)
  })

  it('treats tables as non-empty even without text content', () => {
    expect(isEffectivelyEmptyDocumentHtml('<table><tbody><tr><td></td></tr></tbody></table>')).toBe(false)
  })

  it('treats actual text as non-empty', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p>Hello</p>')).toBe(false)
  })
})
