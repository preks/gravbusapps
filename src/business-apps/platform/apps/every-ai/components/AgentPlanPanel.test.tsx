import React from 'react'
import { render, screen } from '@testing-library/react'

import { AgentPlanPanel } from './AgentPlanPanel'
import type { AgentPlanItem } from '../types/models'

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))

const baseItems: AgentPlanItem[] = [
  { id: '1', content: 'Look up the contact', status: 'completed' },
  { id: '2', content: 'Draft the email', status: 'in_progress' },
  { id: '3', content: 'Send to manager', status: 'pending' },
  { id: '4', content: 'Forget the obsolete step', status: 'cancelled' }
]

describe('AgentPlanPanel', () => {
  it('renders an item for every plan entry with all four statuses', () => {
    render(<AgentPlanPanel planId="plan-1" items={baseItems} />)

    const items = screen.getAllByTestId('agent-plan-item')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveAttribute('data-status', 'completed')
    expect(items[1]).toHaveAttribute('data-status', 'in_progress')
    expect(items[2]).toHaveAttribute('data-status', 'pending')
    expect(items[3]).toHaveAttribute('data-status', 'cancelled')
  })

  it('shows a "completed / total" progress badge', () => {
    render(<AgentPlanPanel planId="plan-1" items={baseItems} />)
    expect(screen.getByTestId('agent-plan-progress')).toHaveTextContent('1 / 4')
  })

  it('shows an "active" badge when at least one item is in progress', () => {
    render(<AgentPlanPanel planId="plan-1" items={baseItems} />)
    expect(screen.getByTestId('agent-plan-active')).toHaveTextContent('1 active')
  })

  it('hides the active badge when no item is in progress', () => {
    const items: AgentPlanItem[] = [
      { id: '1', content: 'Done', status: 'completed' },
      { id: '2', content: 'Pending', status: 'pending' }
    ]
    render(<AgentPlanPanel planId="plan-2" items={items} />)
    expect(screen.queryByTestId('agent-plan-active')).not.toBeInTheDocument()
  })

  it('renders nothing when given an empty plan', () => {
    const { container } = render(<AgentPlanPanel planId="plan-3" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('updates rendered items when props change (snapshot replace semantics)', () => {
    const { rerender } = render(<AgentPlanPanel planId="plan-1" items={baseItems} />)
    expect(screen.getAllByTestId('agent-plan-item')).toHaveLength(4)

    const next: AgentPlanItem[] = [
      { id: '1', content: 'Look up the contact', status: 'completed' },
      { id: '2', content: 'Draft the email', status: 'completed' }
    ]

    rerender(<AgentPlanPanel planId="plan-1" items={next} />)
    const updated = screen.getAllByTestId('agent-plan-item')
    expect(updated).toHaveLength(2)
    updated.forEach(node => expect(node).toHaveAttribute('data-status', 'completed'))
    expect(screen.getByTestId('agent-plan-progress')).toHaveTextContent('2 / 2')
  })
})
