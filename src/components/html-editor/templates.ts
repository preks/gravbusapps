import { EditorElement } from './types'

/**
 * Design System HTML Templates
 * These templates generate proper HTML with design system classes
 */

/**
 * Local placeholder image as data URI (400x200 SVG)
 * Avoids external network calls and privacy concerns
 */
const PLACEHOLDER_IMAGE_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjQwMCB4IDIwMDwvdGV4dD48L3N2Zz4='

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
const escapeHtml = (text: string): string => {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => htmlEscapeMap[char])
}

/**
 * Escapes HTML attribute values
 */
const escapeAttribute = (value: string): string => {
  return escapeHtml(value)
}

/**
 * Validates and sanitizes URLs to prevent javascript: and data: XSS
 * Only allows http, https, and safe data URIs
 */
const sanitizeUrl = (url: string): string => {
  const trimmed = url.trim().toLowerCase()

  // Allow http and https
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return escapeAttribute(url)
  }

  // Allow data URIs only for images (base64 encoded)
  if (trimmed.startsWith('data:image/')) {
    return escapeAttribute(url)
  }

  // Allow relative URLs and anchors
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return escapeAttribute(url)
  }

  // Block everything else (javascript:, vbscript:, data:text/html, etc.)
  return '#'
}

/**
 * Converts width values to Tailwind width classes with gba: prefix
 */
const getWidthClass = (width: string): string => {
  const trimmed = width.trim().toLowerCase()

  // Map common percentage values to Tailwind classes
  const widthMap: Record<string, string> = {
    '100%': 'gba:w-full',
    '75%': 'gba:w-3/4',
    '66.666667%': 'gba:w-2/3',
    '50%': 'gba:w-1/2',
    '33.333333%': 'gba:w-1/3',
    '25%': 'gba:w-1/4',
    auto: 'gba:w-auto',
    full: 'gba:w-full'
  }

  // Return mapped class or default to full width
  return widthMap[trimmed] || 'gba:w-full'
}

export const generateElementHtml = (element: EditorElement): string => {
  switch (element.type) {
    case 'heading': {
      const level = element.config?.level || 1
      const sizeClasses = {
        1: 'gba:text-4xl gba:font-bold',
        2: 'gba:text-3xl gba:font-bold',
        3: 'gba:text-2xl gba:font-semibold',
        4: 'gba:text-xl gba:font-semibold',
        5: 'gba:text-lg gba:font-medium',
        6: 'gba:text-base gba:font-medium'
      }
      return `<h${level} class="${sizeClasses[level]} gba:text-foreground gba:mb-4">${escapeHtml(element.content)}</h${level}>`
    }

    case 'paragraph': {
      const alignment = element.config?.alignment || 'left'
      const size = element.config?.size || 'base'

      // Explicit alignment mapping to prevent Tailwind purging
      const alignmentMap: Record<string, string> = {
        left: 'gba:text-left',
        center: 'gba:text-center',
        right: 'gba:text-right',
        justify: 'gba:text-justify'
      }
      const alignClass = alignmentMap[alignment] || 'gba:text-left'

      // Explicit size mapping to prevent Tailwind purging
      const sizeMap: Record<string, string> = {
        xs: 'gba:text-xs',
        sm: 'gba:text-sm',
        base: '',
        lg: 'gba:text-lg',
        xl: 'gba:text-xl',
        '2xl': 'gba:text-2xl'
      }
      const sizeClass = sizeMap[size] || ''

      return `<p class="gba:text-foreground gba:mb-2 ${alignClass} ${sizeClass}">${escapeHtml(element.content)}</p>`
    }

    case 'text': {
      const alignment = element.config?.alignment || 'left'
      const weight = element.config?.weight || 'normal'
      const size = element.config?.size || 'base'

      // Explicit alignment mapping to prevent Tailwind purging
      const alignmentMap: Record<string, string> = {
        left: 'gba:text-left',
        center: 'gba:text-center',
        right: 'gba:text-right',
        justify: 'gba:text-justify'
      }
      const alignClass = alignmentMap[alignment] || 'gba:text-left'

      // Explicit weight mapping to prevent Tailwind purging
      const weightMap: Record<string, string> = {
        normal: '',
        light: 'gba:font-light',
        medium: 'gba:font-medium',
        semibold: 'gba:font-semibold',
        bold: 'gba:font-bold'
      }
      const weightClass = weightMap[weight] || ''

      // Explicit size mapping to prevent Tailwind purging
      const sizeMap: Record<string, string> = {
        xs: 'gba:text-xs',
        sm: 'gba:text-sm',
        base: '',
        lg: 'gba:text-lg',
        xl: 'gba:text-xl',
        '2xl': 'gba:text-2xl'
      }
      const sizeClass = sizeMap[size] || ''

      return `<p class="gba:text-foreground gba:mb-2 ${alignClass} ${weightClass} ${sizeClass}">${escapeHtml(element.content)}</p>`
    }

    case 'card': {
      const variant = element.config?.variant || 'default'
      const padding = element.config?.padding || 'md'

      const variantClass =
        variant === 'outlined' ? 'gba:border gba:border-input' : variant === 'elevated' ? 'gba:shadow-md' : ''
      const paddingClass = {
        sm: 'gba:p-3',
        md: 'gba:p-4',
        lg: 'gba:p-6'
      }[padding]

      return `<div class="gba:rounded-lg gba:bg-card gba:text-card-foreground ${variantClass} ${paddingClass} gba:mb-4">${escapeHtml(element.content)}</div>`
    }

    case 'table': {
      const columns = element.config?.columns || []
      const rows = element.config?.rows || []

      if (columns.length === 0) {
        return `<div class="gba:text-muted-foreground gba:text-sm gba:p-4 gba:border gba:border-dashed gba:rounded">[Empty Table - Configure columns and rows]</div>`
      }

      let html = '<table class="gba:w-full gba:border-collapse gba:mb-4">'
      html += '<thead><tr class="gba:border-b gba:border-input">'
      columns.forEach(col => {
        html += `<th class="gba:text-left gba:p-2 gba:font-semibold gba:text-foreground">${escapeHtml(col.label)}</th>`
      })
      html += '</tr></thead>'

      html += '<tbody>'
      rows.forEach(row => {
        html += '<tr class="gba:border-b gba:border-input">'
        columns.forEach(col => {
          html += `<td class="gba:p-2 gba:text-foreground">${escapeHtml(row[col.key] || '')}</td>`
        })
        html += '</tr>'
      })
      html += '</tbody></table>'

      return html
    }

    case 'list': {
      const listType = element.config?.listType || 'ul'
      const items = element.config?.items || []

      if (items.length === 0) {
        return `<div class="gba:text-muted-foreground gba:text-sm gba:p-4 gba:border gba:border-dashed gba:rounded">[Empty List - Add items]</div>`
      }

      const Tag = listType
      const listClass = listType === 'ul' ? 'gba:list-disc' : 'gba:list-decimal'
      let html = `<${Tag} class="${listClass} gba:pl-6 gba:mb-4 gba:text-foreground">`
      items.forEach(item => {
        html += `<li class="gba:mb-1">${escapeHtml(item.text)}</li>`
      })
      html += `</${Tag}>`

      return html
    }

    case 'divider': {
      return '<hr class="gba:border-t gba:border-input gba:my-6" />'
    }

    case 'spacer': {
      const height = element.config?.height || 'md'
      const heightClass = {
        sm: 'gba:h-4',
        md: 'gba:h-8',
        lg: 'gba:h-12',
        xl: 'gba:h-16'
      }[height]
      return `<div class="${heightClass}"></div>`
    }

    case 'image': {
      const src = element.config.src || PLACEHOLDER_IMAGE_DATA_URI
      const alt = element.config.alt || 'Image'
      const width = element.config.width || '100%'
      const widthClass = getWidthClass(width)

      return `<img src="${sanitizeUrl(src)}" alt="${escapeAttribute(alt)}" class="gba:rounded-md gba:mb-4 gba:h-auto ${widthClass}" />`
    }

    case 'button': {
      const buttonVariant = element.config?.buttonVariant || 'default'
      const buttonSize = element.config?.buttonSize || 'md'
      const href = element.config?.href || '#'

      const variantClass = {
        default: 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90',
        outline: 'gba:border gba:border-input gba:bg-background hover:gba:bg-accent hover:gba:text-accent-foreground',
        ghost: 'hover:gba:bg-accent hover:gba:text-accent-foreground'
      }[buttonVariant]

      const sizeClass = {
        sm: 'gba:px-3 gba:py-1.5 gba:text-sm',
        md: 'gba:px-4 gba:py-2 gba:text-base',
        lg: 'gba:px-6 gba:py-3 gba:text-lg'
      }[buttonSize]

      return `<a href="${sanitizeUrl(href)}" class="gba:inline-flex gba:items-center gba:justify-center gba:rounded-md gba:font-medium gba:transition-colors ${variantClass} ${sizeClass} gba:mb-4">${escapeHtml(element.label)}</a>`
    }

    default:
      return ''
  }
}

