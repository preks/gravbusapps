import React from 'react'
import { render, screen } from '@testing-library/react'
import { StatusIndicators } from '../StatusIndicators'

jest.mock('@newwork/nw-design-system', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  AvatarImage: (props: any) => <img alt={props.alt ?? ''} {...props} />,
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      key === 'status-indicator-active-count' ? `${vars?.count} active` : key
  })
}))

jest.mock('lucide-react', () => {
  const Icon = (props: any) => <span {...props} />
  return {
    Signal: Icon,
    Database: Icon,
    RefreshCw: Icon,
    Loader2: Icon,
    Users: Icon
  }
})

describe('StatusIndicators', () => {
  it('counts unique active users instead of duplicate sockets', () => {
    render(
      <StatusIndicators
        isCollaborationConnected={true}
        headerParticipants={[
          {
            userId: 'user-1',
            userName: 'User One',
            userColor: '#111111',
            socketId: 'socket-1',
            lastActiveAt: new Date()
          },
          {
            userId: 'user-1',
            userName: 'User One',
            userColor: '#111111',
            socketId: 'socket-2',
            lastActiveAt: new Date()
          },
          {
            userId: 'user-2',
            userName: 'User Two',
            userColor: '#222222',
            socketId: 'socket-3',
            lastActiveAt: new Date()
          }
        ]}
      />
    )

    expect(screen.getByText('2 active')).toBeInTheDocument()
    expect(screen.getByText('User One')).toBeInTheDocument()
    expect(screen.getByText('User Two')).toBeInTheDocument()
  })
})
