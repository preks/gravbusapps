import { act, renderHook, waitFor } from '@testing-library/react'
import { useNotes } from './useNotes'

const mockSetAccessToken = jest.fn()
const mockListNotes = jest.fn()
const mockCreateNote = jest.fn()
const mockUpdateNote = jest.fn()

jest.mock('../services/NoteApiService', () => ({
  NoteApiService: {
    setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
    listNotes: (...args: unknown[]) => mockListNotes(...args),
    createNote: (...args: unknown[]) => mockCreateNote(...args),
    updateNote: (...args: unknown[]) => mockUpdateNote(...args)
  }
}))

function makeNote(id: string, title: string) {
  return {
    id,
    title,
    content: `<p>${title}</p>`,
    contentJson: {},
    tags: [],
    color: 'default',
    icon: 'Note',
    isPinned: false,
    isArchived: false,
    parentId: undefined,
    position: 0,
    ownerId: 'user-1',
    spaceId: null,
    currentVersion: 1,
    createdAt: '2026-04-29T08:00:00.000Z',
    updatedAt: '2026-04-29T08:00:00.000Z',
    trashedAt: null,
    permission: 'owner' as const
  }
}

function makeSummary(id: string, title: string) {
  return {
    id,
    title,
    preview: title,
    tags: [],
    color: 'default',
    icon: 'Note',
    isPinned: false,
    isArchived: false,
    parentId: undefined,
    position: 0,
    ownerId: 'user-1',
    spaceId: null,
    createdAt: '2026-04-29T08:00:00.000Z',
    updatedAt: '2026-04-29T08:00:00.000Z',
    trashedAt: null,
    permission: 'owner' as const
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })

  return { promise, resolve }
}

describe('useNotes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deduplicates note ids across paginated loads', async () => {
    const pageOneItems = Array.from({ length: 100 }, (_, index) =>
      makeSummary(`note-${index + 1}`, `Note ${index + 1}`)
    )
    const duplicate = makeSummary('note-100', 'Note 100 latest')

    mockListNotes
      .mockResolvedValueOnce({
        items: pageOneItems,
        page: 1,
        limit: 100,
        total: 101,
        totalPages: 2
      })
      .mockResolvedValueOnce({
        items: [duplicate, makeSummary('note-101', 'Note 101')],
        page: 2,
        limit: 100,
        total: 101,
        totalPages: 2
      })

    const { result } = renderHook(() => useNotes({ accessToken: 'token-1', autoLoad: false }))

    await act(async () => {
      await result.current.loadNotes()
    })

    expect(result.current.notes).toHaveLength(101)
    expect(result.current.notes.find(note => note.id === 'note-100')?.title).toBe('Note 100 latest')
  })

  it('ignores stale update responses for the open note', async () => {
    const baseNote = makeNote('note-1', 'Original')
    mockCreateNote.mockResolvedValue(baseNote)

    const firstUpdate = createDeferred<ReturnType<typeof makeNote>>()
    const secondUpdate = createDeferred<ReturnType<typeof makeNote>>()
    mockUpdateNote.mockImplementationOnce(() => firstUpdate.promise).mockImplementationOnce(() => secondUpdate.promise)

    const { result } = renderHook(() => useNotes({ accessToken: 'token-1', autoLoad: false }))

    await act(async () => {
      await result.current.createNote({ title: 'Original' })
    })

    await act(async () => {
      const firstPromise = result.current.updateNote('note-1', { title: 'First response' })
      const secondPromise = result.current.updateNote('note-1', { title: 'Latest response' })

      secondUpdate.resolve(makeNote('note-1', 'Latest response'))
      firstUpdate.resolve(makeNote('note-1', 'First response'))

      await Promise.all([firstPromise, secondPromise])
    })

    await waitFor(() => {
      expect(result.current.currentNote?.title).toBe('Latest response')
      expect(result.current.notes[0]?.title).toBe('Latest response')
    })
  })
})
