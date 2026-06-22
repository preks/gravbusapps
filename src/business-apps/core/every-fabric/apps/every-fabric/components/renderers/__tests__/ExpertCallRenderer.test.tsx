import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key })
  }
})

import { ExpertCallRenderer } from '../ExpertCallRenderer'

describe('ExpertCallRenderer', () => {
  it('renders expert delegation as a compact pill without output body text', () => {
    render(
      React.createElement(ExpertCallRenderer, {
        agentId: 'HR_General_Agent',
        task: 'Assess the current health of HR operations for the product team across hiring, retention, performance reviews, and exits.',
        description: 'HR operations expert for product teams.',
        status: 'done',
        durationMs: 53630,
        outputPreview: 'Status envelope: scope assessed, risks identified, and gaps summarized.'
      })
    )

    expect(screen.getByText('HR_General_Agent')).toBeInTheDocument()
    expect(screen.getByText('renderer-expert-status-completed')).toBeInTheDocument()
    expect(screen.queryByText(/Status envelope/)).not.toBeInTheDocument()
  })

  it('renders a non-interactive pill (no button) when no onOpenDetail is given', () => {
    render(
      React.createElement(ExpertCallRenderer, {
        agentId: 'HR_General_Agent',
        task: 'Assess HR health.',
        status: 'done'
      })
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByTestId('enterprise-agent-expert-HR_General_Agent')).toBeInTheDocument()
  })

  it('becomes a clickable button that opens the detail panel when onOpenDetail is provided', () => {
    const onOpenDetail = jest.fn()
    render(
      React.createElement(ExpertCallRenderer, {
        agentId: 'Customer 360 Analyst',
        task: 'Summarise account health.',
        status: 'done',
        durationMs: 4200,
        onOpenDetail
      })
    )

    const pill = screen.getByRole('button', { name: /Open details for agent/i })
    fireEvent.click(pill)
    expect(onOpenDetail).toHaveBeenCalledTimes(1)
  })
})
