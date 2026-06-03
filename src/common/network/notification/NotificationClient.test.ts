import { NotificationClient } from './NotificationClient'

describe('NotificationClient', () => {
  it('builds SSE url from notification api base', () => {
    const client = new NotificationClient()
    expect(client.getSseUrl()).toMatch(/\/notifications\/sse$/)
  })
})
