import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { Doc as YDoc } from 'yjs'
import { normalizeDocumentHtmlForEditor, sanitizeDocumentHtmlForEditor } from '../../../utils/documentContentUtils'
import { DocumentApiService } from '../../../services/DocumentApiService'
import {
  applyLatestDocumentContent,
  areHtmlSemanticallyEquivalent,
  restoreVersionContent,
  usePagedDocumentExternalContentSync
} from '../hooks/usePagedDocumentExternalContentSync'

jest.mock('@/components/tiptap-extensions/tiptap-custom-pagination', () => ({
  markNextPaginationHydrationDocChange: jest.fn()
}))

jest.mock('../../../services/DocumentApiService', () => ({
  DocumentApiService: {
    getDocument: jest.fn(),
    getVersion: jest.fn()
  }
}))

describe('areHtmlSemanticallyEquivalent', () => {
  it('treats formatting-only html differences as equivalent', () => {
    expect(areHtmlSemanticallyEquivalent('<p>Hello <strong>world</strong></p>', '<p>Hello world</p>')).toBe(true)
  })
})

describe('applyLatestDocumentContent', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('replaces the editor content and clears unsaved state when the new content applies', async () => {
    let currentHtml = '<p>Old</p>'
    const setContent = jest.fn((html: string) => {
      currentHtml = html
      return true
    })
    const refreshPagesAndStabilize = jest.fn()
    const editor = {
      commands: {
        setContent,
        refreshPagesAndStabilize
      },
      getHTML: jest.fn(() => currentHtml),
      isDestroyed: false
    } as unknown as TiptapEditor
    const editorContainerRef = {
      current: { scrollTop: 24 }
    } as React.MutableRefObject<HTMLDivElement | null>
    const suppressYjsSnapshotSaveRef = { current: false }
    const setHasUnsavedChanges = jest.fn()
    const setLastSaved = jest.fn()
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })

    const promise = applyLatestDocumentContent({
      editor,
      editorContainerRef,
      ydoc: new YDoc(),
      suppressYjsSnapshotSaveRef,
      html: '<p>New content</p>',
      updatedAt: '2026-03-21T12:00:00.000Z',
      setHasUnsavedChanges,
      setLastSaved
    })

    await act(async () => {
      jest.runOnlyPendingTimers()
      await promise
    })

    expect(setContent).toHaveBeenCalledWith(normalizeDocumentHtmlForEditor('<p>New content</p>'), { emitUpdate: true })
    expect(refreshPagesAndStabilize).toHaveBeenCalled()
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(false)
    expect(setLastSaved).toHaveBeenCalledWith(new Date('2026-03-21T12:00:00.000Z'))
    expect(editorContainerRef.current?.scrollTop).toBe(24)
    requestAnimationFrameSpy.mockRestore()
  })

  it('sanitizes remote html before hydrating the editor', async () => {
    let currentHtml = '<p>Old</p>'
    const setContent = jest.fn((html: string) => {
      currentHtml = html
      return true
    })
    const refreshPagesAndStabilize = jest.fn()
    const editor = {
      commands: {
        setContent,
        refreshPagesAndStabilize
      },
      getHTML: jest.fn(() => currentHtml),
      isDestroyed: false
    } as unknown as TiptapEditor
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })

    const promise = applyLatestDocumentContent({
      editor,
      editorContainerRef: { current: { scrollTop: 0 } } as React.MutableRefObject<HTMLDivElement | null>,
      ydoc: new YDoc(),
      suppressYjsSnapshotSaveRef: { current: false },
      html: '<p onclick="alert(1)">Updated</p><script>alert("xss")</script>',
      updatedAt: '2026-03-21T12:00:00.000Z',
      setHasUnsavedChanges: jest.fn(),
      setLastSaved: jest.fn()
    })

    await act(async () => {
      jest.runOnlyPendingTimers()
      await promise
    })

    expect(setContent).toHaveBeenCalledWith(
      sanitizeDocumentHtmlForEditor('<p onclick="alert(1)">Updated</p><script>alert("xss")</script>'),
      { emitUpdate: true }
    )
    requestAnimationFrameSpy.mockRestore()
  })
})

