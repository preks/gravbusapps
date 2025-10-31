import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { useContent } from '@/business-apps/core/content/records/content-record/hooks/useContent'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ContentPage from './components/ContentPage'

export interface ContentRecordProps extends BusinessAppContextProps {
  contentId?: string
}

const ContentRecord: React.FC<ContentRecordProps> = context => {
  const { t } = useTranslation('content')

  // Get contentId from props or URL query parameters
  const contentId = useMemo(() => {
    return context.contentId || new URLSearchParams(window.location.search).get('contentId') || ''
  }, [context.contentId])

  // Get the tab parameter to know which tab to return to
  const fromTab = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tab') || 'intranet'
  }, [])

  const { item, isUpdating, error, contentNotFound } = useContent(contentId, context.accessToken)

  const handleBackClick = () => {
    const url = buildPlatformUrl('/platform/core/content-hub', { tab: fromTab })
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
      <ContentPage item={item} accessToken={context.accessToken} userId={context.userInfo?.id} />
    </div>
  )
}

export default ContentRecord
