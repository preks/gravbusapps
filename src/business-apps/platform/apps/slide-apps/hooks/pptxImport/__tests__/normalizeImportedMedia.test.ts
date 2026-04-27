jest.mock('../../../services/SlidesApiService', () => ({
  SlidesApiService: {
    uploadImageFromBase64: jest.fn(),
    uploadDataUrl: jest.fn()
  }
}))

jest.mock('../../../utils/videoPreview', () => ({
  captureVideoPreviewImage: jest.fn()
}))

import {
  createImageElement,
  createVideoElement,
  type SlideData,
  type VideoElement
} from '../../../components/slideElements'
import { SlidesApiService } from '../../../services/SlidesApiService'
import { captureVideoPreviewImage } from '../../../utils/videoPreview'
import { normalizeImportedSlideMedia } from '../normalizeImportedMedia'

const mockUploadImageFromBase64 = SlidesApiService.uploadImageFromBase64 as jest.MockedFunction<
  typeof SlidesApiService.uploadImageFromBase64
>
const mockUploadDataUrl = SlidesApiService.uploadDataUrl as jest.MockedFunction<typeof SlidesApiService.uploadDataUrl>
const mockCaptureVideoPreviewImage = captureVideoPreviewImage as jest.MockedFunction<typeof captureVideoPreviewImage>

function makeSlide(elements: SlideData['elements']): SlideData {
  return {
    id: 'slide-1',
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

describe('normalizeImportedSlideMedia', () => {
  beforeEach(() => {
    mockUploadImageFromBase64.mockReset()
    mockUploadDataUrl.mockReset()
    mockCaptureVideoPreviewImage.mockReset()
  })

  it('uploads embedded images and videos to internal storage without leaving inline media', async () => {
    mockUploadImageFromBase64
      .mockResolvedValueOnce('https://drive.example/image.png')
      .mockResolvedValueOnce('https://drive.example/video.jpg')
    mockUploadDataUrl.mockResolvedValueOnce('https://drive.example/video.mp4')
    mockCaptureVideoPreviewImage.mockResolvedValueOnce('data:image/jpeg;base64,PREVIEW')

    const embeddedVideo = createVideoElement('data:video/mp4;base64,VIDEO', {
      id: 'video-1',
      sourceUrl: 'ppt/media/video1.mp4',
      videoKind: 'file'
    })

    const result = await normalizeImportedSlideMedia([
      makeSlide([createImageElement('data:image/png;base64,IMAGE', { id: 'image-1' }), embeddedVideo])
    ])

    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: 'https://drive.example/image.png' })
    expect(result.slides[0].elements[1]).toMatchObject<Partial<VideoElement>>({
      type: 'video',
      src: 'https://drive.example/video.mp4',
      sourceUrl: 'https://drive.example/video.mp4',
      previewImageUrl: 'https://drive.example/video.jpg'
    })
    expect(result.warnings).toEqual({
      imageUploadFailures: 0,
      embeddedVideoUploadFailures: 0,
      videoPreviewFailures: 0,
      videoPreviewUploadFailures: 0
    })
    expect(JSON.stringify(result.slides)).not.toContain('data:image/')
    expect(JSON.stringify(result.slides)).not.toContain('data:video/')
  })

  it('reports exact progress for image uploads and video processing', async () => {
    mockUploadImageFromBase64
      .mockResolvedValueOnce('https://drive.example/image.png')
      .mockResolvedValueOnce('https://drive.example/video.jpg')
    mockUploadDataUrl.mockResolvedValueOnce('https://drive.example/video.mp4')
    mockCaptureVideoPreviewImage.mockResolvedValueOnce('data:image/jpeg;base64,PREVIEW')

    const progressCalls: Array<{ phase: string; current: number; total: number }> = []
    const embeddedVideo = createVideoElement('data:video/mp4;base64,VIDEO', {
      id: 'video-progress-1',
      sourceUrl: 'ppt/media/video-progress.mp4',
      videoKind: 'file'
    })

    await normalizeImportedSlideMedia(
      [makeSlide([createImageElement('data:image/png;base64,IMAGE', { id: 'image-progress-1' }), embeddedVideo])],
      {
        onProgress: progress => {
          progressCalls.push(progress)
        }
      }
    )

    expect(progressCalls).toEqual([
      { phase: 'uploading-images', current: 0, total: 1 },
      { phase: 'uploading-images', current: 1, total: 1 },
      { phase: 'processing-videos', current: 0, total: 1 },
      { phase: 'processing-videos', current: 1, total: 1 }
    ])
  })

  it('replaces failed embedded image uploads with the provided placeholder after retry', async () => {
    const placeholderDataUrl = 'data:image/svg+xml;base64,PLACEHOLDER'
    mockUploadImageFromBase64.mockRejectedValue(new Error('upload failed'))

    const result = await normalizeImportedSlideMedia(
      [makeSlide([createImageElement('data:image/png;base64,IMAGE', { id: 'image-1' })])],
      {
        imageFailurePlaceholderDataUrl: placeholderDataUrl,
        uploadRetryCount: 1
      }
    )

    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: placeholderDataUrl })
    expect(mockUploadImageFromBase64).toHaveBeenCalledTimes(2)
    expect(result.warnings.imageUploadFailures).toBe(1)
  })

  it('keeps imported svg images inline without attempting upload', async () => {
    const svgDataUrl = 'data:image/svg+xml;base64,SVGDATA'

    const result = await normalizeImportedSlideMedia([makeSlide([createImageElement(svgDataUrl, { id: 'image-1' })])])

    expect(result.slides[0].elements[0]).toMatchObject({ type: 'image', src: svgDataUrl })
    expect(result.warnings.imageUploadFailures).toBe(0)
    expect(mockUploadImageFromBase64).not.toHaveBeenCalled()
  })

  it('drops embedded videos when upload fails and records a warning', async () => {
    mockUploadDataUrl.mockRejectedValue(new Error('upload failed'))
    mockCaptureVideoPreviewImage.mockResolvedValueOnce(null)

    const result = await normalizeImportedSlideMedia([
      makeSlide([
        createVideoElement('data:video/mp4;base64,VIDEO', {
          id: 'video-1',
          sourceUrl: 'ppt/media/video1.mp4',
          videoKind: 'file'
        })
      ])
    ])

    expect(result.slides[0].elements).toHaveLength(0)
    expect(result.warnings.embeddedVideoUploadFailures).toBe(1)
    expect(result.warnings.videoPreviewFailures).toBe(1)
  })

  it('clears inline preview data when preview upload fails after retry', async () => {
    mockUploadDataUrl.mockResolvedValueOnce('https://drive.example/video.mp4')
    mockUploadImageFromBase64.mockRejectedValue(new Error('preview upload failed'))

    const result = await normalizeImportedSlideMedia(
      [
        makeSlide([
          createVideoElement('data:video/mp4;base64,VIDEO', {
            id: 'video-1',
            sourceUrl: 'ppt/media/video1.mp4',
            previewImageUrl: 'data:image/png;base64,PREVIEW',
            videoKind: 'file'
          })
        ])
      ],
      { uploadRetryCount: 1 }
    )

    expect(result.slides[0].elements[0]).toMatchObject<Partial<VideoElement>>({
      type: 'video',
      src: 'https://drive.example/video.mp4',
      sourceUrl: 'https://drive.example/video.mp4'
    })
    expect((result.slides[0].elements[0] as VideoElement).previewImageUrl).toBeUndefined()
    expect(result.warnings.videoPreviewUploadFailures).toBe(1)
    expect(mockUploadImageFromBase64).toHaveBeenCalledTimes(2)
  })
})