describe('restoreVersionContent', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('restores the selected version into the editor and reloads version history', async () => {
    const setContent = jest.fn(() => true)
    const refreshPagesAndStabilize = jest.fn()
    const editor = {
      commands: {
        setContent,
        refreshPagesAndStabilize
      },
      isDestroyed: false
    } as unknown as TiptapEditor
    const versioning = {
      restoreVersion: jest.fn(async () => true),
      loadVersions: jest.fn(async () => undefined)
    }
    const setTitle = jest.fn()
    const setHasUnsavedChanges = jest.fn()
    const setLastSaved = jest.fn()
    const closeVersionHistory = jest.fn()
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })

    ;(DocumentApiService.getVersion as jest.Mock).mockResolvedValue({
      title: 'Restored title',
      content: '<p>Restored body</p>'
    })

    await restoreVersionContent({
      documentId: 'doc-1',
      versionNumber: 3,
      editor,
      versioning,
      setTitle,
      setHasUnsavedChanges,
      setLastSaved,
      closeVersionHistory
    })

    expect(DocumentApiService.getVersion).toHaveBeenCalledWith('doc-1', 3)
    expect(versioning.restoreVersion).toHaveBeenCalledWith(3)
    expect(setContent).toHaveBeenCalledWith(normalizeDocumentHtmlForEditor('<p>Restored body</p>'))
    expect(refreshPagesAndStabilize).toHaveBeenCalled()
    expect(setTitle).toHaveBeenCalledWith('Restored title')
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(false)
    expect(setLastSaved).toHaveBeenCalledWith(expect.any(Date))
    expect(versioning.loadVersions).toHaveBeenCalled()
    expect(closeVersionHistory).toHaveBeenCalled()
    requestAnimationFrameSpy.mockRestore()
  })
})

describe('usePagedDocumentExternalContentSync', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('starts the EveryAI fallback poll when the open event is dispatched', async () => {
    let currentHtml = '<p>Old</p>'
    const setContent = jest.fn((html: string) => {
      currentHtml = html
      return true
    })
    const editor = {
      commands: {
        setContent,
        refreshPagesAndStabilize: jest.fn()
      },
      getHTML: jest.fn(() => currentHtml),
      isDestroyed: false
    } as unknown as TiptapEditor
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })

    ;(DocumentApiService.getDocument as jest.Mock).mockResolvedValue({
      content: '<p>Updated remotely</p>',
      updatedAt: '2026-03-21T13:00:00.000Z'
    })

    renderHook(() =>
      usePagedDocumentExternalContentSync({
        editor,
        documentId: 'doc-1',
        editorContainerRef: { current: { scrollTop: 0 } } as React.MutableRefObject<HTMLDivElement | null>,
        ydoc: new YDoc(),
        suppressYjsSnapshotSaveRef: { current: false },
        setTitle: jest.fn(),
        setHasUnsavedChanges: jest.fn(),
        setLastSaved: jest.fn(),
        versioning: {
          restoreVersion: jest.fn(async () => true),
          loadVersions: jest.fn(async () => undefined)
        },
        setShowVersionHistory: jest.fn()
      })
    )

    await act(async () => {
      globalThis.dispatchEvent(new CustomEvent('openEveryAI', { detail: { type: 'OPEN_EVERY_AI' } }))
      jest.advanceTimersByTime(8000)
      await Promise.resolve()
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    expect(DocumentApiService.getDocument).toHaveBeenCalledWith('doc-1', { fresh: true })
    expect(setContent).toHaveBeenCalledWith(normalizeDocumentHtmlForEditor('<p>Updated remotely</p>'), {
      emitUpdate: true
    })
    requestAnimationFrameSpy.mockRestore()
  })
})
