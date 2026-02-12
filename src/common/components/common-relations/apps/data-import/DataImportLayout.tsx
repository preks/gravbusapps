import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { FileArrowUpIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { DataImportConfig } from './types/configTypes'

export interface DataImportLayoutProps extends BusinessAppContextProps {
  config: DataImportConfig
}

// Get initial entity from URL
const getInitialEntity = (validEntityTypes: Set<string>): string | null => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const entity = urlParams.get('entity')

  if (entity && validEntityTypes.has(entity)) {
    return entity
  }

  return null
}

// Update URL with entity parameter
const updateUrl = (entity: string | null) => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  if (entity) {
    urlParams.set('entity', entity)
  } else {
    urlParams.delete('entity')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const DataImportLayout: React.FC<DataImportLayoutProps> = ({ config, ...context }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(() => getInitialEntity(config.validEntityTypes))

  // Handle entity selection with URL update
  const handleEntitySelect = (entity: string) => {
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
      setSelectedEntity(getInitialEntity(config.validEntityTypes))
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [config.validEntityTypes])

  // Inject onClick handlers into entity cards
  const cardsWithHandlers = config.entityCards.map(card => ({
    ...card,
    entries: card.entries.map(entry => ({
      label: entry.label,
      onClick: () => handleEntitySelect(entry.entityType)
    }))
  }))

  // Entity selector view
  if (!selectedEntity) {
    return (
      <SettingsLayout
        headerPhosphorIcon={{
          icon: FileArrowUpIcon,
          variant: 'info',
          size: 'lg',
          label: config.headerLabel
        }}
        headerLabel={config.headerLabel}
        headerDescription={config.headerDescription}
        cards={cardsWithHandlers}
        searchPlaceholder={config.searchPlaceholder}
        onBack={() => navigateTo(config.backUrl)}
        prefixDataTestId={config.prefixDataTestId}
      />
    )
  }

  // Render selected entity import view
  const EntityView = config.entityViews[selectedEntity]

  if (!EntityView) {
    return null
  }

  return <EntityView {...context} onBack={handleBackToSelector} />
}

export default DataImportLayout
