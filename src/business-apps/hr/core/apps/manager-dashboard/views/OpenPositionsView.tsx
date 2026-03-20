import React, { useState } from 'react'
import {
  Button,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Sheet,
  SheetContent
} from '@newwork/nw-design-system'
import { ChevronLeft } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OpenJobPosition, JobPosition } from '../hooks/useOpenJobPositions'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'

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

        {loadingOpenPositions && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        )}

        {!loadingOpenPositions && openPositions.length === 0 && (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.no_open_positions',
              'No open positions in your team'
            )}
          </div>
        )}

        {!loadingOpenPositions && openPositions.length > 0 && (
          <div className="gba:flex-1 gba:overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.position',
                      'Position'
                    )}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department')}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_function', 'Job Function')}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employee_table.status_column',
                      'Status'
                    )}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map(position => (
                  <TableRow
                    key={position.id}
                    className="gba:cursor-pointer hover:gba:bg-muted/40"
                    onClick={() => handleOpenPositionSheet(position.id)}
                  >
                    <TableCell>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium">{position.name}</span>
                        {position.jobLevelName && (
                          <span className="gba:text-sm gba:text-muted-foreground">{position.jobLevelName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{position.organizationalUnitName || '-'}</TableCell>
                    <TableCell>{position.jobFunctionName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="warning" size="sm">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.vacant',
                          'Vacant'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={event => {
                          event.stopPropagation()
                          handleOpenPositionSheet(position.id)
                        }}
                        data-testid={`manager-dashboard-open-position-details-${position.id}`}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.view_details',
                          'View Details'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
