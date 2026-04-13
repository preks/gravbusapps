import React from 'react'
import { render, screen } from '@testing-library/react'
import { DocumentTableOfContentsView } from '../components/DocumentTableOfContentsView'
import { subscribeDocumentTocLayout } from '../../../utils/tocLayoutBridge'

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
  ContextMenuItem: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr />,
  ContextMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('../../../utils/navigationPanelUtils', () => ({
  getHeadingsForDocumentTableOfContents: jest.fn(() => []),
  resolvePageNumberForDocPosition: jest.fn(() => null)
}))

jest.mock('../../../utils/tocLayoutBridge', () => ({
  getDocumentTocLayoutHints: jest.fn(() => null),
  subscribeDocumentTocLayout: jest.fn(() => jest.fn())
}))

jest.mock('../commentSidebarNavigation', () => ({
  scrollEditorSelectionNodeIntoView: jest.fn()
}))

describe('DocumentTableOfContentsView', () => {
  it('subscribes to layout hints without attaching a blanket editor update listener', () => {
    const editor = {
      state: {
        doc: {},
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
    expect(subscribeDocumentTocLayout).toHaveBeenCalledTimes(1)
    expect(editor.on).not.toHaveBeenCalled()
    expect(editor.off).not.toHaveBeenCalled()
  })
})
