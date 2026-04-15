import React, { useMemo, useState, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { AiTranslationButton, useContentTranslation } from '@/common/components/content'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import {
  CONTENT_REACTION_IDENTIFIER,
  CONTENT_REACTION_VERSION,
  CONTENT_REACTION_UPVOTE_ENTRY_ID,
  CONTENT_REACTION_DOWNVOTE_ENTRY_ID
} from '@/common/data/content/constants/contentCatalogs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { isPolicyContentEntry } from '@/business-apps/core/content/utils/policyUtils'
import ContentPage from './components/ContentPage'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import translations from './_i18n'

export interface ContentRecordProps extends BusinessAppContextProps {
  contentId?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const ContentRecord: React.FC<ContentRecordProps> = context => {
  const { t } = useTranslation(translations)
  const catalogClient = useCatalogManagerClient(context.accessToken)
  const [reactionCatalogMap, setReactionCatalogMap] = useState<Record<string, string>>(context.reactionCatalogMap || {})
  const [allowedReactions, setAllowedReactions] = useState<string[]>(context.allowedReactions || [])

  // Get contentId from props or URL query parameters
  const contentId = useMemo(() => {
    return context.contentId || new URLSearchParams(window.location.search).get('contentId') || ''
  }, [context.contentId])

  // Load allowed reactions if not provided
  useEffect(() => {
    // Check if reactions are already provided AND have actual data
    if (
      context.reactionCatalogMap &&
      Object.keys(context.reactionCatalogMap).length > 0 &&
      context.allowedReactions &&
      context.allowedReactions.length > 0
    ) {
      console.log('🔥 ContentRecord - Using provided reactions from context')
      return // Already provided with data
    }

    console.log('🔥 ContentRecord - Starting to load reactions...')

    const loadReactions = async () => {
      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: CONTENT_REACTION_IDENTIFIER,
            version: CONTENT_REACTION_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false
          }
        )

        const entries = (response as any).data || []

        // Build map for both vote reactions (+1/-1) and emoji reactions
        const catalogMap: Record<string, string> = {}
        const allowedCodes: string[] = []

        entries.forEach((entry: any) => {
          // Map ALL reactions (including +1/-1 for both voting AND emoji picker)
          if (entry.type === 'EMOJI' && !entry.parentEntryId && entry.additionalValue2 && entry.id) {
            const unifiedCode = entry.additionalValue2
            catalogMap[unifiedCode] = entry.id
            allowedCodes.push(unifiedCode)

            // Also map +1/-1 by their special keys for VoteButtons
            if (entry.id === CONTENT_REACTION_UPVOTE_ENTRY_ID) {
              catalogMap['+1'] = entry.id
            } else if (entry.id === CONTENT_REACTION_DOWNVOTE_ENTRY_ID) {
              catalogMap['-1'] = entry.id
            }
          }
        })

        // Sort emoji codes by display order
        const getDisplayOrder = (code: string): number => {
          const entry = entries.find((e: any) => e.additionalValue2 === code)
          return entry?.displayOrder || 0
        }
        const sortByDisplayOrder = (a: string, b: string): number => {
          return getDisplayOrder(a) - getDisplayOrder(b)
        }
        const sortedCodes = [...allowedCodes].sort(sortByDisplayOrder)

        console.log('🔥 ContentRecord - Loaded Reactions:', {
          totalEntries: entries.length,
          allowedCodesCount: allowedCodes.length,
          sortedCodes,
          allowedCodes,
          catalogMap
        })

        setAllowedReactions(sortedCodes)
        setReactionCatalogMap(catalogMap)
      } catch (error) {
        console.error('Error loading reactions:', error)
      }
    }

    loadReactions()
  }, [context.accessToken, context.reactionCatalogMap, context.allowedReactions])

  // Get the tab parameter to know which tab to return to and determine count type
  const fromTab = useMemo(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') || 'home'
    return tab === 'intranet' ? 'home' : tab
  }, [])

  const queryOptions = useMemo(
    () => ({
      config: 'detail' as const,
      relationLimit: 50
    }),
    []
  )

  const {
    entry: item,
    isLoading,
    error,
    refetch
  } = useContentEntry(contentId, {
    accessToken: context.accessToken,
    queryOptions
  })

  // Translation hook
  const {
    detectedLanguage,
    targetLanguage,
    translatedTexts,
    isTranslating,
    isDetecting,
    detectLanguage,
    setLanguageFromRef,
    translateContent,
    translateComments
  } = useContentTranslation(context.accessToken)

  // Track which content id we already attempted detection for (avoid retry loop when API fails or returns empty)
  const detectionAttemptedForContentIdRef = useRef<string | null>(null)

  // Initial language detection when content is loaded
  // Use existing languageRef if available, otherwise detect from content (once per item)
  useEffect(() => {
    if (!item || isDetecting) return

    // Check if content entry already has a language stored
    if (item.languageRef) {
      setLanguageFromRef(item.languageRef, item.language?.value)
      return
    }
    if (item.language?.id) {
      setLanguageFromRef(item.language.id, item.language.value)
      return
    }
    if (item.content) {
      if (detectedLanguage) return
      const contentId = item.id ?? null
      if (detectionAttemptedForContentIdRef.current === contentId) return
      detectionAttemptedForContentIdRef.current = contentId
      detectLanguage(item.content)
    }
  }, [item, detectedLanguage, isDetecting, detectLanguage, setLanguageFromRef])

  const handleLanguageSelect = async (languageId: string) => {
    if (item) {
      await translateContent(item, languageId)
    }
  }

  const handleBackClick = () => {
    const url = buildPlatformUrl('/platform/content/intranet', { tab: fromTab })
    navigateTo(url)
  }

  // Check if contentId is missing or empty
  if (!contentId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <Alert variant="destructive">
            <AlertTitle>{t('content_id_required')}</AlertTitle>
            <AlertDescription>
              <Button onClick={handleBackClick} variant="outline" className="gba:mt-2">
                {t('go_back')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-screen">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="gba:p-6 gba:max-w-4xl gba:mx-auto" data-testid="content-record-error">
        <Alert variant="destructive">
          <AlertTitle>{item ? t('error_loading_content') : t('content_not_found')}</AlertTitle>
          <AlertDescription>
            <Button onClick={handleBackClick} variant="outline" className="gba:mt-2">
              {t('go_back')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Policy entries have their own back button and translate button inside the hero
  const isPolicy = isPolicyContentEntry(item as any)

  return (
    <div className="gba:min-h-screen gba:bg-background gba:pb-10" data-testid="content-record">
      {/* Back Button and Translation Button – hidden for policy view (handled inside hero) */}
      {!isPolicy && (
        <div className="gba:max-w-[1000px] gba:mx-auto gba:pt-6 gba:px-4 gba:flex gba:justify-between gba:items-center">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="gba:mb-4"
            data-testid="content-record-back-button"
          >
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('back_to_overview')}
          </Button>
          <AiTranslationButton
            detectedLanguage={detectedLanguage}
            targetLanguage={targetLanguage}
            isDetecting={isDetecting}
            isTranslating={isTranslating}
            accessToken={context.accessToken}
            onLanguageSelect={handleLanguageSelect}
            labels={{
              language: t('ai-translation-language'),
              detecting: t('ai-translation-detecting'),
              translating: t('ai-translation-translating'),
              selectTarget: t('ai-translation-select-target'),
              searchPlaceholder: t('ai-translation-search-placeholder'),
              noLanguagesFound: t('ai-translation-no-languages-found'),
              noLanguagesAvailable: t('ai-translation-no-languages-available')
            }}
            data-testid="content-record-translation-button"
          />
        </div>
      )}

      {/* Content Page */}
      <ContentPage
        item={item}
        accessToken={context.accessToken}
        userId={context.userInfo?.id}
        employeeId={context.userInfo?.employeeDetails?.employeeId}
        additionalData={context.additionalData}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
        detectedLanguage={detectedLanguage}
        targetLanguage={targetLanguage}
        translatedTexts={translatedTexts}
        isTranslating={isTranslating}
        isDetecting={isDetecting}
        onTranslateComments={translateComments}
        onReactionSuccess={refetch}
        onEntryUpdated={refetch}
        onBackClick={handleBackClick}
        onLanguageSelect={handleLanguageSelect}
      />
    </div>
  )
}

export default ContentRecord
