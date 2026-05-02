import * as Y from 'yjs'
import { ExcalidrawToolExecutor } from './ExcalidrawToolExecutor'

jest.mock('@excalidraw/excalidraw', () => ({
  restoreElements: jest.fn((elements: unknown[]) => elements)
}))

describe('ExcalidrawToolExecutor', () => {
  it('ignores duplicate tool call ids and keeps a single canonical element', () => {
    let sceneElements: Array<Record<string, unknown>> = []
    const api = {
      getSceneElements: jest.fn(() => sceneElements as never),
      updateScene: jest.fn((update: { elements?: Array<Record<string, unknown>> }) => {
        if (update.elements) {
          sceneElements = update.elements
        }
      }),
      scrollToContent: jest.fn()
    }
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray<Y.Map<unknown>>('elements')
    const yFiles = ydoc.getMap<string>('files')
    const executor = new ExcalidrawToolExecutor(api as never, ydoc, yElements, yFiles)

    const toolCall = {
      id: 'tool-call-1',
      name: 'batch_create_elements',
      arguments: JSON.stringify({
        elements: [{ type: 'rectangle', x: 10, y: 20, width: 120, height: 80 }]
      })
    }

    executor.execute(toolCall)
    executor.execute(toolCall)

    expect(api.updateScene).toHaveBeenCalledTimes(1)
    expect(sceneElements).toHaveLength(1)
    expect(sceneElements[0].id).toBe('tool-call-1-rectangle-0')
    expect(yElements.length).toBe(1)

    ydoc.destroy()
  })
})
