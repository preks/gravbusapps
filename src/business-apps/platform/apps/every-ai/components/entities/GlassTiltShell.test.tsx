/**
 * GlassTiltShell: renders its children and exposes a button affordance
 * (role, keyboard activation) when clickable.
 */

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { GlassTiltShell } from './GlassTiltShell'

describe('GlassTiltShell', () => {
  it('renders children', () => {
    render(
      <GlassTiltShell data-testid="shell">
        <span>Ada Lovelace</span>
      </GlassTiltShell>
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('is not interactive without onClick', () => {
    render(
      <GlassTiltShell data-testid="shell">
        <span>Static</span>
      </GlassTiltShell>
    )
    expect(screen.getByTestId('shell')).not.toHaveAttribute('role')
  })

  it('exposes a button affordance and fires onClick', () => {
    const onClick = jest.fn()
    render(
      <GlassTiltShell onClick={onClick} data-testid="shell">
        <span>Open</span>
      </GlassTiltShell>
    )
    const surface = screen.getByTestId('shell')
    expect(surface).toHaveAttribute('role', 'button')
    fireEvent.click(surface)
    fireEvent.keyDown(surface, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
