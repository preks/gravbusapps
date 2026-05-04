import { derivePreviewNamespaceContext } from '../PreviewSandbox'

describe('derivePreviewNamespaceContext', () => {
  it('derives a draft namespace from a raw session id once', () => {
    expect(derivePreviewNamespaceContext('session-1777477272573-2b0e3e86-4cb')).toEqual({
      sessionNamespace: 'draft_session_1777477272573_2b0e3e86_4cb',
      namespace: 'draft_session_1777477272573_2b0e3e86_4cb'
    })
  })

  it('preserves an existing draft namespace verbatim', () => {
    expect(derivePreviewNamespaceContext('draft_session_1777477272573_2b0e3e86_4cb')).toEqual({
      sessionNamespace: 'draft_session_1777477272573_2b0e3e86_4cb',
      namespace: 'draft_session_1777477272573_2b0e3e86_4cb'
    })
  })
})
