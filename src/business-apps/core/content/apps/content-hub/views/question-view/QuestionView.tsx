import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription, Badge } from '@newwork/nw-design-system'
import { MessageCircle, ThumbsUp, Eye } from 'lucide-react'
import { useContents } from '../../hooks/useContents'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { QUESTION_CATEGORIES, ALL_TAG, contentGroupMapper, QUESTION } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface QuestionViewProps {
  accessToken?: string
  hideBanner?: boolean
  currentTab?: string
}

const DEFAULT_PAGE_SIZE = 15
const NEXT_PAGE_SIZE = 10

const QuestionView: React.FC<QuestionViewProps> = ({ accessToken, hideBanner = false, currentTab = 'questions' }) => {
  const { t } = useTranslation('content')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...QUESTION_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  const { data, totalCount, isLoading, error, refetch } = useContents(
    {
      offset,
      limit,
      search: searchQuery,
      articleGroupRef: contentGroupMapper[QUESTION],
      sorter: { field: 'createdAt', order: 'descend' }
    },
    accessToken
  )

  const hasMore = data.length > 0 && data.length < totalCount

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
    const url = buildPlatformUrl('/platform/core/content-record', { contentId: question.articleId, tab: currentTab })
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
            {error}
            <Button onClick={refetch} variant="outline" className="gba:mt-2 gba:ml-4">
              {t('retry')}
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
      {/* Banner - Full Width */}
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.QUESTION}
            title={t('question_welcome_title', 'Q&A Forum')}
            subtitle={t('question_welcome_subtitle', 'Ask questions and share knowledge')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Navigation and Search */}
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
              <SearchInput onSearch={handleSearch} placeholder={t('search_questions', 'Search questions...')} />
              <AppAction
                contextsArray={[FlowContextName.articleCreate]}
                externalContextData={{ articleGroup: contentGroupMapper[QUESTION] }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="question-view-create-button"
              >
                <Button>{t('ask_question', 'Ask Question')}</Button>
              </AppAction>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="gba:space-y-4 gba:mb-8">
          {data.map(question => (
            <div
              key={question.articleId}
              className="gba:bg-card gba:rounded-lg gba:shadow-sm hover:gba:shadow-md gba:transition gba:border gba:border-border gba:p-6 gba:cursor-pointer"
              onClick={() => handleQuestionClick(question)}
              data-testid={`question-item-${question.articleId}`}
            >
              <div className="gba:flex gba:gap-4">
                {/* Vote Score */}
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:min-w-[60px]">
                  <ThumbsUp className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                  <span className="gba:font-bold gba:text-lg gba:text-foreground">{question.likesCount || 0}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">{t('votes', 'votes')}</span>
                </div>

                {/* Question Content */}
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
                      <span>
                        {question.commentsCount || 0} {t('answers', 'answers')}
                      </span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <Eye className="gba:w-4 gba:h-4" />
                      <span>
                        {question.feedbacksCount || 0} {t('views', 'views')}
                      </span>
                    </div>
                    <span>•</span>
                    <span>
                      {t('asked_by', 'Asked by')} {question.authorFullName || 'Unknown'}
                    </span>
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

        {/* Load More */}
        {hasMore && (
          <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
            <Button
              variant="default"
              className="gba:w-[280px]"
              onClick={loadMore}
              disabled={isLoading}
              data-testid="question-view-load-more"
            >
              {t('load_more')}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data.length === 0 && (
          <div className="gba:text-center gba:py-12 gba:bg-card gba:rounded-lg gba:border gba:border-border">
            <MessageCircle className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
            <p className="gba:text-muted-foreground">
              {t('no_questions_found', 'No questions yet. Be the first to ask!')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionView
