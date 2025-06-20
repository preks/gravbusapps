export const deleteOpportunityMutation = `
  mutation DeleteOpportunity($id: uuid!) {
    deleteOpportunityByPk(id: $id) {
      id
    }
  }
`;

export default deleteOpportunityMutation;
