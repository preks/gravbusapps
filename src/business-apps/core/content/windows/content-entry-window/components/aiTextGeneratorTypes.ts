export type AiActionType = 'generate' | 'improve' | 'summarize' | 'fixSpelling' | 'shorten' | 'changeTone' | 'translate'

export interface AiAction {
  type: AiActionType
  label: string
  icon: React.ReactNode
  requiresPrompt?: boolean
  requiresSubMenu?: boolean
}

export interface AiResponse {
  title: string
  previewText: string
  content: string
  picture?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
}

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContentAiTextGeneratorProps {
  title: string
  previewText: string
  content: string
  onTitleChange: (value: string) => void
  onPreviewTextChange: (value: string) => void
  onContentChange: (value: string) => void
  onPictureChange?: (pictureUrl: string) => Promise<void>
  accessToken: string
  context: BusinessAppContextProps
  contentGroup?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

export interface AiResponsePopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  response: AiResponse | null
  isLoading: boolean
  error: string | null
  onDiscard: () => void
  onRefine: () => void
  onInsert: () => void
  actionType: AiActionType | null
}
