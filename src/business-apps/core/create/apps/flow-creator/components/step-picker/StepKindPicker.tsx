import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { StepKindId, StepKindPickerMode } from './stepKindTypes'
import type { DesignerMode } from '../../types/studioTypes'
import { STEP_KIND_GROUP_LABEL_KEYS, visibleStepKindGroups, type StepKindOption } from './stepKindOptions'
import { TruncatedTileText, TruncatedTileTextGroup } from './TruncatedTileText'

interface StepKindPickerProps {
  designerMode: DesignerMode
  pickerMode?: StepKindPickerMode
  selectedId?: StepKindId
  onSelect: (option: StepKindOption) => void
  className?: string
  'data-testid'?: string
}

export const StepKindPicker: React.FC<StepKindPickerProps> = ({
  designerMode,
  pickerMode = 'insert',
  selectedId,
  onSelect,
  className,
  'data-testid': testId = 'flow-studio-step-kind-picker'
}) => {
  const { t } = useTranslation(translations)
  const groups = visibleStepKindGroups(designerMode, pickerMode, selectedId)

  return (
    <TruncatedTileTextGroup>
      <div className={['gba:flex gba:flex-col gba:gap-4', className].filter(Boolean).join(' ')} data-testid={testId}>
        {groups.map(group => (
          <div key={group.id} className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-group-${group.id}`}>
            <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
              {t(STEP_KIND_GROUP_LABEL_KEYS[group.id])}
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              {group.options.map(opt => {
                const isSelected = selectedId === opt.id
                const title = t(opt.labelKey)
                const description = t(opt.descriptionKey)
                return (
                  <Button
                    key={opt.id}
                    className={[
                      'gba:w-full gba:h-auto gba:justify-start gba:text-left gba:overflow-hidden gba:py-3 gba:px-3 gba:flex gba:items-center gba:gap-3',
                      isSelected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
                    ].join(' ')}
                    type="button"
                    variant="outline"
                    onClick={() => onSelect(opt)}
                    data-testid={`${testId}-tile-${opt.id}`}
                  >
                    <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-muted gba:text-foreground">
                      <opt.Icon className="gba:h-4 gba:w-4" />
                    </div>
                    <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:items-start gba:overflow-hidden gba:leading-tight">
                      <TruncatedTileText text={title} variant="title" data-testid={`${testId}-tile-${opt.id}-title`} />
                      <TruncatedTileText
                        text={description}
                        variant="description"
                        data-testid={`${testId}-tile-${opt.id}-description`}
                      />
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </TruncatedTileTextGroup>
  )
}
