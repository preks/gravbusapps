import React, { useState } from 'react'
import { Button, Badge, DataTable, Sheet, SheetContent } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { CaretLeftIcon as ChevronLeft } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OpenJobPosition, JobPosition } from '../hooks/useOpenJobPositions'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'

const ViewDetailsAction: React.FC<{ id: string; onClick: (id: string) => void }> = ({ id, onClick }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={e => {
      e.stopPropagation()
      onClick(id)
    }}
    data-testid={`manager-dashboard-open-position-details-${id}`}
  >
    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.view_details', 'View Details')}
  </Button>
)

const positionColumns: ColumnDef<OpenJobPosition>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: () =>
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_positions_section.position', 'Position'),
    size: 200,
    cell: ({ row }) => (
      <div className="gba:flex gba:flex-col">
        <span className="gba:font-medium">{row.original.name}</span>
        {row.original.jobLevelName && (
          <span className="gba:text-sm gba:text-muted-foreground">{row.original.jobLevelName}</span>
        )}
      </div>
    )
  },
  {
    id: 'department',
    accessorKey: 'organizationalUnitName',
    header: () => getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department'),
    size: 150,
    cell: ({ row }) => row.original.organizationalUnitName || '-'
  },
  {
    id: 'jobFunction',
    accessorKey: 'jobFunctionName',
    header: () => getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_function', 'Job Function'),
    size: 150,
    cell: ({ row }) => row.original.jobFunctionName || '-'
  },
  {
    id: 'status',
    header: () =>
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employee_table.status_column', 'Status'),
    cell: () => (
      <Badge variant="warning" size="sm">
        {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_positions_section.vacant', 'Vacant')}
      </Badge>
    )
  }
]

export interface OpenPositionsViewProps {
  openPositions: OpenJobPosition[]
  fullPositions: JobPosition[]
  loadingOpenPositions: boolean
  accessToken: string
  onNavigateBack: () => void
}

export const OpenPositionsView: React.FC<OpenPositionsViewProps> = ({
  openPositions,
  fullPositions,
  loadingOpenPositions,
  accessToken,
  onNavigateBack
}) => {
  const [isPositionSheetOpen, setIsPositionSheetOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null)

  const handleOpenPositionSheet = (positionId: string) => {
    const position = fullPositions.find(item => item.id === positionId)
    if (!position) {
      return
    }
    setSelectedPosition(position)
    setIsPositionSheetOpen(true)
  }

  return (
    <>
      <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="gba:mr-4"
              data-testid="manager-dashboard-open-positions-back-button"
            >
              <ChevronLeft size={16} className="gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.open_positions', 'Open Positions')}
            </h1>
            <Badge variant="info" className="gba:ml-3">
              {`${openPositions.length} ${getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.open_positions',
                'open positions'
              ).toLowerCase()}`}
            </Badge>
          </div>
        </div>

        <div className="gba:flex-1 gba:overflow-auto">
          <DataTable
            data={openPositions}
            columns={positionColumns}
            loading={loadingOpenPositions}
            emptyMessage={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.no_open_positions',
              'No open positions in your team'
            )}
            enableSorting={true}
            onRowClick={position => handleOpenPositionSheet(position.id)}
            actions={row => <ViewDetailsAction id={row.original.id} onClick={handleOpenPositionSheet} />}
          />
        </div>
      </div>

      <Sheet open={isPositionSheetOpen} onOpenChange={setIsPositionSheetOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0">
          <div className="gba:h-10 gba:flex-shrink-0" />
          <div className="gba:flex-1 gba:overflow-y-auto">
            {selectedPosition && accessToken && (
              <JobPositionDetails jobPosition={selectedPosition} accessToken={accessToken} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
