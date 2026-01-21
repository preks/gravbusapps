import React, { useCallback } from 'react'
import { Alert, Spinner, PageLayout, Button, EmptyState } from '@newwork/nw-design-system'
import { DatabaseIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentCatalogData,
  InvestmentCatalogData
} from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { GroupTypeSelector, ConfigurationNav, ConfigurationContent } from './components'
import { CatalogEntryWithConfig, FieldGroup, ProspectField, TileField } from './types'
import { useInvestmentConfiguration, useInvestmentDataSave, mapCatalogEntryToTyped } from '../../hooks'
import { useInvestmentDataPageState, useCatalogDataLoader } from './hooks'

interface InvestmentDataPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'investment-data-page'

const InvestmentDataPage: React.FC<InvestmentDataPageProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onBack,
  prefixDataTestId
}) => {
  const businessContext = { accessToken, userInfo, additionalData }
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(businessContext)

  const {
    targetLevel,
    setTargetLevel,
    selectedGroup,
    setSelectedGroup,
    selectedType,
    setSelectedType,
    selectedEntry,
    setSelectedEntry,
    catalogData,
    setCatalogData,
    configSection,
    setConfigSection,
    getTypesForGroup
  } = useInvestmentDataPageState()

  const { configuration, isInherited, setConfiguration, setIsInherited } = useInvestmentConfiguration({
    selectedEntry,
    selectedGroup,
    targetLevel
  })

  const { saveConfiguration, isSaving, error } = useInvestmentDataSave({
    accessToken,
    fetchCatalogData: fetchInvestmentCatalogData
  })

  const handleDataLoaded = useCallback(
    (data: InvestmentCatalogData) => {
      setCatalogData(data)
    },
    [setCatalogData]
  )

  const handleGroupSelected = useCallback(
    (group: CatalogEntryWithConfig) => {
      setSelectedGroup(group)
    },
    [setSelectedGroup]
  )

  const handleEntrySelected = useCallback(
    (entry: CatalogEntryWithConfig) => {
      setSelectedEntry(entry)
    },
    [setSelectedEntry]
  )

  const { isLoading, error: loadError } = useCatalogDataLoader({
    accessToken,
    fetchInvestmentCatalogData,
    onDataLoaded: handleDataLoaded,
    onGroupSelected: handleGroupSelected,
    onEntrySelected: handleEntrySelected
  })

  const handleSave = async () => {
    if (!selectedEntry) return

    const previousEntry = selectedEntry

    try {
      const updatedEntry = await saveConfiguration({
        selectedEntry,
        targetLevel,
        configuration,
        isInherited
      })

      if (updatedEntry) {
        const data = await fetchInvestmentCatalogData()
        setCatalogData(data)
        setSelectedEntry(updatedEntry)
      }
    } catch (err) {
      console.error('Failed to save or reload configuration:', err)

      // Restore previous state on error to maintain UI consistency
      setSelectedEntry(previousEntry)

      // Log detailed error information
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          selectedEntry: previousEntry?.id,
          targetLevel
        })
      }
    }
  }

  const handleGroupSelect = (group: any) => {
    const groupEntry = mapCatalogEntryToTyped(group)
    setSelectedGroup(groupEntry)
    setSelectedType(null)
    setTargetLevel('group')
    setSelectedEntry(groupEntry)
  }

  const handleTypeSelect = (type: any) => {
    const typeEntry = mapCatalogEntryToTyped(type)
    setSelectedType(typeEntry)
    setTargetLevel('type')
    setSelectedEntry(typeEntry)
  }

  const handleGeneralSelect = () => {
    setTargetLevel('group')
    setSelectedType(null)
    setSelectedEntry(selectedGroup)
  }

  const currentTypes = selectedGroup ? getTypesForGroup(selectedGroup.id) : []

  if (isLoading) {
    return (
      <PageLayout
        headerIcon={DatabaseIcon}
        headerTitle="Investment Data Configuration"
        headerDescription="Configure form fields, prospect fields, and tile fields for investment groups and types"
        onBack={onBack}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
      >
        <div
          className="gba:flex gba:items-center gba:justify-center gba:min-h-96"
          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-loading`}
        >
          <Spinner size="lg" />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      headerIcon={DatabaseIcon}
      headerTitle="Investment Data Configuration"
      headerDescription="Configure form fields, prospect fields, and tile fields for investment groups and types"
      headerContent={
        <Button
          onClick={handleSave}
          disabled={!selectedEntry || isSaving}
          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-save-button`}
        >
          {isSaving ? <Spinner size="sm" /> : <FloppyDiskIcon className="gba:w-4 gba:h-4 gba:mr-2" />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      }
      onBack={onBack}
      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
    >
      {(loadError || error) && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-error`}>
          {loadError || error}
        </Alert>
      )}

      <GroupTypeSelector
        catalogData={catalogData}
        selectedGroup={selectedGroup}
        selectedType={selectedType}
        currentTypes={currentTypes}
        onGroupSelect={handleGroupSelect}
        onTypeSelect={handleTypeSelect}
        onGeneralSelect={handleGeneralSelect}
        prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}`}
      />

      {selectedEntry ? (
        <div className="gba:flex gba:gap-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-config-section`}>
          <ConfigurationNav
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            configSection={configSection}
            formFieldsCount={isInherited.formFields ? 0 : configuration.formFields?.length || 0}
            prospectFieldsCount={isInherited.prospectFields ? 0 : configuration.prospectFields?.length || 0}
            tileFieldsCount={isInherited.tileFields ? 0 : configuration.tileFields?.length || 0}
            onSectionChange={setConfigSection}
            prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}`}
          />

          <ConfigurationContent
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            configSection={configSection}
            formFields={configuration.formFields}
            prospectFields={configuration.prospectFields}
            tileFields={configuration.tileFields}
            onFormFieldsChange={(formFields: FieldGroup[]) => setConfiguration({ ...configuration, formFields })}
            onProspectFieldsChange={(prospectFields: ProspectField[]) =>
              setConfiguration({ ...configuration, prospectFields })
            }
            onTileFieldsChange={(tileFields: TileField[]) => setConfiguration({ ...configuration, tileFields })}
            isFormInherited={isInherited.formFields}
            isProspectInherited={isInherited.prospectFields}
            isTileInherited={isInherited.tileFields}
            inheritedFrom={
              isInherited.formFields || isInherited.prospectFields || isInherited.tileFields
                ? selectedGroup?.value
                : undefined
            }
            onClearFormInheritance={() => {
              setIsInherited({ ...isInherited, formFields: false })
              setConfiguration({ ...configuration, formFields: [] })
            }}
            onClearProspectInheritance={() => {
              setIsInherited({ ...isInherited, prospectFields: false })
              setConfiguration({ ...configuration, prospectFields: [] })
            }}
            onClearTileInheritance={() => {
              setIsInherited({ ...isInherited, tileFields: false })
              setConfiguration({ ...configuration, tileFields: [] })
            }}
            prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}`}
          />
        </div>
      ) : (
        <div className="gba:py-12" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-no-selection`}>
          <EmptyState
            title="Select an investment type"
            description="Choose an investment group and type above to configure its fields"
          />
        </div>
      )}
    </PageLayout>
  )
}

export default InvestmentDataPage
