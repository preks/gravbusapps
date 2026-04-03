import React from 'react'
import {
  Input,
  Label,
  Combobox,
  Checkbox,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { CaretDown, CaretUp, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { IconSelect } from '@/components/icon-select/IconSelect'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { DebugSection } from '../../../segments/DebugSection'
import { PLACEHOLDER_DISPLAY_NAME, PLACEHOLDER_MENU_ENTRY_NAME } from '../constants'
import type { MenuEntryRow, MenuSpaceType, UrlRow } from '../types'
import { getUrlEffectiveName, getMenuEntryEffectiveName } from '../utils'
import { getSpaceLabel } from '../../../menuPathUtils'
import { formatIconForDB, parseIconName } from '../../../../../utils/iconUtils'

const SIMPLE_URL_ROW_INDEX = 0

export interface SimpleModeContentProps {
  state: {
    code: string
    setCode: (v: string) => void
    name: string
    setName: (v: string) => void
    componentPath: string
    setComponentPath: (v: string) => void
    setComponentPathError: (v: string | null) => void
    componentPathError: string | null
    componentVersion: string
    setComponentVersion: (v: string) => void
    codeUnifiedWarning: boolean
    simpleModeFirstRow: UrlRow | undefined
    handleUrlRowChange: (index: number, field: keyof UrlRow, value: string | string[] | boolean) => void
    selectedMenuSpace: MenuSpaceType
    setSelectedMenuSpace: (v: MenuSpaceType) => void
    advancedSelectPathOptions: { value: string; label: string }[]
    pathOptionById: Map<string, { path: string; item: MenuItemDTO }>
    handleMenuEntryPathSelect: (urlRowIndex: number, menuEntryIndex: number, selectedNodeId: string) => void
    handleAddMenuEntryAdvanced: (urlRowIndex: number) => void
    handleReorderMenuEntryAdvanced: (urlRowIndex: number, entryIndex: number, direction: 'up' | 'down') => void
    handleRemoveMenuEntry: (urlRowIndex: number, menuEntryIndex: number) => void
    handleMenuEntryChange: (
      urlRowIndex: number,
      menuEntryIndex: number,
      field: keyof MenuEntryRow,
      value: string | null | boolean
    ) => void
    debugSteps: { order: number; method: string; endpoint: string; payload: unknown; note?: string }[]
    dataTestId: string
    roleOptions: { id: string; name: string }[]
    featureOptions: { id: string; name: string }[]
  }
}

const emptyRow: UrlRow = {
  url: '',
  roles: [],
  features: [],
  menuEntries: [],
  flows: [],
  useCustomName: false,
  customName: ''
}

export function SimpleModeContent({ state }: SimpleModeContentProps) {
  const {
    code,
    setCode,
    name,
    setName,
    componentPath,
    setComponentPath,
    setComponentPathError,
    componentPathError,
    componentVersion,
    setComponentVersion,
    codeUnifiedWarning,
    simpleModeFirstRow,
    handleUrlRowChange,
    selectedMenuSpace,
    setSelectedMenuSpace,
    advancedSelectPathOptions,
    pathOptionById,
    handleMenuEntryPathSelect,
    handleAddMenuEntryAdvanced,
    handleReorderMenuEntryAdvanced,
    handleRemoveMenuEntry,
    handleMenuEntryChange,
    debugSteps,
    dataTestId,
    roleOptions,
    featureOptions
  } = state

  const urlRow = simpleModeFirstRow ?? emptyRow
  const urlEffectiveName = getUrlEffectiveName(urlRow, name.trim())
  const menuEntries = urlRow.menuEntries

  return (
    <div className="gba:space-y-8 gba:py-4 gba:px-1">
      <section className="gba:space-y-4">
        {codeUnifiedWarning && (
          <p
            className="gba:text-xs gba:text-amber-600 gba:bg-amber-500/10 gba:px-3 gba:py-2 gba:rounded-md"
            data-testid={`${dataTestId}-code-unified-warning`}
          >
            Alle Codes werden vereinheitlicht.
          </p>
        )}
        <div className="gba:grid gba:grid-cols-[minmax(0,10rem)_1fr] gba:gap-4">
          <div className="gba:space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. my-screen"
              className="gba:w-full"
              data-testid={`${dataTestId}-code`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Display name"
              className="gba:w-full"
              data-testid={`${dataTestId}-name`}
            />
          </div>
        </div>
        <div className="gba:grid gba:grid-cols-[1fr_minmax(0,6rem)] gba:gap-4">
          <div className="gba:space-y-2 gba:min-w-0">
            <Label htmlFor="componentPath">Component path *</Label>
            <Input
              id="componentPath"
              value={componentPath}
              onChange={e => {
                setComponentPath(e.target.value)
                setComponentPathError(null)
              }}
              placeholder="/module/core/apps/my-screen"
              className={`gba:w-full ${componentPathError ? 'gba:border-destructive' : ''}`}
              data-testid={`${dataTestId}-component-path`}
            />
            {componentPathError && (
              <p className="gba:text-sm gba:text-destructive" data-testid={`${dataTestId}-component-path-error`}>
                {componentPathError}
              </p>
            )}
          </div>
          <div className="gba:space-y-2 gba:min-w-0">
            <Label htmlFor="componentVersion">Version</Label>
            <Input
              id="componentVersion"
              value={componentVersion}
              onChange={e => setComponentVersion(e.target.value)}
              placeholder="1.0.0"
              className="gba:w-full"
              data-testid={`${dataTestId}-component-version`}
            />
          </div>
        </div>
      </section>
      <section className="gba:space-y-4 gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-muted/10">
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              id={`${dataTestId}-url-use-custom-name-0`}
              checked={simpleModeFirstRow?.useCustomName ?? false}
              onCheckedChange={c => handleUrlRowChange(SIMPLE_URL_ROW_INDEX, 'useCustomName', c === true)}
              data-testid={`${dataTestId}-url-use-custom-name-0`}
            />
            {simpleModeFirstRow?.useCustomName ? (
              <Input
                value={simpleModeFirstRow.customName ?? ''}
                onChange={e => handleUrlRowChange(SIMPLE_URL_ROW_INDEX, 'customName', e.target.value)}
                placeholder={PLACEHOLDER_DISPLAY_NAME}
                className="gba:flex-1 gba:min-w-0 gba:max-w-sm"
                data-testid={`${dataTestId}-url-custom-name-0`}
              />
            ) : (
              <span className="gba:text-sm gba:text-muted-foreground">{urlEffectiveName}</span>
            )}
          </div>
        </div>
        <div className="gba:space-y-2 gba:pb-3 gba:border-b gba:border-border">
          <Label
            htmlFor={`${dataTestId}-url-input-0`}
            className="gba:text-xs gba:font-medium gba:text-muted-foreground"
          >
            URL
          </Label>
          <Input
            id={`${dataTestId}-url-input-0`}
            value={simpleModeFirstRow?.url ?? ''}
            onChange={e => handleUrlRowChange(SIMPLE_URL_ROW_INDEX, 'url', e.target.value)}
            placeholder="/platform/apps/my-screen"
            className={`gba:w-full ${simpleModeFirstRow?.urlError ? 'gba:border-destructive' : ''}`}
            data-testid={`${dataTestId}-url-0`}
          />
          {simpleModeFirstRow?.urlError && (
            <p className="gba:text-xs gba:text-destructive gba:mt-0.5">{simpleModeFirstRow.urlError}</p>
          )}
        </div>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <Combobox
            mode="multiple"
            options={roleOptions.map(r => ({ value: r.id, label: r.name }))}
            value={simpleModeFirstRow?.roles ?? []}
            onValueChange={v => handleUrlRowChange(SIMPLE_URL_ROW_INDEX, 'roles', Array.isArray(v) ? v : v ? [v] : [])}
            placeholder="Roles"
            data-testid={`${dataTestId}-url-roles-0`}
          />
          <Combobox
            mode="multiple"
            options={featureOptions.map(f => ({ value: f.id, label: f.name }))}
            value={simpleModeFirstRow?.features ?? []}
            onValueChange={v =>
              handleUrlRowChange(SIMPLE_URL_ROW_INDEX, 'features', Array.isArray(v) ? v : v ? [v] : [])
            }
            placeholder="Features"
            data-testid={`${dataTestId}-url-features-0`}
          />
        </div>
        <div className="gba:pt-3 gba:border-t gba:border-border gba:space-y-3">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Menu entries</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
            Optional. Choose a space, then one path per entry. Multiple entries link this URL under different menu
            nodes.
          </p>
          <div className="gba:mb-1">
            <Select
              value={selectedMenuSpace}
              onValueChange={v => setSelectedMenuSpace(v as MenuSpaceType)}
              data-testid={`${dataTestId}-simple-menu-space-select`}
            >
              <SelectTrigger className="gba:w-[10rem] gba:h-9">
                <SelectValue placeholder="Space" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USE">{getSpaceLabel('USE')}</SelectItem>
                <SelectItem value="CREATE">{getSpaceLabel('CREATE')}</SelectItem>
                <SelectItem value="MANAGE">{getSpaceLabel('MANAGE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/5 gba:p-4">
            {menuEntries.map((entry, entryIndex) => {
              const placementNodeId = entry.parentId ?? entry.hubId ?? ''
              const pathSelectValue =
                placementNodeId && pathOptionById.has(placementNodeId)
                  ? placementNodeId
                  : (Array.from(pathOptionById.entries()).find(
                      ([, { path }]) => path === (entry.pathString ?? '')
                    )?.[0] ?? '')
              return (
                <div
                  key={entryIndex}
                  className="gba:flex gba:flex-wrap gba:items-end gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border/60"
                >
                  <div className="gba:flex-1 gba:min-w-[12rem] gba:space-y-1">
                    <Label className="gba:text-xs gba:text-muted-foreground">Path</Label>
                    <Combobox
                      options={advancedSelectPathOptions}
                      value={pathSelectValue}
                      onValueChange={id =>
                        id != null && handleMenuEntryPathSelect(SIMPLE_URL_ROW_INDEX, entryIndex, id)
                      }
                      placeholder="e.g. Use / My Hub / Section"
                      searchPlaceholder="Search path..."
                      className="gba:w-full"
                      data-testid={`${dataTestId}-simple-select-path-${entryIndex}`}
                    />
                  </div>
                  <div
                    className="gba:flex gba:items-center gba:gap-2 gba:pb-0.5"
                    data-testid={`${dataTestId}-simple-menu-icon-${entryIndex}`}
                  >
                    <IconSelect
                      value={parseIconName(entry.icon)}
                      onValueChange={v =>
                        handleMenuEntryChange(SIMPLE_URL_ROW_INDEX, entryIndex, 'icon', formatIconForDB(v))
                      }
                      className="gba:h-8 gba:w-8"
                    />
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Checkbox
                      id={`${dataTestId}-simple-select-use-custom-name-${entryIndex}`}
                      checked={entry.useCustomName ?? false}
                      onCheckedChange={c =>
                        handleMenuEntryChange(SIMPLE_URL_ROW_INDEX, entryIndex, 'useCustomName', c === true)
                      }
                      data-testid={`${dataTestId}-simple-select-use-custom-name-${entryIndex}`}
                      aria-label="Name override"
                    />
                    {entry.useCustomName ? (
                      <Input
                        value={entry.name ?? ''}
                        onChange={e => handleMenuEntryChange(SIMPLE_URL_ROW_INDEX, entryIndex, 'name', e.target.value)}
                        placeholder={PLACEHOLDER_MENU_ENTRY_NAME}
                        className="gba:w-44 gba:min-w-0"
                        data-testid={`${dataTestId}-simple-select-entry-name-${entryIndex}`}
                      />
                    ) : (
                      <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[10rem]">
                        {pathSelectValue ? getMenuEntryEffectiveName(entry, urlEffectiveName) : '-'}
                      </span>
                    )}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8"
                      onClick={() => handleReorderMenuEntryAdvanced(SIMPLE_URL_ROW_INDEX, entryIndex, 'up')}
                      disabled={entryIndex === 0}
                      aria-label="Move up"
                      data-testid={`${dataTestId}-simple-select-move-up-${entryIndex}`}
                    >
                      <CaretUp size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8"
                      onClick={() => handleReorderMenuEntryAdvanced(SIMPLE_URL_ROW_INDEX, entryIndex, 'down')}
                      disabled={entryIndex === menuEntries.length - 1}
                      aria-label="Move down"
                      data-testid={`${dataTestId}-simple-select-move-down-${entryIndex}`}
                    >
                      <CaretDown size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8 gba:text-muted-foreground gba:hover:text-destructive"
                      onClick={() => handleRemoveMenuEntry(SIMPLE_URL_ROW_INDEX, entryIndex)}
                      aria-label="Remove entry"
                      data-testid={`${dataTestId}-simple-select-remove-${entryIndex}`}
                    >
                      <TrashIcon size={16} />
                    </Button>
                  </div>
                </div>
              )
            })}
            <div className="gba:flex gba:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddMenuEntryAdvanced(SIMPLE_URL_ROW_INDEX)}
                data-testid={`${dataTestId}-simple-select-add-entry`}
              >
                <PlusIcon size={14} className="gba:mr-1" />
                Add menu entry
              </Button>
            </div>
          </div>
        </div>
      </section>
      <DebugSection steps={debugSteps} data-testid={dataTestId} />
    </div>
  )
}
