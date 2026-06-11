import { Badge, useTranslation } from '@newwork/nw-design-system'
import { CHECKLIST_I18N_KEY, HINT_I18N_KEY } from '../../services/dataQualityCompute'
import type { DataQualityIssueCode } from '../../types/dataQuality.types'
import { FlowActionRow } from './FlowActionRow'
import translations from '../../_i18n'

export interface DataQualityChecklistItem {
  readonly id: string
  readonly label: string
  readonly satisfied: boolean
}

interface DataQualityChecklistProps {
  readonly checklist: DataQualityChecklistItem[]
  readonly employeeId: string | null
  readonly accessToken: string
  readonly onClose: () => void
  readonly onActionStarted?: (employeeId: string) => void
}

export function DataQualityChecklist({
  checklist,
  employeeId,
  accessToken,
  onClose,
  onActionStarted
}: Readonly<DataQualityChecklistProps>) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-3">
      {checklist.map(item => (
        <div
          key={item.id}
          className="gba:space-y-2 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3 gba:text-sm"
        >
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:min-w-0 gba:space-y-1">
              <p className="gba:font-medium gba:text-foreground">
                {CHECKLIST_I18N_KEY[item.id] ? t(CHECKLIST_I18N_KEY[item.id]) : item.label}
              </p>
              {!item.satisfied && HINT_I18N_KEY[item.id] && (
                <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground">{t(HINT_I18N_KEY[item.id])}</p>
              )}
            </div>
            <Badge variant={item.satisfied ? 'success' : 'destructive'} size="sm" className="gba:shrink-0">
              {item.satisfied ? t('detail-status-ok') : t('detail-status-missing')}
            </Badge>
          </div>
          {!item.satisfied && employeeId && (
            <div className="gba:w-full">
              <FlowActionRow
                issueCode={item.id as DataQualityIssueCode}
                employeeId={employeeId}
                accessToken={accessToken}
                onClose={onClose}
                onActionStarted={onActionStarted}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
