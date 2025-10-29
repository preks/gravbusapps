/**
 * Mock Content Relations Data
 * Categories, Tags, Documents, and Reactions
 *
 * NOTE: Mock data uses type assertions to bypass strict type checking for auto-generated fields
 */
import type {
  BaseContentEntryCategory,
  BaseContentEntryTag,
  BaseContentDocument,
  BaseContentEntryReaction
} from '../types/contentBaseTypes'
import { RecordState } from '../types/contentEnums'

// =====================================================
// CONTENT ENTRY CATEGORIES
// =====================================================

export const mockContentEntryCategories = [
  // content-entry-1: Q4 Results
  {
    id: 'cat-rel-1',
    contentEntryId: 'content-entry-1',
    contentCategoryRef: 'ContentCategory:v1:FINANCE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: 'employee-1',
    isDeleted: false
  },
  // content-entry-2: Onboarding Guide
  {
    id: 'cat-rel-2',
    contentEntryId: 'content-entry-2',
    contentCategoryRef: 'ContentCategory:v1:HR',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-10T09:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  // content-entry-3: Remote Work Policy
  {
    id: 'cat-rel-3',
    contentEntryId: 'content-entry-3',
    contentCategoryRef: 'ContentCategory:v1:HR',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T11:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  {
    id: 'cat-rel-4',
    contentEntryId: 'content-entry-3',
    contentCategoryRef: 'ContentCategory:v1:OPERATIONS',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T11:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  // content-entry-4: Dev Practices
  {
    id: 'cat-rel-5',
    contentEntryId: 'content-entry-4',
    contentCategoryRef: 'ContentCategory:v1:TECH',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T14:00:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  {
    id: 'cat-rel-6',
    contentEntryId: 'content-entry-4',
    contentCategoryRef: 'ContentCategory:v1:PRODUCT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T14:00:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  // content-entry-5: Sales Performance
  {
    id: 'cat-rel-7',
    contentEntryId: 'content-entry-5',
    contentCategoryRef: 'ContentCategory:v1:SALES',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-22T10:30:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  },
  {
    id: 'cat-rel-8',
    contentEntryId: 'content-entry-5',
    contentCategoryRef: 'ContentCategory:v1:FINANCE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-22T10:30:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  },
  // content-entry-6: IT Security
  {
    id: 'cat-rel-9',
    contentEntryId: 'content-entry-6',
    contentCategoryRef: 'ContentCategory:v1:TECH',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-14T09:00:00Z',
    createdBy: 'employee-6',
    isDeleted: false
  },
  // content-entry-7: Marketing Campaign
  {
    id: 'cat-rel-10',
    contentEntryId: 'content-entry-7',
    contentCategoryRef: 'ContentCategory:v1:MARKETING',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-25T15:00:00Z',
    createdBy: 'employee-7',
    isDeleted: false
  },
  // content-entry-8: FAQ Benefits
  {
    id: 'cat-rel-11',
    contentEntryId: 'content-entry-8',
    contentCategoryRef: 'ContentCategory:v1:HR',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-08T10:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  // content-entry-9: Product Roadmap
  {
    id: 'cat-rel-12',
    contentEntryId: 'content-entry-9',
    contentCategoryRef: 'ContentCategory:v1:PRODUCT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-24T11:30:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  {
    id: 'cat-rel-13',
    contentEntryId: 'content-entry-9',
    contentCategoryRef: 'ContentCategory:v1:TECH',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-24T11:30:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  // content-entry-10: Office Reopening
  {
    id: 'cat-rel-14',
    contentEntryId: 'content-entry-10',
    contentCategoryRef: 'ContentCategory:v1:OPERATIONS',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-19T13:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  // content-entry-12: Customer Success
  {
    id: 'cat-rel-15',
    contentEntryId: 'content-entry-12',
    contentCategoryRef: 'ContentCategory:v1:SALES',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-21T10:00:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  },
  {
    id: 'cat-rel-16',
    contentEntryId: 'content-entry-12',
    contentCategoryRef: 'ContentCategory:v1:MARKETING',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-21T10:00:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  }
] as BaseContentEntryCategory[]

// =====================================================
// CONTENT ENTRY TAGS
// =====================================================

export const mockContentEntryTags = [
  // content-entry-1: Q4 Results
  {
    id: 'tag-rel-1',
    contentEntryId: 'content-entry-1',
    contentTagRef: 'ContentTag:v1:ANNOUNCEMENT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: 'employee-1',
    isDeleted: false
  },
  {
    id: 'tag-rel-2',
    contentEntryId: 'content-entry-1',
    contentTagRef: 'ContentTag:v1:IMPORTANT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: 'employee-1',
    isDeleted: false
  },
  // content-entry-2: Onboarding Guide
  {
    id: 'tag-rel-3',
    contentEntryId: 'content-entry-2',
    contentTagRef: 'ContentTag:v1:GUIDE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-10T09:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  {
    id: 'tag-rel-4',
    contentEntryId: 'content-entry-2',
    contentTagRef: 'ContentTag:v1:TRAINING',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-10T09:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  {
    id: 'tag-rel-5',
    contentEntryId: 'content-entry-2',
    contentTagRef: 'ContentTag:v1:UPDATED',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-12T14:30:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  // content-entry-3: Remote Work Policy
  {
    id: 'tag-rel-6',
    contentEntryId: 'content-entry-3',
    contentTagRef: 'ContentTag:v1:POLICY',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T11:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  {
    id: 'tag-rel-7',
    contentEntryId: 'content-entry-3',
    contentTagRef: 'ContentTag:v1:IMPORTANT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T11:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  {
    id: 'tag-rel-8',
    contentEntryId: 'content-entry-3',
    contentTagRef: 'ContentTag:v1:NEW',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T11:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  // content-entry-4: Dev Practices
  {
    id: 'tag-rel-9',
    contentEntryId: 'content-entry-4',
    contentTagRef: 'ContentTag:v1:TUTORIAL',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T14:00:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  {
    id: 'tag-rel-10',
    contentEntryId: 'content-entry-4',
    contentTagRef: 'ContentTag:v1:BEST_PRACTICE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T14:00:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  // content-entry-5: Sales Performance
  {
    id: 'tag-rel-11',
    contentEntryId: 'content-entry-5',
    contentTagRef: 'ContentTag:v1:ANNOUNCEMENT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-22T10:30:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  },
  // content-entry-6: IT Security
  {
    id: 'tag-rel-12',
    contentEntryId: 'content-entry-6',
    contentTagRef: 'ContentTag:v1:GUIDE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-14T09:00:00Z',
    createdBy: 'employee-6',
    isDeleted: false
  },
  {
    id: 'tag-rel-13',
    contentEntryId: 'content-entry-6',
    contentTagRef: 'ContentTag:v1:IMPORTANT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-14T09:00:00Z',
    createdBy: 'employee-6',
    isDeleted: false
  },
  // content-entry-7: Marketing Campaign
  {
    id: 'tag-rel-14',
    contentEntryId: 'content-entry-7',
    contentTagRef: 'ContentTag:v1:ANNOUNCEMENT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-25T15:00:00Z',
    createdBy: 'employee-7',
    isDeleted: false
  },
  {
    id: 'tag-rel-15',
    contentEntryId: 'content-entry-7',
    contentTagRef: 'ContentTag:v1:URGENT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-25T15:00:00Z',
    createdBy: 'employee-7',
    isDeleted: false
  },
  // content-entry-8: FAQ Benefits
  {
    id: 'tag-rel-16',
    contentEntryId: 'content-entry-8',
    contentTagRef: 'ContentTag:v1:GUIDE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-08T10:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  // content-entry-9: Product Roadmap
  {
    id: 'tag-rel-17',
    contentEntryId: 'content-entry-9',
    contentTagRef: 'ContentTag:v1:ANNOUNCEMENT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-24T11:30:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  // content-entry-10: Office Reopening
  {
    id: 'tag-rel-18',
    contentEntryId: 'content-entry-10',
    contentTagRef: 'ContentTag:v1:GUIDE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-19T13:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  {
    id: 'tag-rel-19',
    contentEntryId: 'content-entry-10',
    contentTagRef: 'ContentTag:v1:IMPORTANT',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-19T13:00:00Z',
    createdBy: 'employee-3',
    isDeleted: false
  },
  // content-entry-12: Customer Success
  {
    id: 'tag-rel-20',
    contentEntryId: 'content-entry-12',
    contentTagRef: 'ContentTag:v1:BEST_PRACTICE',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-21T10:00:00Z',
    createdBy: 'employee-5',
    isDeleted: false
  }
] as BaseContentEntryTag[]

// =====================================================
// CONTENT DOCUMENTS
// =====================================================

export const mockContentDocuments = [
  // Documents for content-entry-1
  {
    id: 'doc-1-1',
    parentDocumentId: null,
    folder: false,
    name: 'Q4_Financial_Report.pdf',
    description: 'Detailed Q4 financial report',
    fileInfo: {
      path: 'documents/Q4_Financial_Report.pdf',
      fileMetadata: {
        originalFileName: 'Q4_Financial_Report.pdf',
        mimeType: 'application/pdf'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:DOCUMENT',
    contentEntryId: 'content-entry-1',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: 'employee-1',
    isDeleted: false
  },
  {
    id: 'doc-1-2',
    parentDocumentId: null,
    folder: false,
    name: 'Q4_Presentation.pptx',
    description: 'Q4 results presentation slides',
    fileInfo: {
      path: 'documents/Q4_Presentation.pptx',
      fileMetadata: {
        originalFileName: 'Q4_Presentation.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:DOCUMENT',
    contentEntryId: 'content-entry-1',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: 'employee-1',
    isDeleted: false
  },
  // Documents for content-entry-2
  {
    id: 'doc-2-1',
    parentDocumentId: null,
    folder: false,
    name: 'Onboarding_Checklist.pdf',
    description: 'New employee onboarding checklist',
    fileInfo: {
      path: 'documents/Onboarding_Checklist.pdf',
      fileMetadata: {
        originalFileName: 'Onboarding_Checklist.pdf',
        mimeType: 'application/pdf'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:DOCUMENT',
    contentEntryId: 'content-entry-2',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-10T09:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  {
    id: 'doc-2-2',
    parentDocumentId: null,
    folder: false,
    name: 'Welcome_Video.mp4',
    description: 'Welcome video for new employees',
    fileInfo: {
      path: 'documents/Welcome_Video.mp4',
      fileMetadata: {
        originalFileName: 'Welcome_Video.mp4',
        mimeType: 'video/mp4'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:VIDEO',
    contentEntryId: 'content-entry-2',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-10T09:00:00Z',
    createdBy: 'employee-2',
    isDeleted: false
  },
  // Documents for content-entry-4
  {
    id: 'doc-4-1',
    parentDocumentId: null,
    folder: false,
    name: 'Code_Review_Guidelines.pdf',
    description: 'Guidelines for conducting code reviews',
    fileInfo: {
      path: 'documents/Code_Review_Guidelines.pdf',
      fileMetadata: {
        originalFileName: 'Code_Review_Guidelines.pdf',
        mimeType: 'application/pdf'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:DOCUMENT',
    contentEntryId: 'content-entry-4',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T14:00:00Z',
    createdBy: 'employee-4',
    isDeleted: false
  },
  // Documents for content-entry-6
  {
    id: 'doc-6-1',
    parentDocumentId: null,
    folder: false,
    name: 'Security_Policy.pdf',
    description: 'Comprehensive IT security policy document',
    fileInfo: {
      path: 'documents/Security_Policy.pdf',
      fileMetadata: {
        originalFileName: 'Security_Policy.pdf',
        mimeType: 'application/pdf'
      }
    },
    documentGroupRef: null,
    documentTypeRef: 'ContentDocumentType:v1:DOCUMENT',
    contentEntryId: 'content-entry-6',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-14T09:00:00Z',
    createdBy: 'employee-6',
    isDeleted: false
  }
] as BaseContentDocument[]

// =====================================================
// CONTENT ENTRY REACTIONS
// =====================================================

export const mockContentEntryReactions = [
  // Reactions for content-entry-1 (Q4 Results)
  {
    id: 'reaction-1-1',
    contentEntryId: 'content-entry-1',
    creatorEmployeeId: 'employee-8',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T11:00:00Z',
    createdBy: 'employee-8',
    isDeleted: false
  },
  {
    id: 'reaction-1-2',
    contentEntryId: 'content-entry-1',
    creatorEmployeeId: 'employee-9',
    reaction: '🎉',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T11:30:00Z',
    createdBy: 'employee-9',
    isDeleted: false
  },
  {
    id: 'reaction-1-3',
    contentEntryId: 'content-entry-1',
    creatorEmployeeId: 'employee-10',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T12:00:00Z',
    createdBy: 'employee-10',
    isDeleted: false
  },
  {
    id: 'reaction-1-4',
    contentEntryId: 'content-entry-1',
    creatorEmployeeId: 'employee-11',
    reaction: '🚀',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T13:00:00Z',
    createdBy: 'employee-11',
    isDeleted: false
  },
  // Reactions for content-entry-2 (Onboarding Guide)
  {
    id: 'reaction-2-1',
    contentEntryId: 'content-entry-2',
    creatorEmployeeId: 'employee-10',
    reaction: '❤️',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-12T15:00:00Z',
    createdBy: 'employee-10',
    isDeleted: false
  },
  {
    id: 'reaction-2-2',
    contentEntryId: 'content-entry-2',
    creatorEmployeeId: 'employee-12',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-12T16:00:00Z',
    createdBy: 'employee-12',
    isDeleted: false
  },
  // Reactions for content-entry-3 (Remote Work Policy)
  {
    id: 'reaction-3-1',
    contentEntryId: 'content-entry-3',
    creatorEmployeeId: 'employee-12',
    reaction: '❤️',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T14:30:00Z',
    createdBy: 'employee-12',
    isDeleted: false
  },
  {
    id: 'reaction-3-2',
    contentEntryId: 'content-entry-3',
    creatorEmployeeId: 'employee-8',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T15:00:00Z',
    createdBy: 'employee-8',
    isDeleted: false
  },
  {
    id: 'reaction-3-3',
    contentEntryId: 'content-entry-3',
    creatorEmployeeId: 'employee-9',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-20T15:30:00Z',
    createdBy: 'employee-9',
    isDeleted: false
  },
  // Reactions for content-entry-4 (Dev Practices)
  {
    id: 'reaction-4-1',
    contentEntryId: 'content-entry-4',
    creatorEmployeeId: 'employee-13',
    reaction: '🔥',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T15:30:00Z',
    createdBy: 'employee-13',
    isDeleted: false
  },
  {
    id: 'reaction-4-2',
    contentEntryId: 'content-entry-4',
    creatorEmployeeId: 'employee-8',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T16:00:00Z',
    createdBy: 'employee-8',
    isDeleted: false
  },
  // Reactions for content-entry-5 (Sales Performance)
  {
    id: 'reaction-5-1',
    contentEntryId: 'content-entry-5',
    creatorEmployeeId: 'employee-12',
    reaction: '🎉',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-22T11:00:00Z',
    createdBy: 'employee-12',
    isDeleted: false
  },
  {
    id: 'reaction-5-2',
    contentEntryId: 'content-entry-5',
    creatorEmployeeId: 'employee-13',
    reaction: '🚀',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-22T11:30:00Z',
    createdBy: 'employee-13',
    isDeleted: false
  },
  // Reactions for content-entry-7 (Marketing Campaign)
  {
    id: 'reaction-7-1',
    contentEntryId: 'content-entry-7',
    creatorEmployeeId: 'employee-11',
    reaction: '🎨',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-25T15:30:00Z',
    createdBy: 'employee-11',
    isDeleted: false
  },
  {
    id: 'reaction-7-2',
    contentEntryId: 'content-entry-7',
    creatorEmployeeId: 'employee-12',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-25T16:00:00Z',
    createdBy: 'employee-12',
    isDeleted: false
  },
  // Reactions for comments
  {
    id: 'reaction-c-1',
    contentEntryId: 'comment-1-2-1',
    creatorEmployeeId: 'employee-9',
    reaction: '👍',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-15T14:30:00Z',
    createdBy: 'employee-9',
    isDeleted: false
  },
  {
    id: 'reaction-c-2',
    contentEntryId: 'comment-4-1-1',
    creatorEmployeeId: 'employee-13',
    reaction: '❤️',
    recordState: RecordState.ACTIVE,
    createdAt: '2025-01-18T16:15:00Z',
    createdBy: 'employee-13',
    isDeleted: false
  }
] as BaseContentEntryReaction[]
