jest.mock('../headerFooterOverlay', () => ({
  HeaderFooterOverlayManager: jest.fn().mockImplementation((_editor, getRuntimeOptions, getStorage) => ({
    close: jest.fn(),
    updateAccentColor: jest.fn(),
    getRuntimeOptions,
    getStorage
  }))
}))

import type { PagesOptions } from '../types'
import {
  destroyPaginationRuntimeRegistries,
  getPaginationOverlayManager,
  getRuntimeOptions,
  getWindowedRenderer,
  syncEditorStorage
} from '../paginationRuntimeRegistry'
import { HeaderFooterOverlayManager } from '../headerFooterOverlay'

const baseOptions: PagesOptions = {
  pageFormat: 'A4',
  headerHeight: 50,
  footerHeight: 50,
  pageGap: 32,
  header: '',
  footer: '',
  differentFirstPage: false,
  differentOddEven: false
}

describe('paginationRuntimeRegistry', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('caches merged runtime options per editor', () => {
    const editor = {}

    const first = getRuntimeOptions(
      editor,
      { ...baseOptions, accentColor: '#111111' },
      { ...baseOptions, accentColor: '#222222', headerHeight: 40 }
    )
    const second = getRuntimeOptions(
      editor,
      { ...baseOptions, accentColor: '#333333' },
      { ...baseOptions, accentColor: '#444444', headerHeight: 10 }
    )

    expect(first).toBe(second)
    expect(first).toMatchObject({
      accentColor: '#111111',
      headerHeight: 50
    })
  })

  it('syncs pages storage onto the editor storage bag', () => {
    const editor = {
      storage: {}
    }
    const storage = {
      pageCount: 3
    }

    syncEditorStorage(editor, storage as never)

    expect(editor.storage.pages).toBe(storage)
  })

  it('caches overlay managers and tears them down with the registries', () => {
    const editor = {
      storage: {}
    } as never
    const storage = {
      pageCount: 2
    } as never
    const getOptions = jest.fn(() => baseOptions)

    const first = getPaginationOverlayManager({
      editor,
      getRuntimeOptions: getOptions,
      getStorage: () => storage
    })
    const second = getPaginationOverlayManager({
      editor,
      getRuntimeOptions: getOptions,
      getStorage: () => storage
    })

    expect(first).toBe(second)
    expect(HeaderFooterOverlayManager).toHaveBeenCalledTimes(1)

    destroyPaginationRuntimeRegistries(editor)

    expect(first.close).toHaveBeenCalledTimes(1)
  })

  it('caches windowed renderers and destroys them with the registries', () => {
    const editor = {}
    const createRenderer = jest.fn(() => ({
      destroy: jest.fn()
    }))

    const first = getWindowedRenderer(editor, createRenderer as never)
    const second = getWindowedRenderer(editor, jest.fn() as never)

    expect(first).toBe(second)
    expect(createRenderer).toHaveBeenCalledTimes(1)

    destroyPaginationRuntimeRegistries(editor)

    expect(first.destroy).toHaveBeenCalledTimes(1)
  })
})
