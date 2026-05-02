import { act, renderHook, waitFor } from '@testing-library/react'
import { useComments } from './useComments'
import type { Comment } from '../types/versioning'

class FakeSocket {
  private listeners = new Map<string, Set<(...args: any[]) => void>>()

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(listener)
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(listener)
  }

  fire(event: string, payload?: unknown) {
    this.listeners.get(event)?.forEach(listener => listener(payload))
  }
}

describe('useComments', () => {
  it('flattens loaded reply threads so panels can render replies after refresh', async () => {
    const parentComment: Comment = {
      id: 'comment-1',
      entityId: 'note-1',
      entityType: 'note',
      type: 'document',
      content: 'Parent comment',
      createdBy: 'user-1',
      createdAt: '2026-04-29T16:00:00.000Z',
      replies: [
        {
          id: 'reply-1',
          entityId: 'note-1',
          entityType: 'note',
          type: 'document',
          content: 'Reply comment',
          createdBy: 'user-2',
          createdAt: '2026-04-29T16:01:00.000Z',
          parentId: 'comment-1'
        }
      ]
    }

    const apiService = {
      createComment: jest.fn(),
      listComments: jest.fn<Promise<Comment[]>, [string, unknown?]>().mockResolvedValue([parentComment]),
      updateComment: jest.fn(),
      resolveComment: jest.fn(),
      deleteComment: jest.fn(),
      replyToComment: jest.fn()
    }

    const { result } = renderHook(() =>
      useComments({
        entityId: 'note-1',
        entityType: 'note',
        apiService
      })
    )

    await waitFor(() => {
      expect(result.current.comments).toEqual([
        parentComment,
        expect.objectContaining({
          id: 'reply-1',
          parentId: 'comment-1',
          content: 'Reply comment'
        })
      ])
      expect(result.current.unresolvedCount).toBe(1)
    })
  })

  it('reloads comments when a live comment event arrives', async () => {
    const socket = new FakeSocket()
    const createdComment: Comment = {
      id: 'comment-1',
      entityId: 'note-1',
      entityType: 'note',
      type: 'general',
      content: 'Hello from another user',
      createdBy: 'user-2',
      createdByName: 'Other User',
      createdAt: '2026-04-29T16:00:00.000Z'
    }

    const listComments = jest
      .fn<Promise<Comment[]>, [string, unknown?]>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdComment])

    const apiService = {
      createComment: jest.fn(),
      listComments,
      updateComment: jest.fn(),
      resolveComment: jest.fn(),
      deleteComment: jest.fn(),
      replyToComment: jest.fn()
    }

    const { result } = renderHook(() =>
      useComments({
        entityId: 'note-1',
        entityType: 'note',
        socket: socket as never,
        apiService
      })
    )

    await waitFor(() => {
      expect(listComments).toHaveBeenCalledTimes(1)
      expect(result.current.comments).toEqual([])
    })

    act(() => {
      socket.fire('comment:created', {
        comment: {
          id: createdComment.id
        },
        timestamp: Date.now()
      })
    })

    await waitFor(() => {
      expect(listComments).toHaveBeenCalledTimes(2)
      expect(result.current.comments).toEqual([createdComment])
      expect(result.current.unresolvedCount).toBe(1)
    })
  })

  it('reloads the canonical thread after creating a reply', async () => {
    const parentComment: Comment = {
      id: 'comment-1',
      entityId: 'whiteboard-1',
      entityType: 'whiteboard',
      type: 'selection',
      content: 'Parent comment',
      createdBy: 'user-1',
      createdAt: '2026-04-29T16:00:00.000Z'
    }
    const replyComment: Comment = {
      id: 'reply-1',
      entityId: 'whiteboard-1',
      entityType: 'whiteboard',
      type: 'selection',
      content: 'Reply comment',
      createdBy: 'user-2',
      createdAt: '2026-04-29T16:01:00.000Z',
      parentId: 'comment-1'
    }

    const listComments = jest
      .fn<Promise<Comment[]>, [string, unknown?]>()
      .mockResolvedValueOnce([parentComment])
      .mockResolvedValueOnce([
        {
          ...parentComment,
          replies: [replyComment]
        }
      ])

    const apiService = {
      createComment: jest.fn(),
      listComments,
      updateComment: jest.fn(),
      resolveComment: jest.fn(),
      deleteComment: jest.fn(),
      replyToComment: jest
        .fn<Promise<Comment | null>, [string, string, string?, string?]>()
        .mockResolvedValue(replyComment)
    }

    const { result } = renderHook(() =>
      useComments({
        entityId: 'whiteboard-1',
        entityType: 'whiteboard',
        apiService
      })
    )

    await waitFor(() => {
      expect(result.current.comments).toEqual([parentComment])
    })

    await act(async () => {
      await result.current.replyToComment('comment-1', 'Reply comment', 'Xmir Sali', 'https://example.com/avatar.png')
    })

    await waitFor(() => {
      expect(apiService.replyToComment).toHaveBeenCalledWith(
        'comment-1',
        'Reply comment',
        'Xmir Sali',
        'https://example.com/avatar.png'
      )
      expect(listComments).toHaveBeenLastCalledWith('whiteboard-1', {
        includeResolved: true,
        includeReplies: true
      })
      expect(result.current.comments).toEqual([
        expect.objectContaining({ id: 'comment-1' }),
        expect.objectContaining({
          id: 'reply-1',
          parentId: 'comment-1',
          content: 'Reply comment'
        })
      ])
    })
  })
})
