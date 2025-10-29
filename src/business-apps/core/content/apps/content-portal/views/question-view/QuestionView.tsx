import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Badge } from '@newwork/nw-design-system'
import { MessageCircle, ThumbsUp, Eye } from 'lucide-react'
import { useContentEntries, toIntranetContent } from '@/common/data/content'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { QUESTION_CATEGORIES, ALL_TAG, contentGroupMapper, QUESTION } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import translations from '../../_i18n'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface QuestionViewProps {
  accessToken?: string
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 15
const NEXT_PAGE_SIZE = 10

const QuestionView: React.FC<QuestionViewProps> = ({ accessToken, hideBanner = false, currentTab = 'questions' }) => {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...QUESTION_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: contentGroupMapper[QUESTION],
      search: searchQuery,
      limit,
      offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, limit, offset]
  )

  // Use central content data - FIXED: correct parameter order
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Convert to legacy format
  const data = useMemo(() => entries.map(toIntranetContent), [entries])

  const hasMore = entries.length > 0 && entries.length < totalCount

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleCategoryClick = (label: string) => {
    const updatedCategories = updateTags(categories, label)
    setCategories(updatedCategories)
    setPage(1)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  const handleQuestionClick = (question: any) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: question.articleId,
      tab: currentTab
    })
    navigateTo(url)
  }

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'info' => {
    switch (status?.toLowerCase()) {
      case 'answered':
        return 'success'
      case 'open':
        return 'warning'
      case 'closed':
        return 'default'
      default:
        return 'info'
    }
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="question-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error?.message || String(error)}
            <Button onClick={refetch} variant="outline" className="gba:mt-2 gba:ml-4">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:w-full"
      data-testid="question-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.QUESTION}
            title={t('question-welcome-title')}
            subtitle={t('question-welcome-subtitle')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        <div className="gba:w-full gba:mb-6">
          <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-4">
            <div>
              <NavigationTagList
                tags={categories}
                onTagClick={handleCategoryClick}
                maxVisibleTags={6}
                alwaysVisibleTag={ALL_TAG}
              />
            </div>
            <div className="gba:flex gba:gap-2">
              <SearchInput onSearch={handleSearch} placeholder="Search questions..." />
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: contentGroupMapper[QUESTION] }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="question-view-create-button"
              >
                <Button>Ask Question</Button>
              </AppAction>
            </div>
          </div>
        </div>

        <div className="gba:space-y-4 gba:mb-8">
          {data.map(question => (
            <div
              key={question.articleId}
              className="gba:bg-card gba:rounded-lg gba:shadow-sm hover:gba:shadow-md gba:transition gba:border gba:border-border gba:p-6 gba:cursor-pointer"
              onClick={() => handleQuestionClick(question)}
              data-testid={`question-item-${question.articleId}`}
            >
              <div className="gba:flex gba:gap-4">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:min-w-[60px]">
                  <ThumbsUp className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                  <span className="gba:font-bold gba:text-lg gba:text-foreground">{question.reactionsCount || 0}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">votes</span>
                </div>

                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <Badge variant={getStatusVariant(question.status)} className="gba:text-xs">
                      {question.status || 'OPEN'}
                    </Badge>
                    {question.tagNames?.slice(0, 3).map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="gba:text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="gba:text-xl gba:font-bold gba:text-foreground gba:mb-2 hover:gba:text-primary gba:transition">
                    {question.title}
                  </h3>

                  <p className="gba:text-muted-foreground gba:mb-4 gba:line-clamp-2">{question.previewText}</p>

                  <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <MessageCircle className="gba:w-4 gba:h-4" />
                      <span>{question.commentsCount || 0} answers</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <Eye className="gba:w-4 gba:h-4" />
                      <span>{question.feedbacksCount || 0} views</span>
                    </div>
                    <span>•</span>
                    <span>Asked by {question.authorFullName || 'Unknown'}</span>
                    {question.createdAtText && (
                      <>
                        <span>•</span>
                        <span>{question.createdAtText}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
            <Button
              variant="default"
              className="gba:w-[280px]"
              onClick={loadMore}
              disabled={isLoading}
              data-testid="question-view-load-more"
            >
              Load More
            </Button>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="gba:text-center gba:py-12 gba:bg-card gba:rounded-lg gba:border gba:border-border">
            <MessageCircle className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
            <p className="gba:text-muted-foreground">No questions yet. Be the first to ask!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionView
