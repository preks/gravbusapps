export const GET_OPPORTUNITIES = `
  query GetOpportunities($offset: Int, $limit: Int, $where: OpportunityBoolExp) {
    Opportunity(offset: $offset, limit: $limit, where: $where) {
      id
      version
      account {
        name
      }
      createdAt
      currency {
        id
      }
      name
      ownerEmployee {
        fullName
        id
      }
      estimatedAmount
      stage
      sourceApp
      salesPipelineRef
      salesPipelineStageRef
    }
  }
`;

export const GET_PIPELINES = `
  query GetPipelines {
    Pipeline {
      id
      name
      category
      isDefault
    }
  }
`;

export const GET_PIPELINE_STAGES = `
  query GetPipelineStages($pipelineId: String!) {
    Stage(where: { pipelineId: { _eq: $pipelineId } }) {
      id
      name
      pipelineId
      probability
      rotting
      rottingDays
      order
    }
  }
`;

export const GET_PIPELINE_OPPORTUNITIES = `
  query GetPipelineOpportunities($pipelineRef: String!) {
    Opportunity(where: { pipelineId: { _eq: $pipelineRef } }) {
      id
      title
      description
      value
      pipelineId
      stageId
      assignedTo
      createdAt
      updatedAt
      lastActivityAt
      company {
        name
      }
      tags
    }
  }
`;

export const UPDATE_OPPORTUNITY_STAGE = `
  mutation UpdateOpportunityStage($id: String!, $stageId: String!, $lastActivityAt: String!) {
    updateOpportunity(
      id: $id
      input: {
        stageId: $stageId
        lastActivityAt: $lastActivityAt
      }
    ) {
      id
      stageId
      lastActivityAt
    }
  }
`; 