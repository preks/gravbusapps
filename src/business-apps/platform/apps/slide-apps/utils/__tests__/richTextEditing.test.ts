import type { TextElement } from '../../components/slideElements'
import {
  applyCaretFormattingToInsertedText,
  applyRichTextFormatting,
  getRichTextStyleAtRange,
  getTextEditDelta,
  replaceRichTextContent
} from '../richTextEditing'

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 300, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 0,
    ...overrides
  }
}

describe('richTextEditing', () => {
  it('applies character formatting only to the selected range', () => {
    const updated = applyRichTextFormatting(makeTextElement(), { fontWeight: 'bold' }, { start: 6, end: 11 })

    expect(updated.content).toBe('Hello world')
    expect(updated.fontWeight).toBe('normal')
    expect(updated.paragraphs?.[0].runs).toEqual([
      expect.objectContaining({ text: 'Hello ', fontWeight: 'normal' }),
      expect.objectContaining({ text: 'world', fontWeight: 'bold' })
    ])
  })

  it('applies formatting to every run when no text range is active', () => {
    const element = makeTextElement({
      paragraphs: [
        {
          runs: [
            { text: 'Hello ', fontSize: 16 },
            { text: 'world', fontSize: 20 }
          ]
        }
      ]
    })
    const updated = applyRichTextFormatting(element, { fontSize: 24 })

    expect(updated.fontSize).toBe(24)
    expect(updated.paragraphs?.[0].runs).toEqual([expect.objectContaining({ text: 'Hello world', fontSize: 24 })])
  })

  it('applies paragraph alignment to all paragraphs touched by a range', () => {
    const updated = applyRichTextFormatting(
      makeTextElement({ content: 'one\ntwo' }),
      { textAlign: 'center' },
      { start: 2, end: 5 }
    )

    expect(updated.textAlign).toBe('left')
    expect(updated.paragraphs?.[0].alignment).toBe('center')
    expect(updated.paragraphs?.[1].alignment).toBe('center')
  })

  it('preserves existing run styles when text content changes', () => {
    const element = makeTextElement({
      content: 'ab',
      paragraphs: [
        {
          runs: [
            { text: 'a', fontWeight: 'bold' },
            { text: 'b', fontStyle: 'italic' }
          ]
        }
      ]
    })

    const updated = replaceRichTextContent(element, 'abc')

    expect(updated.content).toBe('abc')
    expect(updated.paragraphs?.[0].runs[0]).toEqual(expect.objectContaining({ text: 'a', fontWeight: 'bold' }))
    expect(updated.paragraphs?.[0].runs[1]).toEqual(expect.objectContaining({ text: 'bc', fontStyle: 'italic' }))
  })

  it('detects inserted text ranges for caret formatting', () => {
    expect(getTextEditDelta('Hello world', 'Hello brave world')).toEqual({
      start: 6,
      deletedLength: 0,
      insertedLength: 6
    })
  })

  it('applies pending caret formatting only to inserted text', () => {
    const element = makeTextElement({
      content: 'ab',
      paragraphs: [
        {
          runs: [
            { text: 'a', fontWeight: 'normal' },
            { text: 'b', fontWeight: 'normal' }
          ]
        }
      ]
    })

    const nextContent = 'axb'
    const editDelta = getTextEditDelta(element.content, nextContent)
    const updated = applyCaretFormattingToInsertedText(
      replaceRichTextContent(element, nextContent),
      { fontWeight: 'bold', fontSize: 24 },
      editDelta
    )

    expect(updated.content).toBe('axb')
    expect(updated.paragraphs?.[0].runs).toEqual([
      expect.objectContaining({ text: 'a', fontWeight: 'normal' }),
      expect.objectContaining({ text: 'x', fontWeight: 'bold', fontSize: 24 }),
      expect.objectContaining({ text: 'b', fontWeight: 'normal' })
    ])
  })

  it('resolves mixed font family and size across a selection', () => {
    const element = makeTextElement({
      content: 'Hello world',
      paragraphs: [
        {
          runs: [
            { text: 'Hello ', fontFamily: 'Inter', fontSize: 16 },
            { text: 'world', fontFamily: 'Arial', fontSize: 24 }
          ]
        }
      ]
    })

    const resolved = getRichTextStyleAtRange(element, { start: 0, end: 11 })

    expect(resolved.isFontFamilyMixed).toBe(true)
    expect(resolved.fontFamily).toBeUndefined()
    expect(resolved.isFontSizeMixed).toBe(true)
    expect(resolved.fontSize).toBeUndefined()
  })

  it('resolves tri-state toggles for mixed bold and italic selections', () => {
    const element = makeTextElement({
      content: 'Hello world',
      paragraphs: [
        {
          runs: [
            { text: 'Hello ', fontWeight: 'bold', fontStyle: 'normal' },
            { text: 'world', fontWeight: 'normal', fontStyle: 'italic' }
          ]
        }
      ]
    })

    const resolved = getRichTextStyleAtRange(element, { start: 0, end: 11 })

    expect(resolved.fontWeightState).toBe('mixed')
    expect(resolved.fontStyleState).toBe('mixed')
    expect(resolved.underlineState).toBe('off')
    expect(resolved.strikethroughState).toBe('off')
  })

  it('resolves mixed paragraph alignment across a multi-paragraph selection', () => {
    const element = makeTextElement({
      content: 'one\ntwo',
      paragraphs: [
        {
          alignment: 'left',
          runs: [{ text: 'one' }]
        },
        {
          alignment: 'center',
          runs: [{ text: 'two' }]
        }
      ]
    })

    const resolved = getRichTextStyleAtRange(element, { start: 0, end: 7 })

    expect(resolved.isTextAlignMixed).toBe(true)
    expect(resolved.textAlign).toBeUndefined()
  })

  it('keeps uniform selection values when every touched run matches', () => {
    const element = makeTextElement({
      content: 'Hello world',
      paragraphs: [
        {
          runs: [
            { text: 'Hello ', fontFamily: 'Inter', fontSize: 18, fontWeight: 'bold' },
            { text: 'world', fontFamily: 'Inter', fontSize: 18, fontWeight: 'bold' }
          ]
        }
      ]
    })

    const resolved = getRichTextStyleAtRange(element, { start: 0, end: 11 })

    expect(resolved.isFontFamilyMixed).toBe(false)
    expect(resolved.fontFamily).toBe('Inter')
    expect(resolved.isFontSizeMixed).toBe(false)
    expect(resolved.fontSize).toBe(18)
    expect(resolved.fontWeightState).toBe('on')
  })
})
