import type { TextElement } from '../../components/slideElements'
import {
  applyCaretFormattingToInsertedText,
  applyRichTextHyperlink,
  applyRichTextFormatting,
  clearRichTextHyperlink,
  createRichTextClipboardFragment,
  getRichTextHyperlinkAtSelection,
  getRichTextStyleAtRange,
  getRichTextTextInRange,
  getTextEditDelta,
  insertRichTextClipboardFragment,
  parseHtmlToRichTextClipboardFragment,
  replaceRichTextContent,
  resolveRichTextSelectionForLinkAction
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

  it('applies hyperlinks only to the selected text range', () => {
    const updated = applyRichTextHyperlink(makeTextElement(), { start: 6, end: 11 }, 'https://example.com')

    expect(updated.content).toBe('Hello world')
    expect(updated.paragraphs?.[0].runs).toEqual([
      expect.objectContaining({ text: 'Hello ', hyperlink: undefined }),
      expect.objectContaining({ text: 'world', hyperlink: 'https://example.com' })
    ])
  })

  it('expands a collapsed caret to the current hyperlink range', () => {
    const element = makeTextElement({
      paragraphs: [
        {
          runs: [{ text: 'Hello ' }, { text: 'world', hyperlink: 'https://example.com' }, { text: '!' }]
        }
      ]
    })

    const selection = resolveRichTextSelectionForLinkAction(element, { start: 8, end: 8 })

    expect(selection).toEqual({ start: 6, end: 11 })
    expect(getRichTextHyperlinkAtSelection(element, { start: 8, end: 8 })).toBe('https://example.com')
    expect(getRichTextTextInRange(element, selection)).toBe('world')
  })

  it('removes hyperlinks only from the resolved link range', () => {
    const element = makeTextElement({
      paragraphs: [
        {
          runs: [{ text: 'Hello ' }, { text: 'world', hyperlink: 'https://example.com' }, { text: '!' }]
        }
      ]
    })

    const updated = clearRichTextHyperlink(
      element,
      resolveRichTextSelectionForLinkAction(element, { start: 8, end: 8 })
    )

    expect(updated.paragraphs?.[0].runs).toEqual([expect.objectContaining({ text: 'Hello world!' })])
    expect(updated.paragraphs?.[0].runs[0].hyperlink).toBeUndefined()
  })

  it('creates clipboard fragments that preserve run-level formatting', () => {
    const element = makeTextElement({
      paragraphs: [
        {
          runs: [{ text: 'Hello ' }, { text: 'world', fontWeight: 'bold', hyperlink: 'https://example.com' }]
        }
      ]
    })

    const fragment = createRichTextClipboardFragment(element, { start: 6, end: 11 })

    expect(fragment?.text).toBe('world')
    expect(fragment?.paragraphs[0].runs).toEqual([
      expect.objectContaining({ text: 'world', fontWeight: 'bold', hyperlink: 'https://example.com' })
    ])
  })

  it('inserts clipboard fragments without flattening formatting', () => {
    const source = makeTextElement({
      content: 'Hello world',
      paragraphs: [
        {
          runs: [{ text: 'Hello ' }, { text: 'world', fontStyle: 'italic', hyperlink: 'https://example.com' }]
        }
      ]
    })
    const target = makeTextElement({
      content: 'Start ',
      paragraphs: [{ runs: [{ text: 'Start ' }] }]
    })
    const fragment = createRichTextClipboardFragment(source, { start: 6, end: 11 })

    const updated = insertRichTextClipboardFragment(target, { start: 6, end: 6 }, fragment!)

    expect(updated.content).toBe('Start world')
    expect(updated.paragraphs?.[0].runs).toEqual([
      expect.objectContaining({ text: 'Start ' }),
      expect.objectContaining({ text: 'world', fontStyle: 'italic', hyperlink: 'https://example.com' })
    ])
  })

  it('parses clipboard html into formatted rich-text fragments', () => {
    const fragment = parseHtmlToRichTextClipboardFragment(
      '<p>Hello <strong>bold</strong> <a href="https://example.com">link</a></p><ul><li>Item</li></ul>',
      makeTextElement()
    )

    expect(fragment?.text).toBe('Hello bold link\nItem')
    expect(fragment?.paragraphs[0].runs).toEqual([
      expect.objectContaining({ text: 'Hello ' }),
      expect.objectContaining({ text: 'bold', fontWeight: 'bold' }),
      expect.objectContaining({ text: ' ' }),
      expect.objectContaining({ text: 'link', hyperlink: 'https://example.com' })
    ])
    expect(fragment?.paragraphs[1]).toEqual(expect.objectContaining({ bulletType: 'bullet' }))
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

  it('applies list formatting to the whole textbox when no inline selection is active', () => {
    const element = makeTextElement({
      content: 'one\ntwo',
      paragraphs: [{ runs: [{ text: 'one' }] }, { runs: [{ text: 'two' }] }]
    })

    const updated = applyRichTextFormatting(element, { bulletType: 'bullet', bulletChar: '◆' })

    expect(updated.paragraphs?.[0]).toEqual(
      expect.objectContaining({
        bulletType: 'bullet',
        bulletChar: '◆'
      })
    )
    expect(updated.paragraphs?.[1]).toEqual(
      expect.objectContaining({
        bulletType: 'bullet',
        bulletChar: '◆'
      })
    )
  })

  it('applies list formatting to the active paragraph for collapsed selections', () => {
    const element = makeTextElement({
      content: 'one\ntwo',
      paragraphs: [{ runs: [{ text: 'one' }] }, { runs: [{ text: 'two' }] }]
    })

    const updated = applyRichTextFormatting(
      element,
      { bulletType: 'number', numberingStyle: 'alphaUcPeriod', numberStartAt: 5 },
      { start: 1, end: 1 }
    )

    expect(updated.paragraphs?.[0]).toEqual(
      expect.objectContaining({
        bulletType: 'number',
        numberingStyle: 'alphaUcPeriod',
        numberStartAt: 5,
        listLeftMargin: 18,
        listIndent: -18
      })
    )
    expect(updated.paragraphs?.[1]).toEqual(expect.objectContaining({ bulletType: 'none' }))
  })

  it('applies bullet representation changes to the whole contiguous list block', () => {
    const element = makeTextElement({
      content: 'one\ntwo\nthree',
      paragraphs: [
        { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'one' }] },
        { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'two' }] },
        { bulletType: 'none', runs: [{ text: 'three' }] }
      ]
    })

    const updated = applyRichTextFormatting(element, { bulletType: 'bullet', bulletChar: '◆' }, { start: 5, end: 5 })

    expect(updated.paragraphs?.[0]).toEqual(expect.objectContaining({ bulletType: 'bullet', bulletChar: '◆' }))
    expect(updated.paragraphs?.[1]).toEqual(expect.objectContaining({ bulletType: 'bullet', bulletChar: '◆' }))
    expect(updated.paragraphs?.[2]).toEqual(expect.objectContaining({ bulletType: 'none' }))
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

  it('preserves hyperlinks when text content changes', () => {
    const element = makeTextElement({
      content: 'go',
      paragraphs: [{ runs: [{ text: 'go', hyperlink: 'https://example.com' }] }]
    })

    const updated = replaceRichTextContent(element, 'goal')

    expect(updated.content).toBe('goal')
    expect(updated.paragraphs?.[0].runs).toEqual([
      expect.objectContaining({ text: 'goal', hyperlink: 'https://example.com' })
    ])
  })

  it('preserves paragraph bullet metadata when text content changes', () => {
    const element = makeTextElement({
      content: 'Item one\nItem two',
      paragraphs: [
        {
          alignment: 'left',
          bulletType: 'bullet',
          bulletChar: '→',
          indentLevel: 1,
          lineHeight: 1.6,
          spaceBefore: 8,
          spaceAfter: 4,
          runs: [{ text: 'Item one' }]
        },
        {
          alignment: 'center',
          bulletType: 'none',
          lineHeight: 1.2,
          runs: [{ text: 'Item two' }]
        }
      ]
    })

    const updated = replaceRichTextContent(element, 'Item one updated\nItem two')

    expect(updated.paragraphs?.[0]).toEqual(
      expect.objectContaining({
        bulletType: 'bullet',
        bulletChar: '→',
        indentLevel: 1,
        lineHeight: 1.6,
        spaceBefore: 8,
        spaceAfter: 4
      })
    )
    expect(updated.paragraphs?.[1]).toEqual(expect.objectContaining({ alignment: 'center', bulletType: 'none' }))
  })

  it('carries paragraph bullet metadata forward when splitting a list item', () => {
    const element = makeTextElement({
      content: 'Alpha Beta',
      paragraphs: [
        {
          alignment: 'left',
          bulletType: 'bullet',
          bulletChar: '•',
          indentLevel: 2,
          lineHeight: 1.5,
          runs: [{ text: 'Alpha Beta' }]
        }
      ]
    })

    const updated = replaceRichTextContent(element, 'Alpha\nBeta')

    expect(updated.paragraphs).toHaveLength(2)
    expect(updated.paragraphs?.[0]).toEqual(expect.objectContaining({ bulletType: 'bullet', indentLevel: 2 }))
    expect(updated.paragraphs?.[1]).toEqual(expect.objectContaining({ bulletType: 'bullet', indentLevel: 2 }))
  })

  it('keeps the leading paragraph metadata when merging paragraphs', () => {
    const element = makeTextElement({
      content: 'Alpha\nBeta',
      paragraphs: [
        {
          alignment: 'left',
          bulletType: 'bullet',
          bulletChar: '•',
          indentLevel: 1,
          runs: [{ text: 'Alpha' }]
        },
        {
          alignment: 'right',
          bulletType: 'none',
          runs: [{ text: 'Beta' }]
        }
      ]
    })

    const updated = replaceRichTextContent(element, 'AlphaBeta')

    expect(updated.paragraphs).toHaveLength(1)
    expect(updated.paragraphs?.[0]).toEqual(
      expect.objectContaining({
        alignment: 'left',
        bulletType: 'bullet',
        bulletChar: '•',
        indentLevel: 1
      })
    )
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

  it('resolves paragraph list state at the caret and across mixed selections', () => {
    const element = makeTextElement({
      content: 'one\ntwo',
      paragraphs: [
        {
          bulletType: 'bullet',
          bulletChar: '◆',
          runs: [{ text: 'one' }]
        },
        {
          bulletType: 'number',
          numberingStyle: 'romanLcPeriod',
          runs: [{ text: 'two' }]
        }
      ]
    })

    expect(getRichTextStyleAtRange(element, { start: 0, end: 0 })).toEqual(
      expect.objectContaining({
        bulletType: 'bullet',
        bulletChar: '◆'
      })
    )

    expect(getRichTextStyleAtRange(element, { start: 0, end: 7 })).toEqual(
      expect.objectContaining({
        isBulletTypeMixed: true,
        isNumberingStyleMixed: true
      })
    )
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
