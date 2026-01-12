import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useEmployeeDocumentPdfFileService,
  type HasEmployeeDocument,
  type PrintPdfResult
} from './useEmployeeDocumentPdfFileService'

export type PrintRequestResult = PrintPdfResult

export const useExpenseRequestFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  const printExpenseRequest = (record: HasEmployeeDocument): Promise<PrintRequestResult> => {
    return printEmployeeDocumentPdf(record)
  }

  return { printExpenseRequest, isMounted }
}
