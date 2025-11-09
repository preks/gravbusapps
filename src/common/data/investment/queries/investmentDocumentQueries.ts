/**
 * Investment Document Queries
 */

import { INVESTMENT_DOCUMENT } from './fragments/investmentFragments'

// Get investment documents with filtering
export const GET_INVESTMENT_DOCUMENTS = (): string => {
  return `
    query GetInvestmentDocuments(
      $limit: Int
      $offset: Int
      $where: InvestmentDocumentBoolExp
      $orderBy: [InvestmentDocumentOrderBy!]
    ) {
      InvestmentDocument(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${INVESTMENT_DOCUMENT}
      }
      InvestmentDocumentAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment documents by investment ID
export const GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID = (): string => {
  return GET_INVESTMENT_DOCUMENTS()
}
