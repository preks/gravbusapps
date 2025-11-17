import React, { useCallback, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import { LeadLayout } from '@/common/components/common-relations/form-layouts/lead-layout'
import { createLeadSegmentResolver } from '@/common/components/common-relations/schemas/leadSchema'
import { buildInvestmentLeadPayload } from '@/common/data/investment/types/investmentLeadTypes'
import { AppActionForm } from '@/components/app-action-form'
import { InvestmentProspectSegment } from '@/common/components/investment/form-segments/investment-prospect-segment'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

const prefixDataTestId = 'IrmLeadForm'

interface LeadFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentLead>
  onSubmit?: (lead: Partial<InvestmentLead>) => Promise<void>
  onCancel?: () => Promise<void>
}

const LeadFormComponent: React.FC<LeadFormComponentProps> = ({ businessAppContext, initialValues }) => {
  // Extract leadId from multiple sources (same pattern as ConvertLeadForm)
  const leadId =
    initialValues?.id ||
    businessAppContext.additionalData?.leadId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    undefined

  // Lead state - use new declarative hook
  const { lead: fetchedLead, loading: leadLoading, error: leadError } = useInvestmentLead(businessAppContext, leadId)
  const [lead, setLead] = useState<InvestmentLead | null>((initialValues as InvestmentLead) || null)

  // Update lead when fetched
  useEffect(() => {
    if (fetchedLead) {
      setLead(fetchedLead)
    }
  }, [fetchedLead])

  // Transform InvestmentLead to form values
  const leadToFormValues = useCallback((ld: InvestmentLead | null) => {
    if (!ld) {
      // New lead - initialize with defaults
      return {
        ownerEmployeeId: '',
        firstName: '',
        lastName: '',
        company: '',
        leadStatusRef: '',
        leadSourceRef: '',
        leadRatingRef: '',
        sensitive: false,
        academicTitleRef: '',
        jobPosition: '',
        legalFormRef: '',
        industryClassRef: '',
        website: '',
        companyEmail: '',
        companyPhone: '',
        companySizeRef: '',
        annualRevenueBandRef: '',
        addresses: [
          {
            addressType: AddressType.PRIMARY_ADDRESS,
            addressLines: [''],
            postalCode: '',
            locality: '',
            regionRef: '',
            countryRef: ''
          }
        ] as any,
        communicationChannels: [
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.PHONE),
            value: '',
            valueExtension: null
          },
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.EMAIL),
            value: '',
            valueExtension: null
          },
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.LINKEDIN),
            value: '',
            valueExtension: null
          },
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.XING),
            value: '',
            valueExtension: null
          }
        ] as any,
        id: undefined,
        version: undefined
      }
    }

    // Transform addresses
    const addresses = (ld.addresses || []).map((addr: any) => {
      const addressLines = addr.addressLine
        ? typeof addr.addressLine === 'object' && addr.addressLine.value
          ? addr.addressLine.value
              .split(',')
              .map((line: string) => line.trim())
              .filter(Boolean)
          : typeof addr.addressLine === 'string'
            ? addr.addressLine
                .split(',')
                .map((line: string) => line.trim())
                .filter(Boolean)
            : []
        : ['']
      return {
        ...(addr.id && { id: addr.id }),
        ...(addr.version !== undefined && { version: addr.version }),
        addressType: addr.addressType || AddressType.PRIMARY_ADDRESS,
        addressLines: addressLines.length > 0 ? addressLines : [''],
        postalCode: addr.postalCode || '',
        locality: addr.locality || '',
        regionRef: addr.regionRef || '',
        countryRef: addr.countryRef || ''
      }
    })

    if (addresses.length === 0) {
      addresses.push({
        addressType: AddressType.PRIMARY_ADDRESS,
        addressLines: [''],
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: ''
      })
    }

    // Transform communication channels
    const communicationChannels =
      ld.communicationChannels?.map((ch: any) => ({
        ...(ch.id && { id: ch.id }),
        ...(ch.version !== undefined && { version: ch.version }),
        communicationChannelRef: ch.communicationChannelRef || '',
        value: ch.value || '',
        valueExtension: ch.valueExtension || null
      })) || []

    return {
      ownerEmployeeId: ld.ownerEmployeeId || '',
      firstName: ld.firstName || '',
      lastName: ld.lastName || '',
      company: ld.companyName || '',
      leadStatusRef: ld.leadStatusRef || '',
      leadSourceRef: ld.leadSourceRef || '',
      leadRatingRef: ld.leadRatingRef || '',
      sensitive: ld.sensitive || false,
      academicTitleRef: ld.academicTitleRef || '',
      jobPosition: ld.position || '',
      legalFormRef: ld.legalFormRef || '',
      industryClassRef: ld.industryClassRef || '',
      website: ld.companyWebsite || '',
      companyEmail: ld.companyEmail || '',
      companyPhone: ld.companyPhone || '',
      companySizeRef: ld.companySizeRef || '',
      annualRevenueBandRef: ld.accountAnnualRevenueBandRef || '',
      addresses,
      communicationChannels,
      id: ld.id,
      version: ld.version
    }
  }, [])

  const form = useForm<any>({
    resolver: createLeadSegmentResolver() as any,
    defaultValues: leadToFormValues(lead) as any
  })

  // Update form when lead changes
  React.useEffect(() => {
    if (lead) {
      const formValues = leadToFormValues(lead)
      form.reset(formValues)
    }
  }, [lead, form, leadToFormValues])

  // Watch investment group and type for prospect segment (like Opportunity Form)
  const investmentGroupId = form.watch('investmentGroup')
  const investmentTypeValue = form.watch('investmentType')
  const investmentTypeId =
    typeof investmentTypeValue === 'object' ? investmentTypeValue?.id : investmentTypeValue || null

  // Handle pre-submit (before AppActionForm processes)
  const handlePreSubmit = useCallback(async (formValues: any) => {
    // Transform addressLines (array) back to addressLine (object with value)
    const addresses = (formValues.addresses || []).map((addr: any) => {
      const addressLineValue = (addr.addressLines || []).filter((line: string) => line.trim()).join(', ')
      return {
        ...(addr.id && { id: addr.id }),
        ...(addr.version !== undefined && { version: addr.version }),
        addressType: addr.addressType || AddressType.PRIMARY_ADDRESS,
        addressLine: addressLineValue ? { value: addressLineValue } : undefined,
        postalCode: addr.postalCode || undefined,
        locality: addr.locality || undefined,
        regionRef: addr.regionRef || undefined,
        countryRef: addr.countryRef || undefined
      }
    })

    // Filter out empty communication channels
    const communicationChannels = (formValues.communicationChannels || [])
      .filter((ch: any) => ch.value?.trim())
      .map((ch: any) => ({
        ...(ch.id && { id: ch.id }),
        ...(ch.version !== undefined && { version: ch.version }),
        communicationChannelRef: ch.communicationChannelRef,
        value: ch.value,
        valueExtension: ch.valueExtension || null
      }))

    // Build lead payload
    const leadPayload: Partial<InvestmentLead> = {
      ...(formValues.id && { id: formValues.id }),
      ...(formValues.version !== undefined && { version: formValues.version }),
      ownerEmployeeId: formValues.ownerEmployeeId,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      company: formValues.company,
      leadStatusRef: formValues.leadStatusRef || undefined,
      leadSourceRef: formValues.leadSourceRef || undefined,
      leadRatingRef: formValues.leadRatingRef || undefined,
      sensitive: formValues.sensitive || false,
      academicTitleRef: formValues.academicTitleRef || undefined,
      jobPosition: formValues.jobPosition || undefined,
      legalFormRef: formValues.legalFormRef || undefined,
      industryClassRef: formValues.industryClassRef || undefined,
      website: formValues.website || undefined,
      companyEmail: formValues.companyEmail || undefined,
      companyPhone: formValues.companyPhone || undefined,
      companySizeRef: formValues.companySizeRef || undefined,
      annualRevenueBandRef: formValues.annualRevenueBandRef || undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
    } as any

    // Use buildInvestmentLeadPayload to get the final API payload
    return buildInvestmentLeadPayload(leadPayload)
  }, [])

  if (leadLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={`${prefixDataTestId}-loading`}>
        Loading lead data...
      </div>
    )
  }

  if (leadError) {
    return (
      <div className="gba:p-6" data-testid={`${prefixDataTestId}-error`}>
        <Alert variant="destructive">
          <AlertDescription>Error loading lead: {leadError.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm form={form} onSubmit={handlePreSubmit} data-testid={prefixDataTestId}>
      <CatalogSelect.Provider {...businessAppContext} form={form}>
        <LeadLayout
          businessAppContext={businessAppContext}
          ownerEmployee={lead?.ownerEmployee}
          entityId={lead?.id}
          leadStatusCatalogIdentifier="InvestmentLeadStatus:v1"
          leadSourceCatalogIdentifier="InvestmentLeadSource:v1"
          leadRatingCatalogIdentifier="InvestmentLeadRating:v1"
          companySizeCatalogIdentifier="CompanySize:v1"
          annualRevenueCatalogIdentifier="AccountAnnualRevenueBand:v1"
          addresses={(lead as any)?.addresses}
          customSegments={[
            {
              id: 'investment-prospect',
              title: 'Investment Information',
              content: (
                <InvestmentProspectSegment
                  investmentGroupId={investmentGroupId as string}
                  investmentTypeId={investmentTypeId as string}
                  businessAppContext={businessAppContext}
                  testIdPrefix={prefixDataTestId}
                  currencySymbol="€"
                />
              )
            }
          ]}
        />
      </CatalogSelect.Provider>
    </AppActionForm>
  )
}

export default LeadFormComponent
