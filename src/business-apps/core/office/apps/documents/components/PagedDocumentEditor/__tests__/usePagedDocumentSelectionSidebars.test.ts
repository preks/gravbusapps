import {
  shouldKeepImageSidebarOpenForUiMode,
  resolveSidebarContextSubtitleKey,
  resolveSidebarPresentationState
} from '../hooks/usePagedDocumentSelectionSidebars'

describe('resolveSidebarPresentationState', () => {
  it('prioritizes the image sidebar over the table and header/footer sidebars for the same editor', () => {
    const sharedEditor = {} as never

    expect(
      resolveSidebarPresentationState({
        rightSidebar: 'comments',
        selectedImageSidebar: {
          open: true,
          editor: sharedEditor,
          pos: 5,
          nodeSize: 1,
          attrs: {} as never
        },
        selectedTableSidebar: {
          open: true,
          editor: sharedEditor,
          tablePos: 10
        },
        activeHeaderFooterEditor: sharedEditor,
        isHeaderFooterEditing: true
      })
    ).toEqual({
      documentRightPanelOffset: 412,
      showTableSidebar: false,
      showHeaderFooterSidebar: false,
      documentEditorRightReservePx: 772
    })
  })

  it('shows the header footer sidebar when no conflicting table or image sidebar is active', () => {
    expect(
      resolveSidebarPresentationState({
        rightSidebar: 'closed',
        selectedImageSidebar: {
          open: false,
          editor: null,
          pos: null,
          nodeSize: null,
          attrs: null
        },
        selectedTableSidebar: {
          open: false,
          editor: null,
          tablePos: null
        },
        activeHeaderFooterEditor: {} as never,
        isHeaderFooterEditing: true
      })
    ).toEqual({
      documentRightPanelOffset: 16,
      showTableSidebar: false,
      showHeaderFooterSidebar: true,
      documentEditorRightReservePx: 376
    })
  })
})

describe('resolveSidebarContextSubtitleKey', () => {
  it('returns the table-in-header key for an overlay table editor', () => {
    const mainEditor = {} as never
    const overlayEditor = {} as never

    expect(
      resolveSidebarContextSubtitleKey({
        sidebar: 'table',
        open: true,
        mainEditor,
        sidebarEditor: overlayEditor,
        activeHeaderFooterType: 'header'
      })
    ).toBe('table-sidebar-in-header-context')
  })

  it('returns undefined when the sidebar editor is the main editor', () => {
    const mainEditor = {} as never

    expect(
      resolveSidebarContextSubtitleKey({
        sidebar: 'image',
        open: true,
        mainEditor,
        sidebarEditor: mainEditor,
        activeHeaderFooterType: 'footer'
      })
    ).toBeUndefined()
  })
})

describe('shouldKeepImageSidebarOpenForUiMode', () => {
  it('keeps the image sidebar open while crop mode is active for the same image', () => {
    expect(
      shouldKeepImageSidebarOpenForUiMode(
        {
          open: true,
          pos: 12
        },
        {
          pos: 12,
          mode: 'crop'
        }
      )
    ).toBe(true)
  })

  it('does not keep the image sidebar open for a different image or default mode', () => {
    expect(
      shouldKeepImageSidebarOpenForUiMode(
        {
          open: true,
          pos: 12
        },
        {
          pos: 8,
          mode: 'crop'
        }
      )
    ).toBe(false)

    expect(
      shouldKeepImageSidebarOpenForUiMode(
        {
          open: true,
          pos: 12
        },
        {
          pos: 12,
          mode: 'default'
        }
      )
    ).toBe(false)
  })
})
