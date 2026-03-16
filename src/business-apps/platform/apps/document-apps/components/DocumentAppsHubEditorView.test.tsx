import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Document } from '../types/document'
import { DocumentAppsHubEditorView } from './DocumentAppsHubEditorView'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('./PagedDocumentEditor', () => ({
  PagedDocumentEditor: React.forwardRef((props: any) => (
    <div data-testid={props['data-testid'] ?? 'mock-paged-document-editor'}>
      {props.headerExtra}
      <button
        type="button"
        data-testid="mock-paged-editor-save"
        onClick={() =>
          props.onSave?.('Updated title', '<p>Updated body</p>', {
            pageSize: 'A4',
            pages: {
              header: '<p>Header</p>',
              footer: 'Page {page}'
            }
          })
        }
      >
        Save
      </button>
    </div>
  ))
}))

jest.mock('./PdfDocumentViewer', () => ({
  PdfDocumentViewer: () => <div data-testid="mock-pdf-viewer" />
}))

jest.mock('./TemplateFieldsPanel', () => ({
  TemplateFieldsPanel: () => <div data-testid="mock-template-fields-panel" />
}))

jest.mock('./external-import/ExternalDocumentSourceBadge', () => ({
  ExternalDocumentSourceBadge: ({ onCreateEditableCopy }: any) => (
    <button type="button" data-testid="mock-create-editable-copy" onClick={onCreateEditableCopy}>
      Create editable copy
    </button>
  )
}))

function createBaseProps() {
  return {
    templateBeingEdited: null,
    setTemplateBeingEdited: jest.fn(),
    setSessionEntityContext: jest.fn(),
    parsedWordDocument: null,
    setParsedWordDocument: jest.fn(),
    setSelectedDocumentId: jest.fn(),
    currentDocument: null,
    currentDocumentPermission: 'owner',
    createDocument: jest.fn(
      async (): Promise<Document | null> => ({
        id: 'new-doc-id',
        title: '',
        content: '',
        status: 'draft',
        createdAt: '',
        updatedAt: '',
        createdBy: 'user-1'
      })
    ),
    loadDocument: jest.fn(async () => null),
    updateDocument: jest.fn(async () => null),
    updateTemplate: jest.fn(async (_id, updates) => ({ id: 'template-1', ...updates })),
    updateUrl: jest.fn(),
    setCurrentView: jest.fn(),
    setActiveSection: jest.fn(),
    handleBack: jest.fn(),
    handleSendForApprovalClick: jest.fn(),
    currentUserId: 'user-1',
    accessToken: 'token',
    userInfo: {},
    templateEditorRef: { current: null },
    effectiveEntityContext: 'candidate',
    testId: 'document-apps-editor-view'
  }
}

describe('DocumentAppsHubEditorView', () => {
  it('passes formatting when saving an edited template', async () => {
    const props = createBaseProps()
    props.templateBeingEdited = {
      id: 'template-1',
      name: 'Offer letter',
      content: '<p>Body</p>',
      category: 'other',
      createdAt: '',
      updatedAt: '',
      createdBy: 'user-1',
      isPublic: false,
      formatting: {
        pageSize: 'A4',
        pages: {
          header: '<p>Existing header</p>'
        }
      }
    } as any

    render(<DocumentAppsHubEditorView {...props} />)
    fireEvent.click(screen.getByTestId('mock-paged-editor-save'))

    expect(props.updateTemplate).toHaveBeenCalledWith(
      'template-1',
      expect.objectContaining({
        name: 'Updated title',
        content: '<p>Updated body</p>',
        formatting: expect.objectContaining({
          pages: expect.objectContaining({
            header: '<p>Header</p>'
          })
        })
      })
    )
  })

  it('keeps formatting when creating an editable copy of an external document', async () => {
    const props = createBaseProps()
    props.currentDocument = {
      id: 'doc-1',
      title: 'External doc',
      content: '<p>External</p>',
      status: 'draft',
      createdAt: '',
      updatedAt: '',
      createdBy: 'user-1',
      settings: {
        external: {
          provider: 'sharepoint'
        }
      },
      formatting: {
        pageSize: 'A4',
        pages: {
          footer: 'Page {page}'
        }
      }
    } as any

    render(<DocumentAppsHubEditorView {...props} />)
    fireEvent.click(screen.getByTestId('mock-create-editable-copy'))

    expect(props.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'External doc (copy)',
        content: '<p>External</p>',
        formatting: expect.objectContaining({
          pages: expect.objectContaining({
            footer: 'Page {page}'
          })
        })
      })
    )
  })
})
