import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { DirectReport } from '../hooks/useDirectReports'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type DirectMemberProps = {
  report: DirectReport
  handleNavigateToEmployee: (_employeeId: string) => void
}

export const DirectMember = ({ report, handleNavigateToEmployee }: DirectMemberProps) => {
  return (
    <button
      key={report.id}
      type="button"
      className="gba:flex gba:w-full gba:cursor-pointer gba:items-center gba:justify-between gba:rounded-lg gba:border-0 gba:bg-transparent gba:px-2 gba:py-2 gba:text-left gba:transition-colors gba:hover:bg-muted/50"
      data-testid={`manager-dashboard-direct-report-${report.id}`}
      onClick={() => handleNavigateToEmployee(report.id)}
      title={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.view_profile',
        `View ${report.fullName}'s profile`,
        { name: report.fullName }
      )}
    >
      <div className="gba:flex gba:items-center">
        <div className="gba:mr-3">
          <Avatar
            size="default"
            className="gba:h-10 gba:w-10"
            data-testid={`manager-dashboard-direct-report-avatar-${report.id}`}
          >
            <AvatarImage
              src={
                report.pictureThumbnail && !report.pictureThumbnail.startsWith('{')
                  ? `data:image/jpeg;base64,${report.pictureThumbnail}`
                  : undefined
              }
              alt={`${report.firstName} ${report.lastName}`}
            />
            <AvatarFallback>{`${report.firstName[0]}${report.lastName[0]}`.toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <div
            className="gba:font-medium gba:text-primary gba:hover:underline"
            data-testid={`manager-dashboard-direct-report-name-${report.id}`}
          >
            {report.displayName}
          </div>
          <div
            className="gba:text-sm gba:text-muted-foreground"
            data-testid={`manager-dashboard-direct-report-title-${report.id}`}
          >
            {report.jobPositionName ||
              getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.direct_report', 'Direct Report')}
          </div>
          {report.organizationalUnitName && (
            <div className="gba:text-xs gba:text-muted-foreground">{report.organizationalUnitName}</div>
          )}
          {/* Absence Information */}
          {report.status === 'On Leave' && report.currentAbsence && (
            <div
              className="gba:mt-1 gba:text-xs gba:text-warning"
              data-testid={`manager-dashboard-current-absence-${report.id}`}
            >
              {`${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_leave_since', 'On leave since')} ${formatDate(report.currentAbsence.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to').toLowerCase()} ${formatDate(report.currentAbsence.endDate)}`}
            </div>
          )}
          {report.status === 'Available' && report.nextAbsence && (
            <div
              className="gba:mt-1 gba:text-xs gba:font-medium gba:text-muted-foreground"
              data-testid={`manager-dashboard-next-absence-${report.id}`}
            >
              {`${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_leave_from', 'On leave from')} ${formatDate(report.nextAbsence.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to').toLowerCase()} ${formatDate(report.nextAbsence.endDate)}`}
            </div>
          )}
        </div>
      </div>
      <div className="gba:flex gba:flex-col gba:items-end">
        <Badge variant={report.status === 'On Leave' ? 'destructive' : 'outline'} size="sm" className="gba:mb-1">
          {report.status === 'On Leave'
            ? getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')
            : getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
        </Badge>
      </div>
    </button>
  )
}

export default DirectMember
