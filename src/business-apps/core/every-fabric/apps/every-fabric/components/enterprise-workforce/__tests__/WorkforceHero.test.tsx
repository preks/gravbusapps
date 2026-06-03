/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkforceHero } from '../WorkforceHero'
import type { WorkforceCounts } from '../useWorkforceData'

function makeCounts(overrides: Partial<WorkforceCounts> = {}): WorkforceCounts {
  return {
    active: 0,
    paused: 0,
    total: 0,
    activeTriggers: 0,
    creditsThisWeek: 0,
    runsToday: 0,
    ...overrides
  }
}

describe('WorkforceHero', () => {
  it('renders all four KPI tiles with their values', () => {
    render(
      <WorkforceHero
        counts={makeCounts({ active: 3, paused: 2, activeTriggers: 7, creditsThisWeek: 142 })}
        onHireAgent={jest.fn()}
      />
    )

    expect(screen.getByTestId('workforce-kpi-active')).toHaveTextContent('3')
    expect(screen.getByTestId('workforce-kpi-paused')).toHaveTextContent('2')
    expect(screen.getByTestId('workforce-kpi-triggers')).toHaveTextContent('7')
    expect(screen.getByTestId('workforce-kpi-credits')).toHaveTextContent('142')
  })

  it('fires onHireAgent when the hire button is clicked', () => {
    const onHire = jest.fn()
    render(<WorkforceHero counts={makeCounts()} onHireAgent={onHire} />)
    fireEvent.click(screen.getByTestId('workforce-hire-button'))
    expect(onHire).toHaveBeenCalledTimes(1)
  })
})
