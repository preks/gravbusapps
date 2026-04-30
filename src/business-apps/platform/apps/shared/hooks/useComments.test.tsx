import { renderHook, waitFor } from '@testing-library/react'
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

    const { result } = renderHook(() =>
      useComments({
        entityId: 'note-1',
        entityType: 'note',
        socket: socket as never,
        apiService: {
          createComment: jest.fn(),
          listComments,
          updateComment: jest.fn(),
          resolveComment: jest.fn(),
          deleteComment: jest.fn(),
          replyToComment: jest.fn()
        }
      })
    )

    await waitFor(() => {
      expect(listComments).toHaveBeenCalledTimes(1)
      expect(result.current.comments).toEqual([])
    })

    socket.fire('comment:created', {
      comment: {
        id: createdComment.id
      },
      timestamp: Date.now()
    })

    await waitFor(() => {
      expect(listComments).toHaveBeenCalledTimes(2)
      expect(result.current.comments).toEqual([createdComment])
      expect(result.current.unresolvedCount).toBe(1)
    })
  })
})
