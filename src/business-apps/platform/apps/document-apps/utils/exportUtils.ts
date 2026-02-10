/**
 * Export Utilities for PagedDocumentEditor
 *
 * Handles exporting documents to Word (.docx) and PDF formats
 * with proper page break support.
 */

import DOMPurify from 'dompurify'
import JSZip from 'jszip'

/**
 * Escape plain text for safe insertion into HTML text nodes / <title>
 */
export function escapeHtmlText(text: string): string {
  return (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Lightweight export sanitizer to reduce risk when embedding editor HTML into print/export documents.
 * This is not a full HTML sanitizer, but it removes the most dangerous primitives:
 * - script/iframe/object/embed tags
 * - inline event handlers (on*)
 * - dangerous URL protocols in href/src
 * - inline styles (style=...) to avoid CSS-based injection vectors
 */
export function sanitizeHtmlForExport(html: string): string {
  if (!html) return ''

  // Prefer DOMPurify when available (browser context). Snyk recognizes it as a sanitizer.
  try {
    if (typeof window !== 'undefined') {
      return DOMPurify.sanitize(html, {
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['style']
      })
    }
  } catch {
    // Fall back to regex-based stripping below.
  }

  let out = html

  // Remove potentially executable / embeddable tags completely
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
  out = out.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
  out = out.replace(/<embed[\s\S]*?>/gi, '')

  // Remove inline event handlers (quoted or unquoted)
  out = out.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')

  // Remove inline styles entirely (safer for exports/print)
  out = out.replace(/\s+style\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')

  // Remove dangerous protocols in href/src (keep attribute-less element instead)
  out = out.replace(/\s+(href|src)\s*=\s*(["']?)\s*(javascript:|data:text\/html)[\s\S]*?\2/gi, '')

  return out
}

export interface PrintHtmlDocumentOptions {
  title: string
  htmlContent: string
  includeTitleHeading?: boolean
  extraCss?: string
}

export function buildPrintHtmlDocument({
  title,
  htmlContent,
  includeTitleHeading = false,
  extraCss = ''
}: PrintHtmlDocumentOptions): string {
  const safeTitle = escapeHtmlText(title || 'Document')
  const safeBodyHtml = sanitizeHtmlForExport(htmlContent)
  const titleHeading = includeTitleHeading ? `<h1>${safeTitle}</h1>` : ''

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="referrer" content="no-referrer">
    <title>${safeTitle}</title>
    <style>
      @page { size: A4; margin: 1in; }
      body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 0; }
      h1 { font-size: 24pt; margin: 0 0 12pt 0; }
      h2 { font-size: 18pt; margin: 18pt 0 10pt 0; }
      h3 { font-size: 14pt; margin: 16pt 0 8pt 0; }
      h4, h5, h6 { font-size: 12pt; margin: 14pt 0 6pt 0; }
      p { margin: 0 0 10pt 0; }
      ul, ol { padding-left: 24pt; margin: 0 0 10pt 0; }
      li { margin-bottom: 4pt; }
      blockquote { border-left: 3pt solid #ccc; padding-left: 12pt; margin: 12pt 0; color: #555; font-style: italic; }
      table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
      td, th { border: 1px solid #333; padding: 6pt 8pt; }
      th { background: #f0f0f0; font-weight: bold; }
      pre { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 8pt; font-family: 'Courier New', monospace; font-size: 10pt; white-space: pre-wrap; }
      code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f0f0f0; padding: 2pt 4pt; }
      img { max-width: 100%; height: auto; }
      a { color: #0066cc; text-decoration: underline; }
      .page-break { page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0; border: none; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break { page-break-after: always; break-after: page; height: 0; border: none; }
      }
      ${extraCss}
    </style>
  </head>
  <body>
    ${titleHeading}
    ${safeBodyHtml}
  </body>
</html>`
}

export function printHtmlDocument(options: PrintHtmlDocumentOptions): void {
  const { title, htmlContent, includeTitleHeading = false, extraCss = '' } = options
  const safeTitleText = title || 'Document'
  const sanitizedBodyHtml = DOMPurify.sanitize(sanitizeHtmlForExport(htmlContent), {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style']
  })

  const printWindow = window.open('about:blank', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    console.error('[exportUtils] Print window blocked')
    return
  }

  try {
    const doc = printWindow.document

    // Reset head/body (about:blank might already have them)
    while (doc.head.firstChild) doc.head.removeChild(doc.head.firstChild)
    while (doc.body.firstChild) doc.body.removeChild(doc.body.firstChild)

    const metaCharset = doc.createElement('meta')
    metaCharset.setAttribute('charset', 'utf-8')

    const metaReferrer = doc.createElement('meta')
    metaReferrer.setAttribute('name', 'referrer')
    metaReferrer.setAttribute('content', 'no-referrer')

    const titleEl = doc.createElement('title')
    titleEl.textContent = safeTitleText

    const styleEl = doc.createElement('style')
    styleEl.textContent = `
      @page { size: A4; margin: 1in; }
      body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 0; }
      h1 { font-size: 24pt; margin: 0 0 12pt 0; }
      h2 { font-size: 18pt; margin: 18pt 0 10pt 0; }
      h3 { font-size: 14pt; margin: 16pt 0 8pt 0; }
      h4, h5, h6 { font-size: 12pt; margin: 14pt 0 6pt 0; }
      p { margin: 0 0 10pt 0; }
      ul, ol { padding-left: 24pt; margin: 0 0 10pt 0; }
      li { margin-bottom: 4pt; }
      blockquote { border-left: 3pt solid #ccc; padding-left: 12pt; margin: 12pt 0; color: #555; font-style: italic; }
      table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
      td, th { border: 1px solid #333; padding: 6pt 8pt; }
      th { background: #f0f0f0; font-weight: bold; }
      pre { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 8pt; font-family: 'Courier New', monospace; font-size: 10pt; white-space: pre-wrap; }
      code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f0f0f0; padding: 2pt 4pt; }
      img { max-width: 100%; height: auto; }
      a { color: #0066cc; text-decoration: underline; }
      .page-break { page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0; border: none; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break { page-break-after: always; break-after: page; height: 0; border: none; }
      }
      ${extraCss}
    `

    doc.head.append(metaCharset, metaReferrer, titleEl, styleEl)

    if (includeTitleHeading) {
      const heading = doc.createElement('h1')
      heading.textContent = safeTitleText
      doc.body.appendChild(heading)
    }

    const container = doc.createElement('div')
    // Sanitized via DOMPurify above.
    container.innerHTML = sanitizedBodyHtml
    doc.body.appendChild(container)
  } catch {
    console.error('[exportUtils] Failed to prepare print window')
    try {
      printWindow.close()
    } catch {}
    return
  }

  const doPrint = () => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (error) {
      console.error('[exportUtils] Print failed:', error)
    } finally {
      // Give the print dialog a moment to open before we clean up.
      setTimeout(() => {
        try {
          printWindow.close()
        } catch {}
      }, 1000)
    }
  }

  // Try to print once the new document loads, with a fallback timer.
  try {
    printWindow.addEventListener('load', () => setTimeout(doPrint, 50), { once: true })
  } catch {
    // ignore
  }
  setTimeout(doPrint, 800)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener noreferrer'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Convert HTML content to Word-compatible markup
 */
function htmlToWordML(html: string): string {
  // Clean up the HTML and convert page breaks
  const content = html
    // Convert page breaks to Word-compatible format
    .replace(/<div[^>]*data-page-break[^>]*>.*?<\/div>/gi, '<br clear="all" style="page-break-after:always"/>')
    // Clean up empty paragraphs that might interfere
    .replace(/<p><\/p>/gi, '<p>&nbsp;</p>')

  return content
}

/**
 * Export document to Word format (.docx)
 *
 * Uses HTML-to-DOCX conversion with proper page break handling
 */
export async function exportToWord(title: string, htmlContent: string): Promise<void> {
  // Convert HTML to Word-compatible format
  const wordContent = htmlToWordML(sanitizeHtmlForExport(htmlContent))
  const safeTitle = escapeHtmlText(title || 'Document')

  // Create Word document using HTML
  const wordDoc = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>${safeTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4;
          margin: 1in;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          margin: 0;
          padding: 0;
        }
        h1 { font-size: 24pt; font-weight: bold; margin: 0 0 12pt 0; }
        h2 { font-size: 18pt; font-weight: bold; margin: 18pt 0 10pt 0; }
        h3 { font-size: 14pt; font-weight: bold; margin: 16pt 0 8pt 0; }
        h4, h5, h6 { font-size: 12pt; font-weight: bold; margin: 14pt 0 6pt 0; }
        p { margin: 0 0 10pt 0; }
        ul, ol { padding-left: 24pt; margin: 0 0 10pt 0; }
        li { margin-bottom: 4pt; }
        blockquote {
          border-left: 3pt solid #ccc;
          padding-left: 12pt;
          margin: 12pt 0;
          color: #555;
          font-style: italic;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 12pt 0;
        }
        td, th {
          border: 1pt solid #333;
          padding: 6pt 8pt;
        }
        th {
          background: #f0f0f0;
          font-weight: bold;
        }
        pre {
          background: #f5f5f5;
          border: 1pt solid #e0e0e0;
          padding: 8pt;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          white-space: pre-wrap;
        }
        code {
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          background: #f0f0f0;
          padding: 2pt 4pt;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        /* Page break styles */
        br[style*="page-break"] {
          page-break-after: always;
          mso-break-type: section-break;
        }
        .page-break {
          page-break-after: always;
          mso-break-type: section-break;
        }
      </style>
    </head>
    <body>
      ${wordContent}
    </body>
    </html>
  `

  // Create blob and download
  const blob = new Blob([wordDoc], {
    type: 'application/msword'
  })

  downloadBlob(blob, `${sanitizeFilename(title)}.doc`)
}

/**
 * Export document to PDF format
 *
 * Uses browser's print to PDF functionality with proper page breaks
 */
export async function exportToPDF(title: string, htmlContent: string): Promise<void> {
  // Convert page breaks for print/PDF
  const pdfContent = htmlContent.replace(/<div[^>]*data-page-break[^>]*>.*?<\/div>/gi, '<div class="page-break"></div>')
  printHtmlDocument({ title, htmlContent: pdfContent })
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 200) || // Limit length
    'document'
  )
}

/**
 * Get HTML content optimized for export
 * Processes the editor HTML to be more compatible with external formats
 */
export function prepareContentForExport(htmlContent: string): string {
  let content = htmlContent

  // Ensure all images have proper alt text
  content = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('alt=')) {
      return `<img${attrs} alt="Document image">`
    }
    return match
  })

  // Convert data URIs to proper image references if needed
  // (This would need additional implementation for server-side image storage)

  return content
}

/**
 * Convert TipTap JSON to HTML for export
 * Used when working with JSON content instead of HTML
 */
export function jsonToHtml(jsonContent: unknown): string {
  // TipTap can directly convert to HTML via editor.getHTML(), but some backends might store JSON.
  // This helper is best-effort and guarantees a non-constant return shape.
  if (typeof jsonContent === 'string') {
    return jsonContent
  }

  if (!jsonContent || typeof jsonContent !== 'object') {
    return ''
  }

  // Common convenience shape: { html: "<p>...</p>" }
  if ('html' in jsonContent && typeof (jsonContent as { html?: unknown }).html === 'string') {
    return (jsonContent as { html: string }).html
  }

  // Fallback: preserve content for export/debug in a safe way.
  const asJson = JSON.stringify(jsonContent, null, 2)
  return `<pre>${escapeHtmlText(asJson)}</pre>`
}

/**
 * Export document to HTML format
 * Downloads the document as a standalone HTML file
 */
export async function exportToHTML(title: string, htmlContent: string): Promise<void> {
  const safeTitle = escapeHtmlText(title || 'Document')
  const safeBodyHtml = sanitizeHtmlForExport(htmlContent)
  const htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeTitle}</title>
      <style>
        body {
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
          background: #fff;
        }
        h1 { font-size: 24pt; font-weight: bold; margin: 0 0 12pt 0; }
        h2 { font-size: 18pt; font-weight: bold; margin: 18pt 0 10pt 0; }
        h3 { font-size: 14pt; font-weight: bold; margin: 16pt 0 8pt 0; }
        h4, h5, h6 { font-size: 12pt; font-weight: bold; margin: 14pt 0 6pt 0; }
        p { margin: 0 0 10pt 0; }
        ul, ol { padding-left: 24pt; margin: 0 0 10pt 0; }
        li { margin-bottom: 4pt; }
        blockquote {
          border-left: 3pt solid #ccc;
          padding-left: 12pt;
          margin: 12pt 0;
          color: #555;
          font-style: italic;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 12pt 0;
        }
        td, th {
          border: 1pt solid #333;
          padding: 6pt 8pt;
        }
        th {
          background: #f0f0f0;
          font-weight: bold;
        }
        pre {
          background: #f5f5f5;
          border: 1pt solid #e0e0e0;
          padding: 8pt;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          white-space: pre-wrap;
        }
        code {
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          background: #f0f0f0;
          padding: 2pt 4pt;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        a {
          color: #0066cc;
          text-decoration: underline;
        }
        mark {
          background-color: yellow;
          padding: 0 2pt;
        }
      </style>
    </head>
    <body>
      ${safeBodyHtml}
    </body>
    </html>
  `

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(title)}.html`)
}

/**
 * Export document to plain text format
 * Strips all HTML tags and downloads as .txt
 */
export async function exportToText(title: string, htmlContent: string): Promise<void> {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = sanitizeHtmlForExport(htmlContent)

  // Get plain text content
  let textContent = tempDiv.textContent || tempDiv.innerText || ''

  // Clean up extra whitespace
  textContent = textContent
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove triple+ line breaks
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .trim()

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(title)}.txt`)
}

/**
 * Export document to ODF format (.odt)
 *
 * Builds an ODF-compliant ZIP archive with content.xml, styles.xml,
 * manifest, and mimetype. Uses JSZip for ZIP creation.
 */
export async function exportToOdt(title: string, htmlContent: string): Promise<void> {
  const safeHtml = sanitizeHtmlForExport(htmlContent)
  const odfContent = htmlToOdfXml(safeHtml)
  const safeTitle = escapeHtmlText(title || 'Document')

  const zip = new JSZip()

  // mimetype MUST be first entry and uncompressed (ODF spec requirement)
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })

  // META-INF/manifest.xml
  zip.file(
    'META-INF/manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`
  )

  // meta.xml
  const now = new Date().toISOString()
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>
    <dc:title>${safeTitle}</dc:title>
    <dc:date>${now}</dc:date>
    <meta:creation-date>${now}</meta:creation-date>
    <meta:generator>NEWWORK Document Apps</meta:generator>
  </office:meta>
</office:document-meta>`
  )

  // styles.xml (basic document styles)
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.35cm"/>
      <style:text-properties fo:font-family="'Times New Roman'" fo:font-size="12pt" fo:language="en" fo:country="US"/>
    </style:default-style>
    <style:style style:name="Heading_1" style:family="paragraph" style:class="text">
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading_2" style:family="paragraph" style:class="text">
      <style:text-properties fo:font-size="18pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading_3" style:family="paragraph" style:class="text">
      <style:text-properties fo:font-size="14pt" fo:font-weight="bold"/>
    </style:style>
  </office:styles>
</office:document-styles>`
  )

  // content.xml
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Bold" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Italic" style:family="text">
      <style:text-properties fo:font-style="italic"/>
    </style:style>
    <style:style style:name="BoldItalic" style:family="text">
      <style:text-properties fo:font-weight="bold" fo:font-style="italic"/>
    </style:style>
    <style:style style:name="Underline" style:family="text">
      <style:text-properties style:text-underline-style="solid" style:text-underline-width="auto"/>
    </style:style>
    <style:style style:name="Strikethrough" style:family="text">
      <style:text-properties style:text-line-through-style="solid"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${odfContent}
    </office:text>
  </office:body>
</office:document-content>`
  )

  // Generate the ZIP and download
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.text',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  downloadBlob(blob, `${sanitizeFilename(title)}.odt`)
}

/**
 * Convert HTML content to ODF XML elements.
 * Maps common HTML tags to their ODF text:* equivalents.
 */
function htmlToOdfXml(html: string): string {
  if (!html) return '      <text:p/>'

  // Parse the HTML using a temporary DOM element
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  const odfParts: string[] = []
  convertHtmlChildrenToOdf(tempDiv, odfParts, 6)

  return odfParts.join('\n') || '      <text:p/>'
}

/**
 * Recursively convert HTML children to ODF XML.
 */
function convertHtmlChildrenToOdf(parent: Node, parts: string[], indent: number): void {
  const pad = ' '.repeat(indent)

  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        parts.push(`${pad}<text:p>${escapeOdfText(text)}</text:p>`)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      switch (tag) {
        case 'p': {
          const content = convertInlineHtmlToOdf(el)
          parts.push(`${pad}<text:p>${content}</text:p>`)
          break
        }
        case 'h1':
          parts.push(`${pad}<text:h text:outline-level="1">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'h2':
          parts.push(`${pad}<text:h text:outline-level="2">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'h3':
          parts.push(`${pad}<text:h text:outline-level="3">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'h4':
          parts.push(`${pad}<text:h text:outline-level="4">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'h5':
          parts.push(`${pad}<text:h text:outline-level="5">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'h6':
          parts.push(`${pad}<text:h text:outline-level="6">${convertInlineHtmlToOdf(el)}</text:h>`)
          break
        case 'ul':
        case 'ol':
          convertHtmlListToOdf(el, parts, indent)
          break
        case 'table':
          convertHtmlTableToOdf(el, parts, indent)
          break
        case 'blockquote': {
          // Convert blockquote paragraphs as indented text
          const bqChildren = el.querySelectorAll('p')
          if (bqChildren.length > 0) {
            bqChildren.forEach(p => {
              parts.push(`${pad}<text:p>${convertInlineHtmlToOdf(p)}</text:p>`)
            })
          } else {
            parts.push(`${pad}<text:p>${convertInlineHtmlToOdf(el)}</text:p>`)
          }
          break
        }
        case 'br':
          // Line break within a paragraph context gets handled by inline converter
          break
        case 'hr':
          parts.push(`${pad}<text:p/>`)
          break
        case 'div':
          // Recurse into div wrappers
          convertHtmlChildrenToOdf(el, parts, indent)
          break
        default:
          // For unknown block elements, try to convert as paragraph
          if (el.textContent?.trim()) {
            parts.push(`${pad}<text:p>${convertInlineHtmlToOdf(el)}</text:p>`)
          }
          break
      }
    }
  }
}

