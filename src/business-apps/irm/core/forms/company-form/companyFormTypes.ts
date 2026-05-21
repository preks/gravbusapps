import { z } from 'zod'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const DATA_TEST_ID_PREFIX = 'investment-company-form'
export const LEGAL_ENTITY_EXECUTIVE_TYPE_CATALOG = 'LegalEntityExecutiveType'
export const CURRENCY_CATALOG = 'Currency:v1'
export const OWNERSHIP_TOTAL_LIMIT = 100

const addressSchema = z.object({
  id: z.string().optional(),
  investmentCompanyId: z.string().optional(),
  addressType: z.string().optional(),
  addressLine: z
    .object({
      lines: z.array(z.string().optional()).optional()
    })
    .optional(),
  postalCode: z.string().optional(),
  locality: z.string().optional(),
  regionRef: z.string().optional(),
  countryRef: z.string().optional()
})

export const createCompanySchema = (t: (key: string) => string) => {
  const executiveSchema = z
    .object({
      id: z.string().optional(),
      version: z.number().optional(),
      sourceType: z.enum(['employee', 'investmentContact']),
      employeeId: z.string().optional(),
      investmentContactId: z.string().optional(),
      executiveTypeRef: z.string().optional()
    })
    .superRefine((value, ctx) => {
      if (value.sourceType === 'employee' && !value.employeeId) {
        ctx.addIssue({ code: 'custom', path: ['employeeId'], message: t('validation-employee-required') })
      }
      if (value.sourceType === 'investmentContact' && !value.investmentContactId) {
        ctx.addIssue({
          code: 'custom',
          path: ['investmentContactId'],
          message: t('validation-investment-contact-required')
        })
      }
    })

  const ownershipSchema = z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    ownerInvestmentCompanyId: z.string().min(1, t('validation-owner-company-required')),
    percentage: z
      .number()
      .min(0, t('validation-ownership-percentage-min'))
      .max(OWNERSHIP_TOTAL_LIMIT, t('validation-ownership-percentage-max'))
  })

  return z
    .object({
      id: z.string().optional(),
      version: z.number().optional(),
      name: z.string().trim().min(1, t('validation-company-name-required')).max(64, t('validation-company-name-max')),
      code: z.string().trim().min(1, t('validation-company-code-required')).max(20, t('validation-company-code-max')),
      description: z.string().optional(),
      commercialRegistrationNumber: z.string().optional(),
      taxIdentificationNumber: z.string().optional(),
      taxNumber: z.string().optional(),
      valueAddedTaxNumber: z.string().optional(),
      currencyRef: z.string().optional(),
      investmentCompanyGroupAssociationId: z.string().optional(),
      investmentCompanyGroupAssociationVersion: z.number().optional(),
      investmentCompanyGroupId: z.string().optional(),
      addresses: z.array(addressSchema).optional(),
      executives: z.array(executiveSchema).optional(),
      ownerships: z.array(ownershipSchema).optional(),
      pictureModified: z.boolean().optional()
    })
    .superRefine((value, ctx) => {
      const ownershipTotal = (value.ownerships || []).reduce((sum, ownership) => sum + (ownership.percentage || 0), 0)
      if (ownershipTotal > OWNERSHIP_TOTAL_LIMIT) {
        ctx.addIssue({
          code: 'custom',
          path: ['ownerships'],
          message: t('validation-ownership-total-max')
        })
      }
    })
}

export type CompanyFormData = z.infer<ReturnType<typeof createCompanySchema>>
export type AddressFormRow = NonNullable<CompanyFormData['addresses']>[number]
export type ExecutiveFormRow = NonNullable<CompanyFormData['executives']>[number]
export type OwnershipFormRow = NonNullable<CompanyFormData['ownerships']>[number]

type ExecutiveFormSource = {
  id?: string
  version?: number
  employeeId?: string
  employee?: { id?: string }
  investmentContactId?: string
  investmentContact?: { id?: string }
  executiveTypeRef?: string
}

type GroupAssociationFormSource = {
  id?: string
  version?: number
  investmentCompanyGroupId?: string
  investmentCompanyGroup?: { id?: string }
}

type OwnershipFormSource = {
  id?: string
  version?: number
  ownerInvestmentCompanyId?: string
  ownerInvestmentCompany?: { id?: string }
  percentage?: number
}

export type InvestmentCompanyFormSource = Partial<InvestmentCompany> & {
  investmentCompanyExecutives?: ExecutiveFormSource[]
  investmentCompanyGroupAssociation?: GroupAssociationFormSource[]
  investmentCompanyOwnership?: OwnershipFormSource[]
  picture?: { additionalProp1?: string } | string
}

export interface CompanyFormProps extends BusinessAppContextProps {
  investmentCompany?: Partial<InvestmentCompany> & Record<string, any>
  investmentCompanyId?: string
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  refetch?: () => void
  structureId?: string
  parentNodeId?: string
  isRootCompany?: boolean
}

