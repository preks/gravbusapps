/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'

import { FlowProgressBar } from '../FlowProgressBar'

describe('FlowProgressBar', () => {
  it('renders nothing without a positive total step count', () => {
    const { container } = render(<FlowProgressBar totalSteps={0} variant="running" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the step count and percentage label', () => {
    render(<FlowProgressBar completedSteps={2} totalSteps={4} percentage={50} variant="running" />)
    expect(screen.getByText('2/4 steps')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('derives the percentage from steps when none is supplied and clamps the fill', () => {
    render(<FlowProgressBar completedSteps={6} totalSteps={4} variant="success" />)
    // 6/4 -> 150% label, but the fill width is clamped to 100%.
    expect(screen.getByText('150%')).toBeInTheDocument()
    expect(screen.getByTestId('flow-progress-fill')).toHaveStyle({ width: '100%' })
  })
})
