/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { ConfirmActionModal } from '../ConfirmActionModal'

describe('ConfirmActionModal', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmActionModal
        open={false}
        title="Archive?"
        description="Are you sure?"
        confirmLabel="Archive"
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(screen.queryByTestId('workforce-confirm-modal')).toBeNull()
  })

  it('renders the supplied copy when open', () => {
    render(
      <ConfirmActionModal
        open
        title="Archive Helper?"
        description="Will be hidden from the workforce."
        confirmLabel="Archive"
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(screen.getByTestId('workforce-confirm-modal')).toBeInTheDocument()
    expect(screen.getByText('Archive Helper?')).toBeInTheDocument()
    expect(screen.getByText('Will be hidden from the workforce.')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-confirm-confirm')).toHaveTextContent('Archive')
  })

  it('fires onCancel from cancel + close + escape buttons', () => {
    const onCancel = jest.fn()
    render(
      <ConfirmActionModal open title="t" description="d" confirmLabel="ok" onCancel={onCancel} onConfirm={() => {}} />
    )
    fireEvent.click(screen.getByTestId('workforce-confirm-cancel'))
    fireEvent.click(screen.getByTestId('workforce-confirm-close'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('fires onConfirm when the destructive button is clicked', () => {
    const onConfirm = jest.fn()
    render(
      <ConfirmActionModal
        open
        title="t"
        description="d"
        confirmLabel="Archive"
        onCancel={() => {}}
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByTestId('workforce-confirm-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while busy and swallows extra clicks', () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    render(
      <ConfirmActionModal
        open
        isBusy
        title="t"
        description="d"
        confirmLabel="Archive"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )
    expect(screen.getByTestId('workforce-confirm-confirm')).toBeDisabled()
    expect(screen.getByTestId('workforce-confirm-cancel')).toBeDisabled()
    fireEvent.click(screen.getByTestId('workforce-confirm-confirm'))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows the error banner when provided', () => {
    render(
      <ConfirmActionModal
        open
        title="t"
        description="d"
        confirmLabel="Archive"
        errorMessage="server said no"
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(screen.getByTestId('workforce-confirm-error')).toHaveTextContent('server said no')
  })
})
