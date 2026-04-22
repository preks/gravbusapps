import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { SpaceTeamChatPanel } from './SpaceTeamChatPanel'

const mockGetMessages = jest.fn()
const mockChatClient = {
  getMessages: mockGetMessages
}

jest.mock('@newwork/nw-design-system', () => ({
  ...jest.requireActual('@/__mocks__/@newwork/nw-design-system'),
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en-US'
  })
}))

jest.mock('@/common/network/chat/useChatClient', () => ({
  useChatClient: () => mockChatClient
}))

describe('SpaceTeamChatPanel', () => {
  beforeEach(() => {
    mockGetMessages.mockReset()
  })

  it('resolves system message authors from metadata user ids', async () => {
    const onUserIdsNeeded = jest.fn()

    mockGetMessages.mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          content: 'Xmir Sali created the group.',
          createdAt: '2026-04-20T12:00:00Z',
          type: 'system',
          metadata: {
            type: 'conversation_created',
            userId: 'user-123'
          }
        }
      ]
    })

    render(
      <SpaceTeamChatPanel
        conversation={{
          id: 'conversation-1',
          name: 'Product Testing Unit',
          type: 'group',
          participantCount: 2,
          createdAt: '2026-04-20T10:00:00Z',
          updatedAt: '2026-04-20T10:00:00Z'
        }}
        accessToken="token"
        getUserInfo={userId =>
          userId === 'user-123'
            ? {
                userId,
                name: 'Xmir Sali'
              }
            : undefined
        }
        onUserIdsNeeded={onUserIdsNeeded}
      />
    )

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith('conversation-1', 1, 8)
    })

    await waitFor(() => {
      expect(screen.getByText('Xmir Sali')).toBeInTheDocument()
    })

    expect(screen.queryByText('common-unknown')).not.toBeInTheDocument()
    expect(onUserIdsNeeded).toHaveBeenCalledWith(['user-123'])
  })
})
