import { richParagraphsToPptxRuns } from '../pptxExport'
import type { RichTextParagraph, TextElement } from '../../components/slideElements'

function makeFallback(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 300, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: '',
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

describe('richParagraphsToPptxRuns', () => {
  it('exports numbering styles, start values, and custom bullet characters', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        bulletType: 'bullet',
        bulletChar: '◆',
        runs: [{ text: 'Bullet item' }]
      },
      {
        bulletType: 'number',
        numberingStyle: 'romanUcPeriod',
        numberStartAt: 4,
        runs: [{ text: 'Numbered item' }]
      }
    ]

    const runs = richParagraphsToPptxRuns(paragraphs, makeFallback())

    expect(runs[0].options.bullet).toEqual(
      expect.objectContaining({
        type: 'bullet',
        characterCode: '25C6'
      })
    )
    expect(runs[1].options.bullet).toEqual(
      expect.objectContaining({
        type: 'number',
        numberType: 'romanUcPeriod',
        numberStartAt: 4
      })
    )
  })
})
