import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeDocumentPdfFileService, type PrintPdfResult } from './useEmployeeDocumentPdfFileService'

export type PrintPlanResult = PrintPdfResult
export type { HasEmployeeDocument } from './useEmployeeDocumentPdfFileService'

export const useExpensePlanFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  return {
    printExpensePlan: printEmployeeDocumentPdf,
    isMounted
  }
}
