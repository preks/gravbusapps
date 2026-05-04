import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { SocketIoYjsProvider } from './SocketIoYjsProvider'

type SocketListener = (...args: any[]) => void

class FakeSocket {
  connected = true
  private listeners = new Map<string, Set<SocketListener>>()
  bootstrapState?: string
  yjsUpdates: unknown[] = []

  on(event: string, listener: SocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(listener)
  }

  off(event: string, listener: SocketListener) {
    this.listeners.get(event)?.delete(listener)
  }

  emit(event: string, payload: any, ack?: (response: unknown) => void) {
    if (event === 'yjs_sync_request') {
      ack?.({
        success: true,
        status: 'bootstrap',
        role: 'initializer',
        initialHtml: '<p>Bootstrap me</p>'
      })
      return
    }

    if (event === 'yjs_bootstrap') {
      this.bootstrapState = payload.state
      ack?.({ success: true })
      return
    }

    if (event === 'yjs_update') {
      this.yjsUpdates.push(payload)
      ack?.({ success: true })
      return
    }
  }

  fire(event: string, payload: unknown) {
    const listeners = this.listeners.get(event)
    listeners?.forEach(listener => listener(payload))
  }
}

function seedDefaultFragment(targetDoc: Y.Doc) {
  const seededDoc = new Y.Doc()
  const fragment = seededDoc.getXmlFragment('default')
  const paragraph = new Y.XmlElement('paragraph')
  const text = new Y.XmlText()
  text.insert(0, 'Hello notes')
  paragraph.insert(0, [text])
  fragment.insert(0, [paragraph])
  Y.applyUpdate(targetDoc, Y.encodeStateAsUpdate(seededDoc))
  seededDoc.destroy()
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

async function waitForCondition(assertion: () => boolean, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (assertion()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error('Timed out waiting for condition')
}

describe('SocketIoYjsProvider', () => {
  it('waits for the server ready snapshot before marking bootstrap as synced', async () => {
    const socket = new FakeSocket()
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)
    const syncedStates: boolean[] = []

    const provider = new SocketIoYjsProvider({
      socket: socket as never,
      documentId: 'note-1',
      entityType: 'note',
      ydoc,
      awareness,
      onSyncedChange: isSynced => syncedStates.push(isSynced),
      onBootstrapRequired: () => {
        seedDefaultFragment(ydoc)
      },
      onBeforeFirstSync: async () => undefined
    })

    provider.start()
    await waitForCondition(() => typeof socket.bootstrapState === 'string')
    await flushAsyncWork()

    expect(socket.bootstrapState).toBeDefined()
    expect(provider.isSynced()).toBe(false)
    expect(syncedStates).toEqual([])

    socket.fire('yjs_sync_response', {
      documentId: 'note-1',
      entityType: 'note',
      state: socket.bootstrapState,
      awareness: null
    })
    await flushAsyncWork()

    expect(provider.isSynced()).toBe(true)
    expect(syncedStates).toEqual([true])
    expect(ydoc.getXmlFragment('default').length).toBeGreaterThan(0)

    provider.destroy()
    awareness.destroy()
    ydoc.destroy()
  })

  it('does not replay whiteboard bootstrap array inserts after sync', async () => {
    const socket = new FakeSocket()
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)

    const provider = new SocketIoYjsProvider({
      socket: socket as never,
      documentId: 'whiteboard-1',
      entityType: 'whiteboard',
      ydoc,
      awareness,
      onBootstrapRequired: () => {
        const element = new Y.Map<unknown>()
        element.set('id', 'rect-1')
        element.set('type', 'rectangle')
        ydoc.getArray<Y.Map<unknown>>('elements').push([element])
      },
      onBeforeFirstSync: async () => undefined
    })

    provider.start()
    await waitForCondition(() => typeof socket.bootstrapState === 'string')
    await flushAsyncWork()

    socket.fire('yjs_sync_response', {
      documentId: 'whiteboard-1',
      entityType: 'whiteboard',
      state: socket.bootstrapState,
      awareness: null
    })
    await flushAsyncWork()

    expect(provider.isSynced()).toBe(true)
    expect(socket.yjsUpdates).toHaveLength(0)
    expect(ydoc.getArray<Y.Map<unknown>>('elements')).toHaveLength(1)

    provider.destroy()
    awareness.destroy()
    ydoc.destroy()
  })
})
