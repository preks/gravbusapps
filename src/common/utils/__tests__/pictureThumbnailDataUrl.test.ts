import { pictureThumbnailToDataUrl } from '../pictureThumbnailDataUrl'

describe('pictureThumbnailToDataUrl', () => {
  it('prefixes raw base64 jpeg', () => {
    expect(pictureThumbnailToDataUrl('/9j/abc')).toBe('data:image/jpeg;base64,/9j/abc')
  })

  it('returns https urls unchanged', () => {
    expect(pictureThumbnailToDataUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
  })
})
