import React, { useState, useEffect } from 'react'
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
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { FlowTags } from '../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Extended interface to handle mixed tag formats
interface MixedFormatTags extends FlowTags {
  serviceCategory?: string | string[]
}

interface TagConfigurationProps {
  tags?: MixedFormatTags
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
  const catalogClient = useCatalogManagerClient(accessToken)

  // State for catalog entries
  const [appCatalogEntries, setAppCatalogEntries] = useState<CatalogEntry[]>([])
  const [serviceCategoryEntries, setServiceCategoryEntries] = useState<CatalogEntry[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [isLoadingServiceCategories, setIsLoadingServiceCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current tag values - handle both string and array formats
  const selectedApp = tags.app || ''
  const selectedServiceCategory = Array.isArray(tags.serviceCategory)
    ? tags.serviceCategory[0] || ''
    : tags.serviceCategory || ''
  const isServicePortalSelected = selectedApp === 'AppCatalog:1:SVC'

  // Load app catalog entries
  useEffect(() => {
    const loadAppCatalog = async () => {
      try {
        setIsLoadingApps(true)
        setError(null)

        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AppCatalog', version: '1' },
          {
            limit: 100,
            includeChildCatalogEntries: true,
            returnTotalRecords: true
          }
        )

        setAppCatalogEntries(response.data || [])
      } catch (err) {
        console.error('Error loading app catalog:', err)
        setError('Failed to load app catalog entries')
      } finally {
        setIsLoadingApps(false)
      }
    }

    if (accessToken) {
      loadAppCatalog()
    }
  }, [accessToken, catalogClient])

  // Load service category catalog entries when service portal is selected
  useEffect(() => {
    const loadServiceCategoryCatalog = async () => {
      if (!isServicePortalSelected) {
        setServiceCategoryEntries([])
        return
      }

      try {
        setIsLoadingServiceCategories(true)
        setError(null)

        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ServicePortalCategory', version: '1' },
          {
            limit: 100,
            includeChildCatalogEntries: true,
            returnTotalRecords: true
          }
        )

        setServiceCategoryEntries(response.data || [])
      } catch (err) {
        console.error('Error loading service category catalog:', err)
        setError('Failed to load service category entries')
      } finally {
        setIsLoadingServiceCategories(false)
      }
    }

    if (accessToken && isServicePortalSelected) {
      loadServiceCategoryCatalog()
    }
  }, [accessToken, isServicePortalSelected, catalogClient])

  // Handle app selection change
  const handleAppChange = (value: string) => {
    const newTags = { ...tags }

    // Handle clear selection
    if (value === '__NONE__') {
      delete newTags.app
      // Also clear service category if app is cleared
      if (newTags.serviceCategory) {
        delete newTags.serviceCategory
      }
    } else {
      newTags.app = value
      // Clear service category if not service portal
      if (value !== 'AppCatalog:1:SVC' && newTags.serviceCategory) {
        delete newTags.serviceCategory
      }
    }

    onTagsChange(newTags)
  }

  // Handle service category change
  const handleServiceCategoryChange = (value: string) => {
    const newTags = { ...tags }

    // Handle clear selection
    if (value === '__NONE__') {
      delete newTags.serviceCategory
    } else {
      // Store as string (preferred format) for compatibility
      newTags.serviceCategory = value
    }

    onTagsChange(newTags)
  }

  // Format catalog entry for display
  const formatCatalogEntry = (entry: CatalogEntry): string => {
    return entry.value || entry.code || entry.id
  }

  // Create catalog entry value (format: CatalogName:Version:Code)
  const createCatalogValue = (catalogName: string, version: string, code: string): string => {
    return `${catalogName}:${version}:${code}`
  }

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
        <Select value={selectedApp || '__NONE__'} onValueChange={handleAppChange} disabled={isLoadingApps}>
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
            onValueChange={handleServiceCategoryChange}
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
    </div>
  )
}
