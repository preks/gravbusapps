/**
 * SlideImageService - Stock image integration for AI slide generation
 *
 * Provides image search and retrieval from Unsplash for enriching slides with relevant visuals.
 */

export interface ImageSearchResult {
  id: string
  url: string
  thumbnailUrl: string
  alt: string
  photographer: string
  photographerUrl: string
  width: number
  height: number
}

export interface ImageSearchOptions {
  query: string
  count?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
}

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || ''
const UNSPLASH_API_URL = 'https://api.unsplash.com'

export class SlideImageService {
  /**
   * Search for images by keywords
   */
  static async searchImages(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
    const { query, count = 3, orientation = 'landscape' } = options

    if (!UNSPLASH_ACCESS_KEY) {
      console.warn('[SlideImageService] Unsplash API key not configured, using placeholders')
      return SlideImageService.getPlaceholderImages(query, count)
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: count.toString(),
        orientation
      })

      const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      })

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`)
      }

      const data = await response.json()

      return data.results.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        alt: photo.alt_description || query,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        width: photo.width,
        height: photo.height
      }))
    } catch (error) {
      console.error('[SlideImageService] Failed to search images:', error)
      return SlideImageService.getPlaceholderImages(query, count)
    }
  }

  /**
   * Get a single image URL by keywords (returns best match)
   */
  static async getImageByKeywords(keywords: string): Promise<string> {
    const results = await SlideImageService.searchImages({ query: keywords, count: 1 })
    return results[0]?.url || SlideImageService.getPlaceholderUrl(keywords)
  }

  /**
   * Get placeholder images when Unsplash is unavailable
   */
  static getPlaceholderImages(query: string, count: number): ImageSearchResult[] {
    const seed = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

    return Array.from({ length: count }, (_, i) => ({
      id: `placeholder-${seed}-${i}`,
      url: `https://picsum.photos/seed/${seed + i}/1280/720`,
      thumbnailUrl: `https://picsum.photos/seed/${seed + i}/320/180`,
      alt: query,
      photographer: 'Lorem Picsum',
      photographerUrl: 'https://picsum.photos',
      width: 1280,
      height: 720
    }))
  }

  /**
   * Get a single placeholder URL
   */
  static getPlaceholderUrl(keywords: string): string {
    const seed = keywords.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return `https://picsum.photos/seed/${seed}/1280/720`
  }

  /**
   * Extract relevant image keywords from slide content
   */
  static extractImageKeywords(content: { title?: string; description?: string; topic?: string }): string {
    const parts: string[] = []

    if (content.topic) {
      parts.push(content.topic)
    }

    if (content.title) {
      const titleWords = content.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 3)
      parts.push(...titleWords)
    }

    if (content.description && parts.length < 3) {
      const descWords = content.description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 2)
      parts.push(...descWords)
    }

    return parts.slice(0, 4).join(' ') || 'business presentation'
  }

  /**
   * Get recommended image for a slide based on its layout and content
   */
  static async getRecommendedImage(
    layout: string,
    content: { title?: string; description?: string; topic?: string }
  ): Promise<string> {
    const keywords = SlideImageService.extractImageKeywords(content)

    const layoutOrientations: Record<string, 'landscape' | 'portrait'> = {
      'image-left': 'portrait',
      'image-right': 'portrait',
      'full-image': 'landscape',
      'title-cover': 'landscape'
    }

    const orientation = layoutOrientations[layout] || 'landscape'

    const results = await SlideImageService.searchImages({
      query: keywords,
      count: 1,
      orientation
    })

    return results[0]?.url || SlideImageService.getPlaceholderUrl(keywords)
  }

  /**
   * Batch fetch images for multiple slides
   */
  static async batchFetchImages(
    slides: Array<{
      id: string
      layout: string
      content: { title?: string; description?: string; imageKeywords?: string }
    }>
  ): Promise<Record<string, string>> {
    const imageLayouts = ['image-left', 'image-right', 'full-image', 'title-cover']
    const slidesNeedingImages = slides.filter(s => imageLayouts.includes(s.layout))

    const results: Record<string, string> = {}

    await Promise.all(
      slidesNeedingImages.map(async slide => {
        const keywords = slide.content.imageKeywords || SlideImageService.extractImageKeywords(slide.content)

        results[slide.id] = await SlideImageService.getImageByKeywords(keywords)
      })
    )

    return results
  }
}

export default SlideImageService
