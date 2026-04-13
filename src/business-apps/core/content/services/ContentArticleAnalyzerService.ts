import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { executeContentPromptByJson } from '@/common/data/content/prompts'

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
  constructor(private readonly promptManagerClient: PromptManagerClient) {}

  async analyzeArticle(input: ContentArticleAnalyzerInput): Promise<ContentArticleAnalyzerOutput> {
    const contentEntryText = this.formatContentEntry(input.contentEntry)
    const descendantsText = this.formatDescendants(input.descendants)

    const response = await executeContentPromptByJson(this.promptManagerClient, 'ContentArticleAnalyzer', {
      user_params: {
        contentEntry: contentEntryText,
        descendants: descendantsText,
        userId: input.userId
      }
    })
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
        contentGroup: entry.contentGroup,
        contentTypeId: entry.contentType?.id,
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
