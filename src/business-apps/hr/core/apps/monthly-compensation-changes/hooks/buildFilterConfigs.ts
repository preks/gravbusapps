type TranslationFn = (key: string) => string

interface FilterOption {
  readonly id: string
  readonly label: string
}

function legalEntityGroup(t: TranslationFn, options: FilterOption[]) {
  return {
    id: 'entity-group',
    label: t('filter-group-legal-entity'),
    collapsible: true,
    filters: [
      {
        id: 'legalEntity',
        field: 'legalEntity',
        label: t('filter-group-legal-entity'),
        type: 'multi-select' as const,
        config: { options }
      }
    ]
  }
}

function statusGroup(t: TranslationFn, options: FilterOption[]) {
  return {
    id: 'status-group',
    label: t('filter-group-status'),
    collapsible: true,
    filters: [
      {
        id: 'status',
        field: 'status',
        label: t('filter-group-status'),
        type: 'multi-select' as const,
        config: { options }
      }
    ]
  }
}

export function buildChangesFilterConfig(t: TranslationFn, companyOptions: FilterOption[]) {
  return {
    id: 'changes-filters',
    name: t('filter-changes-title'),
    groups: [
      legalEntityGroup(t, companyOptions),
      statusGroup(t, [
        { id: 'Approved', label: t('status-approved') },
        { id: 'Pending', label: t('status-pending') },
        { id: 'Activation', label: t('status-activation') },
        { id: 'Deactivation', label: t('status-deactivation') }
      ])
    ]
  }
}

export function buildBenefitsFilterConfig(
  t: TranslationFn,
  companyOptions: FilterOption[],
  providerOptions: FilterOption[]
) {
  return {
    id: 'benefits-filters',
    name: t('filter-benefits-title'),
    groups: [
      legalEntityGroup(t, companyOptions),
      {
        id: 'provider-group',
        label: t('filter-group-provider'),
        collapsible: true,
        filters: [
          {
            id: 'provider',
            field: 'provider',
            label: t('filter-group-provider'),
            type: 'multi-select' as const,
            config: { options: providerOptions }
          }
        ]
      },
      statusGroup(t, [
        { id: 'Active', label: t('status-active') },
        { id: 'Inactive', label: t('status-inactive') },
        { id: 'Pending', label: t('status-pending') }
      ])
    ]
  }
}
