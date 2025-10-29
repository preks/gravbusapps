import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CrmDocumentQueryVariables {
  opportunityId: string
}

export interface CrmDocumentData {
  version: number
  id: string
  name: string
  createdAt: string
  documentType: {
    value: string
  }
  file?: string
  mimeType?: string
  fileSize?: number
  createdBy: string
}

export interface CrmDocumentResponse {
  CrmDocument: CrmDocumentData[]
}

export const GET_CRM_DOCUMENTS = (): string => {
  return `
    query GetCrmDocuments($opportunityId: uuid!) {
      CrmDocument(where: {opportunity: {id: {_eq: $opportunityId}}, isDeleted: {_eq: false}}) {
        version
        id
        name
        createdAt
        documentType {
          value
        }
        file
        mimeType
        fileSize
        createdBy
      }
    }
  `
}

export const useGetCrmDocuments = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchCrmDocuments = async (variables: CrmDocumentQueryVariables) => {
    const query = GET_CRM_DOCUMENTS(variables)
    try {
      const result = await graphQLClient.request<CrmDocumentResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching CRM documents:', error)
      throw error
    }
  }

  return { fetchCrmDocuments }
}