/**
 * Convert inline HTML content to ODF inline elements.
 */
function convertInlineHtmlToOdf(element: HTMLElement): string {
  let result = ''

  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i]

    if (node.nodeType === Node.TEXT_NODE) {
      result += escapeOdfText(node.textContent || '')
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      switch (tag) {
        case 'strong':
        case 'b':
          result += `<text:span text:style-name="Bold">${convertInlineHtmlToOdf(el)}</text:span>`
          break
        case 'em':
        case 'i':
          result += `<text:span text:style-name="Italic">${convertInlineHtmlToOdf(el)}</text:span>`
          break
        case 'u':
          result += `<text:span text:style-name="Underline">${convertInlineHtmlToOdf(el)}</text:span>`
          break
        case 's':
        case 'del':
        case 'strike':
          result += `<text:span text:style-name="Strikethrough">${convertInlineHtmlToOdf(el)}</text:span>`
          break
        case 'a': {
          const href = el.getAttribute('href') || ''
          result += `<text:a xlink:type="simple" xlink:href="${escapeOdfText(href)}">${convertInlineHtmlToOdf(el)}</text:a>`
          break
        }
        case 'br':
          result += '<text:line-break/>'
          break
        case 'span':
          // Pass through spans, converting children
          result += convertInlineHtmlToOdf(el)
          break
        default:
          result += convertInlineHtmlToOdf(el)
          break
      }
    }
  }

  return result
}

