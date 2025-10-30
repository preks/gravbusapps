import React from 'react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { QUESTION_MODULE } from '@/business-apps/core/content/apps/content-portal/constants/contentConstants'
import ArticleView from './ArticleView'
import QuestionView from './QuestionView'

interface ContentPageProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  reactionCatalogMap?: Record<string, string>
}

/**
 * ContentPage Router - Routes to appropriate view based on content type
 */
const ContentPage: React.FC<ContentPageProps> = ({ item, accessToken, userId, employeeId, reactionCatalogMap }) => {
  // Determine which view to render based on contentGroupRef
  const isQuestion = item.contentGroupRef === QUESTION_MODULE

  if (isQuestion) {
    return (
      <QuestionView
        item={item}
        accessToken={accessToken}
        userId={userId}
        employeeId={employeeId}
        reactionCatalogMap={reactionCatalogMap}
      />
    )
  }

  // Default to ArticleView for News, Knowledge, Documents, Intranet, etc.
  return (
    <ArticleView
      item={item}
      accessToken={accessToken}
      userId={userId}
      employeeId={employeeId}
      allowedReactions={[]}
      reactionCatalogMap={reactionCatalogMap}
    />
  )
}

export default ContentPage
