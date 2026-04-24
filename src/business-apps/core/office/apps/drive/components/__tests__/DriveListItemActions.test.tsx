import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { DriveListItemActions } from '../DriveListItemActions'
import type { DriveItem } from '../../types/drive.types'

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

function createItem(overrides: Partial<DriveItem> = {}): DriveItem {
  return {
    id: 'item-1',
    type: 'document',
    name: 'Quarterly Report.docx',
    ownerId: 'owner-1',
    folderId: null,
    spaceId: null,
    spaceFolderId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides
  }
}

function renderActions(item: DriveItem, onShareItem = jest.fn()) {
  return {
    onShareItem,
    ...render(
      <DriveListItemActions
        item={item}
        isTrash={false}
        onToggleFavorite={jest.fn()}
        onTrashItem={jest.fn()}
        onDownloadItem={jest.fn()}
        onRenameItem={jest.fn()}
        onShareItem={onShareItem}
        t={(key: string) => key}
        testId="drive-actions"
      />
    )
  }
}

describe('DriveListItemActions', () => {
  it('disables sharing for spreadsheet app items', () => {
    const { onShareItem } = renderActions(
      createItem({
        type: 'spreadsheet_app',
        name: 'Forecast',
        mimeType: 'application/vnd.newwork.spreadsheet'
      })
    )

    const shareButton = screen.getByTestId('drive-actions-share-item-1')
    expect(shareButton).toBeDisabled()

    fireEvent.click(shareButton)
    expect(onShareItem).not.toHaveBeenCalled()
  })

  it('disables sharing for spreadsheet-like uploaded files', () => {
    renderActions(
      createItem({
        type: 'drive_file',
        name: 'budget.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    )

    expect(screen.getByTestId('drive-actions-share-item-1')).toBeDisabled()
  })

  it('keeps sharing enabled for non-spreadsheet files', () => {
    const { onShareItem } = renderActions(createItem())

    const shareButton = screen.getByTestId('drive-actions-share-item-1')
    expect(shareButton).not.toBeDisabled()

    fireEvent.click(shareButton)
    expect(onShareItem).toHaveBeenCalledTimes(1)
  })
})
