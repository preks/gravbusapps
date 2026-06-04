import React from 'react'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByText(/Status envelope/)).not.toBeInTheDocument()
  })
})
