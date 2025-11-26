import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useTranslation,
  Skeleton,
  FormAccordion,
  FormAccordionItem,
  FormAccordionTrigger,
  FormAccordionContent
} from '@newwork/nw-design-system'
import { LeadInformationSegment } from '../../form-segments/lead-information-segment'
import { LeadPersonSegment } from '../../form-segments/lead-person-segment'
import { LeadCompanySegment } from '../../form-segments/lead-company-segment'
import translations from './_i18n'

interface LeadLayoutProps {
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  entityId?: string
  leadStatusCatalogIdentifier: string
  leadSourceCatalogIdentifier: string
  leadRatingCatalogIdentifier: string
  companySizeCatalogIdentifier: string
  annualRevenueCatalogIdentifier: string
  leadInformationCustomFields?: React.ReactNode
  leadPersonCustomFields?: React.ReactNode
  leadCompanyCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const LeadLayout: React.FC<LeadLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  leadStatusCatalogIdentifier,
  leadSourceCatalogIdentifier,
  leadRatingCatalogIdentifier,
  companySizeCatalogIdentifier,
  annualRevenueCatalogIdentifier,
  leadInformationCustomFields,
  leadPersonCustomFields,
  leadCompanyCustomFields,
  customSegments = [],
  loading = false
}) => {
  const { t } = useTranslation(translations)

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid="lead-layout-loading" className="gba:space-y-6">
        {/* Lead Information Skeleton */}
        <div className="gba:space-y-4">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-3/4" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-32 gba:w-full" />
        </div>
        {/* FormAccordion Skeleton */}
        <div className="gba:space-y-2">
          <Skeleton className="gba:h-12 gba:w-full" />
          <Skeleton className="gba:h-12 gba:w-full" />
        </div>
      </div>
    )
  }

  return (
    <div data-testid="lead-layout">
      <LeadInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        leadStatusCatalogIdentifier={leadStatusCatalogIdentifier}
        leadSourceCatalogIdentifier={leadSourceCatalogIdentifier}
        leadRatingCatalogIdentifier={leadRatingCatalogIdentifier}
        customFields={leadInformationCustomFields}
      />
      <FormAccordion type="multiple" className="gba:w-full" data-testid="lead-layout-FormAccordion">
        <FormAccordionItem value="personal-information">
          <FormAccordionTrigger>{t('personal-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <LeadPersonSegment customFields={leadPersonCustomFields} />
          </FormAccordionContent>
        </FormAccordionItem>
        <FormAccordionItem value="company-information">
          <FormAccordionTrigger>{t('company-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <LeadCompanySegment
              companySizeCatalogIdentifier={companySizeCatalogIdentifier}
              annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
              customFields={leadCompanyCustomFields}
            />
          </FormAccordionContent>
        </FormAccordionItem>
        {customSegments.map(segment => (
          <FormAccordionItem key={segment.id} value={segment.id}>
            <FormAccordionTrigger>{segment.title}</FormAccordionTrigger>
            <FormAccordionContent>{segment.content}</FormAccordionContent>
          </FormAccordionItem>
        ))}
      </FormAccordion>
    </div>
  )
}

export default LeadLayout
