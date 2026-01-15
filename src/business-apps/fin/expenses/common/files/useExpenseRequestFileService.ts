import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeDocumentPdfFileService, type PrintPdfResult } from './useEmployeeDocumentPdfFileService'

export type PrintRequestResult = PrintPdfResult
export type { HasEmployeeDocument } from './useEmployeeDocumentPdfFileService'

export const useExpenseRequestFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  return {
    printExpenseRequest: printEmployeeDocumentPdf,
    isMounted
  }
}
