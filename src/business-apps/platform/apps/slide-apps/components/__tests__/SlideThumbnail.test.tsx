import React from 'react'
import { render, screen } from '@testing-library/react'
import { SlideThumbnail } from '../SlideThumbnail'
import type {
  ImageElement,
  LogoElement,
  RichTextParagraph,
  SlideData,
  TextElement,
  VideoElement
} from '../slideElements'

void React

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGD4DwABBAEAeU2mGQAAAABJRU5ErkJggg=='

function makeSlide(overrides: Partial<SlideData> = {}): SlideData {
  return {
    id: 'slide-1',
    background: { type: 'solid', color: '#ffffff' },
    elements: [],
    ...overrides
  }
}

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 80, y: 80 },
    size: { width: 420, height: 180 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Plain text',
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.3,
    letterSpacing: 0,
    padding: 12,
    ...overrides
  }
}

function makeImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'image-1',
    type: 'image',
    position: { x: 100, y: 120 },
    size: { width: 260, height: 180 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    src: TINY_PNG,
    alt: 'Preview image',
    objectFit: 'contain',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: '#000000',
    shadow: false,
    ...overrides
  }
}

function makeLogoElement(overrides: Partial<LogoElement> = {}): LogoElement {
  return {
    id: 'logo-1',
    type: 'logo',
    position: { x: 920, y: 40 },
    size: { width: 220, height: 60 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    preset: 'newwork-light',
    showText: true,
    ...overrides
  }
}

function makeVideoElement(overrides: Partial<VideoElement> = {}): VideoElement {
  return {
    id: 'video-1',
    type: 'video',
    position: { x: 120, y: 120 },
    size: { width: 320, height: 180 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    src: 'https://cdn.example.com/demo.mp4',
    sourceUrl: 'https://cdn.example.com/demo.mp4',
    previewImageUrl: TINY_PNG,
    videoKind: 'file',
    autoplay: false,
    loop: true,
    muted: true,
    objectFit: 'contain',
    borderRadius: 8,
    shadow: false,
    ...overrides
  }
}

describe('SlideThumbnail', () => {
  it('renders rich text paragraphs instead of falling back to plain content', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        level: 0,
        bulletType: 'bullet',
        runs: [{ text: 'Preview bullet', fontWeight: 'bold' }]
      },
      {
        alignment: 'left',
        level: 0,
        bulletType: 'none',
        runs: [{ text: 'Follow-up line' }]
      }
    ]

    render(
      <SlideThumbnail
        slide={makeSlide({
          elements: [makeTextElement({ content: 'Fallback content', paragraphs })]
        })}
        index={-1}
        thumbScale={0.125}
      />
    )

    expect(screen.getByTestId('rich-text-content-paragraph-0')).toBeInTheDocument()
    expect(screen.getByTestId('rich-text-content-run-0-0')).toHaveTextContent('Preview bullet')
    expect(screen.getByText('Follow-up line')).toBeInTheDocument()
  })

  it('keeps cropped images aligned with the shared image crop styles', () => {
    render(
      <SlideThumbnail
        slide={makeSlide({
          elements: [
            makeImageElement({
              cropRect: { left: 0.1, right: 0.1, top: 0.05, bottom: 0.15 }
            })
          ]
        })}
        index={-1}
        thumbScale={0.125}
      />
    )

    const image = screen.getByAltText('Preview image')

    expect(image).toHaveStyle({
      position: 'absolute',
      width: '125%',
      left: '-12.5%'
    })
    expect(Number.parseFloat(image.style.top)).toBeCloseTo(-6.25, 5)
  })

  it('applies wrapper rotation and opacity through the shared static surface', () => {
    render(
      <SlideThumbnail
        slide={makeSlide({
          elements: [
            makeTextElement({
              id: 'rotated-text',
              content: 'Rotated preview',
              rotation: 15,
              opacity: 0.4
            })
          ]
        })}
        index={-1}
        thumbScale={0.125}
      />
    )

    expect(screen.getByTestId('slide-static-element-rotated-text')).toHaveStyle({
      transform: 'rotate(15deg)',
      opacity: '0.4'
    })
  })

  it('renders previously missing logo elements in the thumbnail preview', () => {
    render(
      <SlideThumbnail
        slide={makeSlide({
          elements: [makeLogoElement()]
        })}
        index={-1}
        thumbScale={0.125}
      />
    )

    expect(screen.getByTestId('slide-static-element-logo-1')).toHaveTextContent('NEWWORK')
  })

  it('renders a stored poster image for video previews', () => {
    render(
      <SlideThumbnail
        slide={makeSlide({
          elements: [makeVideoElement()]
        })}
        index={-1}
        thumbScale={0.125}
      />
    )

    const preview = screen.getByTestId('slide-static-element-video-1').querySelector('img')
    expect(preview).not.toBeNull()
    expect(preview).toHaveAttribute('src', expect.stringContaining('data:image/png'))
  })
})
