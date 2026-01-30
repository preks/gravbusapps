/**
 * Data Import App
 * Main entry point for IRM data import functionality
 * Supports multiple entity types: Lead, Contact, Account
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { FileArrowUpIcon, UserIcon, IdentificationCardIcon, BuildingsIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { LeadImportView } from './views/lead-import-view'
import { ContactImportView } from './views/contact-import-view'
import { AccountImportView } from './views/account-import-view'

export type DataImportProps = BusinessAppContextProps

type EntityType = 'lead' | 'contact' | 'account' | null

const VALID_ENTITIES = new Set<EntityType>(['lead', 'contact', 'account'])

// Get initial entity from URL
const getInitialEntity = (): EntityType => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const entity = urlParams.get('entity') as EntityType

  if (entity && VALID_ENTITIES.has(entity)) {
    return entity
  }

  return null
}

// Update URL with entity parameter
const updateUrl = (entity: EntityType) => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  if (entity) {
    urlParams.set('entity', entity)
  } else {
    urlParams.delete('entity')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const DataImport: React.FC<DataImportProps> = props => {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>(getInitialEntity())

  // Handle entity selection with URL update
  const handleEntitySelect = (entity: EntityType) => {
    setSelectedEntity(entity)
    updateUrl(entity)
  }

  // Handle back navigation
  const handleBackToSelector = () => {
    setSelectedEntity(null)
    updateUrl(null)
  }

  // Browser back/forward navigation support
  useEffect(() => {
    const handlePopState = () => {
      setSelectedEntity(getInitialEntity())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // Entity selector view
  if (!selectedEntity) {
    const cards = [
      {
        title: 'Import Leads',
        description:
          'Import investment leads from CSV with company information, investment details, financial data, and property information. AI-powered field mapping helps you quickly map your data.',
        icon: UserIcon,
        iconSize: 'md' as const,
        entries: [
          {
            label: 'Start Lead Import',
            onClick: () => handleEntitySelect('lead')
          }
        ]
      },
      {
        title: 'Import Contacts',
        description:
          'Import individual contacts from CSV with personal information, contact details, and language preferences. AI automatically detects and maps fields.',
        icon: IdentificationCardIcon,
        iconSize: 'md' as const,
        entries: [
          {
            label: 'Start Contact Import',
            onClick: () => handleEntitySelect('contact')
          }
        ]
      },
      {
        title: 'Import Accounts',
        description:
          'Import company accounts from CSV with organization details, industry information, revenue data, and communication channels. AI-powered mapping streamlines the process.',
        icon: BuildingsIcon,
        iconSize: 'md' as const,
        entries: [
          {
            label: 'Start Account Import',
            onClick: () => handleEntitySelect('account')
          }
        ]
      }
    ]

    return (
      <SettingsLayout
        headerPhosphorIcon={{
          icon: FileArrowUpIcon,
          variant: 'info',
          size: 'lg',
          label: 'Data Import'
        }}
        headerLabel="Data Import"
        headerDescription="Import data from CSV files with AI-powered field mapping. Upload your file, review suggested mappings, and import."
        cards={cards}
        searchPlaceholder="Search import types..."
        onBack={() => navigateTo('/platform/use')}
        prefixDataTestId="DataImport"
      />
    )
  }

  // Render selected entity import view
  if (selectedEntity === 'lead') {
    return <LeadImportView {...props} onBack={handleBackToSelector} />
  }

  if (selectedEntity === 'contact') {
    return <ContactImportView {...props} onBack={handleBackToSelector} />
  }

  if (selectedEntity === 'account') {
    return <AccountImportView {...props} onBack={handleBackToSelector} />
  }

  return null
}

export default DataImport
