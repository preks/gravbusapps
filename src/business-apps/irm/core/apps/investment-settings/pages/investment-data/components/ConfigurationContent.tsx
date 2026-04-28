import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormFieldsEditor } from './FormFieldsEditor'
import { TileFieldsEditor } from './TileFieldsEditor'
import { ProspectFieldsEditor } from './ProspectFieldsEditor'
import { ConfigurationScopeSummary } from './ConfigurationScopeSummary'
import { CatalogEntryWithConfig, FieldGroup, ProspectField, RequiredSubtypeKey, TargetLevel, TileField } from '../types'

interface ConfigurationContentProps extends BusinessAppContextProps {
  configSection: 'form' | 'prospect' | 'tile'
  formFields: FieldGroup[] | undefined
  prospectFields: ProspectField[] | undefined
  tileFields: TileField[] | undefined
  onFormFieldsChange: (fields: FieldGroup[]) => void
  onProspectFieldsChange: (fields: ProspectField[]) => void
  onTileFieldsChange: (fields: TileField[]) => void
  targetLevel: TargetLevel
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
  selectedLiquidFundType: CatalogEntryWithConfig | null
  isFormInherited: boolean
  isProspectInherited: boolean
  isTileInherited: boolean
  inheritedFrom?: string
  onClearFormInheritance: () => void
  onClearProspectInheritance: () => void
  onClearTileInheritance: () => void
  prefixDataTestId?: string
  requiredSubtypeKey: RequiredSubtypeKey
  onRequiredSubtypeKeyChange: (key: RequiredSubtypeKey) => void
}

const DATA_TEST_ID = 'configuration-content'

export const ConfigurationContent: React.FC<ConfigurationContentProps> = ({
  accessToken,
  userInfo,
  additionalData,
  configSection,
  formFields,
  prospectFields,
  tileFields,
  onFormFieldsChange,
  onProspectFieldsChange,
  onTileFieldsChange,
  targetLevel,
  selectedGroup,
  selectedType,
  selectedLiquidFundType,
  isFormInherited,
  isProspectInherited,
  isTileInherited,
  inheritedFrom,
  onClearFormInheritance,
  onClearProspectInheritance,
  onClearTileInheritance,
  prefixDataTestId,
  requiredSubtypeKey,
  onRequiredSubtypeKeyChange
}) => {
  const inheritedSections = [
    isFormInherited ? 'form fields' : null,
    isProspectInherited ? 'prospect fields' : null,
    isTileInherited ? 'tile fields' : null
  ].filter(Boolean) as string[]

  return (
    <div className="gba:flex-1 gba:space-y-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}>
      <ConfigurationScopeSummary
        targetLevel={targetLevel}
        selectedGroup={selectedGroup}
        selectedType={selectedType}
        selectedLiquidFundType={selectedLiquidFundType}
        inheritedSections={inheritedSections}
        inheritedFrom={inheritedFrom}
        prefixDataTestId={prefixDataTestId}
      />

      {configSection === 'form' && (
        <FormFieldsEditor
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          fieldGroups={formFields || []}
          onChange={onFormFieldsChange}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-form-editor`}
          isInherited={isFormInherited}
          inheritedFrom={inheritedFrom}
          onClearInheritance={onClearFormInheritance}
          requiredSubtypeKey={requiredSubtypeKey}
          onRequiredSubtypeKeyChange={onRequiredSubtypeKeyChange}
        />
      )}

      {configSection === 'prospect' && (
        <ProspectFieldsEditor
          prospectFields={prospectFields || []}
          onChange={onProspectFieldsChange}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-prospect-editor`}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          isInherited={isProspectInherited}
          inheritedFrom={inheritedFrom}
          onClearInheritance={onClearProspectInheritance}
        />
      )}

      {configSection === 'tile' && (
        <TileFieldsEditor
          tileFields={tileFields || []}
          onChange={onTileFieldsChange}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-tile-editor`}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          isInherited={isTileInherited}
          inheritedFrom={inheritedFrom}
          onClearInheritance={onClearTileInheritance}
        />
      )}
    </div>
  )
}
