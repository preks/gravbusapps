import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Spinner, PageLayout, Button, EmptyState } from '@newwork/nw-design-system'
import { DatabaseIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentCatalogData,
  InvestmentCatalogData
} from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { GroupTypeSelector, ConfigurationNav, ConfigurationContent } from './components'
import { CatalogEntryRaw, CatalogEntryWithConfig, FieldGroup, ProspectField, TileField } from './types'
import { useInvestmentConfiguration, useInvestmentDataSave, mapCatalogEntryToTyped } from '../../hooks'
import { useInvestmentDataPageState, useCatalogDataLoader } from './hooks'
import { validateInvestmentFormFieldsForLayout } from './utils/investmentFormFieldValidation'
import { coerceRequiredSubtypeKey, DEFAULT_REQUIRED_SUBTYPE_KEY } from './utils/formLayoutChoice'

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
    selectedGroup,
    selectedType,
    selectedLiquidFundType,
    selectedEntry,
    setSelectedGroup,
    setSelectedEntry,
    catalogData,
    setCatalogData,
    configSection,
    setConfigSection,
    selectGroup,
    selectType,
    selectLiquidFundType,
    selectGeneralGroupSettings,
    getTypesForGroup,
    getLiquidFundTypesForType
  } = useInvestmentDataPageState()

  const { configuration, isInherited, setConfiguration, setIsInherited } = useInvestmentConfiguration({
    selectedEntry,
    selectedGroup,
    selectedType,
    targetLevel
  })

  const { saveConfiguration, isSaving, error } = useInvestmentDataSave({
    accessToken,
    fetchCatalogData: fetchInvestmentCatalogData
  })

  const [formLayoutSaveError, setFormLayoutSaveError] = useState<string | null>(null)

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

    const formValidation = validateInvestmentFormFieldsForLayout(
      configuration.formFields || [],
      coerceRequiredSubtypeKey(configuration.requiredSubtypeKey)
    )
    if (!formValidation.valid) {
      setFormLayoutSaveError(formValidation.issues.map(i => `${i.property || '(empty)'}: ${i.message}`).join(' | '))
      setConfigSection('form')
      return
    }
    setFormLayoutSaveError(null)

    try {
      const updatedEntry = await saveConfiguration({
        selectedEntry,
        targetLevel,
        configuration,
        isInherited
      })

      if (updatedEntry) {
        setFormLayoutSaveError(null)
        const data = await fetchInvestmentCatalogData()
        setCatalogData(data)
        setSelectedEntry(updatedEntry)
      }
    } catch (err) {
      // Restore previous state on error to maintain UI consistency.
      setSelectedEntry(previousEntry)

      const context = {
        selectedEntry: previousEntry?.id,
        targetLevel,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }
      console.error('Failed to save or reload configuration:', err, context)
    }
  }

  const handleGroupSelect = (group: CatalogEntryRaw) => {
    selectGroup(mapCatalogEntryToTyped(group))
  }

  const handleTypeSelect = (type: CatalogEntryRaw) => {
    selectType(mapCatalogEntryToTyped(type))
  }

  const handleLiquidFundTypeSelect = (liquidFundType: CatalogEntryRaw) => {
    selectLiquidFundType(mapCatalogEntryToTyped(liquidFundType))
  }

  const handleGeneralSelect = () => {
    selectGeneralGroupSettings()
  }

  const currentTypes = useMemo(
    () => (selectedGroup ? getTypesForGroup(selectedGroup.id) : []),
    [selectedGroup, getTypesForGroup]
  )
  const currentLiquidFundTypes = useMemo(
    () => (selectedType ? getLiquidFundTypesForType(selectedType.id) : []),
    [selectedType, getLiquidFundTypesForType]
  )

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
      {(loadError || error || formLayoutSaveError) && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-error`}>
          {loadError || error || formLayoutSaveError}
        </Alert>
      )}

      <div
        className="gba:sticky gba:top-0 gba:z-50 gba:isolate gba:bg-background gba:py-2 -gba:mx-1 gba:px-1 gba:border-b gba:border-border gba:shadow-sm"
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-selector-sticky`}
      >
        <GroupTypeSelector
          catalogData={catalogData}
          selectedGroup={selectedGroup}
          selectedType={selectedType}
          selectedLiquidFundType={selectedLiquidFundType}
          currentTypes={currentTypes}
          currentLiquidFundTypes={currentLiquidFundTypes}
          onGroupSelect={handleGroupSelect}
          onTypeSelect={handleTypeSelect}
          onLiquidFundTypeSelect={handleLiquidFundTypeSelect}
          onGeneralSelect={handleGeneralSelect}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}`}
        />
      </div>

      {selectedEntry ? (
        <div className="gba:mt-6 gba:flex gba:gap-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-config-section`}>
          <ConfigurationNav
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            configSection={configSection}
            formFieldsCount={configuration.formFields?.length || 0}
            prospectFieldsCount={configuration.prospectFields?.length || 0}
            tileFieldsCount={configuration.tileFields?.length || 0}
            isFormInherited={isInherited.formFields}
            isProspectInherited={isInherited.prospectFields}
            isTileInherited={isInherited.tileFields}
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
            targetLevel={targetLevel}
            selectedGroup={selectedGroup}
            selectedType={selectedType}
            selectedLiquidFundType={selectedLiquidFundType}
            isFormInherited={isInherited.formFields}
            isProspectInherited={isInherited.prospectFields}
            isTileInherited={isInherited.tileFields}
            inheritedFrom={
              isInherited.formFields || isInherited.prospectFields || isInherited.tileFields
                ? targetLevel === 'liquidFundType'
                  ? selectedType?.value
                  : selectedGroup?.value
                : undefined
            }
            onClearFormInheritance={() => {
              setIsInherited({ ...isInherited, formFields: false })
              setConfiguration({ ...configuration, formFields: [], requiredSubtypeKey: DEFAULT_REQUIRED_SUBTYPE_KEY })
            }}
            onClearProspectInheritance={() => {
              setIsInherited({ ...isInherited, prospectFields: false })
              setConfiguration({ ...configuration, prospectFields: [] })
            }}
            onClearTileInheritance={() => {
              setIsInherited({ ...isInherited, tileFields: false })
              setConfiguration({ ...configuration, tileFields: [] })
            }}
            requiredSubtypeKey={coerceRequiredSubtypeKey(configuration.requiredSubtypeKey)}
            onRequiredSubtypeKeyChange={key => setConfiguration({ ...configuration, requiredSubtypeKey: key })}
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
