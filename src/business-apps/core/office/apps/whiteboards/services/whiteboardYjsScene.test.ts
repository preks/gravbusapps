import * as Y from 'yjs'
import {
  dedupeWhiteboardElementRecords,
  markWhiteboardElementsDeleted,
  syncWhiteboardAppState,
  syncWhiteboardElements,
  syncWhiteboardFiles
} from './whiteboardYjsScene'

describe('whiteboardYjsScene', () => {
  it('updates existing ids, inserts new ids, and removes missing ids', () => {
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray<Y.Map<unknown>>('elements')

    const first = new Y.Map<unknown>()
    first.set('id', 'rect-1')
    first.set('type', 'rectangle')
    first.set('x', 10)
    const second = new Y.Map<unknown>()
    second.set('id', 'rect-2')
    second.set('type', 'ellipse')
    yElements.push([first, second])

    syncWhiteboardElements(yElements, [
      { id: 'rect-1', type: 'rectangle', x: 42 },
      { id: 'rect-3', type: 'diamond', x: 100 }
    ])

    expect(yElements.length).toBe(2)
    expect(yElements.get(0)?.get('id')).toBe('rect-1')
    expect(yElements.get(0)?.get('x')).toBe(42)
    expect(yElements.get(1)?.get('id')).toBe('rect-3')

    ydoc.destroy()
  })

  it('marks only targeted ids as deleted', () => {
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray<Y.Map<unknown>>('elements')

    const shape = new Y.Map<unknown>()
    shape.set('id', 'shape-1')
    shape.set('type', 'rectangle')
    const label = new Y.Map<unknown>()
    label.set('id', 'shape-1-label')
    label.set('containerId', 'shape-1')
    label.set('type', 'text')
    const untouched = new Y.Map<unknown>()
    untouched.set('id', 'shape-2')
    untouched.set('type', 'ellipse')
    yElements.push([shape, label, untouched])

    markWhiteboardElementsDeleted(yElements, ['shape-1'])

    expect(yElements.get(0)?.get('isDeleted')).toBe(true)
    expect(yElements.get(1)?.get('isDeleted')).toBe(true)
    expect(yElements.get(2)?.get('isDeleted')).not.toBe(true)

    ydoc.destroy()
  })

  it('syncs files and app state without clearing the whole map', () => {
    const ydoc = new Y.Doc()
    const yFiles = ydoc.getMap<string>('files')
    const yAppState = ydoc.getMap<unknown>('appState')

    yFiles.set('file-1', JSON.stringify({ id: 'file-1', mimeType: 'image/png' }))
    yAppState.set('viewBackgroundColor', '#ffffff')
    yAppState.set('obsolete', true)

    syncWhiteboardFiles(yFiles, {
      'file-2': { id: 'file-2', mimeType: 'image/jpeg' }
    })
    syncWhiteboardAppState(yAppState, {
      viewBackgroundColor: '#000000'
    })

    expect(Array.from(yFiles.keys())).toEqual(['file-2'])
    expect(yAppState.get('viewBackgroundColor')).toBe('#000000')
    expect(yAppState.has('obsolete')).toBe(false)

    ydoc.destroy()
  })

  it('keeps the latest element when duplicate element ids are projected', () => {
    expect(
      dedupeWhiteboardElementRecords([
        { id: 'rect-1', type: 'rectangle', x: 10 },
        { id: 'rect-2', type: 'rectangle', x: 20 },
        { id: 'rect-1', type: 'rectangle', x: 30 }
      ])
    ).toEqual([
      { id: 'rect-2', type: 'rectangle', x: 20 },
      { id: 'rect-1', type: 'rectangle', x: 30 }
    ])
  })
})
