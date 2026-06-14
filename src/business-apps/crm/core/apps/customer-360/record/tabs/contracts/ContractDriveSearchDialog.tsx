import React from 'react'
import { DriveSearchDialog } from '@/business-apps/core/office/apps/drive/components/DriveSearchDialog'
import type { DriveSearchResult } from '@/business-apps/core/office/apps/drive/types/drive.types'

interface ContractDriveSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (query: string) => void
  results: DriveSearchResult[]
  isSearching: boolean
  onSelectResult: (result: DriveSearchResult) => void
}

const translateSearch = (key: string): string => {
  if (key === 'search-title') return 'Pick contract asset'
  if (key === 'search-placeholder') return 'Search Every Office assets...'
  if (key === 'search-no-results') return 'No assets found'
  return key
}

const ContractDriveSearchDialog: React.FC<ContractDriveSearchDialogProps> = props => (
  <DriveSearchDialog {...props} t={translateSearch} data-testid="customer-360-contract-drive-search" />
)

export default ContractDriveSearchDialog
