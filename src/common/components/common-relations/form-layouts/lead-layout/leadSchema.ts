import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isValidPhoneNumberWithMetadata } from '@/common/utils/validation/phoneNumberValidation'

// Helper to accept null and transform to empty string (for field deletion)
const nullableString = () => z.preprocess(val => (val === null ? '' : val), z.string().optional())

const optionalPhoneNumber = () =>
  nullableString().refine(value => {
    const phoneNumber = (value || '').trim()
    return !phoneNumber || isValidPhoneNumberWithMetadata(phoneNumber)
  }, 'Please enter a valid phone number')

export const leadSchema = z.object({
  // BaseEntity fields
  id: z.string().optional(),
  version: z.number().optional(),
  ownerEmployeeId: z.string().trim().min(1, 'Owner is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  companyName: nullableString(),
  leadStatusRef: nullableString(),
  leadSourceRef: nullableString(),
  leadRatingRef: nullableString(),
  sensitive: z.boolean().optional(),
  email: nullableString(),
  phoneNumber: optionalPhoneNumber(),
  secondaryNumber: optionalPhoneNumber(),
  linkedinUrl: nullableString(),
  academicTitleRef: nullableString(),
  jobPosition: nullableString(),
  legalFormRef: nullableString(),
  industryClassRef: nullableString(),
  companyWebsite: nullableString(),
  companyEmail: nullableString(),
  companyPhone: optionalPhoneNumber(),
  companySizeRef: nullableString(),
  accountAnnualRevenueBandRef: nullableString(),
  description: nullableString(),
  // Address line as object with lines array (exact interface structure)
  addressLine: z
    .object({ lines: z.array(z.string().nullable()) })
    .nullable()
    .optional(),
  postalCode: nullableString(),
  locality: nullableString(),
  regionRef: nullableString(),
  countryRef: nullableString()
})

export type LeadSchema = z.infer<typeof leadSchema>

export const createLeadSegmentResolver = () => zodResolver(leadSchema)
