import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormFieldsEditor } from './FormFieldsEditor'
import { TileFieldsEditor } from './TileFieldsEditor'
import { ProspectFieldsEditor } from './ProspectFieldsEditor'
import { FieldGroup, ProspectField, TileField } from '../types'

interface ConfigurationContentProps extends BusinessAppContextProps {
  configSection: 'form' | 'prospect' | 'tile'
  formFields: FieldGroup[] | undefined
  prospectFields: ProspectField[] | undefined
  tileFields: TileField[] | undefined
  onFormFieldsChange: (fields: FieldGroup[]) => void
  onProspectFieldsChange: (fields: ProspectField[]) => void
  onTileFieldsChange: (fields: TileField[]) => void
  isFormInherited: boolean
  isProspectInherited: boolean
  isTileInherited: boolean
  inheritedFrom?: string
  onClearFormInheritance: () => void
  onClearProspectInheritance: () => void
  onClearTileInheritance: () => void
  prefixDataTestId?: string
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
  isFormInherited,
  isProspectInherited,
  isTileInherited,
  inheritedFrom,
  onClearFormInheritance,
  onClearProspectInheritance,
  onClearTileInheritance,
  prefixDataTestId
}) => {
  return (
    <div className="gba:flex-1" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}>
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
