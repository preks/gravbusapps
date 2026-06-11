import { useCallback, useMemo, useState, type ElementType } from 'react'
import { ArrowRightIcon, BriefcaseIcon, FileCodeIcon, UserIcon } from '@phosphor-icons/react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { buildIssueDetail, CATEGORY_I18N_KEY, HINT_I18N_KEY, ISSUE_I18N_KEY } from '../services/dataQualityCompute'
import type { DataQualityIssueCode, TopUrgentRecord } from '../types/dataQuality.types'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import { useEmployeeActionRefresh } from '../hooks/useEmployeeActionRefresh'
import { DataQualityChecklist } from './records/DataQualityChecklist'
import { EmployeeHeaderPanel } from './records/EmployeeHeaderPanel'
import { severityToBadgeStatus, severityToLabel } from './records/RecordsTable'
import translations from '../_i18n'

const ENTITY_ICON: Record<string, ElementType> = {
  employee: UserIcon,
  job_position: BriefcaseIcon,
  job_profile: FileCodeIcon
}

function getIssueLabelKey(code: DataQualityIssueCode): string {
  return ISSUE_I18N_KEY[code] ?? CATEGORY_I18N_KEY[code] ?? code
}

interface TopUrgentRecordsCardProps {
  readonly accessToken: string
  readonly onViewAll: () => void
  readonly onNonEmployeeReview: (record: TopUrgentRecord) => void
}

export function TopUrgentRecordsCard({
  accessToken,
  onViewAll,
  onNonEmployeeReview
}: Readonly<TopUrgentRecordsCardProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()
  const handleActionStarted = useEmployeeActionRefresh()
  const totalIssues = useMemo(() => {
    const employeeIds = new Set(
      ctx.recordsNeedingAttention.filter(record => record.entityKind === 'employee').map(record => record.entityId)
    )
    return employeeIds.size
  }, [ctx.recordsNeedingAttention])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const selectedRecord = useMemo(
    () =>
      selectedEmployeeId
        ? (ctx.topUrgentRecords.find(r => r.entityKind === 'employee' && r.entityId === selectedEmployeeId) ?? null)
        : null,
    [selectedEmployeeId, ctx.topUrgentRecords]
  )

  const checklist = useMemo(() => {
    if (!selectedEmployeeId) return []
    const dummy = ctx.recordsNeedingAttention.find(
      r => r.entityKind === 'employee' && r.entityId === selectedEmployeeId
    )
    if (!dummy) return []
    return buildIssueDetail(dummy, ctx.employeeById).checklist
  }, [selectedEmployeeId, ctx.recordsNeedingAttention, ctx.employeeById])

  const handleRowClick = useCallback(
    (record: TopUrgentRecord) => {
      if (record.entityKind === 'employee') setSelectedEmployeeId(record.entityId)
      else onNonEmployeeReview(record)
    },
    [onNonEmployeeReview]
  )

  if (ctx.loading) return <Spinner />

  const displayMissingFields = selectedRecord?.missingFields ?? []

  return (
    <>
      <Card className="gba:h-full">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:font-semibold">{t('section-top-urgent')}</CardTitle>
          <p className="gba:text-xs gba:text-muted-foreground">{t('top-urgent-subtitle')}</p>
        </CardHeader>
        <CardContent>
          {ctx.topUrgentRecords.length === 0 ? (
            <EmptyState type="no-data" compact title={t('empty-no-actions')} description={t('empty-healthy')} />
          ) : (
            <>
              <Table className="gba:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('top-urgent-col-record')}</TableHead>
                    <TableHead>{t('top-urgent-col-legal-entity')}</TableHead>
                    <TableHead>{t('top-urgent-col-missing')}</TableHead>
                    <TableHead>{t('top-urgent-col-severity')}</TableHead>
                    <TableHead className="gba:text-right">{t('top-urgent-col-action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ctx.topUrgentRecords.map(record => {
                    const Icon = ENTITY_ICON[record.entityKind] ?? UserIcon
                    return (
                      <TableRow
                        key={`${record.entityKind}:${record.entityId}`}
                        className="gba:cursor-pointer hover:gba:bg-muted/50"
                        onClick={() => handleRowClick(record)}
                      >
                        <TableCell>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Icon className="gba:size-4 gba:text-muted-foreground gba:shrink-0" />
                            <span className="gba:font-medium gba:truncate gba:max-w-40">{record.entityLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="gba:text-muted-foreground">{record.legalEntity ?? '-'}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="gba:flex gba:flex-wrap gba:gap-1">
                              {record.missingFields.slice(0, 2).map(code => (
                                <Tooltip key={code}>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant={code === 'tax' || code === 'payroll_bank' ? 'destructive' : 'warning'}
                                      size="sm"
                                      className="gba:cursor-help"
                                    >
                                      {t(getIssueLabelKey(code))}
                                    </Badge>
                                  </TooltipTrigger>
                                  {HINT_I18N_KEY[code] && <TooltipContent>{t(HINT_I18N_KEY[code])}</TooltipContent>}
                                </Tooltip>
                              ))}
                              {record.missingFields.length > 2 && (
                                <Badge variant="secondary" size="sm">
                                  +{record.missingFields.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            size="sm"
                            status={severityToBadgeStatus(record.severity)}
                            leftLabel={severityToLabel(t, record.severity)}
                          />
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              handleRowClick(record)
                            }}
                          >
                            {t('top-urgent-btn-review')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {totalIssues > 0 && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-info gba:mt-3 hover:gba:underline"
                >
                  {t('top-urgent-view-all-issues', { count: totalIssues })}
                  <ArrowRightIcon className="gba:size-3.5" />
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={selectedRecord !== null} onOpenChange={open => !open && setSelectedEmployeeId(null)}>
        <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0">
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">{selectedRecord?.entityLabel}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="gba:flex-1 gba:min-h-0">
            {selectedEmployeeId && <EmployeeHeaderPanel employeeId={selectedEmployeeId} accessToken={accessToken} />}

            <div className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
              {displayMissingFields.length > 0 && (
                <div className="gba:mb-6">
                  <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:border-b gba:border-border gba:pb-2">
                    {t('detail-missing-data', { count: displayMissingFields.length })}
                  </h4>
                  <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                    {displayMissingFields.map(code => (
                      <Badge
                        key={code}
                        variant={code === 'tax' || code === 'payroll_bank' ? 'destructive' : 'warning'}
                        size="sm"
                      >
                        {t(getIssueLabelKey(code))}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {checklist.length > 0 && (
                <div className="gba:mb-6">
                  <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:border-b gba:border-border gba:pb-2">
                    {t('detail-completeness-checklist')}
                  </h4>
                  <DataQualityChecklist
                    checklist={checklist}
                    employeeId={selectedEmployeeId}
                    accessToken={accessToken}
                    onClose={() => setSelectedEmployeeId(null)}
                    onActionStarted={handleActionStarted}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
