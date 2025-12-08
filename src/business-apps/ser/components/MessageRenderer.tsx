/**
 * MessageRenderer Component
 *
 * A shared component for rendering messages with support for:
 * - Markdown formatting (headings, lists, links, code, etc.)
 * - HTML content (with XSS sanitization)
 * - Plain text with whitespace preservation
 *
 * Features:
 * - Auto-detection of content format
 * - Configurable variants for different contexts
 * - Safe HTML rendering with sanitization
 * - Consistent styling with design tokens
 */

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type MessageFormat = 'auto' | 'markdown' | 'html' | 'text'
export type MessageVariant = 'default' | 'compact' | 'card' | 'inline'

export interface MessageRendererProps {
  /** The content to render */
  content: string
  /** Format of the content - 'auto' will detect based on content */
  format?: MessageFormat
  /** Visual variant of the renderer */
  variant?: MessageVariant
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing */
  'data-testid'?: string
  /** Whether to allow links to open in new tab */
  openLinksInNewTab?: boolean
  /** Maximum height with scroll (in pixels) - undefined for no limit */
  maxHeight?: number
}

// Allowed HTML tags for sanitization
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'b',
  'i',
  'u',
  's',
  'strong',
  'em',
  'mark',
  'small',
  'sub',
  'sup',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'span',
  'div',
  'blockquote',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'img'
])

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  '*': new Set(['class', 'id', 'style'])
}

/**
 * Convert newlines to <br> tags in HTML content
 * Preserves newlines inside <pre> and <code> tags
 */
const convertNewlinesToBr = (html: string): string => {
  // First, convert \n to <br> outside of pre/code blocks
  // Simple approach: replace \n with <br> then let the HTML parser handle it
  return html.replace(/\n/g, '<br>')
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
const sanitizeHtml = (html: string): string => {
  // Convert newlines to <br> tags first
  const htmlWithBr = convertNewlinesToBr(html)

  // Create a temporary div to parse HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlWithBr, 'text/html')

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true)
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      const tagName = element.tagName.toLowerCase()

      // Skip disallowed tags
      if (!ALLOWED_TAGS.has(tagName)) {
        // Return text content for disallowed tags (strip the tag but keep content)
        const fragment = document.createDocumentFragment()
        element.childNodes.forEach(child => {
          const sanitized = sanitizeNode(child)
          if (sanitized) fragment.appendChild(sanitized)
        })
        return fragment
      }

      // Create new element with only allowed attributes
      const newElement = document.createElement(tagName)
      const allowedAttrs = new Set([...(ALLOWED_ATTRIBUTES[tagName] || []), ...(ALLOWED_ATTRIBUTES['*'] || [])])

      Array.from(element.attributes).forEach(attr => {
        if (allowedAttrs.has(attr.name)) {
          // Special handling for href to prevent javascript: URLs
          if (attr.name === 'href') {
            const href = attr.value.trim().toLowerCase()
            if (href.startsWith('javascript:') || href.startsWith('data:')) {
              return // Skip dangerous URLs
            }
          }
          // Special handling for src to prevent javascript: URLs
          if (attr.name === 'src') {
            const src = attr.value.trim().toLowerCase()
            if (src.startsWith('javascript:') || src.startsWith('data:text/html')) {
              return // Skip dangerous URLs
            }
          }
          // Filter out dangerous CSS in style attribute
          if (attr.name === 'style') {
            const safeStyle = attr.value
              .replace(/expression\s*\(/gi, '')
              .replace(/javascript\s*:/gi, '')
              .replace(/behavior\s*:/gi, '')
            newElement.setAttribute(attr.name, safeStyle)
            return
          }
          newElement.setAttribute(attr.name, attr.value)
        }
      })

      // Recursively sanitize children
      element.childNodes.forEach(child => {
        const sanitized = sanitizeNode(child)
        if (sanitized) newElement.appendChild(sanitized)
      })

      return newElement
    }

    return null
  }

  const sanitizedBody = document.createElement('div')
  doc.body.childNodes.forEach(child => {
    const sanitized = sanitizeNode(child)
    if (sanitized) sanitizedBody.appendChild(sanitized)
  })

  return sanitizedBody.innerHTML
}

/**
 * Detect content format based on content analysis
 */
