export interface SelectOption {
  id: string
  name: string
  value?: string
}

export interface Content {
  articleId: string
  articleVersion: number | null
  articleGroupRef: string
  articleTypeRef: string
  title: string
  previewText: string
  content: string
  timeToRead: number | null
  displayAuthor: boolean
  allowComment: boolean
  allowLike: boolean
  allowRate: boolean
  allowFeedback: boolean
  startDate: string | null
  endDate: string | null
  authorFullName: string | null
  author: ContentAuthor | null
  comments: any | null
  commentsCount: number
  likesCount: number
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
  userLike?: { id: string; version: number; liked: boolean } | null
  userHasLiked?: boolean
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

export interface ContentFormVals {
  id: string
  articleGroupRef: string
  articleTypeRef: string
  contentImage: string | null
  tags: string[]
  title: string
  previewText: string
  content: string
  displayAuthor: boolean
  author: string | null
  authorId: string
  allowComment: boolean
  allowLike: boolean
  startDate: Date | null | string
  endDate: Date | null | string
  schedulePublication: boolean
  status: string
}

export interface UseContentResult {
  isUpdating: boolean
  isMutating: boolean
  item: Content | null
  create: (values: ContentFormVals) => Promise<void>
  error: any
  contentNotFound: boolean
}

export interface ContentFormProps {
  id?: string
  data: ContentFormVals | Content | null
  create: (data: ContentFormVals) => void
  isUpdating: boolean
  tags: SelectOption[]
  groupValues: SelectOption[]
  typeValues: SelectOption[]
  onFormUpdate?: (formData: ContentFormVals) => void
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
  articleGroupRef: string
  authorName: string
  authorJobPosition: string
  displayAuthor: boolean
  allowComment: boolean
  allowLike: boolean
}
