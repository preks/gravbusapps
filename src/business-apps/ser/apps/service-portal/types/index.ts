/**
 * Service Portal Types
 * Export all types used in service-portal
 */

export * from './comments';

// Re-export specific types for convenience
export type { 
  FlowComment, 
  FlowCommentsResponse, 
  ServicePortalComment,
  ServicePortalCommentVisibility 
} from './comments';
