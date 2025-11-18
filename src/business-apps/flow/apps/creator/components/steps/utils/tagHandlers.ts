import { FlowTags } from '@/business-apps/flow/types'

export const handleAppChange = (value: string, tags: FlowTags, onTagsChange: (tags: FlowTags) => void) => {
  const newTags = { ...tags }

  // Handle clear selection
  if (value === '__NONE__') {
    delete newTags.app
    // Also clear service category if app is cleared
    if (newTags.serviceCategory) {
      delete newTags.serviceCategory
    }
    // Also clear digital workplace category if app is cleared
    if (newTags.digitalWorkplaceCategory) {
      delete newTags.digitalWorkplaceCategory
    }
  } else {
    newTags.app = value
    // Clear service category if not service portal
    if (value !== 'AppCatalog:1:SVC' && newTags.serviceCategory) {
      delete newTags.serviceCategory
    }
    // Clear digital workplace category if not digital workplace
    if (value !== 'AppCatalog:1:DWP' && newTags.digitalWorkplaceCategory) {
      delete newTags.digitalWorkplaceCategory
    }
  }

  onTagsChange(newTags)
}

export const handleCategoryChange = (
  value: string,
  categoryKey: 'serviceCategory' | 'digitalWorkplaceCategory',
  tags: FlowTags,
  onTagsChange: (tags: FlowTags) => void
) => {
  const newTags = { ...tags }

  // Handle clear selection
  if (value === '__NONE__') {
    delete newTags[categoryKey]
  } else {
    // Store as string (preferred format) for compatibility
    newTags[categoryKey] = value
  }

  onTagsChange(newTags)
}
