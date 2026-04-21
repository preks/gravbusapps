/**
 * Data Import App
 * Main entry point for CRM data import functionality
 * Supports multiple entity types: Lead, Contact, Account, Opportunity
 */

import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataImportLayout } from '@/common/components/common-relations/apps/data-import'
import { createCrmDataImportConfig } from './config/crmDataImportConfig'
import translations from './_i18n'

export type DataImportProps = BusinessAppContextProps

export const DataImport: React.FC<DataImportProps> = props => {
  const { t } = useTranslation(translations)
  const config = useMemo(
    () =>
      createCrmDataImportConfig({
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
        }
      }),
    [t]
  )

  return <DataImportLayout config={config} {...props} />
}

export default DataImport
