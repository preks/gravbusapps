import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, ChevronRight, ClipboardList } from 'lucide-react'
import translations from '../_i18n'
import { useLearningAssignments } from '../hooks/useLearningAssignments'
import type { LearningAssignmentGroup } from '../types'

interface AssignmentsTabProps {
  accessToken?: string
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

interface SummaryMetricProps {
  label: string
  value: number
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({ label, value }) => (
  <div className="gba:min-w-0">
    <div className="gba:text-sm gba:font-semibold gba:leading-none">{value}</div>
    <div className="gba:mt-0.5 gba:text-[11px] gba:leading-tight gba:text-muted-foreground">{label}</div>
  </div>
)

interface CourseCardProps {
  group: LearningAssignmentGroup
  onSelect: (courseId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

const CourseAssignmentCard: React.FC<CourseCardProps> = ({ group, onSelect, t }) => (
  <button
    type="button"
    className="gba:block gba:w-full gba:rounded-lg gba:text-left gba:transition hover:gba:bg-muted/50 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring"
    onClick={() => onSelect(group.courseId)}
    data-testid={`learning-assignment-card-${group.courseId}`}
  >
    <Card className="gba:border-muted/70">
      <CardContent className="gba:p-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:min-w-0 gba:flex-1">
            <CardTitle className="gba:truncate gba:text-sm gba:leading-tight">{group.courseTitle}</CardTitle>
            <p className="gba:mt-0.5 gba:text-[11px] gba:leading-tight gba:text-muted-foreground">
              {t('learning-assignments-card-subtitle', { count: group.assignments.length })}
            </p>
          </div>
          <div className="gba:grid gba:flex-1 gba:grid-cols-5 gba:gap-2 gba:text-right">
            <SummaryMetric label={t('learning-assignments-metric-assigned')} value={group.summary.assigned} />
            <SummaryMetric label={t('learning-assignments-metric-in-progress')} value={group.summary.inProgress} />
            <SummaryMetric label={t('learning-assignments-metric-submitted')} value={group.summary.submittedOrGraded} />
            <SummaryMetric label={t('learning-assignments-metric-passed')} value={group.summary.passed} />
            <SummaryMetric label={t('learning-assignments-metric-overdue')} value={group.summary.overdue} />
          </div>
          <ChevronRight className="gba:h-4 gba:w-4 gba:flex-none gba:text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  </button>
)

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const { groups, loading, error, refetch } = useLearningAssignments(accessToken)
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null)
  const selectedGroup = React.useMemo(
    () => groups.find(group => group.courseId === selectedCourseId) ?? null,
    [groups, selectedCourseId]
  )

  React.useEffect(() => {
    const handleAssignmentCreated = () => {
      refetch().catch(() => undefined)
    }
    globalThis.addEventListener('learning-assignment-created', handleAssignmentCreated)
    return () => globalThis.removeEventListener('learning-assignment-created', handleAssignmentCreated)
  }, [refetch])

  React.useEffect(() => {
    if (selectedCourseId && groups.length > 0 && !selectedGroup) {
      setSelectedCourseId(null)
    }
  }, [groups, selectedCourseId, selectedGroup])

  return (
    <div className="gba:space-y-3" data-testid="learning-assignments-tab">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <ClipboardList className="gba:h-5 gba:w-5" />
                {t('learning-assignments-title')}
              </CardTitle>
              <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('learning-assignments-description')}</p>
            </div>
            {loading && <Spinner className="gba:h-5 gba:w-5" />}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive">
              {error}
            </div>
          )}
          {!loading && groups.length === 0 && (
            <div className="gba:rounded-lg gba:border gba:border-dashed gba:p-8 gba:text-center gba:text-sm gba:text-muted-foreground">
              {t('learning-assignments-empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedGroup &&
        groups.map(group => (
          <CourseAssignmentCard key={group.courseId} group={group} onSelect={setSelectedCourseId} t={t} />
        ))}

      {selectedGroup && (
        <Card data-testid={`learning-assignment-detail-${selectedGroup.courseId}`}>
          <CardHeader>
            <div className="gba:space-y-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCourseId(null)}>
                <ArrowLeft className="gba:mr-2 gba:h-4 gba:w-4" />
                {t('learning-assignments-back')}
              </Button>
              <div>
                <CardTitle>{selectedGroup.courseTitle}</CardTitle>
                <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  {t('learning-assignments-detail-description')}
                </p>
              </div>
              <div className="gba:grid gba:grid-cols-2 gba:gap-3 sm:gba:grid-cols-5">
                <SummaryMetric
                  label={t('learning-assignments-metric-assigned')}
                  value={selectedGroup.summary.assigned}
                />
                <SummaryMetric
                  label={t('learning-assignments-metric-in-progress')}
                  value={selectedGroup.summary.inProgress}
                />
                <SummaryMetric
                  label={t('learning-assignments-metric-submitted')}
                  value={selectedGroup.summary.submittedOrGraded}
                />
                <SummaryMetric label={t('learning-assignments-metric-passed')} value={selectedGroup.summary.passed} />
                <SummaryMetric label={t('learning-assignments-metric-overdue')} value={selectedGroup.summary.overdue} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:overflow-hidden gba:rounded-lg gba:border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('learning-assignments-employee')}</TableHead>
                    <TableHead>{t('learning-assignments-assignment-status')}</TableHead>
                    <TableHead>{t('learning-assignments-attempt-status')}</TableHead>
                    <TableHead>{t('learning-assignments-started')}</TableHead>
                    <TableHead>{t('learning-assignments-submitted')}</TableHead>
                    <TableHead>{t('learning-assignments-score')}</TableHead>
                    <TableHead>{t('learning-assignments-due')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGroup.rows.map(row => (
                    <TableRow
                      key={`${row.employeeId}-${row.assignmentTargetId ?? row.attemptId ?? row.availableUntil}`}
                    >
                      <TableCell className="gba:font-medium">{row.employeeName}</TableCell>
                      <TableCell>{row.assignmentStatusLabel}</TableCell>
                      <TableCell>{row.attemptStatusLabel}</TableCell>
                      <TableCell>{formatDate(row.startedAt)}</TableCell>
                      <TableCell>{formatDate(row.submittedAt ?? row.gradedAt)}</TableCell>
                      <TableCell>{row.scorePct === undefined ? '-' : `${row.scorePct}%`}</TableCell>
                      <TableCell>{formatDate(row.availableUntil)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
