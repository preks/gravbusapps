import { env } from '@/common/env/EnvUtils'

export const uploadEmployeeDocumentIfAny = async (
  fileClient: any,
  accessToken: string | undefined,
  fileList: any[],
  employeeId: string
): Promise<string | undefined> => {
  let uploadedEmployeeDocumentId: string | undefined
  try {
    if (fileList && fileList.length > 0 && fileList[0]?.originFileObj) {
      const file: File = fileList[0].originFileObj as File
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

      const processesBase = env('NEXT_PUBLIC_PROCESSES_ENDPOINT') || 'https://newwork-dev.newwork.com/processes'
      const createDocUrl = `${processesBase}/employee/employeeDocuments`
      const body = {
        employeeDocument: {
          employeeId: employeeId,
          documentGroup: 'DocumentGroup:v1:PERSONAL',
          type: 'DocumentType:v1:17',
          description: '',
          name: uploadResp?.fileInfo?.fileMetadata?.originalFileName,
          file: uploadResp?.fileInfo?.fileId,
          mimeType: uploadResp?.fileInfo?.fileMetadata?.mimeType,
          fileSize: 0,
          validFrom: new Date().toISOString()
        }
      } as any

      await fetch(createDocUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: accessToken ? `Bearer ${accessToken}` : ''
        },
        body: JSON.stringify(body)
      })
        .then(async r => {
          const json = await r.json()
          uploadedEmployeeDocumentId = json?.employeeDocument?.id
        })
        .catch(() => {
          uploadedEmployeeDocumentId = undefined
        })
    }
  } catch {
    uploadedEmployeeDocumentId = undefined
  }
  return uploadedEmployeeDocumentId
}
