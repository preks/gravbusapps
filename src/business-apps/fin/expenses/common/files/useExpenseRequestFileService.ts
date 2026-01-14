import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useEmployeeDocumentPdfFileService,
  type HasEmployeeDocument,
  type PrintPdfResult
} from './useEmployeeDocumentPdfFileService'

export type PrintRequestResult = PrintPdfResult
export type { HasEmployeeDocument }

export const useExpenseRequestFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  return {
    printExpenseRequest: printEmployeeDocumentPdf,
    isMounted
  }
}
