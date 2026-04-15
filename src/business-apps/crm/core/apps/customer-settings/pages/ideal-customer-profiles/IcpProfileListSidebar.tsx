import React from 'react'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { Button, Card, EmptyState, useTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'

export interface IcpProfileListItem {
  id: string
  code: string
  value: string
}

export interface IcpProfileListSidebarProps {
  filteredProfiles: IcpProfileListItem[]
  selectedId: string | null
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
  onRequestDelete: (profile: IcpProfileListItem) => void
  onRequestNew: () => void
  dataTestIdPrefix: string
}

export const IcpProfileListSidebar: React.FC<IcpProfileListSidebarProps> = ({
  filteredProfiles,
  selectedId,
  searchTerm,
  onSearchChange,
  onSelect,
  onRequestDelete,
  onRequestNew,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(customerSettingsI18n)

  return (
    <div className="gba:w-80 gba:flex-shrink-0">
      <Card className="gba:h-full">
        <div className="gba:p-4 gba:border-b">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('icp-profiles-heading')}</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRequestNew}
              data-testid={`${dataTestIdPrefix}-new-profile`}
            >
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('icp-new-profile')}
            </Button>
          </div>
          <DebouncedInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={t('icp-search-placeholder')}
            debounceDelay={300}
            data-testid={`${dataTestIdPrefix}-search`}
          />
        </div>
        <div className="gba:overflow-y-auto gba:max-h-[calc(100vh-280px)]">
          {filteredProfiles.length === 0 ? (
            <div className="gba:p-4">
              <EmptyState title={t('icp-no-profiles-title')} description={t('icp-no-profiles-hint')} />
            </div>
          ) : (
            <div className="gba:p-2">
              {filteredProfiles.map(p => {
                const isSelected = selectedId === p.id
                return (
                  <div
                    key={p.id}
                    className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:mb-1 ${
                      isSelected ? 'gba:bg-accent gba:text-accent-foreground' : 'hover:gba:bg-muted'
                    }`}
                  >
                    <button
                      type="button"
                      className="gba:flex-1 gba:min-w-0 gba:text-left gba:bg-transparent gba:border-0 gba:shadow-none gba:p-0 gba:m-0 gba:cursor-pointer gba:font-inherit gba:rounded-sm focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring"
                      onClick={() => onSelect(p.id)}
                      data-testid={`${dataTestIdPrefix}-profile-${p.code}`}
                      aria-pressed={isSelected}
                    >
                      <div className="gba:text-sm gba:font-medium gba:truncate">{p.value}</div>
                      <div className="gba:text-xs gba:text-muted-foreground">{p.code}</div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="gba:flex-shrink-0"
                      onClick={() => onRequestDelete(p)}
                      data-testid={`${dataTestIdPrefix}-delete-${p.code}`}
                      aria-label={t('icp-delete-profile-aria')}
                    >
                      <TrashIcon className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
