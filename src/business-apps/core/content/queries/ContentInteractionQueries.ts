export interface ArticleLikeData {
  id: string
  version: number
  articleId: string
  liked: boolean
  createdBy: string
  createdAt: string
}

export interface ArticleCommentData {
  id: string
  comment: string
  articleId: string
  articleCommentId: string | null
  createdBy: string
  createdAt: string
  version: number
}

export interface ArticleLikesResponse {
  ArticleLike: ArticleLikeData[]
}

export interface ArticleCommentsResponse {
  ArticleComment: ArticleCommentData[]
}

export const GET_ARTICLE_LIKES_QUERY = (articleId: string): string => {
  return `
    query getArticleLikes {
      ArticleLike(
        where: {
          articleId: { _eq: "${articleId}" }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
      ) {
        id
        version
        articleId
        liked
        createdBy
        createdAt
      }
    }
  `
}

export const GET_ARTICLE_COMMENTS_QUERY = (articleId: string): string => {
  return `
    query getArticleComments {
      ArticleComment(
        where: {
          articleId: { _eq: "${articleId}" }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
      ) {
        id
        comment
        articleId
        articleCommentId
        createdBy
        createdAt
        version
      }
    }
  `
}
