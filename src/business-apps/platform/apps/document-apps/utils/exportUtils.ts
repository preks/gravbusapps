/**
 * Document Export Utilities
 *
 * Export documents to Word (.docx) and PDF formats.
 * Reuses patterns from the existing document-creator module.
 */

/**
 * Export document content to Word (.docx) format
 * Uses Word-compatible HTML format for maximum compatibility
 */
export async function exportToWord(title: string, htmlContent: string): Promise<void> {
  // Create Word-compatible HTML with proper namespaces
  const wordContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>${escapeHtml(title)}</title>
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
        /* Base document styles */
        @page {
          size: letter;
          margin: 1in;
        }
        body { 
          font-family: 'Calibri', 'Arial', sans-serif; 
          font-size: 11pt; 
          line-height: 1.5;
          color: #000000;
        }
        
        /* Headings */
        h1 { 
          font-size: 24pt; 
          font-weight: bold; 
          margin-top: 12pt;
          margin-bottom: 12pt;
          color: #000000;
        }
        h2 { 
          font-size: 18pt; 
          font-weight: bold; 
          margin-top: 18pt; 
          margin-bottom: 12pt;
          color: #000000;
        }
        h3 { 
          font-size: 14pt; 
          font-weight: bold; 
          margin-top: 14pt; 
          margin-bottom: 10pt;
          color: #000000;
        }
        h4, h5, h6 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 12pt;
          margin-bottom: 8pt;
          color: #000000;
        }
        
        /* Paragraphs and text */
        p { 
          margin-bottom: 10pt; 
        }
        
        /* Lists */
        ul, ol { 
          margin-left: 24pt; 
          margin-bottom: 10pt; 
        }
        li { 
          margin-bottom: 6pt; 
        }
        
        /* Blockquotes */
        blockquote {
          margin-left: 24pt;
          margin-right: 24pt;
          padding-left: 12pt;
          border-left: 4pt solid #cccccc;
          font-style: italic;
          color: #666666;
        }
        
        /* Tables */
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 12pt;
        }
        table, th, td {
          border: 1pt solid #000000;
        }
        th, td {
          padding: 6pt 8pt;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        
        /* Links */
        a {
          color: #0066cc;
          text-decoration: underline;
        }
        
        /* Images */
        img {
          max-width: 100%;
          height: auto;
        }
        
        /* Code blocks */
        pre, code {
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          background-color: #f5f5f5;
          padding: 2pt 4pt;
        }
        pre {
          padding: 12pt;
          margin-bottom: 12pt;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `

  // Create blob with Word MIME type
  const blob = new Blob([wordContent], {
    type: 'application/vnd.ms-word;charset=utf-8'
  })

  // Download
  downloadBlob(blob, `${sanitizeFilename(title)}.doc`)
}

/**
 * Export document content to PDF format
 * Uses browser's print functionality for reliable PDF generation
 */
export async function exportToPDF(title: string, htmlContent: string): Promise<void> {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.')
  }

  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        /* Print-specific styles */
        @page {
          size: letter;
          margin: 1in;
        }
        
        @media print {
          body { 
            margin: 0;
            padding: 0;
          }
        }
        
        /* Base document styles */
        body { 
          font-family: 'Georgia', 'Times New Roman', serif; 
          font-size: 12pt; 
          line-height: 1.6;
          max-width: 6.5in;
          margin: 0 auto;
          padding: 0.5in;
          color: #000000;
        }
        
        /* Title */
        .document-title {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 24pt;
          text-align: center;
        }
        
        /* Headings */
        h1 { 
          font-size: 20pt; 
          font-weight: bold; 
          margin-top: 24pt;
          margin-bottom: 12pt;
        }
        h2 { 
          font-size: 16pt; 
          font-weight: bold; 
          margin-top: 20pt; 
          margin-bottom: 10pt; 
        }
        h3 { 
          font-size: 14pt; 
          font-weight: bold; 
          margin-top: 16pt; 
          margin-bottom: 8pt; 
        }
        
        /* Paragraphs */
        p { 
          margin-bottom: 12pt; 
          text-align: justify; 
        }
        
        /* Lists */
        ul, ol { 
          margin-left: 36pt; 
          margin-bottom: 12pt; 
        }
        li { 
          margin-bottom: 8pt; 
        }
        
        /* Blockquotes */
        blockquote {
          margin: 16pt 24pt;
          padding-left: 12pt;
          border-left: 3pt solid #666666;
          font-style: italic;
        }
        
        /* Tables */
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 16pt 0;
        }
        th, td {
          border: 1pt solid #000000;
          padding: 8pt;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
        }
        
        /* Other elements */
        strong { font-weight: bold; }
        em { font-style: italic; }
        
        /* Links */
        a {
          color: #000000;
          text-decoration: underline;
        }
        
        /* Images */
        img {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
        
        /* Code */
        pre, code {
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }
        pre {
          background-color: #f5f5f5;
          padding: 12pt;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="document-title">${escapeHtml(title)}</div>
      ${htmlContent}
      <script>
        // Auto-print and close
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
          // Fallback: close after delay if onafterprint isn't supported
          setTimeout(function() {
            window.close();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.write(pdfContent)
  printWindow.document.close()
}

/**
 * Export document as HTML file
 */
export async function exportToHTML(title: string, htmlContent: string): Promise<void> {
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #333333;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        p { margin-bottom: 1em; }
        ul, ol { margin-left: 1.5em; margin-bottom: 1em; }
        li { margin-bottom: 0.5em; }
        blockquote {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 4px solid #ddd;
          color: #666;
        }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        img { max-width: 100%; height: auto; }
        pre { background-color: #f5f5f5; padding: 16px; overflow-x: auto; }
        code { background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        a { color: #0066cc; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${htmlContent}
    </body>
    </html>
  `

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(title)}.html`)
}

/**
 * Export document as plain text
 */
export async function exportToText(title: string, htmlContent: string): Promise<void> {
  // Convert HTML to plain text
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  // Get text content with some basic formatting preservation
  let text = `${title}\n${'='.repeat(title.length)}\n\n`

  const processNode = (node: Node, indent: string = ''): string => {
    let result = ''

    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent?.trim()
      if (textContent) {
        result += textContent + ' '
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      switch (tagName) {
        case 'h1':
          result += '\n' + element.textContent + '\n' + '='.repeat(element.textContent?.length || 0) + '\n\n'
          break
        case 'h2':
          result += '\n' + element.textContent + '\n' + '-'.repeat(element.textContent?.length || 0) + '\n\n'
          break
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          result += '\n' + element.textContent + '\n\n'
          break
        case 'p':
          result += element.textContent + '\n\n'
          break
        case 'br':
          result += '\n'
          break
        case 'li':
          result += indent + '- ' + element.textContent + '\n'
          break
        case 'ul':
        case 'ol':
          element.childNodes.forEach(child => {
            result += processNode(child, indent + '  ')
          })
          result += '\n'
          break
        case 'blockquote':
          result += '\n> ' + element.textContent?.replace(/\n/g, '\n> ') + '\n\n'
          break
        default:
          element.childNodes.forEach(child => {
            result += processNode(child, indent)
          })
      }
    }

    return result
  }

  text += processNode(tempDiv)

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(title)}.txt`)
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename for safe file download
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 200) || // Limit length
    'document'
  )
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, char => escapeMap[char])
}
