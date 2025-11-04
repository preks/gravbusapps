import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { useContentEntry } from '@/common/data/content'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ContentPage from './components/ContentPage'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import translations from './_i18n'

export interface ContentRecordProps extends BusinessAppContextProps {
  contentId?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const CATALOG_IDENTIFIER = 'ContentReaction'
const CATALOG_VERSION = 'v1'

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
            catalogIdentifier: CATALOG_IDENTIFIER,
            version: CATALOG_VERSION
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
            if (entry.id === 'ContentReaction:v1:+1') {
              catalogMap['+1'] = entry.id
            } else if (entry.id === 'ContentReaction:v1:-1') {
              catalogMap['-1'] = entry.id
            }
          }
        })

        // Sort emoji codes by display order
        const sortedCodes = [...allowedCodes].sort((a, b) => {
          const entryA = entries.find((e: any) => e.additionalValue2 === a)
          const entryB = entries.find((e: any) => e.additionalValue2 === b)
          return (entryA?.displayOrder || 0) - (entryB?.displayOrder || 0)
        })

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
    return new URLSearchParams(window.location.search).get('tab') || 'intranet'
  }, [])

  // Questions use child count (direct answers only), everything else uses descendant count (all nested)
  const useChildCount = fromTab === 'questions'

  const {
    entry: item,
    isLoading,
    error
  } = useContentEntry(contentId, {
    accessToken: context.accessToken,
    useChildCount
  })

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
          <AlertTitle>{!item ? t('content_not_found') : t('error_loading_content')}</AlertTitle>
          <AlertDescription>
            <Button onClick={handleBackClick} variant="outline" className="gba:mt-2">
              {t('go_back')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:min-h-screen gba:bg-background gba:pb-10" data-testid="content-record">
      {/* Back Button */}
      <div className="gba:max-w-[1000px] gba:mx-auto gba:pt-6 gba:px-4">
        <Button variant="ghost" onClick={handleBackClick} className="gba:mb-4" data-testid="content-record-back-button">
          <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('back_to_overview')}
        </Button>
      </div>

      {/* Content Page */}
      <ContentPage
        item={item}
        accessToken={context.accessToken}
        userId={context.userInfo?.id}
        employeeId={context.userInfo?.employeeDetails?.employeeId}
        allowedReactions={allowedReactions}
        reactionCatalogMap={reactionCatalogMap}
      />
    </div>
  )
}

export default ContentRecord
