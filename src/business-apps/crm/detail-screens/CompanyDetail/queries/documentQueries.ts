export interface DocumentData {
  id: string;
  name: string;
  createdAt: string;
  fileSize: number;
  mimeType: string;
  fileId?: string;
  fileUrl?: string;
  additionalProperties?: any;
}

export interface GetDocumentsResponse {
  CrmDocument: DocumentData[];
  CrmDocumentAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_DOCUMENTS_BY_ACCOUNT = `
  query GetDocumentsByAccount(
    $accountId: uuid!
    $limit: Int
    $offset: Int
  ) {
    CrmDocument(
      where: { accountId: { _eq: $accountId } }
      orderBy: { createdAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      createdAt
      fileSize
      mimeType
      additionalProperties
    }
    CrmDocumentAggregate(
      where: { accountId: { _eq: $accountId } }
    ) {
      aggregate {
        count
      }
    }
  }
`;
