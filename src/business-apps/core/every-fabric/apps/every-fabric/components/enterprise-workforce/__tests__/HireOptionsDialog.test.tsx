/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { HireOptionsDialog } from '../HireOptionsDialog'

describe('HireOptionsDialog', () => {
  it('does not render when closed', () => {
    render(
      <HireOptionsDialog open={false} onClose={jest.fn()} onChooseMarketplace={jest.fn()} onChooseCreate={jest.fn()} />
    )
    expect(screen.queryByTestId('hire-options-dialog')).not.toBeInTheDocument()
  })

  it('renders both options and fires the marketplace callback', () => {
    const onMarketplace = jest.fn()
    render(
      <HireOptionsDialog open onClose={jest.fn()} onChooseMarketplace={onMarketplace} onChooseCreate={jest.fn()} />
    )

    expect(screen.getByTestId('hire-options-marketplace')).toBeInTheDocument()
    expect(screen.getByTestId('hire-options-create')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('hire-options-marketplace'))
    expect(onMarketplace).toHaveBeenCalledTimes(1)
  })

  it('fires the create callback', () => {
    const onCreate = jest.fn()
    render(<HireOptionsDialog open onClose={jest.fn()} onChooseMarketplace={jest.fn()} onChooseCreate={onCreate} />)
    fireEvent.click(screen.getByTestId('hire-options-create'))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('fires onClose from the close button', () => {
    const onClose = jest.fn()
    render(<HireOptionsDialog open onClose={onClose} onChooseMarketplace={jest.fn()} onChooseCreate={jest.fn()} />)
    fireEvent.click(screen.getByTestId('hire-options-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
