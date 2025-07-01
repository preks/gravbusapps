export const getActivityByLeadId = `
  query getActivityByLeadId($id: uuid!, $offset: Int, $limit: Int) {
    SalesActivity(where: {leadId: {_eq: $id}}, offset: $offset, limit: $limit) {
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

export default getActivityByLeadId;