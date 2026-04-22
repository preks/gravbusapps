/**
 * PowerPoint Export Utility
 *
 * Converts slides to PPTX format using pptxgenjs.
 * Handles text, images, shapes, code blocks, and backgrounds.
 */

import pptxgen from 'pptxgenjs'
import type {
  SlideData,
  AnySlideElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CodeElement,
  VideoElement
} from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'

/**
 * Convert pixels to inches for pptxgen (96 DPI)
 */
function pxToInches(px: number): number {
  return px / 96
}

/**
 * Convert hex color to pptxgen format (remove #)
 */
function hexToPptxColor(hex: string): string {
  return hex.replace('#', '')
}

/**
 * Get text alignment for pptxgen
 */
function getPptxAlign(align: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  return align
}

/**
 * Get text vertical alignment for pptxgen
 */
function getPptxValign(valign: 'top' | 'middle' | 'bottom'): 'top' | 'middle' | 'bottom' {
  return valign
}

/**
 * Convert text element to pptxgen text box
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- theme reserved for future styling
function addTextElement(pptxSlide: any, element: TextElement, theme: SlideTheme) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fontSize: element.fontSize / 2, // pptxgen uses points, our UI uses pixels (approximate)
    fontFace: element.fontFamily,
    bold: element.fontWeight === 'bold',
    italic: element.fontStyle === 'italic',
    underline: element.textDecoration === 'underline',
    strike: element.textDecoration === 'line-through',
    align: getPptxAlign(element.textAlign),
    valign: getPptxValign(element.verticalAlign),
    color: hexToPptxColor(element.color),
    rotate: element.rotation
  }

  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    options.fill = { color: hexToPptxColor(element.backgroundColor) }
  }

  if (element.gradient) {
    // pptxgen supports gradients
    options.fill = {
      type: element.gradient.type === 'linear' ? 'solid' : 'solid', // Simplified
      color: hexToPptxColor(element.gradient.stops[0]?.color || element.color)
    }
  }

  pptxSlide.addText(element.content || '', options)
}

/**
 * Convert image element to pptxgen image
 */
function addImageElement(pptxSlide: any, element: ImageElement) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    rotate: element.rotation,
    sizing: { type: element.objectFit === 'contain' ? 'contain' : 'cover' }
  }

  if (element.borderRadius > 0) {
    options.rounding = true
  }

  // Add image (src should be data URL or http URL)
  pptxSlide.addImage({
    ...options,
    data: element.src,
    altText: element.alt || 'Image'
  })
}

/**
 * Convert shape element to pptxgen shape
 */
function addShapeElement(pptxSlide: any, element: ShapeElement) {
  // Map our shape types to pptxgen shape types
  const shapeTypeMap: Record<string, string> = {
    rectangle: 'rect',
    'rounded-rectangle': 'roundRect',
    circle: 'ellipse',
    ellipse: 'ellipse',
    triangle: 'triangle',
    diamond: 'diamond',
    'arrow-right': 'rightArrow',
    'arrow-left': 'leftArrow',
    'arrow-up': 'upArrow',
    'arrow-down': 'downArrow',
    star: 'star5',
    hexagon: 'hexagon',
    line: 'line'
  }

  const pptxShapeType = shapeTypeMap[element.shapeType] || 'rect'

  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    rotate: element.rotation,
    fill: { color: hexToPptxColor(element.fill) }
  }

  if (element.strokeWidth > 0) {
    options.line = {
      color: hexToPptxColor(element.strokeColor),
      width: element.strokeWidth,
      dashType: element.strokeStyle === 'dashed' ? 'dash' : element.strokeStyle === 'dotted' ? 'dot' : 'solid'
    }
  }

  if (element.gradient) {
    // Simplified gradient support
    options.fill = {
      color: hexToPptxColor(element.gradient.stops[0]?.color || element.fill)
    }
  }

  pptxSlide.addShape(pptxShapeType, options)
}

/**
 * Convert code element to pptxgen text box with code formatting
 */
