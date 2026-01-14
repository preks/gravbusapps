import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useEmployeeDocumentPdfFileService,
  type HasEmployeeDocument,
  type PrintPdfResult
} from './useEmployeeDocumentPdfFileService'

export type PrintPlanResult = PrintPdfResult
export type { HasEmployeeDocument }

export const useExpensePlanFileService = (props: BusinessAppContextProps) => {
  const { printEmployeeDocumentPdf, isMounted } = useEmployeeDocumentPdfFileService(props)

  return {
    printExpensePlan: printEmployeeDocumentPdf,
    isMounted
  }
}
