import React from 'react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import ArticleView from './ArticleView'
import QuestionView from './QuestionView'
import KnowledgeArticleView from './KnowledgeArticleView'

interface ContentPageProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

/**
 * ContentPage Router - Routes to appropriate view based on content type
 */
const ContentPage: React.FC<ContentPageProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  allowedReactions,
  reactionCatalogMap
}) => {
  // Determine which view to render based on contentGroupRef
  const isQuestion = item.contentGroupRef === ContentGroup.QUESTION
  const isKnowledge = item.contentGroupRef === ContentGroup.KNOWLEDGE

  if (isQuestion) {
    return (
      <QuestionView
        item={item}
        accessToken={accessToken}
        userId={userId}
        employeeId={employeeId}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
      />
    )
  }

  if (isKnowledge) {
    return (
      <KnowledgeArticleView
        item={item}
        accessToken={accessToken}
        userId={userId}
        employeeId={employeeId}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
      />
    )
  }

  // Default to ArticleView for News, Documents, Intranet, etc.
  return (
    <ArticleView
      item={item}
      accessToken={accessToken}
      userId={userId}
      employeeId={employeeId}
      allowedReactions={allowedReactions}
      reactionCatalogMap={reactionCatalogMap}
    />
  )
}

export default ContentPage
