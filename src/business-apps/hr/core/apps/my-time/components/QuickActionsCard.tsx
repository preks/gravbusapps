'use client'

import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarBlank, PencilSimpleLine, CaretRight } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { startProcess } from '@/common/utils/start-process'
import timeTrackingTranslations from '../_i18n'

interface QuickActionsCardProps {
  employeeId?: string
  accessToken?: string
}

const ABSENCE_REQUEST_OPTIONS = [
  {
    id: 'AbsenceType:v1:A001',
    processName: 'createEmployeeVacation',
    flowType: 'vacation',
    labelKey: 'absence_option_vacation'
  },
  {
    id: 'AbsenceType:v1:A021',
    processName: 'createEmployeeSickLeave',
    flowType: 'sickLeave',
    labelKey: 'absence_option_sick'
  },
  {
    id: 'AbsenceType:v1:A050',
    processName: 'createEmployeeSpecialLeave',
    flowType: 'specialLeave',
    labelKey: 'absence_option_special'
  },
  {
    id: 'AbsenceType:v1:A170',
    processName: 'createEmployeeWorkLeave',
    flowType: 'workLeave',
    labelKey: 'absence_option_work'
  }
] as const

const actionButtonClasses =
  'gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:p-3 gba:text-left gba:transition-colors hover:gba:bg-muted/50'

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ employeeId, accessToken }) => {
  const { t } = useTranslation(timeTrackingTranslations)

  const handleAbsenceRequest = (option: (typeof ABSENCE_REQUEST_OPTIONS)[number]) => {
    if (!employeeId) return
    startProcess({
      domain: 'employee-time',
      processName: option.processName,
      payload: { employeeId, absenceType: option.id, flowType: option.flowType },
      builderType: 'NATIVE_SCREEN'
    })
  }

  return (
    <Card className="gba:h-full" data-testid="timeclock-quick-actions-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-xs gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
          {t('quick_actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {/* Request Leave — dropdown with absence type options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={actionButtonClasses} data-testid="timeclock-request-leave-button">
              <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted">
                <CalendarBlank size={20} />
              </div>
              <div className="gba:flex-1">
                <div className="gba:text-sm gba:font-medium">{t('request_leave')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('request_leave_description')}</div>
              </div>
              <CaretRight size={16} className="gba:text-muted-foreground gba:shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className="gba:min-w-[220px]">
            {ABSENCE_REQUEST_OPTIONS.map(option => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => handleAbsenceRequest(option)}
                data-testid={`timeclock-absence-option-${option.flowType}`}
              >
                {t(option.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Request Correction — triggers attendance correction flow */}
        <AppAction
          mode="trigger"
          variant="custom"
          autoExecute
          contexts={[
            {
              context: FlowContextName.employeeAttendanceCorrectionRequest,
              contextData: { employeeId }
            }
          ]}
          accessToken={accessToken}
          prefixDataTestId="timeclock-request-correction"
        >
          <button type="button" className={actionButtonClasses} data-testid="timeclock-request-correction-button">
            <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted">
              <PencilSimpleLine size={20} />
            </div>
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:font-medium">{t('request_correction')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('request_correction_description')}</div>
            </div>
            <CaretRight size={16} className="gba:text-muted-foreground gba:shrink-0" />
          </button>
        </AppAction>
      </CardContent>
    </Card>
  )
}
