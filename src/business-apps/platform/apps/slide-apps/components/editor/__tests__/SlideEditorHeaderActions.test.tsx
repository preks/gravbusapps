import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SlideEditorHeaderActions } from '../SlideEditorHeaderActions'

const versioningMock = {
  versions: [],
  isLoading: false,
  isSaving: false,
  error: null as string | null,
  loadVersions: jest.fn(),
  createCheckpoint: jest.fn()
}

const fileLockMock = {
  lock: null,
  isLockedByMe: false,
  acquireLock: jest.fn(),
  releaseLock: jest.fn()
}

const toastErrorMock = jest.fn()

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <div />,
  Separator: () => <div />,
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.PropsWithChildren<React.LabelHTMLAttributes<HTMLLabelElement>>) => (
    <label {...props}>{children}</label>
  ),
  useTranslation: () => ({ t: (key: string) => key, locale: 'en-US' })
}))

jest.mock('lucide-react', () => ({
  FileText: () => <span />,
  History: () => <span />,
  Lock: () => <span />,
  Share2: () => <span />,
  Save: () => <span />,
  Unlock: () => <span />
}))

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args)
  }
}))

jest.mock('@/business-apps/platform/apps/shared/hooks/useVersioning', () => ({
  useVersioning: () => versioningMock
}))

jest.mock('@/business-apps/platform/apps/shared/hooks/useFileLock', () => ({
  useFileLock: () => fileLockMock
}))

jest.mock('@/business-apps/platform/apps/shared/components/VersionHistory', () => ({
  VersionHistory: () => <div>version-history</div>
}))

jest.mock('../../ShareSlideDialog', () => ({
  ShareSlideDialog: () => null
}))

jest.mock('../../ManageSharesDialog', () => ({
  ManageSharesDialog: () => null
}))

describe('SlideEditorHeaderActions', () => {
  beforeEach(() => {
    versioningMock.versions = []
    versioningMock.isLoading = false
    versioningMock.isSaving = false
    versioningMock.error = null
    versioningMock.loadVersions.mockReset()
    versioningMock.createCheckpoint.mockReset()
    fileLockMock.acquireLock.mockReset()
    fileLockMock.releaseLock.mockReset()
    toastErrorMock.mockReset()
  })

  it('keeps the checkpoint dialog open when checkpoint creation fails', async () => {
    versioningMock.createCheckpoint.mockResolvedValue(null)
    const flushPendingCollaborationUpdates = jest.fn()

    render(
      <SlideEditorHeaderActions
        slideId="slide-1"
        slideTitle="Deck"
        currentUserId="user-1"
        applyContentJsonSnapshot={() => undefined}
        flushPendingCollaborationUpdates={flushPendingCollaborationUpdates}
      />
    )

    fireEvent.click(screen.getByTestId('slide-editor-header-actions-checkpoint'))
    fireEvent.click(screen.getByTestId('checkpoint-save-button'))

    await waitFor(() => {
      expect(flushPendingCollaborationUpdates).toHaveBeenCalled()
      expect(versioningMock.createCheckpoint).toHaveBeenCalledWith('')
      expect(toastErrorMock).toHaveBeenCalledWith('checkpoint-save-failed')
    })

    expect(screen.getByTestId('slide-editor-header-actions-checkpoint-dialog')).toBeInTheDocument()
  })
})
