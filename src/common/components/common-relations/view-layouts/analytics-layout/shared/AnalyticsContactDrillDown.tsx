import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { AddressBookIcon, XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { commonContactFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'
import type { FilterConfiguration } from '@newwork/nw-design-system'

const LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(ContactTypeLabels).map(([key, label]) => [label, key])
)

const buildPreseededContactTypeConfig = (label: string, enumValue: string): FilterConfiguration => ({
  ...commonContactFilterConfig,
  groups: [
    {
      id: 'contact-type-group',
      label: 'Contact Type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'contactTypes',
          field: 'contactTypes',
          label: 'Contact Type',
          type: 'multi-select',
          config: { options: [{ id: enumValue, label }] }
        }
      ]
    },
    ...commonContactFilterConfig.groups
  ]
})

export interface AnalyticsContactDrillDownProps {
  context: BusinessAppContextProps
  config: ContactViewConfig<Contact, any>
  contactType?: string
  onClose: () => void
  moduleColor?: string
  additionalInitialFilters?: Record<string, any>
  titleOverride?: string
  cacheKey?: string
  dataTestId: string
}

export const AnalyticsContactDrillDown: React.FC<AnalyticsContactDrillDownProps> = ({
  context,
  config: baseConfig,
  contactType,
  onClose,
  moduleColor = 'default',
  additionalInitialFilters,
  titleOverride,
  cacheKey,
  dataTestId
}) => {
  const typeEnum = contactType ? (LABEL_TO_ENUM[contactType] ?? contactType) : undefined

  const config = useMemo(() => {
    if (!contactType) return baseConfig
    return {
      ...baseConfig,
      baseFilterConfig: buildPreseededContactTypeConfig(contactType, LABEL_TO_ENUM[contactType] ?? contactType)
    }
  }, [baseConfig, contactType])

  const panelTitle = titleOverride ?? (contactType ? `Contacts in ${contactType}` : 'Contacts')
  const baseFilters = typeEnum ? { contactTypes: [typeEnum] } : {}
  const mergedFilters = { ...baseFilters, ...additionalInitialFilters }

  return (
    <Card data-testid="contact-type-drill-down-panel" className="gba:w-full">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={AddressBookIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative />
          <CardTitle>{panelTitle}</CardTitle>
        </div>
        <button
          type="button"
          aria-label="Close contact drill-down panel"
          data-testid="contact-type-drill-down-panel-close"
          onClick={onClose}
          className="gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-1 gba:text-muted-foreground gba:transition-colors hover:gba:bg-accent hover:gba:text-accent-foreground"
        >
          <XIcon size={20} />
        </button>
      </CardHeader>
      <CardContent className="gba:px-6 gba:pb-6 gba:pt-0">
        <ContactLayout
          key={cacheKey ?? typeEnum ?? 'all'}
          context={context}
          config={config}
          dataTestId={dataTestId}
          initialFilters={mergedFilters}
          customPrimaryAction={<></>}
        />
      </CardContent>
    </Card>
  )
}

export default AnalyticsContactDrillDown
