import { buildDocumentAppsHubUrl } from '../useDocumentAppsHubUrlState'

describe('buildDocumentAppsHubUrl', () => {
  it('sets the review version when navigating to review mode', () => {
    const result = buildDocumentAppsHubUrl('/platform/every-office/documents', '?section=shared', {
      docId: 'doc-1',
      view: 'review',
      sectionOverride: 'shared',
      reviewVersion: '12'
    })
    const params = new URLSearchParams(result.newUrl.split('?')[1])

    expect(params.get('docId')).toBe('doc-1')
    expect(params.get('view')).toBe('review')
    expect(params.get('version')).toBe('12')
    expect(params.get('section')).toBe('shared')
    expect(result.state).toEqual({
      docId: 'doc-1',
      view: 'review',
      section: 'shared',
      version: '12'
    })
  })

  it('removes the review version when leaving review mode', () => {
    const result = buildDocumentAppsHubUrl(
      '/platform/every-office/documents',
      '?docId=doc-1&view=review&version=12&section=shared',
      {
        docId: 'doc-1',
        view: 'editor',
        sectionOverride: 'shared'
      }
    )
    const params = new URLSearchParams(result.newUrl.split('?')[1])

    expect(params.get('docId')).toBe('doc-1')
    expect(params.get('view')).toBe('editor')
    expect(params.has('version')).toBe(false)
    expect(params.get('section')).toBe('shared')
  })
})