/**
 * Convert an HTML list to ODF.
 */
function convertHtmlListToOdf(listEl: HTMLElement, parts: string[], indent: number): void {
  const pad = ' '.repeat(indent)
  parts.push(`${pad}<text:list>`)

  const items = listEl.querySelectorAll(':scope > li')
  items.forEach(li => {
    parts.push(`${pad}  <text:list-item>`)

    // Convert paragraphs inside the list item
    const paragraphs = li.querySelectorAll(':scope > p')
    if (paragraphs.length > 0) {
      paragraphs.forEach(p => {
        parts.push(`${pad}    <text:p>${convertInlineHtmlToOdf(p as HTMLElement)}</text:p>`)
      })
    } else {
      // No <p> wrapper, treat direct text content
      parts.push(`${pad}    <text:p>${convertInlineHtmlToOdf(li as HTMLElement)}</text:p>`)
    }

    // Handle nested lists
    const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol')
    nestedLists.forEach(nested => {
      convertHtmlListToOdf(nested as HTMLElement, parts, indent + 4)
    })

    parts.push(`${pad}  </text:list-item>`)
  })

  parts.push(`${pad}</text:list>`)
}

/**
 * Convert an HTML table to ODF.
 */
function convertHtmlTableToOdf(tableEl: HTMLElement, parts: string[], indent: number): void {
  const pad = ' '.repeat(indent)
  parts.push(`${pad}<table:table>`)

  const rows = tableEl.querySelectorAll('tr')
  rows.forEach(row => {
    parts.push(`${pad}  <table:table-row>`)

    const cells = row.querySelectorAll('td, th')
    cells.forEach(cell => {
      const colspan = cell.getAttribute('colspan')
      const spanAttr = colspan ? ` table:number-columns-spanned="${colspan}"` : ''
      parts.push(
        `${pad}    <table:table-cell${spanAttr}><text:p>${convertInlineHtmlToOdf(cell as HTMLElement)}</text:p></table:table-cell>`
      )
    })

    parts.push(`${pad}  </table:table-row>`)
  })

  parts.push(`${pad}</table:table>`)
}

/**
 * Escape text for use in ODF XML.
 */
function escapeOdfText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default {
  exportToWord,
  exportToPDF,
  exportToHTML,
  exportToText,
  exportToOdt,
  prepareContentForExport,
  jsonToHtml
}
