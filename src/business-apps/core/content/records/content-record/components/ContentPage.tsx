import React from 'react'
import { Alert, AlertDescription, AlertTitle, Button, useTranslation } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import ArticleView from './ArticleView'
import QuestionView from './QuestionView'
import KnowledgeArticleView from './KnowledgeArticleView'
import PolicyView from './policy-view/PolicyView'
import type { DetectedLanguage, TranslatedTexts } from '@/common/components/content'
import { isPolicyContentEntry } from '@/business-apps/core/content/utils/policyUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import translations from '../_i18n'
import { toast } from 'sonner'

interface ContentPageProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  additionalData?: { [k: string]: any }
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  detectedLanguage?: DetectedLanguage | null
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  isTranslating?: boolean
  isDetecting?: boolean
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
  onReactionSuccess?: () => void
  onEntryUpdated?: () => void
  onBackClick?: () => void
  onLanguageSelect?: (languageId: string) => void
}

/**
 * ContentPage Router - Routes to appropriate view based on content type
 */
const ContentPage: React.FC<ContentPageProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  additionalData,
  allowedReactions,
  reactionCatalogMap,
  detectedLanguage,
  targetLanguage,
  translatedTexts,
  isTranslating,
  isDetecting,
  onTranslateComments,
  onReactionSuccess,
  onEntryUpdated,
  onBackClick,
  onLanguageSelect
}) => {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)

  // Determine which view to render based on contentGroupRef
  const isQuestion = item.contentGroupRef === ContentGroup.QUESTION
  const isKnowledge = item.contentGroupRef === ContentGroup.KNOWLEDGE
  const isPolicy = isPolicyContentEntry(item as any)

  const canMarkAsPolicy = Boolean(
    additionalData?.isAdmin ||
      additionalData?.admin === true ||
      (Array.isArray(additionalData?.roles) && additionalData?.roles.includes('admin')) ||
      (Array.isArray(additionalData?.permissions) && additionalData?.permissions.includes('content.admin'))
  )

  const hasPolicyFlag = Boolean((item as any)?.additionalProperties?.policy)

  const markAsPolicy = async () => {
    try {
      const mutation = `
        mutation MarkAsPolicy($id: uuid!, $changes: ContentEntrySetInput!) {
          updateContentEntryByPk(pkColumns: { id: $id }, _set: $changes) {
            id
            updatedAt
            additionalProperties
          }
        }
      `
      const current = ((item as any)?.additionalProperties as Record<string, any> | null) || {}
      const changes = {
        additionalProperties: {
          ...current,
          policy: {
            ...(current as any)?.policy,
            kind: 'policy',
            stage: 'platform-story',
            markedAt: new Date().toISOString()
          }
        }
      }
      await graphqlClient.request(mutation, { id: item.id, changes })
      toast.success(t('mark_as_policy_success'))
      onEntryUpdated?.()
    } catch (e) {
      toast.error(t('mark_as_policy_error'), { description: e instanceof Error ? e.message : String(e) })
    }
  }

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

  const markBar =
    canMarkAsPolicy && !isPolicy && !hasPolicyFlag ? (
      <div className="gba:max-w-[1000px] gba:mx-auto gba:px-4 gba:mt-2" data-testid="content-mark-as-policy-bar">
        <Alert>
          <AlertTitle>{t('mark_as_policy_title')}</AlertTitle>
          <AlertDescription className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
            <span className="gba:text-sm">{t('mark_as_policy_description')}</span>
            <Button variant="default" onClick={markAsPolicy} data-testid="content-mark-as-policy-button" type="button">
              {t('mark_as_policy_action')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    ) : null

  if (isPolicy) {
    return (
      <>
        {markBar}
        <PolicyView
          item={item}
          accessToken={accessToken}
          userId={userId}
          employeeId={employeeId}
          targetLanguage={targetLanguage}
          translatedTexts={translatedTexts}
          detectedLanguage={detectedLanguage}
          isDetecting={isDetecting}
          isTranslating={isTranslating}
          onBackClick={onBackClick}
          onLanguageSelect={onLanguageSelect}
        />
      </>
    )
  }

  if (isKnowledge) {
    return (
      <>
        {markBar}
        <KnowledgeArticleView
          item={item}
          accessToken={accessToken}
          userId={userId}
          employeeId={employeeId}
          allowedReactions={allowedReactions}
          reactionCatalogMap={reactionCatalogMap}
          onReactionSuccess={onReactionSuccess}
          {...translationProps}
        />
      </>
    )
  }

  return (
    <>
      {markBar}
      <ArticleView
        item={item}
        accessToken={accessToken}
        userId={userId}
        employeeId={employeeId}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
        onReactionSuccess={onReactionSuccess}
        {...translationProps}
      />
    </>
  )
}

export default ContentPage
