import { FlowTags } from '@/business-apps/flow/types'

export const handleAppChange = (value: string, tags: FlowTags, onTagsChange: (tags: FlowTags) => void) => {
  const newTags = { ...tags }

  if (value === '__NONE__') {
    delete newTags.app
    if (newTags.serviceCategory) {
      delete newTags.serviceCategory
    }
    if (newTags.digitalWorkplaceCategory) {
      delete newTags.digitalWorkplaceCategory
    }
  } else {
    newTags.app = value
    if (value !== 'AppCatalog:1:SVC' && newTags.serviceCategory) {
      delete newTags.serviceCategory
    }
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

  if (value === '__NONE__') {
    delete newTags[categoryKey]
  } else {
    newTags[categoryKey] = value
  }

  onTagsChange(newTags)
}
