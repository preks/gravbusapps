import {
  buildYouTubeEmbedUrl,
  buildYouTubePreviewImageUrl,
  parseOnlineVideoUrl,
  sanitizeOnlineVideoEmbedUrl
} from '../onlineVideo'

describe('onlineVideo', () => {
  it('parses standard YouTube watch URLs', () => {
    const parsed = parseOnlineVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(parsed).toEqual({
      provider: 'youtube',
      sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      embedUrl: buildYouTubeEmbedUrl('dQw4w9WgXcQ'),
      previewImageUrl: buildYouTubePreviewImageUrl('dQw4w9WgXcQ'),
      videoId: 'dQw4w9WgXcQ'
    })
  })

  it('parses youtu.be short links', () => {
    const parsed = parseOnlineVideoUrl('https://youtu.be/dQw4w9WgXcQ')

    expect(parsed?.embedUrl).toBe(buildYouTubeEmbedUrl('dQw4w9WgXcQ'))
    expect(parsed?.previewImageUrl).toBe(buildYouTubePreviewImageUrl('dQw4w9WgXcQ'))
  })

  it('sanitizes supported embed URLs', () => {
    expect(sanitizeOnlineVideoEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      buildYouTubeEmbedUrl('dQw4w9WgXcQ')
    )
  })

  it('rejects unsupported providers', () => {
    expect(parseOnlineVideoUrl('https://vimeo.com/123456')).toBeNull()
    expect(sanitizeOnlineVideoEmbedUrl('https://example.com/video')).toBe('')
  })
})
