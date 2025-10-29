export interface SelectOption {
  id: string
  name: string
  value?: string
}

export interface Content {
  articleId: string
  articleVersion: number | null
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  articleTypeRef: string
  title: string
  previewText: string
  content: string
  timeToRead: number | null
  displayAuthor: boolean
  allowComment: boolean
  allowReaction: boolean
  allowRate: boolean
  allowFeedback: boolean
  startDate: string | null
  endDate: string | null
  authorFullName: string | null
  author: ContentAuthor | null
  comments: any | null
  commentsCount: number
  reactionsCount: number
  feedbacksCount: number
  rates: any | null
  ratesCount: number
  status: string
  tagNames: string[] | null
  tags: ContentTag[]
  attachments: any[] | null
  contentImage: string | null
  createdAt: string | null
  createdAtText: string | null
  feedbacks?: string | null
  shareCount?: number
  reactionSummary?: { [emoji: string]: { emoji: string; count: number; userReacted: boolean; reactionId?: string } }
}

export interface ContentAuthor {
  userId: string
  firstName: string
  lastName: string
  jobPosition: string
  avatar?: string
}

export interface ContentTag {
  tag_id: string
  version?: number
  tag?: string
  name?: string
}

export interface ContentEntryWindowVals {
  id?: string
  version?: number
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  contentTypeRef?: string
  articleTypeRef?: string
  role?: string
  contentImage: string | null
  tags: string[]
  title: string
  previewText: string
  content: string
  displayAuthor: boolean
  author: string | null
  authorId: string
  allowComment: boolean
  allowReaction: boolean
  startDate: Date | null | string
  endDate: Date | null | string
  schedulePublication: boolean
  status: string
}

export interface UseContentResult {
  isUpdating: boolean
  isMutating: boolean
  item: Content | null
  create: (values: ContentEntryWindowVals) => Promise<void>
  error: any
  contentNotFound: boolean
}

export interface ContentEntryWindowProps {
  id?: string
  data: ContentEntryWindowVals | Content | null
  create: (data: ContentEntryWindowVals) => void
  isUpdating: boolean
  tags: SelectOption[]
  groupValues: SelectOption[]
  typeValues: SelectOption[]
  onFormUpdate?: (formData: ContentEntryWindowVals) => void
  refetchTags?: () => void
}

export enum ContentType {
  NEWS = 'news',
  INTRANET = 'intranet',
  KNOWLEDGE = 'knowledge',
  DOCUMENT = 'document'
}

export interface ContentPreviewData {
  title: string
  previewText: string
  articleTypeRef: string
  content: string
  contentImage: string | null
  tags: ContentTag[]
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  authorName: string
  authorJobPosition: string
  displayAuthor: boolean
  allowComment: boolean
  allowReaction: boolean
}
