import React, { useState, useMemo } from 'react';
import { 
  Button, 
  Badge, 
  Textarea,
  Spinner,
  Separator,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system';
import { message } from 'antd';
import { 
  ChatCircle, 
  PaperPlaneTilt, 
  EyeIcon,
  ClockIcon
} from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeeNamesBatch } from '../../../hooks/useEmployeeNamesBatch';
import { EnhancedEmployeeDisplay } from '../../../components/shared';
import { formatDate, formatDateTime, getUserDateFormat, getUserLocale } from '../../../config/dateTimeConfig';
import { 
  ServicePortalComment, 
  ServicePortalCommentVisibility, 
  RequestCommentContext,
  PostCommentRequest
} from '../types/comments';

export interface RequestCommentsProps extends BusinessAppContextProps {
  requestId: string;
  comments: ServicePortalComment[];
  commentContext: RequestCommentContext;
  onPostComment: (request: PostCommentRequest) => Promise<void>;
  onRefreshComments: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}


const CommentItem: React.FC<{
  comment: ServicePortalComment;
  employeeData?: any;
  userInfo?: any;
}> = ({ comment, employeeData, userInfo }) => {

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDateTime(commentDate.toISOString());
  };

  const displayName = employeeData?.displayName || employeeData?.fullName || 'Unknown User';

  return (
    <div 
      className="gba:group gba:relative gba:p-4 gba:bg-gradient-to-r gba:from-slate-50/80 gba:to-slate-50/40 gba:rounded-xl gba:border gba:border-slate-200/60 hover:gba:border-slate-300/80 gba:transition-all gba:duration-200 hover:gba:shadow-sm"
      data-testid={`comment-${comment.id}`}
    >
      {/* Comment Header - All inline */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3 gba:flex-wrap">
        {/* Enhanced Employee Display */}
        <div className="gba:flex-shrink-0">
          <EnhancedEmployeeDisplay
            userId={comment.authorId || 'unknown'}
            displayName={displayName}
            employeeData={employeeData}
            testId={`comment-author-${comment.id}`}
            showTooltip={true}
          />
        </div>
        
        {/* Timestamp */}
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-slate-500">
          <ClockIcon className="gba:w-3.5 gba:h-3.5" />
          <time dateTime={comment.createdAt}>
            {formatTimeAgo(comment.createdAt)}
          </time>
        </div>
        
        {/* Public Comment Badge */}
        <Badge 
          variant="outline"
          className="gba:text-xs gba:gap-1.5 gba:px-2.5 gba:py-1 gba:font-medium gba:shadow-sm gba:bg-green-50 gba:text-green-700 gba:border-green-200"
          data-testid={`comment-visibility-${comment.id}`}
        >
          <EyeIcon className="gba:w-3.5 gba:h-3.5" />
          Public
        </Badge>
      </div>
      
      {/* Comment Body */}
      <div className="gba:ml-12 gba:pl-3">
        <div className="gba:relative gba:bg-white gba:rounded-lg gba:p-3 gba:shadow-sm gba:border gba:border-slate-200/60">
          {/* Speech bubble arrow */}
          <div className="gba:absolute gba:-left-2 gba:top-3 gba:w-0 gba:h-0 gba:border-t-[6px] gba:border-t-transparent gba:border-b-[6px] gba:border-b-transparent gba:border-r-[8px] gba:border-r-white"></div>
          <div className="gba:absolute gba:-left-2.5 gba:top-3 gba:w-0 gba:h-0 gba:border-t-[6px] gba:border-t-transparent gba:border-b-[6px] gba:border-b-transparent gba:border-r-[8px] gba:border-r-slate-200/60"></div>
          
          <p className="gba:text-sm gba:text-slate-700 gba:leading-relaxed gba:m-0">
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
};

const CommentForm: React.FC<{
  onSubmit: (comment: string, visibility: ServicePortalCommentVisibility) => Promise<void>;
  commentContext: RequestCommentContext;
  isSubmitting: boolean;
}> = ({ onSubmit, commentContext, isSubmitting }) => {
  const [newComment, setNewComment] = useState('');
  // Always use EXTERNAL visibility for service portal comments
  const commentVisibility: ServicePortalCommentVisibility = 'EXTERNAL';

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      await onSubmit(newComment.trim(), commentVisibility);
      setNewComment('');
    } catch (error) {
      console.error('[CommentForm] Failed to submit comment:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!commentContext.canPostComments) {
    return null;
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:relative">
        <Textarea
          placeholder="Enter your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="gba:resize-none gba:border-slate-200 gba:bg-slate-50/50 focus:gba:bg-white gba:transition-colors gba:duration-200 gba:rounded-lg gba:shadow-sm focus:gba:shadow-md"
          data-testid="comment-textarea"
        />
      </div>
      
      <div className="gba:flex gba:justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          className="gba:gap-2"
          data-testid="submit-comment-button"
        >
          <PaperPlaneTilt className="gba:w-4 gba:h-4" />
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </div>
  );
};

export const RequestComments: React.FC<RequestCommentsProps> = ({
  requestId,
  comments,
  commentContext,
  onPostComment,
  onRefreshComments,
  isLoading = false,
  className = '',
  ...contextProps
}) => {
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sort comments by creation date (newest first)
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [comments]);

  // Get unique user IDs from comments for batch fetching
  const userIds = useMemo(() => {
    return [...new Set(comments.map(comment => comment.authorId).filter(Boolean))];
  }, [comments]);

  // Batch fetch employee data
  const { employees } = useEmployeeNamesBatch({
    userIds,
    accessToken: contextProps.accessToken
  });

  // Filter comments based on user's visibility permissions
  const visibleComments = useMemo(() => {
    return sortedComments.filter(comment => {
      // Requesters can only see EXTERNAL comments
      if (commentContext.userRole === 'requester') {
        return comment.visibility === 'EXTERNAL';
      }
      
      // Staff can see EXTERNAL and INTERNAL_FLOW comments
      if (commentContext.userRole === 'staff') {
        return comment.visibility === 'EXTERNAL' || comment.visibility === 'INTERNAL_FLOW';
      }
      
      // Assignees can see all comments for their tasks, plus EXTERNAL and INTERNAL_FLOW for others
      if (commentContext.userRole === 'assignee') {
        return comment.visibility === 'EXTERNAL' || 
               comment.visibility === 'INTERNAL_FLOW' ||
               (comment.visibility === 'INTERNAL_TASK' && comment.isFromAssignee);
      }
      
      // Admins can see all comments
      return true;
    });
  }, [sortedComments, commentContext.userRole]);

  const handlePostComment = async (comment: string, visibility: ServicePortalCommentVisibility) => {
    setIsSubmittingComment(true);
    try {
      await onPostComment({
        requestId,
        comment,
        visibility,
        userId: contextProps.userInfo?.id || 'anonymous'
      });
      
      message.success('Comment posted successfully');
      
      // Refresh comments to show the new one
      await onRefreshComments();
    } catch (error) {
      console.error('[RequestComments] Failed to post comment:', error);
      message.error('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <Card className={className} data-testid="request-comments">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-3">
          <ChatCircle className="gba:w-5 gba:h-5" />
          Comments
          {visibleComments.length > 0 && (
            <Badge variant="secondary" className="gba:ml-2">
              {visibleComments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Comments List */}
        <div className="gba:mb-6">
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner size="lg" />
            </div>
          ) : visibleComments.length > 0 ? (
            <div className="gba:space-y-4 gba:max-h-96 gba:overflow-y-auto gba:pr-2 gba:scrollbar-thin gba:scrollbar-thumb-slate-300 gba:scrollbar-track-slate-100">
              {visibleComments
                .sort((a, b) => {
                  const dateA = new Date(a.createdAt);
                  const dateB = new Date(b.createdAt);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    employeeData={employees.get(comment.authorId)}
                    userInfo={contextProps.userInfo}
                  />
                ))}
            </div>
          ) : (
            <div className="gba:text-center gba:py-12 gba:px-6">
              <div className="gba:bg-gradient-to-br gba:from-slate-100 gba:to-slate-50 gba:rounded-full gba:w-20 gba:h-20 gba:mx-auto gba:mb-4 gba:flex gba:items-center gba:justify-center gba:shadow-inner">
                <ChatCircle className="gba:w-8 gba:h-8 gba:text-slate-400" />
              </div>
              <h4 className="gba:text-sm gba:font-medium gba:text-slate-600 gba:mb-1">No comments yet</h4>
              <p className="gba:text-xs gba:text-slate-500">Be the first to add a comment to this request</p>
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <Separator className="gba:my-6 gba:bg-gradient-to-r gba:from-transparent gba:via-slate-200 gba:to-transparent" />
        <div className="gba:space-y-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PaperPlaneTilt className="gba:w-4 gba:h-4 gba:text-slate-600" />
            <h4 className="gba:text-sm gba:font-semibold gba:text-slate-700">Add Comment</h4>
          </div>
          
          <CommentForm
            onSubmit={handlePostComment}
            commentContext={commentContext}
            isSubmitting={isSubmittingComment}
          />
        </div>
      </CardContent>
    </Card>
  );
};
