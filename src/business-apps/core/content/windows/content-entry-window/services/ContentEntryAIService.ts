import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { executeContentPromptByJson } from '@/common/data/content/prompts'

export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  contentGroup?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
}

export class ContentEntryAIService {
  constructor(
    private readonly promptManagerClient: PromptManagerClient,
    private readonly accessToken: string
  ) {}

  async executeContentEntryOperation(
    operation: 'generate' | 'refine',
    userPrompt: string,
    existingContent?: ContentEntryInput
  ): Promise<ContentEntryOutput> {
    const userParams = {
      operation,
      userPrompt,
      title: existingContent?.title || '',
      preview: existingContent?.preview || '',
      content: existingContent?.content || '',
      picture: existingContent?.picture || null,
      contentGroup: existingContent?.contentGroup,
      contentTypeId: existingContent?.contentTypeId,
      contentCategoryIds: existingContent?.contentCategoryIds,
      contentTagIds: existingContent?.contentTagIds
    }

    const response = await executeContentPromptByJson(this.promptManagerClient, 'ContentArticleWriter', {
      user_params: userParams
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    return JSON.parse(content) as ContentEntryOutput
  }
}
