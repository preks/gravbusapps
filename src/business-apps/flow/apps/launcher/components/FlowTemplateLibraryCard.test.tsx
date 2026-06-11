/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { FlowTriggerType } from '@/common/network/flows/FlowTemplateClient'

import { FlowTemplateLibraryCard } from './FlowTemplateLibraryCard'
import type { FlowTemplateLibraryItem } from '../hooks/useFlowTemplateLibrary'

function buildItem(overrides: Partial<FlowTemplateLibraryItem> = {}): FlowTemplateLibraryItem {
  return {
    template: { id: 'tpl-1', name: 'Employee Onboarding Process' } as FlowTemplateLibraryItem['template'],
    templateId: 'tpl-1',
    name: 'Employee Onboarding Process',
    description: 'Onboard a new employee',
    triggerTypes: [FlowTriggerType.MANUAL_FORM],
    isManualLaunchable: true,
    serviceCategoryRefs: [],
    serviceCategoryIds: ['hr'],
    ...overrides
  }
}

describe('FlowTemplateLibraryCard', () => {
  it('starts a manual template when the card is clicked', () => {
    const onStart = jest.fn()
    render(<FlowTemplateLibraryCard item={buildItem()} onStart={onStart} data-testid="flow-card" />)

    fireEvent.click(screen.getByTestId('flow-card'))

    expect(onStart).toHaveBeenCalledWith('tpl-1')
  })

  it('routes non-manual templates to onViewDetails when the card is clicked', () => {
    const onStart = jest.fn()
    const onViewDetails = jest.fn()
    render(
      <FlowTemplateLibraryCard
        item={buildItem({
          triggerTypes: [FlowTriggerType.EMAIL],
          isManualLaunchable: false
        })}
        onStart={onStart}
        onViewDetails={onViewDetails}
        data-testid="flow-card"
      />
    )

    fireEvent.click(screen.getByTestId('flow-card'))

    expect(onStart).not.toHaveBeenCalled()
    expect(onViewDetails).toHaveBeenCalledWith('tpl-1')
  })
})
