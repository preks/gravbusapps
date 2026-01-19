import React from 'react'
import { Pagination } from 'antd'
import { AbsenceListProps } from '../../../queries/types'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusBadgeVariant,
  getBadgeVariantBackgroundClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'

const AbsenceList: React.FC<AbsenceListProps> = ({
  absenceList,
  loading,
  error,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize
}) => {
  if (loading) {
    return (
      <div
        className="gba:loading-skeleton gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
        data-testid="absencehub-loading"
      >
        {[1, 2, 3].map(i => (
          <div key={i} className="gba:h-40 gba:bg-muted gba:rounded gba:animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:error-container gba:text-center gba:py-8" data-testid="absencehub-error">
        <div className="gba:text-destructive gba:text-lg gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load absence data.')}
        </div>
        <div className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again.')}
        </div>
      </div>
    )
  }

  // Paginated absence list
  const paginatedAbsenceList = absenceList.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
      {absenceList.length > 0 ? (
        <div
          className="gba:absenceListCards gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
          data-testid="absencehub-absence-list-cards"
        >
          {paginatedAbsenceList.map((absence, idx) => (
            <div
              key={idx + (currentPage - 1) * pageSize}
              className="gba:absence-card gba:border gba:rounded gba:p-4 gba:shadow-sm gba:bg-white gba:hover:shadow-md gba:transition-shadow"
              data-testid={`absence-card-${idx}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <div
                  className="gba:icon-container gba:p-2 gba:rounded-full"
                  style={{ backgroundColor: `${absence.typeColor}20` }}
                >
                  <span className="gba:icon">{absence.icon}</span>
                </div>
                <h4 className="gba:text-lg gba:font-medium">{absence.title}</h4>
              </div>

              <div className="gba:absence-details gba:mt-3">
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <div className="gba:text-muted-foreground">
                    {formatDate(absence.startDate, 'date.long')} - {formatDate(absence.endDate, 'date.long')}
                  </div>
                  <div
                    className={`gba:status-badge gba:px-3 gba:py-1 gba:rounded gba:text-sm ${getBadgeVariantBackgroundClass(getAbsenceStatusBadgeVariant(absence.originalStatus))}`}
                    data-testid={`absence-status-badge-${idx}`}
                  >
                    {absence.status}
                  </div>
                </div>

                <div className="gba:mb-2">
                  <span className="gba:text-muted-foreground gba:mr-1">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}
                    :
                  </span>
                  <span>{absence.duration}</span>
                </div>

                {absence.description && (
                  <div className="gba:mb-2 gba:text-foreground">
                    <span className="gba:text-muted-foreground gba:mr-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.document_layout.document_table.description',
                        'Description'
                      )}
                      :
                    </span>
                    <span>{absence.description}</span>
                  </div>
                )}

                <div className="gba:text-muted-foreground gba:text-sm gba:mt-3 gba:text-right">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.requested_on', 'Requested on')}:{' '}
                  {formatDate(absence.requestDate, 'date.short')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="gba:absenceListEmpty gba:text-center gba:py-8 gba:text-muted-foreground"
          data-testid="absencehub-absence-list-empty"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.no_absences_found', 'No absences found.')}
        </div>
      )}

      {absenceList.length > pageSize && (
        <div
          className="gba:absenceListPagination gba:mt-6 gba:flex gba:justify-center"
          data-testid="absencehub-absence-list-pagination"
        >
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={absenceList.length}
            showSizeChanger
            pageSizeOptions={['10', '20', '50']}
            onChange={(page: number, size?: number) => {
              setCurrentPage(page)
              if (size) setPageSize(size)
            }}
            showTotal={(total: number, range: [number, number]) =>
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.pagination',
                '{{range0}}-{{range1}} of {{total}}',
                { range0: range[0], range1: range[1], total }
              )
            }
            locale={{
              items_per_page: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.per_page', '/ page')
            }}
          />
        </div>
      )}
    </>
  )
}

export default AbsenceList
