export const getActivityByLeadId = `
  query GetActivityByLeadId($id: ID!, $limit: Int, $offset: Int) {
    SalesActivity(
      where: { leadId: { _eq: $id } }
      limit: $limit
      offset: $offset
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      title
      leadId
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