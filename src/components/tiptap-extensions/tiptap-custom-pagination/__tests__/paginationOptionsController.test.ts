import { applyPaginationOptionUpdates } from '../paginationOptionsController'

describe('applyPaginationOptionUpdates', () => {
  it('clears stored header/footer variants when corresponding templates change', () => {
    const storage = {
      headerHTML: '<p>header</p>',
      headerJSON: { type: 'doc' },
      footerHTML: '<p>footer</p>',
      footerJSON: { type: 'doc' },
      headerFirstPageHTML: '<p>first</p>',
      headerFirstPageJSON: { type: 'doc' },
      footerFirstPageHTML: '<p>first-footer</p>',
      footerFirstPageJSON: { type: 'doc' },
      headerOddHTML: '<p>odd</p>',
      headerOddJSON: { type: 'doc' },
      headerEvenHTML: '<p>even</p>',
      headerEvenJSON: { type: 'doc' },
      footerOddHTML: '<p>odd-footer</p>',
      footerOddJSON: { type: 'doc' },
      footerEvenHTML: '<p>even-footer</p>',
      footerEvenJSON: { type: 'doc' }
    } as never

    const runtimeOptions = {} as never

    applyPaginationOptionUpdates({
      updates: {
        header: 'new header',
        footerEven: 'new even footer',
        headerFirstPage: 'new first header'
      },
      runtimeOptions,
      storage
    })

    expect(storage).toMatchObject({
      headerHTML: null,
      headerJSON: null,
      headerFirstPageHTML: null,
      headerFirstPageJSON: null,
      footerEvenHTML: null,
      footerEvenJSON: null,
      footerHTML: '<p>footer</p>',
      footerJSON: { type: 'doc' }
    })
  })

  it('updates page format, syncs editor storage, and emits page format change', () => {
    const onPageFormatChange = jest.fn()
    const onSyncEditorStorage = jest.fn()
    const runtimeOptions = {
      pageFormat: 'A4',
      onPageFormatChange
    } as never
    const storage = {} as never

    applyPaginationOptionUpdates({
      updates: {
        pageFormat: 'Letter',
        pageNumberRegion: null,
        pageNumberAlignment: 'center',
        pageNumberShowOnFirstPage: true
      },
      runtimeOptions,
      storage,
      onSyncEditorStorage
    })

    expect(runtimeOptions.pageFormat).toBe('Letter')
    expect(storage.pageFormat).toMatchObject({ name: 'Letter' })
    expect(onSyncEditorStorage).toHaveBeenCalledTimes(1)
    expect(onPageFormatChange).toHaveBeenCalledWith(storage.pageFormat)
    expect('pageNumberRegion' in runtimeOptions).toBe(false)
    expect(runtimeOptions.pageNumberAlignment).toBe('center')
    expect(runtimeOptions.pageNumberShowOnFirstPage).toBe(true)
  })
})
