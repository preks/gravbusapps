import { EntityPreviewConfig } from '@/common/components/common-relations/apps/data-import/types'

export const leadPreviewConfig: EntityPreviewConfig = {
  title: { fields: ['firstName', 'lastName'], separator: ' ', fallbackFields: ['name', 'companyName'] },
  badges: [
    { field: 'position' },
    { field: 'salutationRef' },
    { field: 'academicTitleRef' },
    { field: 'leadStatusRef' },
    { field: 'leadSourceRef' },
    { field: 'leadRatingRef' },
    { field: 'investmentGroupRef' },
    { field: 'investmentTypeRef' },
    { field: 'investmentRoleRef' },
    { field: 'investmentStakeTypeRef' }
  ],
  rows: [
    {
      label: 'Company',
      icon: 'building',
      field: 'companyName',
      badges: [
        { field: 'industryRef', variant: 'success' },
        { field: 'numberOfEmployeesRef', variant: 'info' },
        { field: 'legalFormRef' },
        { field: 'accountAnnualRevenueBandRef' }
      ]
    },
    {
      label: 'Location',
      icon: 'location',
      fields: ['city', 'locality'],
      badges: [{ field: 'countryRef' }, { field: 'regionRef' }]
    }
  ],
  footerItems: [
    { field: 'email', icon: 'email' },
    { field: 'phoneNumber', icon: 'phone' }
  ]
}

export const contactPreviewConfig: EntityPreviewConfig = {
  title: { fields: ['firstName', 'lastName'], separator: ' ', fallbackFields: ['name'] },
  badges: [
    { field: 'jobPosition' },
    { field: 'position' },
    { field: 'salutationRef' },
    { field: 'academicTitleRef' },
    { field: 'languageRef' }
  ],
  rows: [
    {
      label: 'Location',
      icon: 'location',
      fields: ['city', 'locality'],
      badges: [{ field: 'countryRef' }, { field: 'regionRef' }]
    }
  ],
  footerItems: [
    { field: 'email', icon: 'email' },
    { field: 'phoneNumber', icon: 'phone' }
  ]
}

export const accountPreviewConfig: EntityPreviewConfig = {
  title: { fields: ['name'], fallbackFields: ['companyName'] },
  badges: [
    { field: 'industryClassRef', variant: 'success' },
    { field: 'industryRef', variant: 'success' },
    { field: 'companySizeRef', variant: 'info' },
    { field: 'numberOfEmployeesRef', variant: 'info' },
    { field: 'legalFormRef' },
    { field: 'accountAnnualRevenueBandRef' }
  ],
  rows: [
    {
      label: 'Location',
      icon: 'location',
      fields: ['city', 'locality', 'addresses.locality'],
      badges: [
        { field: 'countryRef' },
        { field: 'addresses.countryRef' },
        { field: 'regionRef' },
        { field: 'addresses.regionRef' }
      ]
    }
  ],
  footerItems: [
    { field: 'email', icon: 'email' },
    { field: 'phoneNumber', icon: 'phone' }
  ]
}

export const opportunityPreviewConfig: EntityPreviewConfig = {
  title: { fields: ['name'] },
  badges: [
    { field: 'salesPipelineRef' },
    { field: 'salesPipelineStageRef' },
    { field: 'opportunityPipelineRef' },
    { field: 'opportunityPipelineStageRef' },
    { field: 'opportunityStatusRef' },
    { field: 'opportunityForecastRef' }
  ],
  rows: [
    {
      label: 'Estimated amount',
      icon: 'currency',
      field: 'estimatedAmount',
      currencyField: 'currencyRef',
      format: 'amountWithCurrency'
    }
  ]
}
