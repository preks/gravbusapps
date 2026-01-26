import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

export interface ContentArticleAnalyzerInput {
  contentEntry: ContentEntry
  descendants: ContentEntry[]
  userId: string
}

export interface ContentArticleAnalyzerOutput {
  summary?: {
    text?: string
    keyPoints?: string[]
  }
  improvementRecommendations?: {
    writingTips: Array<{
      tip: string
      reason: string
      priority: 'high' | 'medium' | 'low'
    }>
    contentStructure: string[]
    futureConsiderations: Array<{
      consideration: string
      rationale: string
    }>
    intranetBestPractices: Array<{
      practice: string
      explanation: string
    }>
    strengths?: string[]
    areasForImprovement?: string[]
  }
  engagementAnalysis: {
    overallScore: number
    reactionAnalysis: {
      totalReactions: number
      reactionBreakdown: Array<{
        reactionType: string
        reactionCode?: string
        count: number
        percentage: number
        sentiment: 'positive' | 'negative' | 'neutral'
      }>
      sentimentScore: {
        positive: number
        negative: number
        neutral: number
      }
      engagementRate?: number
    }
    commentAnalysis: {
      totalComments: number
      averageDepth: number
      commentScore: number
      topThemes?: Array<{
        theme: string
        mentionCount: number
      }>
      sentimentDistribution?: {
        positive: number
        negative: number
        neutral: number
      }
    }
    readerReception: {
      rating: number
      summary: string
      keyInsights: string[]
      resonatingTopics?: string[]
      discussionPoints?: string[]
    }
  }
}

export class ContentArticleAnalyzerService {
  private readonly PROMPT_NAME = 'ContentArticleAnalyzer'
  private promptIdCache: string | null = null

  constructor(accessToken: string) {
    promptManagerClient.setAccessToken(accessToken)
  }

  private async getPromptId(): Promise<string> {
    if (this.promptIdCache) {
      return this.promptIdCache
    }

    const response = await promptManagerClient.getPrompts({
      promptName: this.PROMPT_NAME,
      limit: 1,
      returnTotalRecords: false
    })

    if (!response.data || response.data.length === 0) {
      throw new Error(`Prompt "${this.PROMPT_NAME}" not found`)
    }

    const promptId = response.data[0]._id
    if (!promptId) {
      throw new Error(`Prompt "${this.PROMPT_NAME}" has no ID`)
    }

    this.promptIdCache = promptId
    return promptId
  }

  async analyzeArticle(input: ContentArticleAnalyzerInput): Promise<ContentArticleAnalyzerOutput> {
    const promptId = await this.getPromptId()

    // Format content entry for prompt
    const contentEntryText = this.formatContentEntry(input.contentEntry)

    // Format descendants (comments and replies)
    const descendantsText = this.formatDescendants(input.descendants)

    const formData = new FormData()
    formData.append(
      'user_params',
      JSON.stringify({
        contentEntry: contentEntryText,
        descendants: descendantsText,
        userId: input.userId
      })
    )

    const response = await promptManagerClient.executePromptById(promptId, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as ContentArticleAnalyzerOutput
  }

  private formatContentEntry(entry: ContentEntry): string {
    return JSON.stringify(
      {
        id: entry.id,
        title: entry.title,
        preview: entry.preview,
        content: entry.content,
        contentGroupRef: entry.contentGroupRef,
        contentTypeRef: entry.contentTypeRef,
        createdAt: entry.createdAt,
        creatorEmployeeId: entry.creatorEmployeeId,
        contentEntryReactionCounts: entry.contentEntryReactionCounts || []
      },
      null,
      2
    )
  }

  private formatDescendants(descendants: ContentEntry[]): string {
    return JSON.stringify(
      descendants.map(desc => ({
        id: desc.id,
        title: desc.title,
        content: desc.content,
        createdAt: desc.createdAt,
        creatorEmployeeId: desc.creatorEmployeeId,
        parentContentEntryId: desc.parentContentEntryId,
        contentEntryReactionCounts: desc.contentEntryReactionCounts || []
      })),
      null,
      2
    )
  }
}
