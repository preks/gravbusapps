import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ViewModeToggleProps {
  viewMode: 'grouped' | 'flat'
  onViewModeChange: (mode: 'grouped' | 'flat') => void
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="gba:flex gba:justify-between">
      <div className="gba:flex gba:border gba:border-gray-300 gba:rounded-md">
        <button
          onClick={() => onViewModeChange('flat')}
          className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-none gba:cursor-pointer ${
            viewMode === 'flat' 
              ? 'gba:bg-blue-500 gba:text-white' 
              : 'gba:bg-white gba:text-gray-700 gba:hover:bg-gray-50'
          }`}
        >
          {getTranslationFromI18nKeyAndLabel('changelog.views.flat', 'Flat View')}
        </button>
        <button
          onClick={() => onViewModeChange('grouped')}
          className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-none gba:cursor-pointer ${
            viewMode === 'grouped' 
              ? 'gba:bg-blue-500 gba:text-white' 
              : 'gba:bg-white gba:text-gray-700 gba:hover:bg-gray-50'
          }`}
        >
          {getTranslationFromI18nKeyAndLabel('changelog.views.grouped', 'Grouped View')}
        </button>
      </div>
    </div>
  )
}

export default ViewModeToggle
