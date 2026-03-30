/**
 * Handles file uploads for workflow task completion.
 *
 * When a user completes a task form containing FILE-type fields, the local
 * File objects need to be uploaded to the tenant Files service so that
 * downstream workflow steps (e.g. AI agent tasks) can download them via
 * their ``downloadPath``.
 */

import { env } from '@/common/env/EnvUtils'

const FILES_ENDPOINT = env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT')

interface FileUploadResult {
  fileId: string
  fileName: string
  downloadPath: string
  mimeType: string
  fileSize?: number
}

function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    zip: 'application/zip'
  }
  return (ext && map[ext]) || 'application/octet-stream'
}

async function uploadSingleFile(file: File, accessToken: string, folderPath: string): Promise<FileUploadResult> {
  if (!FILES_ENDPOINT) {
    throw new Error('File service endpoint not configured (NEXT_PUBLIC_FILE_SERVICE_ENDPOINT)')
  }

  const mimeType = getMimeType(file)
  const url = `${FILES_ENDPOINT}/tenant/files?appName=cflow-task&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mimeType)}`

  const body = new FormData()
  body.append('fileContent', file, file.name)

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body
  })

  if (!res.ok) {
    throw new Error(`File upload failed (${res.status}): ${res.statusText}`)
  }

  const result = await res.json()
  const info = result?.fileInfo || result

  return {
    fileId: info?.fileId || `unknown-${Date.now()}`,
    fileName: info?.fileMetadata?.originalFileName || file.name,
    downloadPath: info?.path || '',
    mimeType,
    fileSize: file.size
  }
}

/**
 * Upload local File objects from FILE-type form fields and replace the raw
 * entries in ``processedFormData`` with server-side references.
 *
 * @returns A shallow copy of ``processedFormData`` with FILE fields updated.
 */
export async function uploadFilesForTaskCompletion(
  processedFormData: Record<string, any>,
  fileFields: any[],
  rawFormValues: Record<string, any>,
  accessToken: string,
  taskId: string
): Promise<Record<string, any>> {
  const updated = { ...processedFormData }

  for (const field of fileFields) {
    const fieldName = field.name || field.id
    const rawValue = rawFormValues[fieldName]
    if (!Array.isArray(rawValue) || rawValue.length === 0) continue

    const filesToUpload = rawValue.filter((item: any) => item?.originFileObj instanceof File && item.status !== 'error')

    if (filesToUpload.length === 0) continue

    const folderPath = `/cflow-tasks/${taskId}/attachments`
    const results: FileUploadResult[] = []

    for (const item of filesToUpload) {
      const result = await uploadSingleFile(item.originFileObj, accessToken, folderPath)
      results.push(result)
    }

    updated[fieldName] = results
  }

  return updated
}
