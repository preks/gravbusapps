import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { DocumentTableOfContentsView } from '../components/DocumentTableOfContentsView'
import { getDocumentTocLayoutHints, subscribeDocumentTocLayout } from '../../../utils/tocLayoutBridge'

jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  useEditorState: ({ editor, selector }: { editor: unknown; selector: (params: { editor: unknown }) => unknown }) =>
    selector({ editor })
}))

jest.mock('@newwork/nw-design-system', () => ({
  ContextMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ContextMenuContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.PropsWithChildren<Record<string, unknown> & { onSelect?: () => void }>) => (
    <button type="button" onClick={onSelect} {...props}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr />,
  ContextMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('../../../utils/tocLayoutBridge', () => ({
  getDocumentTocLayoutHints: jest.fn(() => null),
  subscribeDocumentTocLayout: jest.fn(() => jest.fn())
}))

jest.mock('../commentSidebarNavigation', () => ({
  scrollEditorSelectionNodeIntoView: jest.fn()
}))

function createEditor(doc: { descendants: (cb: (node: any, pos: number) => boolean | void) => void }) {
  return {
    state: {
      doc,
      tr: {
        setSelection: jest.fn()
      }
    },
    view: {
      dispatch: jest.fn(),
      focus: jest.fn()
    },
    commands: {
      updateDocumentTableOfContents: jest.fn(),
      updateDocumentTableOfContentsEntireTable: jest.fn(),
      updateDocumentTableOfContentsPageNumbers: jest.fn(),
      removeDocumentTableOfContents: jest.fn()
    },
    chain: jest.fn(() => ({
      focus: jest.fn().mockReturnThis(),
      setNodeSelection: jest.fn().mockReturnThis(),
      run: jest.fn()
    })),
    isEditable: true,
    on: jest.fn(),
    off: jest.fn()
  }
}

describe('DocumentTableOfContentsView', () => {
  beforeEach(() => {
    jest.mocked(getDocumentTocLayoutHints).mockReturnValue(null)
  })

  it('renders without attaching editor listeners for background ToC refresh', () => {
    const editor = createEditor({
      descendants: () => undefined
    })

    render(
      <DocumentTableOfContentsView
        editor={editor as never}
        node={{ attrs: {}, nodeSize: 5 } as never}
        getPos={() => 10}
        selected={false}
        decorations={[] as never}
        extension={{} as never}
        HTMLAttributes={{}}
        updateAttributes={jest.fn()}
        deleteNode={jest.fn()}
      />
    )

    expect(screen.getByTestId('document-table-of-contents')).toBeInTheDocument()
    expect(subscribeDocumentTocLayout).not.toHaveBeenCalled()
    expect(editor.on).not.toHaveBeenCalled()
    expect(editor.off).not.toHaveBeenCalled()
  })

  it('keeps update actions in the context menu without rendering an inline stale banner', () => {
    jest.mocked(getDocumentTocLayoutHints).mockReturnValue({ layoutVersion: 2 })
    const editor = createEditor({
      descendants: visit => {
        visit(
          {
            type: { name: 'heading' },
            attrs: { level: 1 },
            textContent: 'Section 1'
          },
          20
        )
      }
    })

    render(
      <DocumentTableOfContentsView
        editor={editor as never}
        node={
          {
            attrs: {
              snapshotJson: JSON.stringify({
                version: 2,
                entries: [
                  {
                    level: 1,
                    text: 'Section 1',
                    pos: 21,
                    blockStart: 20,
                    pageNumber: '1'
                  }
                ],
                updatedAt: '2026-04-14T10:00:00.000Z',
                updateMode: 'entire',
                layoutVersion: 1
              }),
              showPageNumbers: true,
              headingLinks: true,
              maxHeadingLevel: 3
            },
            nodeSize: 5
          } as never
        }
        getPos={() => 10}
        selected={false}
        decorations={[] as never}
        extension={{} as never}
        HTMLAttributes={{}}
        updateAttributes={jest.fn()}
        deleteNode={jest.fn()}
      />
    )

    expect(screen.queryByTestId('document-toc-stale-banner')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('document-toc-context-update-page-numbers'))
    fireEvent.click(screen.getByTestId('document-toc-context-update-entire'))

    expect(editor.commands.updateDocumentTableOfContentsPageNumbers).toHaveBeenCalledWith(10)
    expect(editor.commands.updateDocumentTableOfContentsEntireTable).toHaveBeenCalledWith(10)
  })
})
