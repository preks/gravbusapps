import { CONTENT_ENTRY_REACTION_FRAGMENT } from './fragments/contentFragments'

export interface ContentReactionQueryParams {
  contentEntryId: string
  reaction?: string | null
  groupBy?: boolean
}

export const buildContentReactionsVariables = (params: ContentReactionQueryParams): Record<string, any> => {
  const where: Record<string, any> = {
    contentEntryId: { _eq: params.contentEntryId },
    isDeleted: { _eq: false }
  }

  if (params.reaction) {
    where.reaction = { _eq: params.reaction }
  }

  return { where }
}

export const buildContentReactionsQuery = (params: Pick<ContentReactionQueryParams, 'groupBy'> = {}): string => {
  if (params.groupBy) {
    return `
      query getContentReactionsGrouped($where: ContentEntryReactionBoolExp!) {
        ContentEntryReaction(where: $where) {
          reaction
          creatorEmployeeId
          creatorEmployee {
            id
            displayName
            picture
          }
        }
      }
    `
  }

  return `
    query getContentReactions($where: ContentEntryReactionBoolExp!) {
      ContentEntryReaction(where: $where orderBy: { createdAt: DESC }) {
        ${CONTENT_ENTRY_REACTION_FRAGMENT}
      }
      ContentEntryReactionAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}
