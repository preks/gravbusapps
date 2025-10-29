/**
 * Mock Catalog Data for Content Module
 * Provides test data for content groups, types, categories, and tags
 */
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

// =====================================================
// CONTENT GROUPS
// =====================================================

export const mockContentGroups: CatalogEntry[] = [
  {
    id: 'ContentGroup:v1:NEWS',
    catalogIdentifier: 'ContentGroup',
    version: 'v1',
    key: 'NEWS',
    value: 'News',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ContentGroup:v1:INTRANET',
    catalogIdentifier: 'ContentGroup',
    version: 'v1',
    key: 'INTRANET',
    value: 'Intranet',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ContentGroup:v1:KNOWLEDGE',
    catalogIdentifier: 'ContentGroup',
    version: 'v1',
    key: 'KNOWLEDGE',
    value: 'Knowledge Base',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'ContentGroup:v1:DOCUMENT',
    catalogIdentifier: 'ContentGroup',
    version: 'v1',
    key: 'DOCUMENT',
    value: 'Documents',
    sortOrder: 4,
    isActive: true
  }
]

// =====================================================
// CONTENT TYPES
// =====================================================

export const mockContentTypes: CatalogEntry[] = [
  {
    id: 'ContentType:v1:ARTICLE',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'ARTICLE',
    value: 'Article',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ContentType:v1:VIDEO',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'VIDEO',
    value: 'Video',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ContentType:v1:TUTORIAL',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'TUTORIAL',
    value: 'Tutorial',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'ContentType:v1:FAQ',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'FAQ',
    value: 'FAQ',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'ContentType:v1:ANNOUNCEMENT',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'ANNOUNCEMENT',
    value: 'Announcement',
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'ContentType:v1:POLICY',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'POLICY',
    value: 'Policy Document',
    sortOrder: 6,
    isActive: true
  },
  {
    id: 'ContentType:v1:GUIDE',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'GUIDE',
    value: 'Guide',
    sortOrder: 7,
    isActive: true
  },
  {
    id: 'ContentType:v1:BLOG',
    catalogIdentifier: 'ContentType',
    version: 'v1',
    key: 'BLOG',
    value: 'Blog Post',
    sortOrder: 8,
    isActive: true
  }
]

// =====================================================
// CONTENT CATEGORIES
// =====================================================

export const mockContentCategories: CatalogEntry[] = [
  {
    id: 'ContentCategory:v1:TECH',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'TECH',
    value: 'Technology',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:HR',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'HR',
    value: 'Human Resources',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:FINANCE',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'FINANCE',
    value: 'Finance',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:MARKETING',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'MARKETING',
    value: 'Marketing',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:OPERATIONS',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'OPERATIONS',
    value: 'Operations',
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:LEGAL',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'LEGAL',
    value: 'Legal',
    sortOrder: 6,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:SALES',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'SALES',
    value: 'Sales',
    sortOrder: 7,
    isActive: true
  },
  {
    id: 'ContentCategory:v1:PRODUCT',
    catalogIdentifier: 'ContentCategory',
    version: 'v1',
    key: 'PRODUCT',
    value: 'Product',
    sortOrder: 8,
    isActive: true
  }
]

// =====================================================
// CONTENT TAGS
// =====================================================

export const mockContentTags: CatalogEntry[] = [
  {
    id: 'ContentTag:v1:ANNOUNCEMENT',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'ANNOUNCEMENT',
    value: 'Announcement',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ContentTag:v1:GUIDE',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'GUIDE',
    value: 'Guide',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ContentTag:v1:POLICY',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'POLICY',
    value: 'Policy',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'ContentTag:v1:URGENT',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'URGENT',
    value: 'Urgent',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'ContentTag:v1:IMPORTANT',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'IMPORTANT',
    value: 'Important',
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'ContentTag:v1:NEW',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'NEW',
    value: 'New',
    sortOrder: 6,
    isActive: true
  },
  {
    id: 'ContentTag:v1:UPDATED',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'UPDATED',
    value: 'Updated',
    sortOrder: 7,
    isActive: true
  },
  {
    id: 'ContentTag:v1:TRAINING',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'TRAINING',
    value: 'Training',
    sortOrder: 8,
    isActive: true
  },
  {
    id: 'ContentTag:v1:BEST_PRACTICE',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'BEST_PRACTICE',
    value: 'Best Practice',
    sortOrder: 9,
    isActive: true
  },
  {
    id: 'ContentTag:v1:TUTORIAL',
    catalogIdentifier: 'ContentTag',
    version: 'v1',
    key: 'TUTORIAL',
    value: 'Tutorial',
    sortOrder: 10,
    isActive: true
  }
]

// =====================================================
// DOCUMENT TYPES
// =====================================================

export const mockDocumentTypes: CatalogEntry[] = [
  {
    id: 'ContentDocumentType:v1:IMAGE',
    catalogIdentifier: 'ContentDocumentType',
    version: 'v1',
    key: 'IMAGE',
    value: 'Image',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ContentDocumentType:v1:VIDEO',
    catalogIdentifier: 'ContentDocumentType',
    version: 'v1',
    key: 'VIDEO',
    value: 'Video',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ContentDocumentType:v1:DOCUMENT',
    catalogIdentifier: 'ContentDocumentType',
    version: 'v1',
    key: 'DOCUMENT',
    value: 'Document',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'ContentDocumentType:v1:AUDIO',
    catalogIdentifier: 'ContentDocumentType',
    version: 'v1',
    key: 'AUDIO',
    value: 'Audio',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'ContentDocumentType:v1:ARCHIVE',
    catalogIdentifier: 'ContentDocumentType',
    version: 'v1',
    key: 'ARCHIVE',
    value: 'Archive',
    sortOrder: 5,
    isActive: true
  }
]
