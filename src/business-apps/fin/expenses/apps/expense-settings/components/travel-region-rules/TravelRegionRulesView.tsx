import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TravelRegionSetCardView from './TravelRegionSetCardView'
import TravelRegionMatrixView from './TravelRegionMatrixView'
import UnassignedRulesView from './UnassignedRulesView'
import DataIntegrityChecker from './DataIntegrityChecker'

export interface TravelRegionRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

type ViewMode = 'sets' | 'matrix' | 'unassigned' | 'integrity'

interface SelectedSet {
  id: string
  name: string
}

// Helper to get view state from URL
const getViewStateFromUrl = (): { viewMode: ViewMode; selectedSet: SelectedSet | null } => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const mode = urlParams.get('viewMode') as ViewMode
  const setId = urlParams.get('setId')
  const setName = urlParams.get('setName')

  if (mode === 'matrix' && setId && setName) {
    return { viewMode: 'matrix', selectedSet: { id: setId, name: setName } }
  }

  if (mode === 'unassigned') {
    return { viewMode: 'unassigned', selectedSet: null }
  }

  if (mode === 'integrity') {
    return { viewMode: 'integrity', selectedSet: null }
  }

  return { viewMode: 'sets', selectedSet: null }
}

// Helper to update URL with view state
const updateUrlWithViewState = (viewMode: ViewMode, selectedSet: SelectedSet | null) => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  // Clear old parameters
  urlParams.delete('viewMode')
  urlParams.delete('setId')
  urlParams.delete('setName')
  urlParams.delete('matrixPage') // Clear matrix page when switching views

  if (viewMode === 'matrix' && selectedSet) {
    urlParams.set('viewMode', 'matrix')
    urlParams.set('setId', selectedSet.id)
    urlParams.set('setName', selectedSet.name)
  } else if (viewMode === 'unassigned') {
    urlParams.set('viewMode', 'unassigned')
  } else if (viewMode === 'integrity') {
    urlParams.set('viewMode', 'integrity')
  }
  // For 'sets' view, we don't set any parameters (clean URL)

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

const TravelRegionRulesView: React.FC<TravelRegionRulesViewProps> = context => {
  const { prefixDataTestId = '' } = context

  // Initialize from URL
  const initialState = getViewStateFromUrl()
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.viewMode)
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(initialState.selectedSet)

  // Update URL whenever view state changes
  useEffect(() => {
    updateUrlWithViewState(viewMode, selectedSet)
  }, [viewMode, selectedSet])

  const handleSelectSet = (setId: string, setName: string) => {
    setSelectedSet({ id: setId, name: setName })
    setViewMode('matrix')
  }

  const handleViewUnassigned = () => {
    setViewMode('unassigned')
  }

  const handleViewIntegrity = () => {
    setViewMode('integrity')
  }

  const handleBackToSets = () => {
    setSelectedSet(null)
    setViewMode('sets')
  }

  // Render based on current view mode
  switch (viewMode) {
    case 'matrix':
      return selectedSet ? (
        <TravelRegionMatrixView
          {...context}
          prefixDataTestId={prefixDataTestId}
          travelRegionSetId={selectedSet.id}
          travelRegionSetName={selectedSet.name}
          onBack={handleBackToSets}
        />
      ) : null

    case 'unassigned':
      return <UnassignedRulesView {...context} prefixDataTestId={prefixDataTestId} onBack={handleBackToSets} />

    case 'integrity':
      return (
        <div className="gba:p-6">
          <DataIntegrityChecker {...context} prefixDataTestId={prefixDataTestId} />
        </div>
      )

    case 'sets':
    default:
      return (
        <TravelRegionSetCardView
          {...context}
          prefixDataTestId={prefixDataTestId}
          onSelectSet={handleSelectSet}
          onViewUnassigned={handleViewUnassigned}
          onViewIntegrity={handleViewIntegrity}
        />
      )
  }
}

export default TravelRegionRulesView
