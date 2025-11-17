import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Accordion, useTranslation } from '@newwork/nw-design-system'
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
  customSegments = []
}) => {
  const { t } = useTranslation(translations)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])

  const accordionItems = useMemo(
    () => [
      {
        id: 'personal-information',
        title: t('personal-title'),
        content: <LeadPersonSegment customFields={leadPersonCustomFields} />
      },
      {
        id: 'company-information',
        title: t('company-title'),
        content: (
          <LeadCompanySegment
            companySizeCatalogIdentifier={companySizeCatalogIdentifier}
            annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
            customFields={leadCompanyCustomFields}
          />
        )
      },
      ...customSegments
    ],
    [
      t,
      companySizeCatalogIdentifier,
      annualRevenueCatalogIdentifier,
      leadPersonCustomFields,
      leadCompanyCustomFields,
      customSegments
    ]
  )

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
      <Accordion
        className="gba:w-full gba:[&>div[data-slot=accordion-item]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:bg-transparent gba:[&_button[data-slot=accordion-trigger][data-state=open]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:pl-0 gba:[&_[data-slot=accordion-content]>div]:bg-transparent gba:[&_[data-slot=accordion-content]>div]:p-0"
        value={accordionValue}
        onValueChange={value => setAccordionValue(value)}
        items={accordionItems}
      />
    </div>
  )
}

export default LeadLayout
