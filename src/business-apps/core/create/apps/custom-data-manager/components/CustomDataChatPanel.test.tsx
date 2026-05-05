import React from 'react'
import { render, screen } from '@testing-library/react'
import { CustomDataChatPanel } from './CustomDataChatPanel'
import { InputType } from '../types'

const mockUseCustomDataChat = jest.fn()

jest.mock('../hooks/useCustomDataChat', () => ({
  useCustomDataChat: (...args: unknown[]) => mockUseCustomDataChat(...args)
}))

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>
}))

jest.mock('@/common/components/ai-builder', () => ({
  CreateChatPanel: ({ children }: any) => <div>{children}</div>,
  CreateChatMessageUser: ({ children }: any) => <div>{children}</div>,
  CreateChatMessageAssistant: ({ children }: any) => <div>{children}</div>
}))

describe('CustomDataChatPanel', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders progress blocks, thinking text, response text, and the proposal preview', () => {
    const proposal = {
      entities: [
        {
          key: 'order',
          displayName: 'Order',
          description: 'Sales order',
          columns: [{ type: InputType.TEXT, name: 'name', label: 'Name' }]
        }
      ],
      relationships: []
    }

    mockUseCustomDataChat.mockReturnValue({
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Built a draft model.',
          thinkingContent: 'Reading namespace graph',
          progressSteps: [
            {
              id: 'planning',
              title: 'Planning',
              detail: 'Namespace context loaded',
              status: 'complete'
            }
          ],
          proposal
        }
      ],
      inputValue: '',
      setInputValue: jest.fn(),
      isProcessing: false,
      pendingProposal: proposal,
      sendMessage: jest.fn(),
      applyProposal: jest.fn(),
      clearChat: jest.fn()
    })

    render(<CustomDataChatPanel onGenerate={jest.fn()} onCreate={jest.fn()} onSuccess={jest.fn()} />)

    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Namespace context loaded')).toBeInTheDocument()
    expect(screen.getByText('Reading namespace graph')).toBeInTheDocument()
    expect(screen.getByText('Built a draft model.')).toBeInTheDocument()
    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply Model' })).toBeInTheDocument()
  })
})
