import React from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { AppWindow, FolderTree } from 'lucide-react'
import { FlowTags } from '@/business-apps/flow/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCatalogLoader } from './hooks/useCatalogLoader'
import { handleAppChange, handleCategoryChange } from './utils/tagHandlers'
import { formatCatalogEntry, createCatalogValue } from './utils/catalogFormatters'

interface TagConfigurationProps {
  tags?: FlowTags
  onTagsChange: (tags: FlowTags) => void
  accessToken: string
  'data-testid'?: string
}

export const TagConfiguration: React.FC<TagConfigurationProps> = ({
  tags = {},
  onTagsChange,
  accessToken,
  'data-testid': testId = 'tag-configuration'
}) => {
  // Current tag values - handle both string and array formats
  const selectedApp = tags.app || ''
  const selectedServiceCategory = Array.isArray(tags.serviceCategory)
    ? tags.serviceCategory[0] || ''
    : tags.serviceCategory || ''
  const selectedDigitalWorkplaceCategory = Array.isArray(tags.digitalWorkplaceCategory)
    ? tags.digitalWorkplaceCategory[0] || ''
    : tags.digitalWorkplaceCategory || ''
  const isServicePortalSelected = selectedApp === 'AppCatalog:1:SVC'
  const isDigitalWorkplaceSelected = selectedApp === 'AppCatalog:1:DWP'

  // Load catalogs using the custom hook
  const {
    entries: appCatalogEntries,
    isLoading: isLoadingApps,
    error: appError
  } = useCatalogLoader({
    catalogIdentifier: 'AppCatalog',
    accessToken,
    enabled: true
  })

  const {
    entries: serviceCategoryEntries,
    isLoading: isLoadingServiceCategories,
    error: serviceCategoryError
  } = useCatalogLoader({
    catalogIdentifier: 'ServicePortalCategory',
    accessToken,
    enabled: isServicePortalSelected
  })

  const {
    entries: digitalWorkplaceCategoryEntries,
    isLoading: isLoadingDigitalWorkplaceCategories,
    error: digitalWorkplaceCategoryError
  } = useCatalogLoader({
    catalogIdentifier: 'DigitalWorkplaceFlowCategory',
    accessToken,
    enabled: isDigitalWorkplaceSelected
  })

  // Combine errors
  const error = appError || serviceCategoryError || digitalWorkplaceCategoryError

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {error && (
        <div className="gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md">
          <p className="gba:text-sm gba:text-red-800">{error}</p>
        </div>
      )}

      {/* App Selection */}
      <div className="gba:space-y-2">
        <Label htmlFor="app-select" className="gba:flex gba:items-center gba:gap-2">
          <AppWindow className="gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('flow.creator.tags.app', 'Application')}
        </Label>
        <Select
          value={selectedApp || '__NONE__'}
          onValueChange={value => handleAppChange(value, tags, onTagsChange)}
          disabled={isLoadingApps}
        >
          <SelectTrigger id="app-select" className="gba:w-full" data-testid={`${testId}-app-select`}>
            <SelectValue placeholder={isLoadingApps ? 'Loading applications...' : 'Select an application'} />
          </SelectTrigger>
          <SelectContent>
            {/* Clear selection option */}
            <SelectItem value="__NONE__">
              <span className="gba:text-gray-500">None selected</span>
            </SelectItem>

            {/* Loading state */}
            {isLoadingApps && (
              <SelectItem value="__LOADING__" disabled>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  <span>Loading applications...</span>
                </div>
              </SelectItem>
            )}

            {/* App options */}
            {appCatalogEntries.map(entry => (
              <SelectItem
                key={entry.id}
                value={createCatalogValue('AppCatalog', '1', entry.code)}
                data-testid={`${testId}-app-option-${entry.code}`}
              >
                {formatCatalogEntry(entry)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service Category Selection - Only shown when Service Portal is selected */}
      {isServicePortalSelected && (
        <div className="gba:space-y-2">
          <Label htmlFor="service-category-select" className="gba:flex gba:items-center gba:gap-2">
            <FolderTree className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('flow.creator.tags.serviceCategory', 'Service Category')}
          </Label>
          <Select
            value={selectedServiceCategory || '__NONE__'}
            onValueChange={value => handleCategoryChange(value, 'serviceCategory', tags, onTagsChange)}
            disabled={isLoadingServiceCategories}
          >
            <SelectTrigger
              id="service-category-select"
              className="gba:w-full"
              data-testid={`${testId}-service-category-select`}
            >
              <SelectValue
                placeholder={isLoadingServiceCategories ? 'Loading service categories...' : 'Select a service category'}
              />
            </SelectTrigger>
            <SelectContent>
              {/* Clear selection option */}
              <SelectItem value="__NONE__">
                <span className="gba:text-gray-500">None selected</span>
              </SelectItem>

              {/* Loading state */}
              {isLoadingServiceCategories && (
                <SelectItem value="__LOADING__" disabled>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Spinner size="sm" />
                    <span>Loading service categories...</span>
                  </div>
                </SelectItem>
              )}

              {/* Service category options */}
              {serviceCategoryEntries.map(entry => (
                <SelectItem
                  key={entry.id}
                  value={createCatalogValue('ServicePortalCategory', '1', entry.code)}
                  data-testid={`${testId}-service-category-option-${entry.code}`}
                >
                  {formatCatalogEntry(entry)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Digital Workplace Category Selection - Only shown when Digital Workplace is selected */}
      {isDigitalWorkplaceSelected && (
        <div className="gba:space-y-2">
          <Label htmlFor="digital-workplace-category-select" className="gba:flex gba:items-center gba:gap-2">
            <FolderTree className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'flow.creator.tags.digitalWorkplaceCategory',
              'Digital Workplace Category'
            )}
          </Label>
          <Select
            value={selectedDigitalWorkplaceCategory || '__NONE__'}
            onValueChange={value => handleCategoryChange(value, 'digitalWorkplaceCategory', tags, onTagsChange)}
            disabled={isLoadingDigitalWorkplaceCategories}
          >
            <SelectTrigger
              id="digital-workplace-category-select"
              className="gba:w-full"
              data-testid={`${testId}-digital-workplace-category-select`}
            >
              <SelectValue
                placeholder={
                  isLoadingDigitalWorkplaceCategories
                    ? 'Loading digital workplace categories...'
                    : 'Select a digital workplace category'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {/* Clear selection option */}
              <SelectItem value="__NONE__">
                <span className="gba:text-gray-500">None selected</span>
              </SelectItem>

              {/* Loading state */}
              {isLoadingDigitalWorkplaceCategories && (
                <SelectItem value="__LOADING__" disabled>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Spinner size="sm" />
                    <span>Loading digital workplace categories...</span>
                  </div>
                </SelectItem>
              )}

              {/* Digital workplace category options */}
              {digitalWorkplaceCategoryEntries.map(entry => (
                <SelectItem
                  key={entry.id}
                  value={createCatalogValue('DigitalWorkplaceFlowCategory', '1', entry.code)}
                  data-testid={`${testId}-digital-workplace-category-option-${entry.code}`}
                >
                  {formatCatalogEntry(entry)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
