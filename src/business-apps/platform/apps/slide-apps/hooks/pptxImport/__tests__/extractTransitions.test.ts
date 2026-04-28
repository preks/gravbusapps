import { extractTransition } from '../extractTransitions'
import { parseXML } from '../ooxmlUtils'
import type { ParserMessage } from '../../usePowerPointParser'

function slideXml(transitionXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      ${transitionXml}
    </p:sld>
  `)
}

describe('extractTransition', () => {
  it('returns undefined when no transition element exists', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml('')
    expect(extractTransition(xml, messages, 0)).toBeUndefined()
  })

  it('extracts fade transition with slow speed', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`<p:transition spd="slow"><p:fade/></p:transition>`)
    const result = extractTransition(xml, messages, 0)

    expect(result).toBeDefined()
    expect(result!.type).toBe('fade')
    expect(result!.duration).toBe(1000)
    expect(result!.trigger).toBe('on-click')
  })

  it('detects auto-advance from advTm attribute', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`<p:transition spd="med" advTm="3000"><p:push/></p:transition>`)
    const result = extractTransition(xml, messages, 0)

    expect(result!.trigger).toBe('auto')
    expect(result!.delay).toBe(3000)
    expect(result!.type).toBe('push-left')
  })

  it('maps wipe to slide-left', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`<p:transition spd="fast"><p:wipe/></p:transition>`)
    const result = extractTransition(xml, messages, 0)

    expect(result!.type).toBe('slide-left')
    expect(result!.duration).toBe(250)
  })

  it('falls back to fade for unmapped transitions and adds message', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`<p:transition><p:vortex/></p:transition>`)
    const result = extractTransition(xml, messages, 0)

    expect(result!.type).toBe('fade')
    expect(messages.some(m => m.message === 'parser-transition-unsupported')).toBe(true)
  })
})
