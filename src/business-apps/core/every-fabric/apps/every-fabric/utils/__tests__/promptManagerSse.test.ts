import { parseSseMessageBuffer } from '../promptManagerSse'

describe('parseSseMessageBuffer', () => {
  it('parses single data frame and returns remainder', () => {
    const messages: string[] = []
    const remainder = parseSseMessageBuffer('data: {"type":"heartbeat"}\n\n', d => messages.push(d))
    expect(messages).toEqual(['{"type":"heartbeat"}'])
    expect(remainder).toBe('')
  })

  it('buffers incomplete frames', () => {
    const messages: string[] = []
    const r1 = parseSseMessageBuffer('data: {"a":1}\n', d => messages.push(d))
    expect(messages).toHaveLength(0)
    const r2 = parseSseMessageBuffer(r1 + '\n', d => messages.push(d))
    expect(messages).toEqual(['{"a":1}'])
    expect(r2).toBe('')
  })

  it('parses multiple frames in one chunk', () => {
    const messages: string[] = []
    parseSseMessageBuffer('data: one\n\ndata: two\n\n', d => messages.push(d))
    expect(messages).toEqual(['one', 'two'])
  })

  it('parses CRLF-delimited frames emitted by sse-starlette', () => {
    const messages: string[] = []
    const remainder = parseSseMessageBuffer('data: one\r\n\r\ndata: two\r\n\r\n', d => messages.push(d))
    expect(messages).toEqual(['one', 'two'])
    expect(remainder).toBe('')
  })
})
