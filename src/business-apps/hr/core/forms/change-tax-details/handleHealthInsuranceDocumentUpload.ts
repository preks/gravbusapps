import { DOCUMENT_GROUP_SALARY } from './constants'
import type { TaxInfoFormValues } from './types'
import { PROCESSES_BASE_URL } from '@/common/utils/serviceResolver'

export type UploadFileFn = (
  file: File,
  scope: { accessScope: string },
  opts: { appName: string; folderPath: string; mimeType: string },
  fieldName: string
) => Promise<{ fileInfo?: { fileId: string; fileMetadata?: { originalFileName?: string; mimeType?: string } } }>

export async function executeHealthInsuranceDocumentUpload(
  file: File,
  values: TaxInfoFormValues,
  employeeId: string,
  accessToken: string,
  fileClient: { uploadFile: UploadFileFn }
): Promise<string | undefined> {
  if (!file || !employeeId || !accessToken) return undefined
  const uploadResp = await fileClient.uploadFile(
    file,
    { accessScope: 'tenant' },
    {
      appName: 'employee-profile',
      folderPath: `/documents/${employeeId}`,
      mimeType: (file as any)?.type || 'application/octet-stream'
    },
    'fileContent'
  )
  const processesBase = PROCESSES_BASE_URL
  const createDocUrl = `${processesBase}/employee/employeeDocuments`
  const body = {
    employeeDocument: {
      employeeId,
      documentGroup: DOCUMENT_GROUP_SALARY,
      type: values.healthInsuranceDocumentTypeId || null,
      description: '',
      name: uploadResp?.fileInfo?.fileMetadata?.originalFileName,
      file: uploadResp?.fileInfo?.fileId,
      mimeType: uploadResp?.fileInfo?.fileMetadata?.mimeType,
      fileSize: 0,
      validFrom: new Date().toISOString(),
      validTo: values.healthInsuranceDocumentValidTo
        ? new Date(values.healthInsuranceDocumentValidTo).toISOString()
        : null
    }
  }
  const response = await fetch(createDocUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : ''
    },
    body: JSON.stringify(body)
  })
  const json = await response.json()
  return json?.employeeDocument?.id
}
