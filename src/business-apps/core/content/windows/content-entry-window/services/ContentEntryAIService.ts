import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { executeContentPromptByJson } from '@/common/data/content/prompts'

export interface ContentGroupPromptOption {
  id: string
  name: string
}

export interface ContentTypePromptOption {
  id: string
  name: string
  contentGroup: string
}

export interface ContentTaxonomyPromptOption {
  id: string
  name: string
}

export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  contentGroup?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentCategoryNames?: string[]
  contentTagIds?: string[]
  contentTagNames?: string[]
  availableContentGroups?: ContentGroupPromptOption[]
  availableContentTypes?: ContentTypePromptOption[]
  availableContentCategories?: ContentTaxonomyPromptOption[]
  availableContentTags?: ContentTaxonomyPromptOption[]
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
  contentGroup?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentCategoryNames?: string[]
  contentTagIds?: string[]
  contentTagNames?: string[]
}

const toJsonParam = (value: unknown): string => JSON.stringify(value ?? null)

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []

export class ContentEntryAIService {
  constructor(private readonly promptManagerClient: PromptManagerClient) {}

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
      contentGroup: toJsonParam(existingContent?.contentGroup ?? null),
      contentTypeId: toJsonParam(existingContent?.contentTypeId ?? null),
      contentCategoryIds: toJsonParam(existingContent?.contentCategoryIds ?? []),
      contentCategoryNames: toJsonParam(existingContent?.contentCategoryNames ?? []),
      contentTagIds: toJsonParam(existingContent?.contentTagIds ?? []),
      contentTagNames: toJsonParam(existingContent?.contentTagNames ?? []),
      availableContentGroups: toJsonParam(existingContent?.availableContentGroups ?? []),
      availableContentTypes: toJsonParam(existingContent?.availableContentTypes ?? []),
      availableContentCategories: toJsonParam(existingContent?.availableContentCategories ?? []),
      availableContentTags: toJsonParam(existingContent?.availableContentTags ?? [])
    }

    const response = await executeContentPromptByJson(this.promptManagerClient, 'ContentArticleWriter', {
      user_params: userParams
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const parsed = JSON.parse(content) as Record<string, unknown>

    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      preview: typeof parsed.preview === 'string' ? parsed.preview : '',
      content: typeof parsed.content === 'string' ? parsed.content : '',
      picture: typeof parsed.picture === 'string' || parsed.picture === null ? parsed.picture : null,
      contentGroup:
        typeof parsed.contentGroup === 'string' || parsed.contentGroup === null ? parsed.contentGroup : undefined,
      contentTypeId: typeof parsed.contentTypeId === 'string' ? parsed.contentTypeId : undefined,
      contentCategoryIds: normalizeStringArray(parsed.contentCategoryIds),
      contentCategoryNames: normalizeStringArray(parsed.contentCategoryNames),
      contentTagIds: normalizeStringArray(parsed.contentTagIds),
      contentTagNames: normalizeStringArray(parsed.contentTagNames)
    }
  }
}
