/**
 * Export Utilities for PagedDocumentEditor
 *
 * Handles exporting documents to Word (.docx) and PDF formats
 * with proper page break support.
 */

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
  const htmlDoc = buildPrintHtmlDocument(options)
  const printWindow = window.open('about:blank', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    console.error('[exportUtils] Print window blocked')
    return
  }

  try {
    // Write the content directly instead of navigating to a generated URL.
    // This avoids passing a dynamic URL into window.open (Snyk Open Redirect sink).
    printWindow.document.open()
    printWindow.document.write(htmlDoc)
    printWindow.document.close()
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
  // TipTap can directly convert to HTML, but this is a fallback
  // if we're working with raw JSON
  if (!jsonContent || typeof jsonContent !== 'object') {
    return ''
  }

  // This would need the TipTap editor instance to properly convert
  // For now, return empty string as we're using editor.getHTML()
  return ''
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

export default {
  exportToWord,
  exportToPDF,
  exportToHTML,
  exportToText,
  prepareContentForExport,
  jsonToHtml
}
