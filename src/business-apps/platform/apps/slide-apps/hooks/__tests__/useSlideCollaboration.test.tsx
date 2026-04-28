import { act, renderHook, waitFor } from '@testing-library/react'
import type { SlideData } from '../../components/slideElements'
import { useSlideCollaboration } from '../useSlideCollaboration'

const mockSocket = {
  connected: true,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}

const providerStartMock = jest.fn()
const providerDestroyMock = jest.fn()

jest.mock('../../../shared/hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    participants: [],
    socket: mockSocket
  })
}))

jest.mock('../../../shared/services/SocketIoYjsProvider', () => ({
  SocketIoYjsProvider: class MockSocketIoYjsProvider {
    private readonly onSyncedChange?: (isSynced: boolean) => void

    constructor(options: { onSyncedChange?: (isSynced: boolean) => void }) {
      this.onSyncedChange = options.onSyncedChange
    }

    start() {
      providerStartMock()
      this.onSyncedChange?.(true)
    }

    destroy() {
      providerDestroyMock()
    }

    flushPendingLocalUpdates() {}
  }
}))

describe('useSlideCollaboration', () => {
  const initialSlides: SlideData[] = [
    {
      id: 'slide-1',
      notes: '',
      elements: [
        {
          id: 'title-1',
          type: 'text',
          position: { x: 80, y: 80 },
          size: { width: 1120, height: 100 },
          rotation: 0,
          opacity: 1,
          locked: false,
          zIndex: 1,
          content: 'Click to add title',
          fontFamily: 'Inter',
          fontSize: 64,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          verticalAlign: 'top',
          color: '#1e293b',
          backgroundColor: 'transparent',
          lineHeight: 1.4,
          letterSpacing: 0,
          padding: 8
        }
      ],
      background: { type: 'solid', color: '#ffffff' }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('seeds an empty collaborative deck after sync so the first slide becomes editable', async () => {
    const { result, unmount } = renderHook(() =>
      useSlideCollaboration({
        slideId: 'deck-1',
        accessToken: 'token-1',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
        enabled: true,
        initialSlides,
        initialThemeId: 'corporate'
      })
    )

    await waitFor(() => {
      expect(result.current.isSynced).toBe(true)
      expect(result.current.isInitialized).toBe(true)
    })

    act(() => {
      result.current.updateElement(0, 'title-1', { content: 'Updated title' })
    })

    await waitFor(() => {
      expect(result.current.slides[0]?.elements[0]).toMatchObject({
        id: 'title-1',
        content: 'Updated title'
      })
    })

    expect(result.current.themeId).toBe('corporate')
    expect(providerStartMock).toHaveBeenCalledTimes(1)

    unmount()

    expect(providerDestroyMock).toHaveBeenCalledTimes(1)
  })
})
