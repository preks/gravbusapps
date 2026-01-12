import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useEmployeeDocumentPdfFileService,
  type HasEmployeeDocument,
  type PrintPdfResult
} from './useEmployeeDocumentPdfFileService'

export type PrintPlanResult = PrintPdfResult

export const useExpensePlanFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  const printExpensePlan = (record: HasEmployeeDocument): Promise<PrintPlanResult> => {
    return printEmployeeDocumentPdf(record)
  }

  return { printExpensePlan, isMounted }
}
