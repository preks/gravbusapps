import { ContentRole } from '../constants/contentConstants'

export const CONTENT_TYPE_FIELDS = `
  id
  version
  name
  nameI18n
  contentGroup
`

export const CONTENT_CATEGORY_FIELDS = `
  id
  version
  name
  nameI18n
`

export const CONTENT_TAG_FIELDS = `
  id
  version
  name
  nameI18n
`

export const buildContentTypesVariables = (contentGroup?: string | null): Record<string, any> => {
  const where: Record<string, any> = { isDeleted: { _eq: false } }

  if (contentGroup) {
    where.contentGroup = { _eq: contentGroup }
  }

  return {
    where,
    rootRole: ContentRole.ROOT
  }
}

export const buildContentTaxonomyVariables = (): Record<string, any> => ({
  rootRole: ContentRole.ROOT
})

export const buildContentTypesQuery = (): string => {
  return `
    query getContentTypes($where: ContentTypeBoolExp!, $rootRole: String!) {
      ContentType(where: $where orderBy: { name: ASC }) {
        ${CONTENT_TYPE_FIELDS}
        contentEntriesAggregate(where: { isDeleted: { _eq: false }, role: { _eq: $rootRole } }) {
          aggregate { count }
        }
      }
    }
  `
}

export const buildContentCategoriesQuery = (): string => {
  return `
    query getContentCategories($rootRole: String!) {
      ContentCategory(where: { isDeleted: { _eq: false } } orderBy: { name: ASC }) {
        ${CONTENT_CATEGORY_FIELDS}
        contentEntryCategoriesAggregate(
          where: {
            isDeleted: { _eq: false }
            contentEntry: { isDeleted: { _eq: false }, role: { _eq: $rootRole } }
          }
        ) {
          aggregate { count }
        }
      }
    }
  `
}

export const buildContentTagsQuery = (): string => {
  return `
    query getContentTags($rootRole: String!) {
      ContentTag(where: { isDeleted: { _eq: false } } orderBy: { name: ASC }) {
        ${CONTENT_TAG_FIELDS}
        contentEntryTagsAggregate(
          where: {
            isDeleted: { _eq: false }
            contentEntry: { isDeleted: { _eq: false }, role: { _eq: $rootRole } }
          }
        ) {
          aggregate { count }
        }
      }
    }
  `
}

export const buildContentTypesPaginatedQuery = (): string => `
  query getContentTypesPaginated($where: ContentTypeBoolExp!, $limit: Int!, $offset: Int!) {
    ContentType(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_TYPE_FIELDS}
    }
    ContentTypeAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildContentCategoriesPaginatedQuery = (): string => `
  query getContentCategoriesPaginated($where: ContentCategoryBoolExp!, $limit: Int!, $offset: Int!) {
    ContentCategory(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_CATEGORY_FIELDS}
    }
    ContentCategoryAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildContentTagsPaginatedQuery = (): string => `
  query getContentTagsPaginated($where: ContentTagBoolExp!, $limit: Int!, $offset: Int!) {
    ContentTag(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_TAG_FIELDS}
    }
    ContentTagAggregate(where: $where) {
      aggregate { count }
    }
  }
`
