import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import { extractTextFromHTML } from '../../../../../utils/translationUtils'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

interface FeaturedArticlesSectionProps {
  articles: ContentEntry[]
  onArticleClick: (entryId: string) => void
  truncateText: (text: string, maxLength: number) => string
  t: (key: string) => string
  accessToken?: string
}

// Helper component to handle async blob URL for article images
const ArticleImage: React.FC<{ picture: any; accessToken?: string; alt: string }> = ({ picture, accessToken, alt }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Clean up previous blob URL if it exists
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!picture) {
      setImageUrl(null)
      return
    }

    let fileInfo: any = null
    try {
      fileInfo = typeof picture === 'string' ? JSON.parse(picture) : picture
    } catch {
      if (typeof picture === 'string' && picture.startsWith('data:')) {
        setImageUrl(picture)
        return
      }
      setImageUrl(picture)
      return
    }

    if (!fileInfo?.path) {
      setImageUrl(null)
      return
    }

    if (accessToken) {
      let isCancelled = false

      const fetchImage = async () => {
        try {
          const blobUrl = await buildFileUrl(fileInfo, accessToken)
          if (!isCancelled) {
            blobUrlRef.current = blobUrl
            setImageUrl(blobUrl)
          } else {
            URL.revokeObjectURL(blobUrl)
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('[FeaturedArticlesSection] Error fetching image:', error)
            setImageUrl(null)
          }
        }
      }

      fetchImage()

      return () => {
        isCancelled = true
        if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
      }
    } else {
      setImageUrl(buildFileUrl(fileInfo))
    }
  }, [picture, accessToken])

  if (!imageUrl) return null

  return (
    <div className="gba:w-48 gba:h-32 gba:rounded-lg gba:overflow-hidden gba:shrink-0">
      <img src={imageUrl} alt={alt} className="gba:w-full gba:h-full gba:object-cover" />
    </div>
  )
}

const FeaturedArticlesSection: React.FC<FeaturedArticlesSectionProps> = ({
  articles,
  onArticleClick,
  truncateText,
  t,
  accessToken
}) => {
  if (articles.length === 0) {
    return null
  }

  return (
    <div className="gba:mb-8">
      <h2 className="gba:text-xl gba:font-semibold gba:mb-4 gba:text-foreground">{t('recent_articles')}</h2>
      <div className="gba:space-y-4">
        {articles.map(entry => (
          <Card
            key={entry.id}
            className="gba:p-6 gba:cursor-pointer gba:hover:shadow-lg gba:transition-shadow"
            onClick={() => onArticleClick(entry.id || '')}
            data-testid={`featured-article-${entry.id}`}
          >
            <div className="gba:flex gba:gap-6">
              <ArticleImage picture={entry.picture} accessToken={accessToken} alt={entry.title || ''} />
              <div className="gba:flex-1">
                <h3 className="gba:text-2xl gba:font-bold gba:mb-2 gba:text-foreground gba:hover:text-primary gba:transition-colors">
                  {entry.title}
                </h3>
                {entry.previewText && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-3 gba:italic">
                    {truncateText(entry.previewText, 150)}
                  </p>
                )}
                {entry.description && (
                  <div
                    className="gba:text-foreground gba:leading-relaxed gba:mb-4"
                    dangerouslySetInnerHTML={{
                      __html: truncateText(extractTextFromHTML(entry.description), 300)
                    }}
                  />
                )}
                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Eye className="gba:w-4 gba:h-4" />
                    <span>{entry.viewCount || 0} views</span>
                  </div>
                  {entry.contentEntryReactionCounts && entry.contentEntryReactionCounts.length > 0 && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <span>❤️</span>
                      {entry.contentEntryReactionCounts.reduce((sum, item) => sum + (item.count || 0), 0)}
                    </span>
                  )}
                  {entry.createdAt && (
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FeaturedArticlesSection
