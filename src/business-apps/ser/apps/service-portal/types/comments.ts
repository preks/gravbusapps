/**
 * Service Portal Comment Types
 * Extends base Comment type with service-portal specific functionality
 */

import { Comment } from '../../../types';

// Comment visibility levels for service-portal
export type ServicePortalCommentVisibility = 'EXTERNAL' | 'INTERNAL_FLOW' | 'INTERNAL_TASK';

// Flow comment from /api/flows/{flowId}/comments endpoint
export interface FlowComment {
  stepIndex: number;
  stepTitle: string;
  comment: string;
  commentedBy: string;
  commentedAt: string;
  action: string;
  visibility: ServicePortalCommentVisibility;
}

// Extended comment interface for service-portal
export interface ServicePortalComment extends Comment {
  visibility: ServicePortalCommentVisibility;
  // Additional service-portal specific fields
  isFromRequester?: boolean; // True if comment is from the original requester
  isFromAssignee?: boolean; // True if comment is from current step assignee
  stepName?: string; // Name of the step this comment belongs to
  desk?: string; // Desk/department that posted the comment
  stepIndex?: number; // Step index from flow API
}

// Comment visibility configuration for UI display
export const SERVICE_PORTAL_COMMENT_VISIBILITY_CONFIG = {
  EXTERNAL: {
    label: 'Public',
    description: 'Visible to requester and all staff members',
    icon: 'EyeIcon',
    badgeVariant: 'outline' as const,
    color: 'gba:text-green-700 gba:bg-green-50 gba:border-green-200',
    priority: 1 // Highest priority for display
  },
  INTERNAL_FLOW: {
    label: 'Internal Team',
    description: 'Visible to all staff working on this request',
    icon: 'UsersIcon', 
    badgeVariant: 'secondary' as const,
    color: 'gba:text-blue-700 gba:bg-blue-50 gba:border-blue-200',
    priority: 2
  },
  INTERNAL_TASK: {
    label: 'Task Only',
    description: 'Visible only to specific task assignees',
    icon: 'LockIcon',
    badgeVariant: 'destructive' as const,
    color: 'gba:text-red-700 gba:bg-red-50 gba:border-red-200',
    priority: 3
  }
} as const;

// Request comment context - determines what user can see/do
export interface RequestCommentContext {
  requestId: string;
  userId: string;
  userRole: 'requester' | 'assignee' | 'staff' | 'admin';
  isRequester: boolean; // True if user is the original requester
  isAssignedToAnyStep: boolean; // True if user is assigned to any step in the request
  canPostComments: boolean; // True if user can post new comments
  defaultVisibility: ServicePortalCommentVisibility; // Default visibility for new comments
}

// Comment posting request
export interface PostCommentRequest {
  requestId: string;
  comment: string;
  visibility: ServicePortalCommentVisibility;
  userId: string;
}

// Comment response from API
export interface CommentResponse {
  success: boolean;
  comment?: ServicePortalComment;
  error?: string;
}

// Flow comments API response
export interface FlowCommentsResponse {
  id: string;
  totalComments: number;
  hasMore: boolean;
  pagination: {
    offset: number;
    limit: number;
  };
  comments: FlowComment[];
}

// Comments list response from API
export interface CommentsListResponse {
  success: boolean;
  comments: ServicePortalComment[];
  total: number;
  error?: string;
}
