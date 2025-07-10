export const getActivityByOpportunityId = `
  query GetActivityByOpportunityId($id: uuid!, $offset: Int, $limit: Int) {
    SalesActivity(where: {opportunityId: {_eq: $id}}, offset: $offset, limit: $limit) {
      accountId
      version
      title
      leadId
      opportunityId
      ownerEmployeeId
    ownerEmployee {
      firstName
      lastName
    }
    createdAt
    description
    activityType {
      code
      id
      type
      value
    }
  }
}
`;

