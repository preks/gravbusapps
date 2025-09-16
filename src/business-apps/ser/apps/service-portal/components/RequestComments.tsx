import React, { useState, useMemo } from 'react';
import { 
  Button, 
  Badge, 
  Textarea,
  Avatar,
  AvatarFallback,
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
  User as UserIcon
} from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { UserDisplayName } from '../../../components/UserDisplayName';
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
  contextProps: BusinessAppContextProps;
}> = ({ comment, contextProps }) => {

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
    
    return commentDate.toLocaleDateString();
  };

  return (
    <div 
      className="gba:flex gba:gap-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg"
      data-testid={`comment-${comment.id}`}
    >
      {/* Avatar */}
      <Avatar className="gba:flex-shrink-0">
        <AvatarFallback>
          <UserIcon className="gba:w-4 gba:h-4" />
        </AvatarFallback>
      </Avatar>

      {/* Comment Content */}
      <div className="gba:flex-1 gba:min-w-0">
        {/* Header */}
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:flex-wrap">
            <span className="gba:text-sm gba:font-medium">
              <UserDisplayName
                userId={comment.authorId}
                accessToken={contextProps.accessToken}
                userInfo={contextProps.userInfo}
                showIcon={false}
                color="default"
                size="small"
                fallback="Unknown User"
                testId={`comment-author-${comment.id}`}
              />
            </span>
            <span 
              className="gba:text-xs"
              style={{ color: 'var(--nw-muted-foreground)' }}
            >
              {formatTimeAgo(comment.createdAt)}
            </span>
            {/* Public Comment Badge */}
            <Badge 
              variant="outline"
              className="gba:text-xs gba:gap-1"
              data-testid={`comment-visibility-${comment.id}`}
            >
              <EyeIcon className="gba:w-3 gba:h-3" />
              Public
            </Badge>
          </div>

          <p className="gba:text-sm">{comment.body}</p>
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
      <Textarea
        placeholder="Enter your comment..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        data-testid="comment-textarea"
      />
      
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
            <div className="gba:space-y-4 gba:max-h-80 gba:overflow-y-auto">
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
                    contextProps={contextProps}
                  />
                ))}
            </div>
          ) : (
            <div 
              className="gba:text-center gba:py-8"
              style={{ color: 'var(--nw-muted-foreground)' }}
            >
              <ChatCircle className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p>No comments yet</p>
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <Separator className="gba:my-6" />
        <div className="gba:space-y-4">
          <h4 className="gba:text-sm gba:font-semibold">Add Comment</h4>
          
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
