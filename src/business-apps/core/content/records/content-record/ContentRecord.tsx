import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { useContent } from '@/business-apps/core/content/records/content-record/hooks/useContent'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ContentPage from './components/ContentPage'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface ContentRecordProps extends BusinessAppContextProps {
  contentId?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const CATALOG_IDENTIFIER = 'ContentReaction'
const CATALOG_VERSION = 'v1'

const ContentRecord: React.FC<ContentRecordProps> = context => {
  const { t } = useTranslation('content')
  const catalogClient = useCatalogManagerClient(context.accessToken)
  const [reactionCatalogMap, setReactionCatalogMap] = useState<Record<string, string>>(context.reactionCatalogMap || {})
  const [allowedReactions, setAllowedReactions] = useState<string[]>(context.allowedReactions || [])

  // Get contentId from props or URL query parameters
  const contentId = useMemo(() => {
    return context.contentId || new URLSearchParams(window.location.search).get('contentId') || ''
  }, [context.contentId])

  // Load allowed reactions if not provided
  useEffect(() => {
    if (context.reactionCatalogMap && context.allowedReactions) {
      return // Already provided
    }

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

        const entries = (response as any).catalogEntries || []

        // Build map: unified code -> catalog entry ID
        const catalogMap: Record<string, string> = {}
        const reactions: string[] = []

        entries.forEach((entry: any) => {
          const unifiedCode = entry.additionalValue2
          if (unifiedCode && entry.id) {
            catalogMap[unifiedCode] = entry.id
            reactions.push(unifiedCode)
          }
        })

        setReactionCatalogMap(catalogMap)
        setAllowedReactions(reactions)
      } catch (error) {
        console.error('Error loading reactions:', error)
      }
    }

    loadReactions()
  }, [context.accessToken, context.reactionCatalogMap, context.allowedReactions])

  // Get the tab parameter to know which tab to return to
  const fromTab = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tab') || 'intranet'
  }, [])

  const { item, isUpdating, error, contentNotFound } = useContent(contentId, context.accessToken)

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

  if (isUpdating) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-screen">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  if (error || contentNotFound) {
    return (
      <div className="gba:p-6 gba:max-w-4xl gba:mx-auto" data-testid="content-record-error">
        <Alert variant="destructive">
          <AlertTitle>{contentNotFound ? t('content_not_found') : t('error_loading_content')}</AlertTitle>
          <AlertDescription>
            <Button onClick={handleBackClick} variant="outline" className="gba:mt-2">
              {t('go_back')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!item) {
    return null
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
