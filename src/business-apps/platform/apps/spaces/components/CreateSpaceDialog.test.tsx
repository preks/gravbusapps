import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateSpaceDialog } from './CreateSpaceDialog'

jest.mock('../../shared', () => ({
  DimensionPicker: () => null,
  useOrganizationalDimensions: () => ({
    organizationalUnits: [],
    matrixTeams: [],
    locations: [],
    legalEntities: [],
    capabilities: [],
    isLoadingDimensions: false,
    isLoadingMembers: false,
    selectedMembers: [],
    loadDimensions: jest.fn(),
    loadMembersByDimension: jest.fn(),
    clearMembers: jest.fn()
  }),
  getDimensionPickerTranslations: jest.fn()
}))

describe('CreateSpaceDialog', () => {
  it('renders the create error and keeps the dialog open when creation fails', async () => {
    const onOpenChange = jest.fn()
    const onCreate = jest.fn().mockResolvedValue(false)

    render(
      <CreateSpaceDialog
        open
        onOpenChange={onOpenChange}
        onCreate={onCreate}
        error="A space for this group already exists"
        accessToken="token"
        currentUserId="user-1"
      />
    )

    fireEvent.change(screen.getByTestId('create-space-dialog-name-input'), {
      target: { value: 'Product Space' }
    })
    fireEvent.click(screen.getByTestId('create-space-dialog-create-button'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Product Space'
        })
      )
    })

    expect(screen.getByTestId('create-space-dialog-error')).toHaveTextContent('A space for this group already exists')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