/**
 * Default element templates for quick insertion
 */
export const DEFAULT_ELEMENTS: Record<string, Partial<EditorElement>> = {
  heading: {
    type: 'heading',
    content: 'Heading Text',
    colSpan: 12,
    config: { level: 1 }
  },
  paragraph: {
    type: 'paragraph',
    content: 'Paragraph text goes here.',
    colSpan: 12,
    config: { alignment: 'left', size: 'base' }
  },
  text: {
    type: 'text',
    content: 'Text goes here.',
    colSpan: 12,
    config: { alignment: 'left', weight: 'normal', size: 'base' }
  },
  card: {
    type: 'card',
    content: 'Card content',
    colSpan: 6,
    config: { variant: 'outlined', padding: 'md' }
  },
  table: {
    type: 'table',
    content: '',
    colSpan: 12,
    config: {
      columns: [
        { key: 'col1', label: 'Column 1' },
        { key: 'col2', label: 'Column 2' }
      ],
      rows: [
        { col1: 'Row 1 Col 1', col2: 'Row 1 Col 2' },
        { col1: 'Row 2 Col 1', col2: 'Row 2 Col 2' }
      ]
    }
  },
  list: {
    type: 'list',
    content: '',
    colSpan: 6,
    config: {
      listType: 'ul',
      items: [
        { id: crypto.randomUUID(), text: 'List item 1' },
        { id: crypto.randomUUID(), text: 'List item 2' },
        { id: crypto.randomUUID(), text: 'List item 3' }
      ]
    }
  },
  divider: {
    type: 'divider',
    colSpan: 12
  },
  spacer: {
    type: 'spacer',
    colSpan: 12,
    config: { height: 'md' }
  },
  image: {
    type: 'image',
    colSpan: 6,
    config: {
      src: PLACEHOLDER_IMAGE_DATA_URI,
      alt: 'Placeholder image',
      width: '100%'
    }
  },
  button: {
    type: 'button',
    label: 'Click Here',
    colSpan: 3,
    config: {
      buttonVariant: 'default',
      buttonSize: 'md',
      href: '#'
    }
  }
}
