import { z } from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import { buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { buildInvestmentActivityPayload } from '@/common/data/investment/types/investmentActivityTypes'
import type { EntityOption } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import type { ActivityAssociationVariant } from '@/common/components/common-relations/activity-association/types'
import { toISOFormat } from '@/common/utils/dateFormatter'

const optionalId = z.string().nullable().optional()

export const quickActivitySchema = z.object({
  details: z.object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string().optional()
  }),
  activityTypeRef: z.string().trim().min(1, 'Activity type is required'),
  occurredAt: z.string().trim().min(1, 'Date & time is required'),
  ownerEmployeeId: z.string().trim().min(1, 'Owner is required'),
  _pendingFiles: z.array(z.any()).optional(),
  relatedEntityId: optionalId,
  accountId: optionalId,
  contactId: optionalId,
  opportunityId: optionalId,
  leadId: optionalId,
  investmentId: optionalId
})

export type QuickActivityFormValues = z.infer<typeof quickActivitySchema>

export type ActivityRecordEntityContext = {
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
}

export function resolveActivityAssociationVariant(
  explicit: ActivityAssociationVariant | undefined,
  buildActivityPayload?: (activity: Record<string, any>) => Record<string, any>
): ActivityAssociationVariant | undefined {
  if (explicit) {
    return explicit
  }
  if (buildActivityPayload === buildInvestmentActivityPayload) {
    return 'irm'
  }
  if (buildActivityPayload === buildCustomerActivityPayload) {
    return 'crm'
  }
  return undefined
}

export function buildAssociationEntityOptions(context: ActivityRecordEntityContext): EntityOption[] {
  const options: EntityOption[] = []
  if (context.accountId) {
    options.push({ id: context.accountId, type: 'account', name: '' })
  }
  if (context.contactId) {
    options.push({ id: context.contactId, type: 'contact', name: '' })
  }
  if (context.opportunityId) {
    options.push({ id: context.opportunityId, type: 'opportunity', name: '' })
  }
  if (context.leadId) {
    options.push({ id: context.leadId, type: 'lead', name: '' })
  }
  if (context.investmentId) {
    options.push({ id: context.investmentId, type: 'investment', name: '' })
  }
  return options
}

export function getQuickActivityDefaultValues(
  ownerEmployeeId: string,
  context: ActivityRecordEntityContext
): QuickActivityFormValues {
  const associationSeed = getPrimaryAssociationSeed(context)
  return {
    details: { title: '', description: '' },
    activityTypeRef: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    ownerEmployeeId,
    _pendingFiles: [],
    relatedEntityId: associationSeed.relatedEntityId ?? null,
    accountId: associationSeed.accountId ?? null,
    contactId: associationSeed.contactId ?? null,
    opportunityId: associationSeed.opportunityId ?? null,
    leadId: associationSeed.leadId ?? null,
    investmentId: associationSeed.investmentId ?? null
  }
}

function getPrimaryAssociationSeed(context: ActivityRecordEntityContext): Partial<QuickActivityFormValues> {
  const empty = {
    relatedEntityId: null as string | null,
    accountId: null as string | null,
    contactId: null as string | null,
    opportunityId: null as string | null,
    leadId: null as string | null,
    investmentId: null as string | null
  }

  if (context.accountId) {
    return { ...empty, accountId: context.accountId, relatedEntityId: context.accountId }
  }
  if (context.contactId) {
    return { ...empty, contactId: context.contactId, relatedEntityId: context.contactId }
  }
  if (context.opportunityId) {
    return { ...empty, opportunityId: context.opportunityId, relatedEntityId: context.opportunityId }
  }
  if (context.leadId) {
    return { ...empty, leadId: context.leadId, relatedEntityId: context.leadId }
  }
  if (context.investmentId) {
    return { ...empty, investmentId: context.investmentId, relatedEntityId: context.investmentId }
  }
  return empty
}

/** Mirrors ActivityForm create-mode entity seeding for association pickers. */
export function seedQuickActivityPrimaryEntity(
  form: UseFormReturn<QuickActivityFormValues>,
  context: ActivityRecordEntityContext
): void {
  const hasEntity = Boolean(
    form.getValues('accountId') ||
      form.getValues('contactId') ||
      form.getValues('opportunityId') ||
      form.getValues('leadId') ||
      form.getValues('investmentId')
  )
  if (hasEntity) {
    return
  }

  const seed = getPrimaryAssociationSeed(context)
  if (seed.accountId) {
    form.setValue('accountId', seed.accountId)
    form.setValue('relatedEntityId', seed.relatedEntityId)
    return
  }
  if (seed.contactId) {
    form.setValue('contactId', seed.contactId)
    form.setValue('relatedEntityId', seed.relatedEntityId)
    return
  }
  if (seed.opportunityId) {
    form.setValue('opportunityId', seed.opportunityId)
    form.setValue('relatedEntityId', seed.relatedEntityId)
    return
  }
  if (seed.leadId) {
    form.setValue('leadId', seed.leadId)
    form.setValue('relatedEntityId', seed.relatedEntityId)
    return
  }
  if (seed.investmentId) {
    form.setValue('investmentId', seed.investmentId)
    form.setValue('relatedEntityId', seed.relatedEntityId)
  }
}

export function mapQuickActivityFormToPayload(
  data: QuickActivityFormValues,
  context: ActivityRecordEntityContext
): Record<string, unknown> {
  const accountId = data.accountId ?? context.accountId ?? undefined
  const contactId = data.contactId ?? context.contactId ?? undefined
  const opportunityId = data.opportunityId ?? context.opportunityId ?? undefined
  const leadId = data.leadId ?? context.leadId ?? undefined
  const investmentId = data.investmentId ?? context.investmentId ?? undefined

  return {
    title: data.details.title,
    description: data.details.description,
    activityTypeRef: data.activityTypeRef,
    occurredAt: toISOFormat(data.occurredAt) || new Date().toISOString(),
    ownerEmployeeId: data.ownerEmployeeId,
    _pendingFiles: data._pendingFiles && data._pendingFiles.length > 0 ? data._pendingFiles : undefined,
    ...(accountId ? { accountId } : {}),
    ...(contactId ? { contactId } : {}),
    ...(opportunityId ? { opportunityId } : {}),
    ...(leadId ? { leadId } : {}),
    ...(investmentId ? { investmentId } : {})
  }
}
