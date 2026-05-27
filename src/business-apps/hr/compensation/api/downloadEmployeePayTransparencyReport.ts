import { buildFilename } from '@/common/utils/excelExportUtils'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'

function parseFilenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) {
    return fallback
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const plainMatch = /filename=([^;]+)/i.exec(header)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return fallback
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) {
    return 'pdf'
  }
  if (contentType.includes('pdf')) {
    return 'pdf'
  }
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
    return 'xlsx'
  }
  if (contentType.includes('csv')) {
    return 'csv'
  }
  return 'pdf'
}

export async function downloadEmployeePayTransparencyReport(
  accessToken: string,
  employeeId: string
): Promise<{ blob: Blob; filename: string }> {
  if (!accessToken) {
    throw new Error('Access token missing')
  }
  if (!employeeId) {
    throw new Error('Employee ID missing')
  }

  const baseUrl = EMPLOYEES_API_URL.endsWith('/') ? EMPLOYEES_API_URL.slice(0, -1) : EMPLOYEES_API_URL
  const url = `${baseUrl}/compensation-analyzer/pay-transparency/${encodeURIComponent(employeeId)}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'same-origin',
    mode: 'cors'
  })

  if (!response.ok) {
    throw new Error(`Pay transparency download failed (${response.status})`)
  }

  const blob = await response.blob()
  const extension = extensionFromContentType(response.headers.get('Content-Type'))
  const fallbackFilename = buildFilename(`pay-transparency-${employeeId}`, extension)
  const filename = parseFilenameFromContentDisposition(response.headers.get('Content-Disposition'), fallbackFilename)

  return { blob, filename }
}
