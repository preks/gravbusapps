import React from 'react'
import { Alert } from '@newwork/nw-design-system'
import { type FolderTemplateEditorProps, type FolderNode } from './types'
import { useFolderTemplateData } from './hooks/useFolderTemplateData'
import { FolderTreeEditor } from './components'

const DATA_TEST_ID = 'folder-template-editor'

export const FolderTemplateEditor: React.FC<FolderTemplateEditorProps> = ({
  accessToken,
  moduleType,
  entityType,
  onSave,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const { folders, isLoading, isSaving, error, saveFolderTemplate } = useFolderTemplateData(
    accessToken,
    moduleType,
    entityType
  )

  const handleSave = async (newFolders: FolderNode[]) => {
    const success = await saveFolderTemplate(newFolders)
    if (success) {
      onSave?.()
    }
    return success
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  const entityLabel = entityType.charAt(0) + entityType.slice(1).toLowerCase()

  return (
    <FolderTreeEditor
      folders={folders}
      title={`Folder Structure for ${entityLabel}s`}
      isLoading={isLoading}
      isSaving={isSaving}
      onSave={handleSave}
      prefixDataTestId={prefixDataTestId}
    />
  )
}

export default FolderTemplateEditor
