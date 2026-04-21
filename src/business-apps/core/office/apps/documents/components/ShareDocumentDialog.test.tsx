import React from 'react'
import { render, screen } from '@testing-library/react'
import { ShareDocumentDialog } from './ShareDocumentDialog'

const mockT = jest.fn((key: string, vars?: Record<string, string | number>) => {
  if (key === 'share-dialog-title') {
    throw new ReferenceError('Unknown variable: $name')
  }

  if (key === 'share-dialog-description') {
    return `Freigabe "${vars?.title ?? ''}"`
  }

  if (key === 'share-dialog-success-title') {
    return 'Dokument geteilt!'
  }

  if (key === 'share-task-someone') {
    return 'Jemand'
  }

  return key
})

jest.mock('@newwork/nw-design-system', () => {
  const passthrough = ({ children, ...props }: any) => <div {...props}>{children}</div>
  const button = ({ children, ...props }: any) => <button {...props}>{children}</button>

  return {
    Dialog: ({ children }: any) => <div>{children}</div>,
    DialogContent: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
    DialogDescription: passthrough,
    DialogFooter: passthrough,
    Button: button,
    Input: (props: any) => <input {...props} />,
    Textarea: (props: any) => <textarea {...props} />,
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    Spinner: (props: any) => <div {...props}>Loading...</div>,
    Avatar: passthrough,
    AvatarImage: (props: any) => <img alt="" {...props} />,
    AvatarFallback: passthrough,
    Select: ({ children }: any) => <div>{children}</div>,
    SelectContent: passthrough,
    SelectItem: passthrough,
    SelectTrigger: passthrough,
    SelectValue: (props: any) => <span {...props} />,
    useTranslation: () => ({ t: mockT })
  }
})

jest.mock('@/common/data/employee/useEmployeeSearch', () => ({
  useEmployeeSearch: () => ({
    employees: [],
    loading: false,
    search: jest.fn()
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn()
  }
}))

describe('ShareDocumentDialog', () => {
  it('falls back to a safe title when a translation throws during render', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ShareDocumentDialog
        open={true}
        onOpenChange={jest.fn()}
        documentId="doc-1"
        documentTitle="Quarterly Plan"
        currentUserId="user-1"
        currentUserName="Alex Admin"
        accessToken="token"
        shareDocument={jest.fn().mockResolvedValue(true)}
      />
    )

    expect(screen.getByText('Share Document')).toBeInTheDocument()
    expect(screen.getByText('Freigabe "Quarterly Plan"')).toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalledWith(
      '[ShareDocument] Failed to translate "share-dialog-title"',
      expect.any(ReferenceError)
    )

    errorSpy.mockRestore()
  })
})
