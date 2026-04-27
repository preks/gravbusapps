import type { TextElement } from '../../components/slideElements'
import { replaceRichTextContent } from '../richTextEditing'
import {
  serializeEditingDraftValue,
  serializeLiveEditingValue,
  shouldRehydrateFromLiveUpdate
} from '../liveEditingSync'

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 320, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 16,
    ...overrides
  }
}

describe('liveEditingSync', () => {
  it('does not rehydrate while local typing is still ahead of the live element', () => {
    const initialElement = makeTextElement()
    const localDraft = replaceRichTextContent(initialElement, 'Hello world\nLocal line')

    expect(
      shouldRehydrateFromLiveUpdate(
        serializeLiveEditingValue(initialElement),
        serializeLiveEditingValue(initialElement),
        serializeEditingDraftValue({ kind: 'text', element: localDraft })
      )
    ).toBe(false)
  })

  it('does not rehydrate when the live element catches up to the local draft', () => {
    const initialElement = makeTextElement()
    const localDraft = replaceRichTextContent(initialElement, 'Hello world\nLocal line')

    expect(
      shouldRehydrateFromLiveUpdate(
        serializeLiveEditingValue(initialElement),
        serializeLiveEditingValue(localDraft),
        serializeEditingDraftValue({ kind: 'text', element: localDraft })
      )
    ).toBe(false)
  })

  it('rehydrates when a remote newline update diverges from the local draft', () => {
    const initialElement = makeTextElement()
    const remoteUpdate = replaceRichTextContent(initialElement, 'Hello world\nRemote line')

    expect(
      shouldRehydrateFromLiveUpdate(
        serializeLiveEditingValue(initialElement),
        serializeLiveEditingValue(remoteUpdate),
        serializeEditingDraftValue({ kind: 'text', element: initialElement })
      )
    ).toBe(true)
  })
})
