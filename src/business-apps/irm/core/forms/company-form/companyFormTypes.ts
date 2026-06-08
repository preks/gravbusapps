import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver, ResolverResult } from 'react-hook-form'
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
  const executiveSchema = z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    sourceType: z.enum(['employee', 'investmentContact']).optional(),
    employeeId: z.string().optional(),
    investmentContactId: z.string().optional(),
    executiveTypeRef: z.string().optional()
  })

  const ownershipSchema = z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    ownerInvestmentCompanyId: z.string().optional(),
    percentage: z
      .number()
      .min(0, t('validation-ownership-percentage-min'))
      .max(OWNERSHIP_TOTAL_LIMIT, t('validation-ownership-percentage-max'))
      .optional()
  })

  return z.object({
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
}

export interface CompanyCrossFieldError {
  path: string
  message: string
}

const validateExecutiveRow = (
  executive: ExecutiveFormRow,
  index: number,
  t: (key: string) => string
): CompanyCrossFieldError[] => {
  const issues: CompanyCrossFieldError[] = []
  const hasSourceType = Boolean(executive.sourceType)
  // A fully empty row is an optional draft (a company can be created without executives) and is
  // dropped from the payload on submit. Once the row is engaged via a source type, an executive
  // type, a person, or it is an existing executive, the mandatory chain applies.
  const hasMeaningfulData =
    Boolean(executive.employeeId) ||
    Boolean(executive.investmentContactId) ||
    Boolean(executive.executiveTypeRef) ||
    hasSourceType ||
    Boolean(executive.id)

  if (!hasMeaningfulData) {
    return issues
  }

  // Choosing an executive type (or otherwise engaging the row) makes the source type mandatory.
  if (!hasSourceType) {
    issues.push({ path: `executives.${index}.sourceType`, message: t('validation-source-type-required') })
    return issues
  }

  // A chosen source type makes the matching person mandatory.
  if (executive.sourceType === 'employee' && !executive.employeeId) {
    issues.push({ path: `executives.${index}.employeeId`, message: t('validation-employee-required') })
  }
  if (executive.sourceType === 'investmentContact' && !executive.investmentContactId) {
    issues.push({
      path: `executives.${index}.investmentContactId`,
      message: t('validation-investment-contact-required')
    })
  }

  return issues
}

const validateOwnershipRow = (
  ownership: OwnershipFormRow,
  index: number,
  t: (key: string) => string
): CompanyCrossFieldError[] => {
  const issues: CompanyCrossFieldError[] = []
  const hasOwner = Boolean(ownership.ownerInvestmentCompanyId)
  const hasPercentage = ownership.percentage !== undefined
  const hasMeaningfulData = hasOwner || hasPercentage || Boolean(ownership.id)

  // Allow empty draft rows; they are dropped from the payload on submit.
  if (!hasMeaningfulData) {
    return issues
  }

  if (!hasOwner) {
    issues.push({
      path: `ownerships.${index}.ownerInvestmentCompanyId`,
      message: t('validation-owner-company-required')
    })
  }
  if (!hasPercentage) {
    issues.push({ path: `ownerships.${index}.percentage`, message: t('validation-ownership-percentage-min') })
  }

  return issues
}

// Conditional / cross-row validation kept out of the Zod schema (see the note on
// `createCompanySchema`). Returns inline field errors that the resolver merges into the result on
// full-form validation only.
export const validateCompanyCrossFields = (
  data: CompanyFormData,
  t: (key: string) => string
): CompanyCrossFieldError[] => {
  const issues: CompanyCrossFieldError[] = []

  ;(data.executives || []).forEach((executive, index) => {
    issues.push(...validateExecutiveRow(executive, index, t))
  })
  ;(data.ownerships || []).forEach((ownership, index) => {
    issues.push(...validateOwnershipRow(ownership, index, t))
  })

  const ownershipTotal = (data.ownerships || []).reduce((sum, ownership) => sum + (ownership.percentage || 0), 0)
  if (ownershipTotal > OWNERSHIP_TOTAL_LIMIT) {
    issues.push({ path: 'ownerships', message: t('validation-ownership-total-max') })
  }

  return issues
}

const setNestedError = (errors: Record<string, any>, path: string, message: string): void => {
  const keys = path.split('.')
  let node = errors
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    if (typeof node[key] !== 'object' || node[key] === null) {
      node[key] = {}
    }
    node = node[key]
  }
  const lastKey = keys[keys.length - 1]
  // Never overwrite an existing (Zod) field error already sitting on this path.
  if (!node[lastKey]) {
    node[lastKey] = { type: 'manual', message }
  }
}

// Detect full-form validation (submit) vs a scoped single-field trigger. On full submit RHF calls
// the resolver with `names` undefined (and always validates the top-level required `name`/`code`).
// A `requireSourceForEnable`-disabled CatalogSelect instead fires a scoped `trigger(field)` with a
// single non-`name`/`code` field name; for those we must NOT augment, otherwise we re-introduce the
// whole-form revalidation loop the plain schema exists to avoid.
const isFullFormValidation = (names?: string[]): boolean =>
  !names || names.length === 0 || names.some(name => name === 'name' || name === 'code')

// Plain zodResolver augmented with the conditional/cross-row company rules. The extra errors are
// merged in ONLY during full-form validation, keeping single-field triggers scoped and loop-free.
export const createCompanyResolver = (
  schema: ReturnType<typeof createCompanySchema>,
  t: (key: string) => string
): Resolver<CompanyFormData> => {
  const baseResolver = zodResolver(schema) as Resolver<CompanyFormData>

  return async (values, context, options) => {
    const result = await baseResolver(values, context, options)

    if (!isFullFormValidation(options.names as string[] | undefined)) {
      return result
    }

    const crossFieldErrors = validateCompanyCrossFields(values as CompanyFormData, t)
    if (crossFieldErrors.length === 0) {
      return result
    }

    const mergedErrors: Record<string, any> = { ...result.errors }
    crossFieldErrors.forEach(({ path, message }) => setNestedError(mergedErrors, path, message))

    return { values: result.values, errors: mergedErrors } as ResolverResult<CompanyFormData>
  }
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
  lines?: Array<string | undefined>
  streetAddress?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
}): { lines: string[] } | undefined => {
  if (!line) return undefined
  if (Array.isArray(line.lines)) {
    const normalizedLines = line.lines.filter((value): value is string => Boolean(value))
    return normalizedLines.length > 0 ? { lines: normalizedLines } : undefined
  }

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
  sourceType: undefined,
  employeeId: undefined,
  investmentContactId: undefined,
  executiveTypeRef: undefined
})

export const createEmptyOwnership = (): OwnershipFormRow => ({
  ownerInvestmentCompanyId: '',
  percentage: undefined
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
