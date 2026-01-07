import React from 'react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import ArticleView from './ArticleView'
import QuestionView from './QuestionView'
import KnowledgeArticleView from './KnowledgeArticleView'
import type { DetectedLanguage, TranslatedTexts } from '@/common/components/content'

interface ContentPageProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  detectedLanguage?: DetectedLanguage | null
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  isTranslating?: boolean
  isDetecting?: boolean
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
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
  reactionCatalogMap,
  detectedLanguage,
  targetLanguage,
  translatedTexts,
  isTranslating,
  isDetecting,
  onTranslateComments
}) => {
  // Determine which view to render based on contentGroupRef
  const isQuestion = item.contentGroupRef === ContentGroup.QUESTION
  const isKnowledge = item.contentGroupRef === ContentGroup.KNOWLEDGE

  const translationProps = {
    detectedLanguage,
    targetLanguage,
    translatedTexts,
    isTranslating,
    isDetecting,
    onTranslateComments
  }

  if (isQuestion) {
    return (
      <QuestionView
        item={item}
        accessToken={accessToken}
        userId={userId}
        employeeId={employeeId}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
        {...translationProps}
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
        {...translationProps}
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
      {...translationProps}
    />
  )
}

export default ContentPage
