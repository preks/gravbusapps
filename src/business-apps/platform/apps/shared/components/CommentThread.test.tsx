import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Comment } from '../types/versioning'
import { CommentThread } from './CommentThread'

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Avatar: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en-US'
  })
}))

jest.mock('./CommentEditor', () => ({
  CommentEditor: () => <div>comment-editor</div>
}))

const baseComment: Comment = {
  id: 'comment-1',
  entityId: 'note-1',
  entityType: 'note',
  type: 'document',
  content: 'Test comment',
  createdBy: 'user-1',
  createdByName: 'Ada',
  createdAt: '2026-04-29T16:00:00.000Z'
}

describe('CommentThread', () => {
  it('shows resolve for unresolved threads and hides reopen', () => {
    render(
      <CommentThread
        comment={baseComment}
        onReply={jest.fn().mockResolvedValue(undefined)}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onResolve={jest.fn().mockResolvedValue(undefined)}
        onUnresolve={jest.fn().mockResolvedValue(undefined)}
        onDelete={jest.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByText('comment-thread-resolve')).toBeInTheDocument()
    expect(screen.queryByTestId('comment-reopen-comment-1')).not.toBeInTheDocument()
  })

  it('shows reopen for resolved threads and calls the reopen handler', () => {
    const onUnresolve = jest.fn().mockResolvedValue(undefined)

    render(
      <CommentThread
        comment={{
          ...baseComment,
          resolvedAt: '2026-04-29T16:05:00.000Z',
          resolvedBy: 'user-2'
        }}
        onReply={jest.fn().mockResolvedValue(undefined)}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onResolve={jest.fn().mockResolvedValue(undefined)}
        onUnresolve={onUnresolve}
        onDelete={jest.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.click(screen.getByTestId('comment-reopen-comment-1'))

    expect(screen.queryByText('comment-thread-resolve')).not.toBeInTheDocument()
    expect(screen.getByTestId('comment-reopen-comment-1')).toBeInTheDocument()
    expect(onUnresolve).toHaveBeenCalledTimes(1)
  })

  it('hides reply and resolve actions when thread permissions are disabled', () => {
    render(
      <CommentThread
        comment={baseComment}
        onReply={jest.fn().mockResolvedValue(undefined)}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onResolve={jest.fn().mockResolvedValue(undefined)}
        onUnresolve={jest.fn().mockResolvedValue(undefined)}
        onDelete={jest.fn().mockResolvedValue(undefined)}
        canReply={false}
        canResolve={false}
      />
    )

    expect(screen.queryByText('comment-thread-reply')).not.toBeInTheDocument()
    expect(screen.queryByText('comment-thread-resolve')).not.toBeInTheDocument()
  })

  it('does not show edit and delete for someone else when own-comment actions are disabled', () => {
    render(
      <CommentThread
        comment={baseComment}
        currentUserId="user-1"
        onReply={jest.fn().mockResolvedValue(undefined)}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onResolve={jest.fn().mockResolvedValue(undefined)}
        onUnresolve={jest.fn().mockResolvedValue(undefined)}
        onDelete={jest.fn().mockResolvedValue(undefined)}
        canEdit={false}
        canDelete={false}
      />
    )

    expect(screen.queryByText('comment-thread-edit')).not.toBeInTheDocument()
    expect(screen.queryByText('comment-thread-delete')).not.toBeInTheDocument()
  })
})