const detectFormat = (content: string): Exclude<MessageFormat, 'auto'> => {
  if (!content) return 'text'

  const trimmed = content.trim()

  // Check for HTML tags
  const htmlTagPattern = /<\/?[a-z][\s\S]*?>/i
  if (htmlTagPattern.test(trimmed)) {
    return 'html'
  }

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headings
    /^\*\s|\-\s|\+\s/m, // Unordered lists
    /^\d+\.\s/m, // Ordered lists
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /__[^_]+__/, // Bold (underscore)
    /_[^_]+_/, // Italic (underscore)
    /`[^`]+`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /\[([^\]]+)\]\([^)]+\)/, // Links
    /!\[([^\]]*)\]\([^)]+\)/, // Images
    /^\s*>\s/m, // Blockquotes
    /^\s*---\s*$/m, // Horizontal rules
    /^\|.*\|$/m // Tables
  ]

  for (const pattern of markdownPatterns) {
    if (pattern.test(trimmed)) {
      return 'markdown'
    }
  }

  return 'text'
}

/**
 * Get variant-specific classes
 */
const getVariantClasses = (variant: MessageVariant): string => {
  switch (variant) {
    case 'compact':
      return 'gba:text-xs gba:leading-tight'
    case 'card':
      return 'gba:bg-muted/20 gba:rounded-lg gba:p-4 gba:border gba:border-muted/40'
    case 'inline':
      return 'gba:inline'
    case 'default':
    default:
      return ''
  }
}

/**
 * Preprocess content to ensure newlines work in markdown
 * Converts single \n to two spaces + \n (markdown line break syntax)
 */
const preprocessForMarkdown = (text: string): string => {
  // Don't process if already has markdown line breaks (two spaces before newline)
  // or if it's inside code blocks
  const lines = text.split('\n')
  const processedLines: string[] = []
  let inCodeBlock = false

  for (const line of lines) {
    // Check for code block start/end
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      processedLines.push(line)
      continue
    }

    // Don't add trailing spaces in code blocks
    if (inCodeBlock) {
      processedLines.push(line)
      continue
    }

    // Add two trailing spaces for line break if line doesn't already end with spaces
    // and is not empty (empty lines become paragraph breaks naturally)
    if (line.trim() !== '' && !line.endsWith('  ')) {
      processedLines.push(line + '  ')
    } else {
      processedLines.push(line)
    }
  }

  return processedLines.join('\n')
}

/**
 * MessageRenderer Component
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({
  content,
  format = 'auto',
  variant = 'default',
  className = '',
  'data-testid': testId,
  openLinksInNewTab = true,
  maxHeight
}) => {
  // Determine the actual format to use
  const actualFormat = useMemo(() => {
    if (format === 'auto') {
      return detectFormat(content)
    }
    return format
  }, [content, format])

  // Sanitized HTML content (memoized)
  const sanitizedContent = useMemo(() => {
    if (actualFormat === 'html') {
      return sanitizeHtml(content)
    }
    return content
  }, [content, actualFormat])

  // Preprocessed markdown content (ensures \n creates line breaks)
  const markdownContent = useMemo(() => {
    if (actualFormat === 'markdown') {
      return preprocessForMarkdown(content)
    }
    return content
  }, [content, actualFormat])

  // Base classes
  const baseClasses = 'gba:text-sm gba:text-muted-foreground gba:leading-relaxed'
  const variantClasses = getVariantClasses(variant)
  const scrollClasses = maxHeight ? 'gba:overflow-y-auto' : ''

  // Combine all classes
  const combinedClasses = [baseClasses, variantClasses, scrollClasses, className].filter(Boolean).join(' ')

  // Style object for max height
  const style: React.CSSProperties = maxHeight ? { maxHeight: `${maxHeight}px` } : {}

  // Render based on format
  if (actualFormat === 'text') {
    return (
      <div className={`${combinedClasses} gba:whitespace-pre-wrap`} data-testid={testId} style={style}>
        {content}
      </div>
    )
  }

  if (actualFormat === 'html') {
    return (
      <div
        className={`${combinedClasses} message-renderer-html`}
        data-testid={testId}
        style={style}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    )
  }

  // Markdown rendering
  return (
    <div className={`${combinedClasses} gba:prose gba:prose-sm gba:max-w-none`} data-testid={testId} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="gba:text-xl gba:font-bold gba:mb-3 gba:mt-4 gba:text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="gba:text-lg gba:font-semibold gba:mb-2 gba:mt-3 gba:text-foreground" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="gba:text-base gba:font-semibold gba:mb-2 gba:mt-3 gba:text-foreground" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="gba:text-sm gba:font-semibold gba:mb-1 gba:mt-2 gba:text-foreground" {...props}>
              {children}
            </h4>
          ),
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="gba:list-disc gba:ml-6 gba:mb-2 gba:space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="gba:list-decimal gba:ml-6 gba:mb-2 gba:space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="gba:text-muted-foreground" {...props}>
              {children}
            </li>
          ),
          // Links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="gba:text-primary gba:underline hover:gba:text-primary/80 gba:transition-colors"
              target={openLinksInNewTab ? '_blank' : undefined}
              rel={openLinksInNewTab ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="gba:mb-2 gba:last:mb-0" {...props}>
              {children}
            </p>
          ),
          // Code
          code: ({ children, className, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:text-foreground"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children, ...props }) => (
            <pre
              className="gba:bg-muted gba:p-3 gba:rounded-lg gba:overflow-x-auto gba:text-xs gba:font-mono gba:mb-2"
              {...props}
            >
              {children}
            </pre>
          ),
          // Blockquote
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="gba:border-l-4 gba:border-primary/30 gba:pl-4 gba:italic gba:text-muted-foreground gba:my-2"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: ({ ...props }) => <hr className="gba:border-border gba:my-4" {...props} />,
          // Strong/Bold
          strong: ({ children, ...props }) => (
            <strong className="gba:font-semibold gba:text-foreground" {...props}>
              {children}
            </strong>
          ),
          // Emphasis/Italic
          em: ({ children, ...props }) => (
            <em className="gba:italic" {...props}>
              {children}
            </em>
          ),
          // Tables
          table: ({ children, ...props }) => (
            <div className="gba:overflow-x-auto gba:mb-2">
              <table className="gba:min-w-full gba:border-collapse gba:text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="gba:bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="gba:border gba:border-border gba:px-3 gba:py-2 gba:text-left gba:font-medium gba:text-foreground"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="gba:border gba:border-border gba:px-3 gba:py-2" {...props}>
              {children}
            </td>
          ),
          // Images
          img: ({ src, alt, ...props }) => (
            <img src={src} alt={alt || ''} className="gba:max-w-full gba:h-auto gba:rounded gba:my-2" {...props} />
          )
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  )
}

export default MessageRenderer
