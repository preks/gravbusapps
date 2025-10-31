export interface QueryVariables {
  articleId?: string
  offset: number
  limit: number
  search?: string
  articleTypeRef?: string
  articleGroupRef?: string
  tags?: string[]
  creationDate?: string
  sorter?: {
    field: string
    order: 'ascend' | 'descend'
  } | null
}

const getSortOrder = (order: 'ascend' | 'descend'): string => {
  return order === 'ascend' ? 'ASC' : 'DESC'
}

const buildOrderByClause = (sorter: QueryVariables['sorter']): string | null => {
  if (!sorter) return null
  const order = getSortOrder(sorter.order)
  return `{ ${sorter.field}: ${order} }`
}

const buildSearchCondition = (search?: string, articleId?: string): string => {
  if (articleId) return ''
  if (!search) return ''
  return `
    _or: [
      { title: { _ilike: "%${search}%" } },
      { authorFullName: { _ilike: "%${search}%" } },
      { articleGroupRef: { _ilike: "%${search}%" } },
      { createdAtText: { _ilike: "%${search}%" } }
    ]
  `
}

const buildFilterConditions = (variables: QueryVariables): string => {
  const { articleId, articleTypeRef, articleGroupRef, tags, creationDate } = variables

  if (articleId) {
    return `articleId: { _eq: "${articleId}" }`
  }

  const conditions = [
    articleTypeRef ? `{ articleTypeRef: { _ilike: "${articleTypeRef}" } }` : null,
    articleGroupRef ? `{ articleGroupRef: { _ilike: "${articleGroupRef}" } }` : null,
    creationDate ? `{ createdAt: { _gte: "${creationDate}" } }` : null
  ].filter(Boolean)

  if (tags && tags.length > 0) {
    conditions.push(`{ _or: [${tags.map(tag => `{ tagNames: { _contains: ["${tag}"] } }`).join(', ')}] }`)
  }

  return conditions.length ? `_and: [${conditions.join(', ')}]` : ''
}

export const GET_ALL_CONTENTS_QUERY = (variables: QueryVariables): string => {
  const { offset, limit, search, articleId } = variables

  const orderByClause = buildOrderByClause(variables.sorter)
  const searchCondition = buildSearchCondition(search, articleId)
  const filterConditions = buildFilterConditions(variables)
  const whereConditions = [searchCondition, filterConditions].filter(Boolean).join(',')
  const whereClause = whereConditions ? `${whereConditions} ` : ''

  return `
    query searchArticles {
      ArticleEmployeeView(
        limit: ${limit}, 
        offset: ${offset},
        where: { ${whereClause}}
        ${orderByClause ? `orderBy: ${orderByClause}` : ''}
      ) {
        allowComment
        allowFeedback
        allowLike
        allowRate
        articleId
        articleGroupRef
        articleTypeRef
        articleVersion
        attachments
        author
        authorFullName
        comments
        commentsCount
        content
        contentImage
        createdAt
        createdAtText
        displayAuthor
        endDate
        feedbacks
        feedbacksCount
        likesCount
        previewText
        rates
        ratesCount
        startDate
        status
        tagNames
        timeToRead
        title
      }
      ArticleEmployeeViewAggregate(
          where: {${whereClause}}
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_CONTENT_TAGS_QUERY = `
  query getTags ($tag: String){
    Tag(where: {tag : {_ilike: $tag}}){
      id
      tag
    }
  }
`

export const GET_CONTENT_GROUPS_QUERY = `
  query getContentGroups {
    ArticleGroup {
      id
      name
    }
  }
`

export const GET_CONTENT_TYPES_QUERY = `
  query getContentTypes {
    ArticleType {
      id
      name
    }
  }
`
