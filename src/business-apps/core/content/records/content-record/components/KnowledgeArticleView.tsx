import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Badge, Card } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { CommentSection } from '@/business-apps/core/content/components/interactions'
import ContentInfoSection from './ContentInfoSection'
import { BookOpen, Clock, User } from 'lucide-react'
import translations from '../_i18n'

interface KnowledgeArticleViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

/**
 * Wiki-style Article View specifically for Knowledge Base articles
 * Features: Table of Contents, Breadcrumbs, Related Articles, Structured Layout
 */
const KnowledgeArticleView: React.FC<KnowledgeArticleViewProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)

  // Extract headings from content for Table of Contents
  const tableOfContents = useMemo(() => {
    if (!item.content) return []

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = item.content

    const headings = Array.from(tempDiv.querySelectorAll('h1, h2, h3'))
    return headings.map((heading, index) => ({
      id: `heading-${index}`,
      text: heading.textContent || '',
      level: parseInt(heading.tagName.charAt(1))
    }))
  }, [item.content])

  const hasTableOfContents = tableOfContents.length > 0

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="knowledge-article-view">
      <div className="gba:flex gba:gap-6 gba:mt-6 gba:max-w-[1200px] gba:mx-auto gba:px-4">
        {/* Left Sidebar - Table of Contents */}
        {hasTableOfContents && (
          <aside className="gba:w-[240px] gba:shrink-0 gba:sticky gba:top-4 gba:h-fit">
            <Card className="gba:p-4">
              <h3 className="gba:text-sm gba:font-semibold gba:mb-3 gba:flex gba:items-center gba:gap-2 gba:text-foreground">
                <BookOpen className="gba:w-4 gba:h-4" />
                {t('table_of_contents', 'Contents')}
              </h3>
              <nav className="gba:space-y-1">
                {tableOfContents.map((heading, index) => (
                  <a
                    key={index}
                    href={`#${heading.id}`}
                    className={`gba:block gba:text-sm gba:py-1 gba:hover:text-primary gba:transition-colors ${
                      heading.level === 1 ? 'gba:pl-0 gba:font-medium' : heading.level === 2 ? 'gba:pl-3' : 'gba:pl-6'
                    } gba:text-muted-foreground gba:hover:text-foreground`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </Card>
          </aside>
        )}

        {/* Main Content */}
        <article className="gba:flex-1 gba:max-w-[800px]">
          {/* Breadcrumb */}
          <nav className="gba:flex gba:items-center gba:gap-2 gba:mb-4 gba:text-sm gba:text-muted-foreground">
            <a
              href="/platform/content/intranet?tab=knowledge"
              className="gba:hover:text-foreground gba:transition-colors"
            >
              {t('knowledge', 'Knowledge')}
            </a>
            {item.categoryNames && item.categoryNames.length > 0 && (
              <>
                <span>/</span>
                <span className="gba:text-foreground">{item.categoryNames[0]}</span>
              </>
            )}
            <span>/</span>
            <span className="gba:text-foreground gba:font-medium gba:truncate">{item.title}</span>
          </nav>

          {/* Tags */}
          {item.tagNames && item.tagNames.length > 0 && (
            <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
              {item.tagNames.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="gba:text-4xl gba:leading-tight gba:font-bold gba:mb-6 gba:text-foreground">{item.title}</h1>

          {/* Article Meta */}
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:mb-6 gba:text-sm gba:text-muted-foreground">
            {item.createdBy && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:w-4 gba:h-4" />
                <span>{item.createdBy}</span>
              </div>
            )}
            {item.createdAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:w-4 gba:h-4" />
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Preview/Summary Box */}
          {item.preview && (
            <Card className="gba:p-4 gba:mb-6 gba:bg-accent gba:border-l-4 gba:border-l-primary">
              <p className="gba:text-base gba:leading-relaxed gba:font-medium gba:text-foreground">{item.preview}</p>
            </Card>
          )}

          {/* Featured Image */}
          {item.picture && (
            <img
              src={item.picture}
              alt={t('content_image')}
              className="gba:w-full gba:h-auto gba:max-h-[400px] gba:object-cover gba:rounded-lg gba:mb-6"
            />
          )}

          {/* Content */}
          {item.content && (
            <div
              className="gba:prose gba:prose-lg gba:max-w-none gba:mb-10
                         [&>h1]:gba:text-3xl [&>h1]:gba:font-bold [&>h1]:gba:mt-8 [&>h1]:gba:mb-4 [&>h1]:gba:text-foreground
                         [&>h2]:gba:text-2xl [&>h2]:gba:font-bold [&>h2]:gba:mt-6 [&>h2]:gba:mb-3 [&>h2]:gba:text-foreground
                         [&>h3]:gba:text-xl [&>h3]:gba:font-bold [&>h3]:gba:mt-4 [&>h3]:gba:mb-2 [&>h3]:gba:text-foreground
                         [&>p]:gba:text-base [&>p]:gba:leading-7 [&>p]:gba:mb-4 [&>p]:gba:text-foreground
                         [&>ul]:gba:list-disc [&>ul]:gba:ml-6 [&>ul]:gba:mb-4
                         [&>ol]:gba:list-decimal [&>ol]:gba:ml-6 [&>ol]:gba:mb-4
                         [&>code]:gba:bg-muted [&>code]:gba:px-1 [&>code]:gba:py-0.5 [&>code]:gba:rounded [&>code]:gba:text-sm
                         [&>pre]:gba:bg-muted [&>pre]:gba:p-4 [&>pre]:gba:rounded-lg [&>pre]:gba:mb-4 [&>pre]:gba:overflow-x-auto
                         [&>blockquote]:gba:border-l-4 [&>blockquote]:gba:border-primary [&>blockquote]:gba:pl-4 [&>blockquote]:gba:italic [&>blockquote]:gba:my-4"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          )}

          {/* Article Info Section */}
          <ContentInfoSection
            item={item}
            accessToken={accessToken}
            userId={userId}
            employeeId={employeeId}
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
          />

          {/* Comment Section */}
          {item.allowComment && (
            <CommentSection
              articleId={item.id}
              allowComment={item.allowComment}
              accessToken={accessToken}
              employeeId={employeeId}
              currentUserId={userId}
              data-testid="knowledge-article-view-comments"
            />
          )}
        </article>

        {/* Right Sidebar - Related Articles / Meta Info */}
        <aside className="gba:w-[260px] gba:shrink-0 gba:sticky gba:top-4 gba:h-fit">
          <Card className="gba:p-4">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-foreground">
              {t('article_info', 'Article Information')}
            </h3>
            <dl className="gba:space-y-3 gba:text-sm">
              {item.createdAt && (
                <div>
                  <dt className="gba:text-muted-foreground gba:mb-1">{t('created', 'Created')}</dt>
                  <dd className="gba:text-foreground gba:font-medium">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {item.updatedAt && (
                <div>
                  <dt className="gba:text-muted-foreground gba:mb-1">{t('last_updated', 'Last Updated')}</dt>
                  <dd className="gba:text-foreground gba:font-medium">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {item.createdBy && (
                <div>
                  <dt className="gba:text-muted-foreground gba:mb-1">{t('author', 'Author')}</dt>
                  <dd className="gba:text-foreground gba:font-medium">{item.createdBy}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Help Section */}
          <Card className="gba:p-4 gba:mt-4 gba:bg-accent">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-foreground">
              {t('need_help', 'Need Help?')}
            </h3>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">
              {t('help_text', "Can't find what you're looking for? Contact support.")}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default KnowledgeArticleView
