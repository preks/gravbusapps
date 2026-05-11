import React from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { UsersThreeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'
import { CatalogTab } from '@/common/components/common-relations/setting-pages/components/CatalogTab'
import {
  getCatalogUsageCheckSpecs,
  useCatalogDeleteAvailability
} from '@/common/components/common-relations/setting-pages/hooks/useCatalogDeleteAvailability'
import translations from './_i18n'

const DATA_TEST_ID = 'InvestmentCompanyExecutiveTypesPage'
const EXECUTIVE_TYPE_CATALOG = 'Legal Entity Executive Type'

export interface InvestmentCompanyExecutiveTypesPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const InvestmentCompanyExecutiveTypesPage: React.FC<InvestmentCompanyExecutiveTypesPageProps> = ({
  prefixDataTestId,
  onBack,
  className,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const executiveTypes = useCatalogSettings(context, EXECUTIVE_TYPE_CATALOG)
  const getExecutiveTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    t('entity-name'),
    getCatalogUsageCheckSpecs(EXECUTIVE_TYPE_CATALOG)
  )

  return (
    <PageLayout
      headerIcon={UsersThreeIcon}
      headerTitle={t('page-title')}
      headerDescription={t('page-description')}
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
    >
      <CatalogTab
        entityName={t('entity-name')}
        dataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}-ExecutiveTypes`}
        getDeleteAvailability={getExecutiveTypeDeleteAvailability}
        {...executiveTypes}
      />
    </PageLayout>
  )
}

export default InvestmentCompanyExecutiveTypesPage
