import React from 'react'
import { render, screen } from '@testing-library/react'
import { AgentTypingIndicator } from '../AgentTypingIndicator'

describe('AgentTypingIndicator', () => {
  it('renders the working label as an FTL key', () => {
    render(<AgentTypingIndicator />)

    expect(screen.getByTestId('enterprise-agent-thinking')).toBeInTheDocument()
    expect(screen.getByText('chat-agent-working')).toBeInTheDocument()
  })
})
