jest.mock('../paginationRuntimeBookkeeping', () => ({
  clearPaginationOwnedGrowthSuppression: jest.fn()
}))

jest.mock('../paginationRuntimeRegistry', () => ({
  destroyPaginationRuntimeRegistries: jest.fn(),
  getPaginationOverlayManager: jest.fn(),
  getRuntimeOptions: jest.fn(),
  getWindowedRenderer: jest.fn(),
  syncEditorStorage: jest.fn()
}))

jest.mock('../windowedRenderer', () => ({
  createWindowedPaginationRenderer: jest.fn()
}))

import type { PagesOptions } from '../types'
import { clearPaginationOwnedGrowthSuppression } from '../paginationRuntimeBookkeeping'
import {
  destroyPaginationRuntimeRegistries,
  getPaginationOverlayManager,
  getRuntimeOptions,
  getWindowedRenderer,
  syncEditorStorage
} from '../paginationRuntimeRegistry'
import { destroyPaginationExtension, initializePaginationExtension } from '../paginationExtensionLifecycle'

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

describe('paginationExtensionLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes storage, overlay manager, and root presentation', () => {
    const editor = {
      view: {
        dom: document.createElement('div')
      },
      storage: {}
    }
    const storage = {
      pageCount: 0,
      getPageCount: () => 0
    }
    const runtimeOptions = { ...baseOptions, accentColor: '#123456' }
    const renderer = {
      syncRootPresentation: jest.fn()
    }
    const syncStorageFromOptionsMock = jest.fn()

    ;(getRuntimeOptions as jest.Mock).mockReturnValue(runtimeOptions)
    ;(getWindowedRenderer as jest.Mock).mockReturnValue(renderer)

    initializePaginationExtension({
      editor: editor as never,
      storage: storage as never,
      extensionOptions: baseOptions,
      defaultOptions: baseOptions,
      syncStorageFromOptions: syncStorageFromOptionsMock
    })

    expect(syncEditorStorage).toHaveBeenCalledWith(editor, storage)
    expect(getPaginationOverlayManager).toHaveBeenCalledWith({
      editor,
      getRuntimeOptions: expect.any(Function),
      getStorage: expect.any(Function)
    })
    expect(syncStorageFromOptionsMock).toHaveBeenCalledWith(storage, runtimeOptions)
    expect(storage.getPageCount()).toBe(1)
    expect(renderer.syncRootPresentation).toHaveBeenCalledWith({
      editorDom: editor.view.dom,
      options: runtimeOptions,
      storage
    })
  })

  it('destroys runtime registries and clears growth suppression', () => {
    const editor = {}

    destroyPaginationExtension(editor)

    expect(destroyPaginationRuntimeRegistries).toHaveBeenCalledWith(editor)
    expect(clearPaginationOwnedGrowthSuppression).toHaveBeenCalledWith(editor)
  })
})
