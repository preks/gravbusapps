jest.mock('../../../services/SlidesApiService', () => ({
  SlidesApiService: {
    uploadImageFromBase64: jest.fn()
  }
}))

import { createImageElement, type SlideData } from '../../../components/slideElements'
import { SlidesApiService } from '../../../services/SlidesApiService'
import { uploadSlideImages } from '../uploadSlideImages'

const mockUploadImageFromBase64 = SlidesApiService.uploadImageFromBase64 as jest.MockedFunction<
  typeof SlidesApiService.uploadImageFromBase64
>

describe('uploadSlideImages', () => {
  beforeEach(() => {
    mockUploadImageFromBase64.mockReset()
  })

  it('keeps inline svg images and backgrounds unchanged', async () => {
    const svgDataUrl = 'data:image/svg+xml;base64,SVGDATA'
    const slide: SlideData = {
      id: 'slide-1',
      background: { type: 'image', imageUrl: svgDataUrl },
      elements: [createImageElement(svgDataUrl, { id: 'image-1' })]
    }

    const result = await uploadSlideImages([slide], {
      failurePlaceholderDataUrl: 'data:image/svg+xml;base64,PLACEHOLDER',
      retryCount: 1
    })

    expect(result.slides[0].background).toEqual({ type: 'image', imageUrl: svgDataUrl })
    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: svgDataUrl })
    expect(result.failedUploads).toBe(0)
    expect(mockUploadImageFromBase64).not.toHaveBeenCalled()
  })

  it('uploads repeated raster sources once and reuses the returned url', async () => {
    const sharedDataUrl = 'data:image/png;base64,SHARED'
    const slide: SlideData = {
      id: 'slide-1',
      background: { type: 'image', imageUrl: sharedDataUrl },
      elements: [
        createImageElement(sharedDataUrl, { id: 'image-1' }),
        createImageElement(sharedDataUrl, { id: 'image-2' })
      ]
    }

    mockUploadImageFromBase64.mockResolvedValueOnce('https://drive.example/shared.png')

    const progressCalls: Array<{ total: number; uploaded: number }> = []
    const result = await uploadSlideImages([slide], {
      onProgress: progress => {
        progressCalls.push(progress)
      }
    })

    expect(result.slides[0].background).toEqual({ type: 'image', imageUrl: 'https://drive.example/shared.png' })
    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: 'https://drive.example/shared.png' })
    expect(result.slides[0].elements[1]).toMatchObject({ type: 'image', src: 'https://drive.example/shared.png' })
    expect(result.failedUploads).toBe(0)
    expect(mockUploadImageFromBase64).toHaveBeenCalledTimes(1)
    expect(progressCalls).toEqual([
      { total: 1, uploaded: 0 },
      { total: 1, uploaded: 1 }
    ])
  })

  it('replaces failed embedded image and background uploads with placeholders after retry', async () => {
    const placeholderDataUrl = 'data:image/svg+xml;base64,PLACEHOLDER'
    const slide: SlideData = {
      id: 'slide-1',
      background: { type: 'image', imageUrl: 'data:image/png;base64,BACKGROUND' },
      elements: [createImageElement('data:image/png;base64,IMAGE', { id: 'image-1' })]
    }

    mockUploadImageFromBase64.mockRejectedValue(new Error('upload failed'))

    const result = await uploadSlideImages([slide], {
      failurePlaceholderDataUrl: placeholderDataUrl,
      retryCount: 1
    })

    expect(result.slides[0].background).toEqual({ type: 'image', imageUrl: placeholderDataUrl })
    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: placeholderDataUrl })
    expect(result.failedUploads).toBe(2)
    expect(mockUploadImageFromBase64).toHaveBeenCalledTimes(4)
  })

  it('applies placeholder to every repeated raster target when the shared upload fails', async () => {
    const placeholderDataUrl = 'data:image/svg+xml;base64,PLACEHOLDER'
    const sharedDataUrl = 'data:image/png;base64,SHARED'
    const slide: SlideData = {
      id: 'slide-1',
      background: { type: 'image', imageUrl: sharedDataUrl },
      elements: [
        createImageElement(sharedDataUrl, { id: 'image-1' }),
        createImageElement(sharedDataUrl, { id: 'image-2' })
      ]
    }

    mockUploadImageFromBase64.mockRejectedValue(new Error('upload failed'))

    const result = await uploadSlideImages([slide], {
      failurePlaceholderDataUrl: placeholderDataUrl,
      retryCount: 1
    })

    expect(result.slides[0].background).toEqual({ type: 'image', imageUrl: placeholderDataUrl })
    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: placeholderDataUrl })
    expect(result.slides[0].elements[1]).toMatchObject({ type: 'image', src: placeholderDataUrl })
    expect(result.failedUploads).toBe(3)
    expect(mockUploadImageFromBase64).toHaveBeenCalledTimes(2)
  })

  it('reports exact upload counts for batched image progress', async () => {
    const slide: SlideData = {
      id: 'slide-progress-1',
      background: { type: 'image', imageUrl: 'data:image/png;base64,BACKGROUND' },
      elements: [createImageElement('data:image/png;base64,IMAGE', { id: 'image-progress-1' })]
    }

    mockUploadImageFromBase64
      .mockResolvedValueOnce('https://drive.example/background.png')
      .mockResolvedValueOnce('https://drive.example/image.png')

    const progressCalls: Array<{ total: number; uploaded: number }> = []
    const result = await uploadSlideImages([slide], {
      onProgress: progress => {
        progressCalls.push(progress)
      }
    })

    expect(result.failedUploads).toBe(0)
    expect(progressCalls).toEqual([
      { total: 2, uploaded: 0 },
      { total: 2, uploaded: 2 }
    ])
  })
})
