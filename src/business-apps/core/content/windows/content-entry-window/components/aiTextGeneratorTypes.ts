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
