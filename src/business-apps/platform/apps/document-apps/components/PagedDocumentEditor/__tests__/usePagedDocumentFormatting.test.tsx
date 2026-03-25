import { act, renderHook } from '@testing-library/react'
import type { PaginationPlusStorage as PagesStorage } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { DocumentFormatting } from '../../../types'
import { usePagedDocumentFormattingState, useSyncPagedDocumentFormatting } from '../hooks/usePagedDocumentFormatting'

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

function createFormattingMap(initialValue?: DocumentFormatting) {
  let value = initialValue
  const observers = new Set<() => void>()

  return {
    get: jest.fn((key: string) => (key === 'formatting' ? value : undefined)),
    set: jest.fn((key: string, nextValue: DocumentFormatting) => {
      if (key !== 'formatting') return
      value = nextValue
      observers.forEach(observer => observer())
    }),
    observe: jest.fn((handler: () => void) => {
      observers.add(handler)
    }),
    unobserve: jest.fn((handler: () => void) => {
      observers.delete(handler)
    }),
    emit(nextValue: DocumentFormatting) {
      value = nextValue
      observers.forEach(observer => observer())
    }
  }
}

describe('usePagedDocumentFormattingState', () => {
  it('merges fallback page formatting with the current editor pages storage snapshot', () => {
    const documentFormatting: DocumentFormatting = {
      pages: {
        header: '<p>fallback header</p>',
        footer: '<p>fallback footer</p>',
        pageNumberNumeralStyle: 'lowerRoman'
      }
    }
    const getPagesStorageSnapshot = jest.fn(
      () =>
        ({
          headerHTML: '<p>editor header</p>',
          footerHTML: null,
          headerTopMargin: 11
        }) as PagesStorage
    )

    const { result } = renderHook(() =>
      usePagedDocumentFormattingState({
        documentFormatting,
        getPagesStorageSnapshot
      })
    )

    const persisted = result.current.buildPersistedFormatting({
      pages: {
        header: '<p>fallback header</p>',
        footer: '<p>fallback footer</p>',
        pageNumberNumeralStyle: 'lowerRoman'
      }
    })

    expect(getPagesStorageSnapshot).toHaveBeenCalled()
    expect(persisted.pages).toMatchObject({
      header: '<p>editor header</p>',
      footer: '<p>fallback footer</p>',
      headerTopMargin: 11,
      pageNumberNumeralStyle: 'lowerRoman'
    })
    expect(result.current.layoutInputsKey).toBe(JSON.stringify(result.current.layoutFormatting ?? {}))
  })
})

describe('useSyncPagedDocumentFormatting', () => {
  it('persists formatting locally and reacts to collaborative formatting updates', () => {
    const documentFormatting: DocumentFormatting = {
      pages: {
        footer: '<p>base footer</p>'
      }
    }
    const formattingMap = createFormattingMap()
    const onPersistFormatting = jest.fn()

    const { result } = renderHook(() => {
      const formattingState = usePagedDocumentFormattingState({
        documentFormatting,
        getPagesStorageSnapshot: () => null
      })
      const syncState = useSyncPagedDocumentFormatting({
        documentId: 'doc-1',
        documentFormatting,
        formattingYMap: formattingMap as never,
        isYjsSynced: true,
        layoutFormatting: formattingState.layoutFormatting,
        setLayoutFormatting: formattingState.setLayoutFormatting,
        getPersistedPagesFormatting: formattingState.getPersistedPagesFormatting,
        buildPersistedFormatting: formattingState.buildPersistedFormatting,
        activeEditorType: null,
        onPersistFormatting
      })

      return {
        ...formattingState,
        ...syncState
      }
    })

    const nextFormatting: DocumentFormatting = {
      ...result.current.layoutFormatting,
      fontSize: 16
    }

    act(() => {
      result.current.persistFormatting(nextFormatting)
    })

    expect(formattingMap.set).toHaveBeenCalledWith('formatting', nextFormatting)
    expect(onPersistFormatting).toHaveBeenCalledWith(nextFormatting)

    const remoteFormatting: DocumentFormatting = {
      ...nextFormatting,
      fontFamily: 'Inter'
    }

    act(() => {
      formattingMap.emit(remoteFormatting)
    })

    expect(result.current.layoutFormatting).toEqual(remoteFormatting)
  })
})
