import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@newwork/nw-design-system'
import { Handshake, TrendUp } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineOverview } from './components/PipelineOverview'

export interface PipelineDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'PipelineData'

const PipelineData: React.FC<PipelineDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()

  // Get sourceApp from URL params - required for this app to work
  const urlParams = new URLSearchParams(window.location.search)
  const sourceApp = urlParams.get('sourceApp') as 'CRM' | 'IRM' | null

  // Validate sourceApp parameter
  useEffect(() => {
    if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
      console.error('PipelineData requires sourceApp parameter (CRM or IRM)')
    }
  }, [sourceApp])

  // Default to CRM if no valid sourceApp parameter
  const validSourceApp: 'CRM' | 'IRM' = sourceApp && ['CRM', 'IRM'].includes(sourceApp) ? sourceApp : 'CRM'

  // Determine title, description and icon based on sourceApp
  const getAppConfig = () => {
    switch (validSourceApp) {
      case 'IRM':
        return {
          title: t('crm.investment_pipeline_management', 'Investment Pipeline Management'),
          description: t(
            'crm.investment_pipeline_description',
            'Manage investment pipeline stages, probabilities, and conversion rates'
          ),
          icon: TrendUp,
          variant: 'premium' as const
        }
      case 'CRM':
      default:
        return {
          title: t('crm.sales_pipeline_management', 'Sales Pipeline Management'),
          description: t(
            'crm.sales_pipeline_description',
            'Manage sales pipeline stages, probabilities, and conversion rates'
          ),
          icon: Handshake,
          variant: 'strategy' as const
        }
    }
  }

  const { title, description, icon, variant } = getAppConfig()

  return (
    <div
      className={`gba:h-full gba:w-full ${className || ''}`}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
    >
      <PageLayout
        headerPhosphorIcon={{
          icon: icon,
          variant: variant,
          size: 'lg',
          label: title
        }}
        headerTitle={title}
        headerDescription={description}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">
          <PipelineOverview
            {...contextProps}
            sourceApp={validSourceApp}
            prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
          />
        </div>
      </PageLayout>
    </div>
  )
}

export default PipelineData
export { PipelineData }
