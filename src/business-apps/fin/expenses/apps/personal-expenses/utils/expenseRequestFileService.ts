import { useCallback, useMemo, useRef, useEffect } from 'react'
import { FileClient } from '@/common/network/files/FileClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ExpenseRequest {
  id: string
  code: string
  title: string
  status: string
  employeeDocument?: {
    file?: string
    name?: string
  } | null
}

export interface PrintRequestResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

export const useExpenseRequestFileService = (props: BusinessAppContextProps) => {
  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true)

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Create FileClient with proper authorization
  const fileClient = useMemo(() => {
    const client = new FileClient()
    // Set authorization header if we have an access token
    if (props.accessToken) {
      client.setAccessToken(props.accessToken)
    }
    return client
  }, [props.accessToken])

  const printExpenseRequest = useCallback(
    async (record: ExpenseRequest): Promise<PrintRequestResult> => {
      if (!record.employeeDocument?.file) {
        return {
          success: false,
          error: 'No employee document file ID available for printing'
        }
      }

      try {
        const employeeId = props.userInfo?.employeeDetails?.employeeId

        if (!employeeId) {
          return {
            success: false,
            error: 'No employee ID available for file path'
          }
        }

        // Extract file ID from the file URL like in expense items
        const fileId = record.employeeDocument.file?.split('/').pop()

        if (!fileId) {
          return {
            success: false,
            error: 'No file ID available for printing'
          }
        }

        // Fetch the PDF file using FileClient with proper authorization
        const blob = await fileClient.getFile(
          {
            accessScope: 'tenant',
            fileId
          },
          {
            appName: 'employee-profile',
            folderPath: `/documents/${employeeId}`
          }
        )

        // Create an object URL from the blob for secure viewing
        const objectUrl = URL.createObjectURL(blob)

        return {
          success: true,
          pdfUrl: objectUrl
        }
      } catch {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    },
    [fileClient, props.userInfo?.employeeDetails?.employeeId, props.accessToken]
  )

  return {
    printExpenseRequest,
    isMounted
  }
}
