import { InvestmentDocument } from '@/common/data/investment/types'
import { DocumentItem } from '@/common/components/common-relations/record-sections/document-section/DocumentSection'

/**
 * Transform InvestmentDocument to DocumentItem interface
 * Used by all IRM record components for DocumentSection
 */
export function transformInvestmentDocument(doc: InvestmentDocument): DocumentItem {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt,
    expirationDate: doc.expirationDate,
    documentType: doc.documentType
      ? {
          id: doc.documentType.id,
          value: doc.documentType.value || '',
          code: doc.documentType.code
        }
      : null,
    documentGroup: doc.documentGroup
      ? {
          id: doc.documentGroup.id,
          value: doc.documentGroup.value || '',
          code: doc.documentGroup.code
        }
      : null,
    fileInfo: doc.fileInfo,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdBy: doc.createdBy,
    parentDocument:
      typeof doc.parentDocument === 'object' ? (doc.parentDocument?.id ?? null) : (doc.parentDocument ?? null),
    folder: doc.folder === true,
    version: doc.version,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy
  }
}

/**
 * Transform array of InvestmentDocuments to DocumentItems
 */
export function transformInvestmentDocuments(docs: InvestmentDocument[]): DocumentItem[] {
  return docs.map(transformInvestmentDocument)
}
