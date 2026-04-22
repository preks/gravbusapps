import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EmptyDropZoneProps {
  readonly testIdPrefix: string
  readonly onSelect: () => void
}

export const EmptyDropZone: React.FC<EmptyDropZoneProps> = ({ testIdPrefix, onSelect }) => (
  <>
    {getDocumentIcon({ isFolder: true, size: 32, className: 'gba:h-8 gba:w-8' })}
    <div className="gba:text-sm gba:font-medium">
      {getTranslationFromI18nKeyAndLabel('folderUpload.popup.drop.primary', 'Drop a folder here')}
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        onSelect()
      }}
      data-testid={`${testIdPrefix}-select-folder-button`}
    >
      <span className="gba:mr-1 gba:inline-flex">
        {getDocumentIcon({ isFolder: true, size: 16, className: 'gba:h-4 gba:w-4' })}
      </span>
      {getTranslationFromI18nKeyAndLabel('folderUpload.popup.selectFolder', 'Select folder')}
    </Button>
  </>
)
