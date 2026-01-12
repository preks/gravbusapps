import { useCallback, useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FileClient } from '@/common/network/files/FileClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface EmployeeDocumentRef {
  file?: string | null
  name?: string | null
  employee?: { id?: string | null } | null
}

export interface HasEmployeeDocument {
  code?: string | null
  employeeDocument?: EmployeeDocumentRef | null
  employee?: { id?: string | null } | null
}

export interface PrintPdfResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

const extractFileId = (fileUrl: string): string | null => {
  const cleaned = fileUrl.split('?')[0].trim()
  if (!cleaned) return null
  const last = cleaned.split('/').filter(Boolean).pop()
  return last || null
}

export const useEmployeeDocumentPdfFileService = (props: BusinessAppContextProps) => {
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fileClient = useMemo(() => {
    const client = new FileClient()
    if (props.accessToken) {
      client.setAccessToken(props.accessToken)
    }
    return client
  }, [props.accessToken])

  const printEmployeeDocumentPdf = useCallback(
    async (record: HasEmployeeDocument): Promise<PrintPdfResult> => {
      if (!props.accessToken) {
        return {
          success: false,
          error: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.employee_document_pdf.error.missing_access_token',
            'Access token missing'
          )
        }
      }

      const fileUrl = record.employeeDocument?.file
      if (!fileUrl || !String(fileUrl).trim()) {
        return {
          success: false,
          error: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.employee_document_pdf.error.no_file',
            'No employee document file available'
          )
        }
      }

      const employeeId =
        record.employee?.id || record.employeeDocument?.employee?.id || props.userInfo?.employeeDetails?.employeeId

      if (!employeeId) {
        return {
          success: false,
          error: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.employee_document_pdf.error.no_employee_id',
            'No employee ID available for file path'
          )
        }
      }

      const fileId = extractFileId(String(fileUrl))
      if (!fileId) {
        return {
          success: false,
          error: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.employee_document_pdf.error.no_file_id',
            'No file ID available for printing'
          )
        }
      }

      try {
        const blob = await fileClient.getFile(
          { accessScope: 'tenant', fileId },
          { appName: 'employee-profile', folderPath: `/documents/${employeeId}` }
        )

        return {
          success: true,
          pdfUrl: URL.createObjectURL(blob)
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses.employee_document_pdf.error.unknown',
                'Unknown error occurred'
              )
        return { success: false, error: message }
      }
    },
    [fileClient, props.accessToken, props.userInfo?.employeeDetails?.employeeId]
  )

  return { printEmployeeDocumentPdf, isMounted }
}
