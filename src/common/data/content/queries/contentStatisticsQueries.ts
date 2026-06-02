import { ContentRole } from '../constants/contentConstants'

export const buildContentStatisticsVariables = (): Record<string, any> => ({
  rootRole: ContentRole.ROOT,
  commentRole: ContentRole.COMMENT
})

export const buildContentStatisticsQuery = (): string => {
  return `
    query getContentStatistics($rootRole: String!, $commentRole: String!) {
      totalEntries: ContentEntryAggregate(
        where: { 
          role: { _eq: $rootRole }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalComments: ContentEntryAggregate(
        where: { 
          role: { _eq: $commentRole }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalReactions: ContentEntryReactionAggregate(
        where: { isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
      totalDocuments: ContentDocumentAggregate(
        where: { isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}
