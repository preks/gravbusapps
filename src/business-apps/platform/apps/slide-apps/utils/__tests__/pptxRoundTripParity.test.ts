import { summarizeDeck, compareDeckSummaries } from '../pptxRoundTripParity'
import type {
  SlideData,
  TextElement,
  ImageElement,
  TableElement,
  RichTextParagraph
} from '../../components/slideElements'

function makeSlide(overrides: Partial<SlideData> = {}): SlideData {
  return {
    id: 'slide-test',
    elements: [],
    background: { type: 'solid', color: '#ffffff' },
    ...overrides
  }
}

function makeTextElement(content: string, paragraphs?: RichTextParagraph[], links?: TextElement['links']): TextElement {
  return {
    id: 'txt-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content,
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    fontFamily: 'sans-serif',
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: 1.4,
    letterSpacing: 0,
    backgroundColor: 'transparent',
    paragraphs,
    links
  }
}

function makeImageElement(): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    src: 'data:image/png;base64,AAA',
    alt: '',
    objectFit: 'contain',
    borderRadius: 0
  } as ImageElement
}

function makeTableElement(withCells: boolean): TableElement {
  const base: TableElement = {
    id: 'tbl-1',
    type: 'table',
    position: { x: 0, y: 0 },
    size: { width: 400, height: 200 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    headers: ['A', 'B'],
    rows: [['1', '2']],
    borderColor: '#000',
    borderWidth: 1,
    headerBackgroundColor: '#eee',
    headerTextColor: '#000',
    cellBackgroundColor: '#fff',
    cellTextColor: '#000',
    fontSize: 12,
    fontFamily: 'sans-serif'
  } as TableElement

  if (withCells) {
    base.cells = [
      [{ text: 'A' }, { text: 'B' }],
      [{ text: '1' }, { text: '2' }]
    ]
  }

  return base
}

describe('summarizeDeck', () => {
  it('counts empty deck correctly', () => {
    const s = summarizeDeck([])
    expect(s.slideCount).toBe(0)
    expect(s.totalElements).toBe(0)
    expect(s.elementTypeCounts).toEqual({})
  })

  it('counts slides, elements, and notes', () => {
    const slides: SlideData[] = [
      makeSlide({ elements: [makeTextElement('a')], notes: 'notes A' }),
      makeSlide({ elements: [makeImageElement(), makeImageElement()] })
    ]
    const s = summarizeDeck(slides)
    expect(s.slideCount).toBe(2)
    expect(s.totalElements).toBe(3)
    expect(s.elementTypeCounts.text).toBe(1)
    expect(s.elementTypeCounts.image).toBe(2)
    expect(s.notesCount).toBe(1)
  })

  it('identifies rich text paragraphs and hyperlinks', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        level: 0,
        bulletType: 'none',
        runs: [{ text: 'Hello ' }, { text: 'link', hyperlink: 'https://example.com' }]
      }
    ]
    const slides = [
      makeSlide({
        elements: [makeTextElement('Hello link', paragraphs)]
      })
    ]
    const s = summarizeDeck(slides)
    expect(s.richTextElementCount).toBe(1)
    expect(s.hyperlinkCount).toBe(1)
  })

  it('distinguishes rich tables from legacy tables', () => {
    const slides = [makeSlide({ elements: [makeTableElement(true), makeTableElement(false)] })]
    const s = summarizeDeck(slides)
    expect(s.elementTypeCounts.table).toBe(2)
    expect(s.richTableCount).toBe(1)
  })

  it('ignores blank notes', () => {
    const s = summarizeDeck([makeSlide({ notes: '   ' })])
    expect(s.notesCount).toBe(0)
  })
})

describe('compareDeckSummaries', () => {
  it('returns no regression when before and after match', () => {
    const deck = [makeSlide({ elements: [makeTextElement('a')] })]
    const s = summarizeDeck(deck)
    const report = compareDeckSummaries(s, s)
    expect(report.isRegression).toBe(false)
    expect(Object.keys(report.lostElements)).toHaveLength(0)
  })

  it('reports lost element types as regressions', () => {
    const before = summarizeDeck([makeSlide({ elements: [makeTextElement('a'), makeImageElement()] })])
    const after = summarizeDeck([makeSlide({ elements: [makeTextElement('a')] })])
    const report = compareDeckSummaries(before, after)
    expect(report.isRegression).toBe(true)
    expect(report.lostElements.image).toBe(1)
  })

  it('gains are allowed and do not count as regression', () => {
    const before = summarizeDeck([makeSlide({ elements: [makeTextElement('a')] })])
    const after = summarizeDeck([makeSlide({ elements: [makeTextElement('a'), makeImageElement()] })])
    const report = compareDeckSummaries(before, after)
    expect(report.isRegression).toBe(false)
    expect(report.gainedElements.image).toBe(1)
  })

  it('detects rich text or notes regressions', () => {
    const richPara: RichTextParagraph[] = [{ alignment: 'left', level: 0, bulletType: 'none', runs: [{ text: 'Hi' }] }]
    const before = summarizeDeck([
      makeSlide({
        elements: [makeTextElement('Hi', richPara)],
        notes: 'speaker note'
      })
    ])
    const after = summarizeDeck([makeSlide({ elements: [makeTextElement('Hi')] })])
    const report = compareDeckSummaries(before, after)
    expect(report.isRegression).toBe(true)
    expect(report.richTextDelta).toBe(-1)
    expect(report.notesDelta).toBe(-1)
  })
})
