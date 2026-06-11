import type { ParsedWordDocument } from '@/business-apps/core/office/apps/documents/types'
import { ContentGroup, ContentRole } from '@/common/data/content/constants/contentConstants'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { RestClient } from '@/common/network/rest/RestClient'
import { CONTENT_API_URL } from '@/common/utils/serviceResolver'

const DEFAULT_ARTICLE_LIMIT = 100
const SAVE_CONTENT_ENTRY_PATH = '/saveContentEntry'

export interface LearningKnowledgeArticle {
  id: string
  title: string
  preview?: string
  content?: string
  updatedAt?: string
}

interface KnowledgeArticlesResponse {
  ContentEntry?: Array<{
    id?: string | null
    title?: string | null
    preview?: string | null
    content?: string | null
    updatedAt?: string | null
  }>
}

interface SaveContentEntryResponse {
  contentEntry?: { id?: string; title?: string; preview?: string; content?: string; updatedAt?: string }
  data?: {
    contentEntry?: { id?: string; title?: string; preview?: string; content?: string; updatedAt?: string }
  }
}

export interface LearningKnowledgeArticlesDependencies {
  graphqlClient?: Pick<GraphQLClient, 'request'>
  contentClient?: Pick<RestClient, 'post'>
}

function createGraphQLClient(accessToken: string) {
  const client = new GraphQLClient(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') ?? '')
  client.setAccessToken(accessToken)
  return client
}

function createContentClient(accessToken: string) {
  return new RestClient(CONTENT_API_URL, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

function assertAccessToken(accessToken: string): void {
  if (!accessToken) {
    throw new Error('Missing access token')
  }
}

function mapArticle(
  article: NonNullable<KnowledgeArticlesResponse['ContentEntry']>[number]
): LearningKnowledgeArticle | null {
  if (!article.id) return null
  return {
    id: article.id,
    title: article.title ?? 'Untitled article',
    preview: article.preview ?? undefined,
    content: article.content ?? undefined,
    updatedAt: article.updatedAt ?? undefined
  }
}

function extractSavedArticle(response: SaveContentEntryResponse): LearningKnowledgeArticle {
  const entry = response.contentEntry ?? response.data?.contentEntry
  if (!entry?.id) {
    throw new Error('Content service did not return the created knowledge article id')
  }

  return {
    id: entry.id,
    title: entry.title ?? 'Untitled article',
    preview: entry.preview,
    content: entry.content,
    updatedAt: entry.updatedAt
  }
}

function buildPreview(description: string | undefined, parsedDocument: ParsedWordDocument): string {
  if (description?.trim()) return description.trim()
  return parsedDocument.plainText.trim().slice(0, 240)
}

export async function listLearningKnowledgeArticles(
  accessToken: string,
  dependencies: LearningKnowledgeArticlesDependencies = {}
): Promise<LearningKnowledgeArticle[]> {
  assertAccessToken(accessToken)
  const graphqlClient = dependencies.graphqlClient ?? createGraphQLClient(accessToken)

  const response = await graphqlClient.request<KnowledgeArticlesResponse>(
    /* GraphQL */ `
      query ListLearningKnowledgeArticles($limit: Int!) {
        ContentEntry(
          where: {
            contentGroup: { _eq: KNOWLEDGE_CONTENT_GROUP }
            role: { _eq: ROOT_CONTENT_ROLE }
            isDeleted: { _eq: false }
          }
          orderBy: [{ updatedAt: DESC }, { createdAt: DESC }]
          limit: $limit
        ) {
          id
          title
          preview
          content
          updatedAt
        }
      }
    `,
    { limit: DEFAULT_ARTICLE_LIMIT }
  )

  return (response.ContentEntry ?? [])
    .map(mapArticle)
    .filter((article): article is LearningKnowledgeArticle => Boolean(article))
}

export async function createLearningKnowledgeArticleFromDocx(
  accessToken: string,
  employeeId: string,
  parsedDocument: ParsedWordDocument,
  title: string,
  description?: string,
  dependencies: LearningKnowledgeArticlesDependencies = {}
): Promise<LearningKnowledgeArticle> {
  assertAccessToken(accessToken)
  if (!employeeId) {
    throw new Error('Missing employee id')
  }

  const contentClient = dependencies.contentClient ?? createContentClient(accessToken)
  const articleTitle = title.trim() || parsedDocument.fileName.replace(/\.(docx?|doc)$/i, '') || 'Untitled article'
  const payload = {
    changeMode: 'INSERT',
    contentEntry: {
      title: articleTitle,
      preview: buildPreview(description, parsedDocument),
      content: parsedDocument.html,
      contentGroup: ContentGroup.KNOWLEDGE,
      role: ContentRole.ROOT,
      creatorEmployee: employeeId,
      displayCreator: false,
      displayUpdater: false,
      allowComment: false,
      allowReaction: false
    }
  }

  const response = await contentClient.post<SaveContentEntryResponse>(SAVE_CONTENT_ENTRY_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })

  return extractSavedArticle(response)
}
