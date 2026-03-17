import React from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditorToolbarRibbon } from './EditorToolbarRibbon'

const homeTabMock = jest.fn(({ editor, testId }: { editor: { id: string }; testId?: string }) => (
  <div data-testid={`${testId}-mock-home`}>{editor.id}</div>
))

const insertTabMock = jest.fn(({ editor, testId }: { editor: { id: string }; testId?: string }) => (
  <div data-testid={`${testId}-mock-insert`}>{editor.id}</div>
))

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  }),
  Button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: ReactNode
    onSelect?: () => void
    [key: string]: unknown
  }) => (
    <button type="button" onClick={() => onSelect?.()} {...props}>
      {children}
    </button>
  )
}))

jest.mock('./HomeTabContent', () => ({
  HomeTabContent: (props: { editor: { id: string }; testId?: string }) => homeTabMock(props)
}))

jest.mock('./InsertTabContent', () => ({
  InsertTabContent: (props: { editor: { id: string }; testId?: string }) => insertTabMock(props)
}))

describe('EditorToolbarRibbon', () => {
  beforeEach(() => {
    homeTabMock.mockClear()
    insertTabMock.mockClear()
  })

  it('renders a compact toolbar surface with spreadsheet-style tab switching', () => {
    render(<EditorToolbarRibbon editor={{ id: 'body-editor' } as any} data-testid="document-toolbar" />)

    expect(screen.getByTestId('document-toolbar-surface')).toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar-compact-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar-tab-selector')).toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar-tab-trigger')).toHaveTextContent('editor-ribbon-tab-home')
    expect(screen.getByTestId('document-toolbar-tab-home')).toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar-tab-insert')).toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar-mock-home')).toHaveTextContent('body-editor')
    expect(screen.queryByTestId('document-toolbar-mock-insert')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('document-toolbar-tab-insert'))

    expect(screen.getByTestId('document-toolbar-mock-insert')).toHaveTextContent('body-editor')
    expect(screen.queryByTestId('document-toolbar-mock-home')).not.toBeInTheDocument()
  })

  it('forwards the current editor instance to the active toolbar section', () => {
    const { rerender } = render(
      <EditorToolbarRibbon editor={{ id: 'body-editor' } as any} data-testid="document-toolbar" />
    )

    rerender(<EditorToolbarRibbon editor={{ id: 'header-editor' } as any} data-testid="document-toolbar" />)

    expect(screen.getByTestId('document-toolbar-mock-home')).toHaveTextContent('header-editor')

    fireEvent.click(screen.getByTestId('document-toolbar-tab-insert'))

    expect(screen.getByTestId('document-toolbar-tab-trigger')).toHaveTextContent('editor-ribbon-tab-insert')
    expect(screen.getByTestId('document-toolbar-mock-insert')).toHaveTextContent('header-editor')
  })
})
