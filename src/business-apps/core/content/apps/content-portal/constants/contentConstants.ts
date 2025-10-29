export const NEWS_MODULE = 'ContentGroup:v1:NEWS'
export const INTRANET_MODULE = 'ContentGroup:v1:INTRANET'
export const KNOWLEDGE_BASE_MODULE = 'ContentGroup:v1:KNOWLEDGE'
export const DOCUMENT_MODULE = 'ContentGroup:v1:DOCUMENT'
export const QUESTION_MODULE = 'ContentGroup:v1:QUESTION'

export const NEWS = 'News'
export const INTRANET = 'Intranet'
export const KNOWLEDGE = 'Knowledge'
export const KNOWLEDGE_BASE = 'Knowledge base'
export const DOCUMENT = 'Document'
export const QUESTION = 'Question'
export const ALL_TAG = 'All'

// News category constants
export const CATEGORY_ACHIEVEMENTS = 'Achievements'
export const CATEGORY_COMPANY_UPDATES = 'Company Updates'
export const CATEGORY_TECH_NEWS = 'Tech News'

// Array of all news categories
export const NEWS_CATEGORIES = [CATEGORY_ACHIEVEMENTS, CATEGORY_COMPANY_UPDATES, CATEGORY_TECH_NEWS]

// Knowledge base category constants
export const CATEGORY_USER_GUIDES = 'User Guides'
export const CATEGORY_ONBOARDING = 'Onboarding'
export const CATEGORY_COMPLIANCE = 'Compliance'

// Array of all knowledge categories
export const KNOWLEDGE_CATEGORIES = [CATEGORY_USER_GUIDES, CATEGORY_ONBOARDING, CATEGORY_COMPLIANCE]

// Document category constants
export const CATEGORY_POLICIES = 'Policies'
export const CATEGORY_TEMPLATES = 'Templates'
export const CATEGORY_REPORTS = 'Reports'

// Array of all document categories
export const DOCUMENT_CATEGORIES = [CATEGORY_POLICIES, CATEGORY_TEMPLATES, CATEGORY_REPORTS]

// Question category constants
export const CATEGORY_TECHNICAL = 'Technical'
export const CATEGORY_PROCESS = 'Process'
export const CATEGORY_GENERAL = 'General'

// Array of all question categories
export const QUESTION_CATEGORIES = [CATEGORY_TECHNICAL, CATEGORY_PROCESS, CATEGORY_GENERAL]

// Category interface for select components
export interface CategoryOption {
  id: string
  name: string
}

export const MAX_IMAGE_SIZE_MB = 1
export const MAX_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024 // 1MB in bytes

// Content group mapping based on content type
export const contentGroupMapper: { [key: string]: string } = {
  [NEWS]: 'ContentGroup:v1:NEWS',
  [KNOWLEDGE_BASE]: 'ContentGroup:v1:KNOWLEDGE',
  [INTRANET]: 'ContentGroup:v1:INTRANET',
  [DOCUMENT]: 'ContentGroup:v1:DOCUMENT',
  [QUESTION]: 'ContentGroup:v1:QUESTION'
}

// Type mapper for form submissions
export const typeMapper: { [key: string]: string } = {
  News: contentGroupMapper[NEWS],
  Intranet: contentGroupMapper[INTRANET],
  Knowledge: contentGroupMapper[KNOWLEDGE_BASE],
  Document: contentGroupMapper[DOCUMENT],
  Question: contentGroupMapper[QUESTION]
}

export const contentTypeMapper: { [key: string]: string } = {
  [NEWS_MODULE]: 'news',
  [INTRANET_MODULE]: 'intranet',
  [KNOWLEDGE_BASE_MODULE]: 'knowledge',
  [DOCUMENT_MODULE]: 'document',
  [QUESTION_MODULE]: 'question'
}

export const moduleToDisplayMapper = {
  [KNOWLEDGE_BASE_MODULE]: 'Knowledge base',
  [NEWS_MODULE]: 'News',
  [INTRANET_MODULE]: 'Intranet',
  [DOCUMENT_MODULE]: 'Document',
  [QUESTION_MODULE]: 'Question'
}

// Category mapping for backend format
export const categoryMapper: { [key: string]: string } = {
  'User Guides': 'ArticleType:v1:USER_GUIDES',
  Onboarding: 'ArticleType:v1:ONBOARDING',
  Compliance: 'ArticleType:v1:COMPLIANCE',
  Achievements: 'ArticleType:v1:ACHIEVEMENTS',
  'Company Updates': 'ArticleType:v1:COMPANY_UPDATES',
  'Tech News': 'ArticleType:v1:TECH_NEWS',
  Policies: 'ArticleType:v1:POLICIES',
  Templates: 'ArticleType:v1:TEMPLATES',
  Reports: 'ArticleType:v1:REPORTS',
  Technical: 'ArticleType:v1:TECHNICAL',
  Process: 'ArticleType:v1:PROCESS',
  General: 'ArticleType:v1:GENERAL'
}

export const reverseContentTypeMapper: { [key: string]: string } = {
  'ArticleType:v1:USER_GUIDES': 'User Guides',
  'ArticleType:v1:ONBOARDING': 'Onboarding',
  'ArticleType:v1:COMPLIANCE': 'Compliance',
  'ArticleType:v1:ACHIEVEMENTS': 'Achievements',
  'ArticleType:v1:COMPANY_UPDATES': 'Company Updates',
  'ArticleType:v1:TECH_NEWS': 'Tech News',
  'ArticleType:v1:POLICIES': 'Policies',
  'ArticleType:v1:TEMPLATES': 'Templates',
  'ArticleType:v1:REPORTS': 'Reports',
  'ArticleType:v1:TECHNICAL': 'Technical',
  'ArticleType:v1:PROCESS': 'Process',
  'ArticleType:v1:GENERAL': 'General'
}

// Default category
export const DEFAULT_CATEGORY = 'ArticleType:v1:NONE'

// Reverse mapping: ContentGroup reference to display name
export const contentGroupToDisplayMapper: { [key: string]: string } = {
  'ContentGroup:v1:NEWS': 'news',
  'ContentGroup:v1:KNOWLEDGE': 'knowledge',
  'ContentGroup:v1:INTRANET': 'intranet',
  'ContentGroup:v1:DOCUMENT': 'document',
  'ContentGroup:v1:QUESTION': 'question'
}
