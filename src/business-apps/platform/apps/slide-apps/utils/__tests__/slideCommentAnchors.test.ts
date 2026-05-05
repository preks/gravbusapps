import type { SlideData } from '../../components/slideElements'
import {
  describeSlideCommentTarget,
  parseSlideCommentAnchor,
  serializeSlideCommentAnchor
} from '../slideCommentAnchors'

function makeSlide(): SlideData {
  return {
    id: 'slide-1',
    elements: [
      {
        id: 'text-1',
        type: 'text',
        position: { x: 0, y: 0 },
        size: { width: 240, height: 100 },
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 1,
        content: 'Editable text',
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        verticalAlign: 'top',
        color: '#111111',
        backgroundColor: 'transparent',
        lineHeight: 1.2,
        letterSpacing: 0,
        padding: 0
      },
      {
        id: 'image-1',
        type: 'image',
        position: { x: 320, y: 40 },
        size: { width: 120, height: 120 },
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 2,
        src: 'https://example.com/image.png',
        alt: 'Sample image',
        objectFit: 'cover'
      }
    ],
    background: {
      type: 'solid',
      color: '#ffffff'
    }
  }
}

describe('slideCommentAnchors', () => {
  it('serializes and parses text-range anchors', () => {
    const anchor = {
      kind: 'text-range' as const,
      slideId: 'slide-1',
      elementId: 'text-1',
      start: 0,
      end: 8,
      selectedText: 'Editable'
    }

    expect(parseSlideCommentAnchor(serializeSlideCommentAnchor(anchor))).toEqual(anchor)
  })

  it('returns undefined for invalid anchor payloads', () => {
    expect(parseSlideCommentAnchor('{"kind":"element","slideId":"slide-1","elementIds":[1]}')).toBeUndefined()
    expect(parseSlideCommentAnchor('not-json')).toBeUndefined()
  })

  it('describes the selected slide target for panel previews', () => {
    const slide = makeSlide()

    expect(describeSlideCommentTarget(slide, ['text-1'])).toBe('Editable text')
    expect(describeSlideCommentTarget(slide, ['text-1', 'image-1'])).toBe('2 selected elements')
  })
})
