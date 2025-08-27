export const getActivityByAccountId = `
  query GetActivityByAccountId($id: ID!, $limit: Int, $offset: Int) {
    SalesActivity(
      where: { accountId: { _eq: $id } }
      limit: $limit
      offset: $offset
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      title
      accountId
      opportunityId
      ownerEmployeeId
      createdBy
      createdAt
      description
      activityType {
        code
        id
        type
        value
      }
      type
    }
  }
`; 