function addCodeElement(pptxSlide: any, element: CodeElement) {
  const defaultBg = element.theme === 'dark' ? '1E1E1E' : 'F5F5F5'
  const bgColor = element.backgroundColor ? hexToPptxColor(element.backgroundColor) : defaultBg

  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fontSize: element.fontSize / 2,
    fontFace: 'Courier New',
    align: 'left',
    valign: 'top',
    color: element.textColor ? hexToPptxColor(element.textColor) : element.theme === 'dark' ? 'FFFFFF' : '000000',
    fill: { color: bgColor },
    rotate: element.rotation,
    margin: element.padding ? pxToInches(element.padding) : undefined,
    shadow: element.shadow ? { type: 'outer', blur: 6, offset: 3, opacity: 0.2, color: '000000' } : undefined
  }

  if ((element.borderRadius ?? 0) > 0) {
    options.rectRadius = pxToInches(element.borderRadius)
  }

  if ((element.borderWidth ?? 0) > 0) {
    options.border = {
      pt: element.borderWidth,
      color: hexToPptxColor(element.borderColor || '#333333')
    }
  }

  const codeLines = element.code.split('\n')
  const displayCode = element.showLineNumbers
    ? codeLines.map((line, i) => `${(i + 1).toString().padStart(3, ' ')} | ${line}`).join('\n')
    : element.code

  pptxSlide.addText(displayCode, options)
}

/**
 * Convert video element to placeholder image (videos can't be embedded in PPTX via pptxgenjs)
 */
function addVideoPlaceholder(pptxSlide: any, element: VideoElement) {
  const options: any = {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y),
    w: pxToInches(element.size.width),
    h: pxToInches(element.size.height),
    fill: { color: '000000' },
    rotate: element.rotation
  }

  // Add a dark rectangle with text indicating video
  pptxSlide.addShape('rect', options)

  pptxSlide.addText('🎥 Video', {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y + element.size.height / 2 - 20),
    w: pxToInches(element.size.width),
    h: pxToInches(40),
    fontSize: 24,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle'
  })

  // Add URL as text below
  pptxSlide.addText(element.src, {
    x: pxToInches(element.position.x),
    y: pxToInches(element.position.y + element.size.height / 2 + 20),
    w: pxToInches(element.size.width),
    h: pxToInches(30),
    fontSize: 12,
    color: 'CCCCCC',
    align: 'center',
    valign: 'middle'
  })
}

/**
 * Add background to slide
 */
function addBackground(pptxSlide: any, background: SlideData['background']) {
  if (background.type === 'solid' && background.color) {
    pptxSlide.background = { color: hexToPptxColor(background.color) }
  } else if (background.type === 'gradient' && background.gradient) {
    // Simplified: use first color from gradient
    const firstColor = background.gradient.stops[0]?.color || '#ffffff'
    pptxSlide.background = { color: hexToPptxColor(firstColor) }
  } else if (background.type === 'image' && background.imageUrl) {
    pptxSlide.background = { data: background.imageUrl }
  }
  // Video backgrounds not supported - use solid color fallback
}

/**
 * Export slides to PowerPoint (.pptx)
 */
export async function exportToPptx(slides: SlideData[], theme: SlideTheme, title: string): Promise<boolean> {
  try {
    const pptx = new pptxgen()

    // Set presentation properties
    pptx.author = 'NEWWORK Slides'
    pptx.company = 'NEWWORK'
    pptx.subject = title
    pptx.title = title

    // Set default slide size (16:9 widescreen)
    pptx.layout = 'LAYOUT_WIDE'

    // Process each slide
    slides.forEach(slideData => {
      const pptxSlide = pptx.addSlide()

      // Add background
      addBackground(pptxSlide, slideData.background)

      // Add all elements sorted by zIndex
      const sortedElements = [...slideData.elements].sort((a, b) => a.zIndex - b.zIndex)

      sortedElements.forEach((element: AnySlideElement) => {
        switch (element.type) {
          case 'text':
            addTextElement(pptxSlide, element as TextElement, theme)
            break
          case 'image':
            addImageElement(pptxSlide, element as ImageElement)
            break
          case 'shape':
            addShapeElement(pptxSlide, element as ShapeElement)
            break
          case 'code':
            addCodeElement(pptxSlide, element as CodeElement)
            break
          case 'video':
            addVideoPlaceholder(pptxSlide, element as VideoElement)
            break
        }
      })

      // Add speaker notes if present
      if (slideData.notes) {
        pptxSlide.addNotes(slideData.notes)
      }
    })

    // Generate and download the file
    const fileName = `${sanitizeFilename(title)}.pptx`
    await pptx.writeFile({ fileName })

    return true
  } catch (err) {
    console.error('[pptxExport] Export error:', err)
    return false
  }
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_')
}
