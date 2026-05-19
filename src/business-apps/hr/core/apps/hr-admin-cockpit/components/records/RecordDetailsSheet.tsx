import {
  Badge,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { CATEGORY_I18N_KEY, CHECKLIST_I18N_KEY, HINT_I18N_KEY } from '../../services/dataQualityCompute'
import type { DataQualityIssueCode, EmployeeAttentionRow } from '../../types/dataQuality.types'
import { EmployeeHeaderPanel } from './EmployeeHeaderPanel'
import { FlowActionRow } from './FlowActionRow'
import translations from '../../_i18n'

interface ChecklistItem {
  id: string
  label: string
  satisfied: boolean
}

interface RecordDetailsSheetProps {
  readonly selectedRow: EmployeeAttentionRow | null
  readonly setSelectedEmployeeId: (employeeId: string | null) => void
  readonly checklist: ChecklistItem[]
  readonly accessToken: string
  readonly onActionStarted?: (employeeId: string) => void
}

export function RecordDetailsSheet({
  selectedRow,
  setSelectedEmployeeId,
  checklist,
  accessToken,
  onActionStarted
}: Readonly<RecordDetailsSheetProps>) {
  const { t } = useTranslation(translations)

  return (
    <Sheet open={selectedRow !== null} onOpenChange={open => !open && setSelectedEmployeeId(null)}>
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">{selectedRow?.employeeName}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="gba:flex-1 gba:min-h-0">
          {selectedRow && <EmployeeHeaderPanel employeeId={selectedRow.employeeId} accessToken={accessToken} />}

          <div className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
            {selectedRow && selectedRow.missingFields.length > 0 && (
              <div className="gba:mb-6">
                <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:border-b gba:border-border gba:pb-2">
                  {t('detail-missing-data', { count: selectedRow.missingFields.length })}
                </h4>
                <TooltipProvider>
                  <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                    {selectedRow.missingFields.map(code => (
                      <Tooltip key={code}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={code === 'tax' || code === 'payroll_bank' ? 'destructive' : 'warning'}
                            size="sm"
                            className="gba:cursor-help"
                          >
                            {CATEGORY_I18N_KEY[code] ? t(CATEGORY_I18N_KEY[code]) : code}
                          </Badge>
                        </TooltipTrigger>
                        {HINT_I18N_KEY[code] && <TooltipContent>{t(HINT_I18N_KEY[code])}</TooltipContent>}
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            )}

            {checklist.length > 0 && (
              <div className="gba:mb-6">
                <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:border-b gba:border-border gba:pb-2">
                  {t('detail-completeness-checklist')}
                </h4>
                <div className="gba:space-y-3">
                  {checklist.map(item => (
                    <div key={item.id} className="gba:text-sm">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-muted-foreground">
                          {CHECKLIST_I18N_KEY[item.id] ? t(CHECKLIST_I18N_KEY[item.id]) : item.label}
                        </span>
                        <Badge variant={item.satisfied ? 'success' : 'destructive'} size="sm">
                          {item.satisfied ? t('detail-status-ok') : t('detail-status-missing')}
                        </Badge>
                      </div>
                      {!item.satisfied && HINT_I18N_KEY[item.id] && (
                        <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                          {t(HINT_I18N_KEY[item.id])}
                        </div>
                      )}
                      {!item.satisfied && selectedRow && (
                        <div className="gba:mt-1.5 gba:flex gba:justify-end">
                          <FlowActionRow
                            issueCode={item.id as DataQualityIssueCode}
                            employeeId={selectedRow.employeeId}
                            accessToken={accessToken}
                            onClose={() => setSelectedEmployeeId(null)}
                            onActionStarted={onActionStarted}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
