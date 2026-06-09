import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FileArrowDownIcon } from '@phosphor-icons/react'
import { ExportEntitySelectorPage } from './components/ExportEntitySelectorPage'
import { DataExportConfig } from './types/configTypes'

export interface DataExportLayoutProps extends BusinessAppContextProps {
  config: DataExportConfig
  onBack?: () => void
}

const getInitialEntity = (validEntityTypes: Set<string>): string | null => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const entity = urlParams.get('entity')

  if (entity && validEntityTypes.has(entity)) {
    return entity
  }

  return null
}

const updateEntityUrl = (entity: string | null, pageKey: string) => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  urlParams.set('page', pageKey)

  if (entity) {
    urlParams.set('entity', entity)
  } else {
    urlParams.delete('entity')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const DataExportLayout: React.FC<DataExportLayoutProps> = ({ config, onBack, ...context }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(() => getInitialEntity(config.validEntityTypes))

  const handleEntitySelect = (entity: string) => {
    setSelectedEntity(entity)
    updateEntityUrl(entity, 'data-export')
  }

  const handleBackToSelector = () => {
    setSelectedEntity(null)
    updateEntityUrl(null, 'data-export')
  }

  useEffect(() => {
    const handlePopState = () => {
      setSelectedEntity(getInitialEntity(config.validEntityTypes))
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [config.validEntityTypes])

  if (!selectedEntity) {
    return (
      <ExportEntitySelectorPage
        headerIcon={FileArrowDownIcon}
        headerLabel={config.headerLabel}
        headerDescription={config.headerDescription}
        searchPlaceholder={config.searchPlaceholder}
        prefixDataTestId={config.prefixDataTestId}
        items={config.entityItems}
        onSelectEntity={handleEntitySelect}
        onBack={onBack}
        iconVariant="info"
      />
    )
  }

  const EntityView = config.entityViews[selectedEntity]

  if (!EntityView) {
    return null
  }

  return <EntityView {...context} onBack={handleBackToSelector} />
}

export default DataExportLayout
