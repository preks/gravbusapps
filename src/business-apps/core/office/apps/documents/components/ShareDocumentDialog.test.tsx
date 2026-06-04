import React from 'react'
import { render, screen } from '@testing-library/react'
import { ShareDocumentDialog } from './ShareDocumentDialog'

const mockBuildPlatformUrl = jest.fn(() => '/platform/every-office/documents?docId=doc-1&view=editor')
const mockSendShareBlinkNotifications = jest.fn().mockResolvedValue({ success: true })
const mockShareEntityDialog = jest.fn(() => <div data-testid="share-entity-dialog" />)

jest.mock('@/common/utils/navigationUtils', () => ({
  buildPlatformUrl: (...args: unknown[]) => mockBuildPlatformUrl(...args)
}))

jest.mock('@/business-apps/core/office/sharing', () => ({
  DOCUMENT_SHARE_PERMISSIONS: [{ id: 'view' }, { id: 'comment' }, { id: 'edit' }],
  ShareEntityDialog: (props: unknown) => mockShareEntityDialog(props),
  sendShareBlinkNotifications: (...args: unknown[]) => mockSendShareBlinkNotifications(...args)
}))

describe('ShareDocumentDialog', () => {
  beforeEach(() => {
    mockBuildPlatformUrl.mockClear()
    mockSendShareBlinkNotifications.mockClear()
    mockShareEntityDialog.mockClear()
  })

  it('maps document sharing props into the shared entity dialog', () => {
    const onShare = jest.fn().mockResolvedValue(true)
    const onUnshare = jest.fn().mockResolvedValue(true)
    const onRefreshShares = jest.fn().mockResolvedValue(undefined)
    const onManageAccess = jest.fn()

    render(
      <ShareDocumentDialog
        open={true}
        onOpenChange={jest.fn()}
        documentId="doc-1"
        documentTitle="Quarterly Plan"
        accessToken="token"
        currentUserId="user-1"
        currentUserName="Alex Admin"
        currentUserAvatar="https://example.com/avatar.png"
        isOwner={true}
        sharedUsers={[
          {
            id: 'share-1',
            userId: 'user-2',
            userName: 'Pat Viewer',
            userEmail: 'pat@example.com',
            userAvatar: 'https://example.com/pat.png',
            permission: 'comment',
            sharedAt: '2026-06-04T08:00:00.000Z',
            sharedBy: 'user-1'
          }
        ]}
        onShare={onShare}
        onUnshare={onUnshare}
        onRefreshShares={onRefreshShares}
        onManageAccess={onManageAccess}
      />
    )

    expect(screen.getByTestId('share-entity-dialog')).toBeInTheDocument()

    const shareDialogProps = mockShareEntityDialog.mock.calls[0][0]
    expect(shareDialogProps.entityId).toBe('doc-1')
    expect(shareDialogProps.entityTitle).toBe('Quarterly Plan')
    expect(shareDialogProps.entityType).toBe('document')
    expect(shareDialogProps.currentUserAvatar).toBe('https://example.com/avatar.png')
    expect(shareDialogProps.permissionOptions).toEqual([{ id: 'view' }, { id: 'comment' }, { id: 'edit' }])
    expect(shareDialogProps.sharedUsers).toEqual([
      {
        shareId: 'share-1',
        userId: 'user-2',
        userName: 'Pat Viewer',
        userEmail: 'pat@example.com',
        userAvatar: 'https://example.com/pat.png',
        permission: 'comment',
        sharedAt: '2026-06-04T08:00:00.000Z'
      }
    ])
    expect(shareDialogProps.onManageAccess).toBe(onManageAccess)
  })

  it('sends document blink notifications with the shared helper', async () => {
    render(
      <ShareDocumentDialog
        open={true}
        onOpenChange={jest.fn()}
        documentId="doc-1"
        documentTitle="Quarterly Plan"
        accessToken="token"
        currentUserId="user-1"
        isOwner={true}
        sharedUsers={[]}
        onShare={jest.fn().mockResolvedValue(true)}
        onUnshare={jest.fn().mockResolvedValue(true)}
        onRefreshShares={jest.fn().mockResolvedValue(undefined)}
      />
    )

    const shareDialogProps = mockShareEntityDialog.mock.calls[0][0]

    await shareDialogProps.sendNotifications({
      accessToken: 'token',
      entityId: 'doc-1',
      entityTitle: 'Quarterly Plan',
      initiatorId: 'user-1',
      recipients: [{ userId: 'user-2', permission: 'view' }]
    })

    expect(mockBuildPlatformUrl).toHaveBeenCalledWith('/platform/every-office/documents', {
      docId: 'doc-1',
      view: 'editor'
    })
    expect(mockSendShareBlinkNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'document',
        appTag: 'document-share',
        titlePrefix: 'Document Shared',
        entityUrl: '/platform/every-office/documents?docId=doc-1&view=editor'
      })
    )
  })
})