const toFormAddressLine = (line?: {
  streetAddress?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
}): { lines: string[] } | undefined => {
  if (!line) return undefined
  const lines = [line.streetAddress, line.addressLine2, line.addressLine3, line.addressLine4].filter(
    (value): value is string => Boolean(value)
  )
  return lines.length > 0 ? { lines } : undefined
}

const getCompanyExecutives = (company?: InvestmentCompanyFormSource): ExecutiveFormSource[] =>
  company?.executives || company?.investmentCompanyExecutives || []

const getCompanyGroupAssociations = (company?: InvestmentCompanyFormSource): GroupAssociationFormSource[] =>
  company?.groupAssociations || company?.investmentCompanyGroupAssociation || []

const getCompanyOwnerships = (company?: InvestmentCompanyFormSource): OwnershipFormSource[] =>
  company?.ownerships || company?.investmentCompanyOwnership || []

export const getPictureAdditionalProp = (picture: unknown): string | undefined => {
  if (!picture || typeof picture !== 'object' || !('additionalProp1' in picture)) return undefined
  const value = picture.additionalProp1
  return typeof value === 'string' ? value : undefined
}

const toExecutiveFormRow = (executive: ExecutiveFormSource): ExecutiveFormRow => ({
  id: executive?.id,
  version: executive?.version,
  sourceType: executive?.investmentContactId ? 'investmentContact' : 'employee',
  employeeId: executive?.employeeId || executive?.employee?.id,
  investmentContactId: executive?.investmentContactId || executive?.investmentContact?.id,
  executiveTypeRef: executive?.executiveTypeRef
})

const toOwnershipFormRow = (ownership: OwnershipFormSource): OwnershipFormRow => ({
  id: ownership?.id,
  version: ownership?.version,
  ownerInvestmentCompanyId: ownership?.ownerInvestmentCompanyId || ownership?.ownerInvestmentCompany?.id || '',
  percentage: ownership?.percentage ?? 0
})

export const createEmptyAddress = (): AddressFormRow => ({
  addressType: AddressType.PRIMARY_ADDRESS,
  addressLine: { lines: [''] },
  postalCode: '',
  locality: '',
  regionRef: '',
  countryRef: ''
})

export const createEmptyExecutive = (): ExecutiveFormRow => ({
  sourceType: 'employee',
  employeeId: undefined,
  investmentContactId: undefined,
  executiveTypeRef: undefined
})

export const createEmptyOwnership = (): OwnershipFormRow => ({
  ownerInvestmentCompanyId: '',
  percentage: 0
})

export const getSelectedContactId = (
  value: Array<string | { id: string }> | string | { id: string } | null
): string | null => {
  if (Array.isArray(value)) {
    const firstValue = value[0]
    return typeof firstValue === 'object' ? firstValue.id : firstValue || null
  }

  if (value && typeof value === 'object') {
    return value.id
  }

  return value || null
}

export const getUploadedFile = (value: unknown): File | null => {
  if (value instanceof File) return value

  if (value && typeof value === 'object' && 'file' in value && value.file instanceof File) {
    return value.file
  }

  return null
}

export const getCompanyDefaultValues = (company?: InvestmentCompanyFormSource): CompanyFormData => {
  const groupAssociation = getCompanyGroupAssociations(company)[0]
  const executives = getCompanyExecutives(company).map(toExecutiveFormRow)
  const ownerships = getCompanyOwnerships(company).map(toOwnershipFormRow)
  const addresses = (company?.addresses || []).map(address => ({
    id: address.id,
    investmentCompanyId: address.investmentCompanyId,
    addressType: address.addressType,
    addressLine: toFormAddressLine(address.addressLine),
    postalCode: address.postalCode,
    locality: address.locality,
    regionRef: address.regionRef,
    countryRef: address.countryRef
  }))

  return {
    id: company?.id,
    version: company?.version,
    name: company?.name || '',
    code: company?.code || '',
    description: company?.description || '',
    commercialRegistrationNumber: company?.commercialRegistrationNumber || '',
    taxIdentificationNumber: company?.taxIdentificationNumber || '',
    taxNumber: company?.taxNumber || '',
    valueAddedTaxNumber: company?.valueAddedTaxNumber || '',
    currencyRef: company?.currencyRef || '',
    investmentCompanyGroupAssociationId: groupAssociation?.id,
    investmentCompanyGroupAssociationVersion: groupAssociation?.version,
    investmentCompanyGroupId:
      groupAssociation?.investmentCompanyGroupId || groupAssociation?.investmentCompanyGroup?.id || '',
    addresses: addresses.length > 0 ? addresses : [createEmptyAddress()],
    executives: executives.length > 0 ? executives : [createEmptyExecutive()],
    ownerships: ownerships.length > 0 ? ownerships : [createEmptyOwnership()],
    pictureModified: false
  }
}

export const fileToBase64 = (file: File, errorMessage: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result.split(',')[1] : ''
      resolve(value || '')
    }
    reader.onerror = () => reject(new Error(errorMessage))
    reader.readAsDataURL(file)
  })
