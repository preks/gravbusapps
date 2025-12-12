import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
}

export class ContentEntryAIService {
  private readonly PROMPT_NAME = 'ContentArticleWriter'
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

  async executeContentEntryOperation(
    operation: 'generate' | 'refine',
    userPrompt: string,
    existingContent?: ContentEntryInput
  ): Promise<ContentEntryOutput> {
    const userParams: {
      operation: string
      userPrompt: string
      title: string
      preview: string
      content: string
      picture: string | null
    } = {
      operation,
      userPrompt,
      title: existingContent?.title || '',
      preview: existingContent?.preview || '',
      content: existingContent?.content || '',
      picture: existingContent?.picture || null
    }

    const formData = new FormData()
    formData.append('user_params', JSON.stringify(userParams))

    const promptId = await this.getPromptId()
    const response = await promptManagerClient.executePromptById(promptId, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as ContentEntryOutput
  }
}
