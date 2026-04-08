/** Matches `EntitySelectOption.type` / relation hooks (lowercase). */
export type TaskTemplateHydratableEntityType = 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'

/** Maps template form enum (e.g. ACCOUNT) to EntitySelect / GraphQL hook entity `type`. */
export function templateEnumToEntitySelectType(value: string): TaskTemplateHydratableEntityType | null {
  const map: Record<string, TaskTemplateHydratableEntityType> = {
    ACCOUNT: 'account',
    CONTACT: 'contact',
    OPPORTUNITY: 'opportunity',
    LEAD: 'lead',
    INVESTMENT: 'investment'
  }
  return map[value] ?? null
}

/** Maps EntitySelect row `type` (lowercase) to stored template enum (e.g. ACCOUNT). */
export function entitySelectTypeToTemplateEnum(type: string): string {
  const map: Record<string, string> = {
    account: 'ACCOUNT',
    contact: 'CONTACT',
    opportunity: 'OPPORTUNITY',
    lead: 'LEAD',
    investment: 'INVESTMENT'
  }
  return map[type] || ''
}
