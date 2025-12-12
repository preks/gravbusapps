/**
 * Document Export Utilities
 * Export documents to Word (.docx) and PDF formats
 */

/**
 * Export document content to Word (.docx) format
 */
export async function exportToWord(title: string, htmlContent: string): Promise<void> {
  // Create a Blob with Word-compatible HTML
  const wordContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
        h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; }
        h2 { font-size: 18pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; }
        h3 { font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 10pt; }
        p { margin-bottom: 10pt; }
        ul, ol { margin-left: 24pt; margin-bottom: 10pt; }
        li { margin-bottom: 6pt; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `

  const blob = new Blob([wordContent], {
    type: 'application/vnd.ms-word;charset=utf-8'
  })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilename(title)}.doc`

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Export document content to PDF format
 * Uses browser's print functionality for now
 */
export async function exportToPDF(title: string, htmlContent: string): Promise<void> {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.')
  }

  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @media print {
          body { 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt; 
            line-height: 1.6;
            margin: 1in;
          }
        }
        body { 
          font-family: 'Times New Roman', serif; 
          font-size: 12pt; 
          line-height: 1.6;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
        }
        h1 { 
          font-size: 24pt; 
          font-weight: bold; 
          margin-bottom: 24pt;
          text-align: center;
        }
        h2 { 
          font-size: 16pt; 
          font-weight: bold; 
          margin-top: 24pt; 
          margin-bottom: 12pt; 
        }
        h3 { 
          font-size: 14pt; 
          font-weight: bold; 
          margin-top: 18pt; 
          margin-bottom: 10pt; 
        }
        p { margin-bottom: 12pt; text-align: justify; }
        ul, ol { margin-left: 36pt; margin-bottom: 12pt; }
        li { margin-bottom: 8pt; }
        strong { font-weight: bold; }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.write(pdfContent)
  printWindow.document.close()
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
