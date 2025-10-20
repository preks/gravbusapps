import React from 'react'

export interface CatalogIdentifier {
  identifier: string
  version: string
}

export interface OptionItem {
  value: string
  label: string
  id?: string | number
}

export interface EntityOption {
  id: string
  name: string
  type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'
  subtitle?: string
  pictureThumbnail?: string
}

export interface EmployeeOption {
  id: string
  displayName: string
  userId?: string
  pictureThumbnail?: string
  organizationalUnitName?: string
  jobPositionName?: string
}

export interface AccountSegmentProps {
  // Labels
  ownerLabel: React.ReactNode
  accountNameLabel: React.ReactNode
  legalFormLabel?: React.ReactNode
  industryLabel?: React.ReactNode
  websiteLabel?: React.ReactNode
  descriptionLabel?: React.ReactNode
  contactPhoneLabel?: React.ReactNode
  contactEmailLabel?: React.ReactNode
  geographicPresenceLabel?: React.ReactNode
  entityLabel?: React.ReactNode
  annualRevenueLabel?: React.ReactNode
  numberOfEmployeesLabel?: React.ReactNode
  timeZoneLabel?: React.ReactNode
  foundationDateLabel?: React.ReactNode
  tickerSymbolLabel?: React.ReactNode
  liquidationDateLabel?: React.ReactNode
  missionLabel?: React.ReactNode
  specialtyLabel?: React.ReactNode
  notesSummaryLabel?: React.ReactNode
  pictureUploadLabel?: React.ReactNode
  communicationChannelsLabel?: React.ReactNode
  addressesLabel?: React.ReactNode

  // Catalog/Options
  accessToken?: string
  legalFormOptions?: OptionItem[]
  legalFormCatalog?: CatalogIdentifier
  fetchLegalFormOptions?: (q?: string) => Promise<OptionItem[]>
  industryOptions?: OptionItem[]
  industryCatalog?: CatalogIdentifier
  fetchIndustryOptions?: (q?: string) => Promise<OptionItem[]>
  annualRevenueOptions?: OptionItem[]
  annualRevenueCatalog?: CatalogIdentifier
  fetchAnnualRevenueOptions?: (q?: string) => Promise<OptionItem[]>
  employeeSizeOptions?: OptionItem[]
  employeeSizeCatalog?: CatalogIdentifier
  fetchEmployeeSizeOptions?: (q?: string) => Promise<OptionItem[]>
  timeZoneOptions?: OptionItem[]
  timeZoneCatalog?: CatalogIdentifier
  fetchTimeZoneOptions?: (q?: string) => Promise<OptionItem[]>

  communicationChannelCatalog?: CatalogIdentifier
  addressTypeCatalog?: CatalogIdentifier
  countryCatalog?: CatalogIdentifier

  // Owner selection
  assignees?: EmployeeOption[]
  assigneesLoading?: boolean
  onAssigneeSearch?: (q: string) => void
  assigneesHasMore?: boolean
  onAssigneeLoadMore?: () => void

  // Entity selection
  showEntitySelection?: boolean
  entities?: EntityOption[]
  entitiesLoading?: boolean
  onEntitySearch?: (q: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void
  initialEntityFromContext?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string }

  ['data-testid']?: string
}
