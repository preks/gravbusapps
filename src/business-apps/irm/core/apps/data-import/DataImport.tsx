/**
 * Data Import App
 * Main entry point for IRM data import functionality.
 *
 * The multi-entry "Import Investments" card is driven by the
 * `InvestmentGroup` catalog: `useInvestmentImportGroups` fetches the live
 * entries, and `createIrmDataImportConfig` turns them into card entries +
 * routed views via `getGroupImportConfiguration`.
 *
 * Three render branches:
 *  - `isLoading`  → skeleton
 *  - `error`      → destructive Alert with an in-place retry (no page reload)
 *  - otherwise    → the real layout
 *
 * We deliberately avoid rendering cards on fetch failure: without a real
 * catalog id we'd send a synthetic `investmentGroupRef` to the backend
 * and every imported row would be rejected.
 */

import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataImportLayout } from '@/common/components/common-relations/apps/data-import'
import { createIrmDataImportConfig } from './config/irmDataImportConfig'
import { useInvestmentImportGroups } from './hooks/useInvestmentImportGroups'
import { DataImportSkeleton } from './components/DataImportSkeleton'
import { DataImportError } from './components/DataImportError'
import translations from './_i18n'

export type DataImportProps = BusinessAppContextProps

export const DataImport: React.FC<DataImportProps> = props => {
  const { t } = useTranslation(translations)
  const { investmentGroups, isLoading, error, refetch } = useInvestmentImportGroups(props.accessToken)
  const config = useMemo(
    () =>
      createIrmDataImportConfig(investmentGroups, {
        headerLabel: t('data-import-header-title'),
        headerDescription: t('data-import-header-description'),
        searchPlaceholder: t('data-import-search-placeholder'),
        leadCard: {
          title: t('card-lead-title'),
          description: t('card-lead-description'),
          buttonLabel: t('card-lead-button')
        },
        contactCard: {
          title: t('card-contact-title'),
          description: t('card-contact-description'),
          buttonLabel: t('card-contact-button')
        },
        accountCard: {
          title: t('card-account-title'),
          description: t('card-account-description'),
          buttonLabel: t('card-account-button')
        },
        opportunityCard: {
          title: t('card-opportunity-title'),
          description: t('card-opportunity-description'),
          buttonLabel: t('card-opportunity-button')
        },
        investmentsCard: {
          title: t('card-investments-title'),
          description: t('card-investments-description')
        },
        investmentReportsCard: {
          title: t('card-investment-reports-title'),
          description: t('card-investment-reports-description')
        },
        equityRoundsCard: {
          title: t('card-equity-rounds-title'),
          description: t('card-equity-rounds-description'),
          buttonLabel: t('card-equity-rounds-button')
        }
      }),
    [investmentGroups, t]
  )

  if (isLoading) {
    return <DataImportSkeleton data-testid="DataImport-skeleton" />
  }

  if (error) {
    return <DataImportError errorMessage={error} onRetry={refetch} data-testid="DataImport-error" />
  }

  return <DataImportLayout config={config} {...props} />
}

export default DataImport
