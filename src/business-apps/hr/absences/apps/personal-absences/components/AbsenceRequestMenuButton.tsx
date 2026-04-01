import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { CaretDownIcon, PlusIcon } from '@phosphor-icons/react'
import { startProcess } from '@/common/utils/start-process'
import translations from '../_i18n'

interface AbsenceRequestMenuButtonProps {
  employeeId?: string
  label: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive'
  className?: string
  buttonTestId?: string
  menuTestIdPrefix?: string
  startDate?: string
  endDate?: string
}

interface AbsenceRequestOption {
  id: string
  processName: string
  flowType: string
  labelKey: string
}

const ABSENCE_REQUEST_OPTIONS: AbsenceRequestOption[] = [
  {
    id: 'AbsenceType:v1:A021',
    processName: 'createEmployeeSickLeave',
    flowType: 'sickLeave',
    labelKey: 'absence-request-option-sick'
  },
  {
    id: 'AbsenceType:v1:A050',
    processName: 'createEmployeeSpecialLeave',
    flowType: 'specialLeave',
    labelKey: 'absence-request-option-special'
  },
  {
    id: 'AbsenceType:v1:A001',
    processName: 'createEmployeeVacation',
    flowType: 'vacation',
    labelKey: 'absence-request-option-vacation'
  },
  {
    id: 'AbsenceType:v1:A170',
    processName: 'createEmployeeWorkLeave',
    flowType: 'workLeave',
    labelKey: 'absence-request-option-work'
  }
]

export const AbsenceRequestMenuButton: React.FC<AbsenceRequestMenuButtonProps> = ({
  employeeId,
  label,
  variant = 'default',
  className,
  buttonTestId,
  menuTestIdPrefix = 'absence-request-option',
  startDate,
  endDate
}) => {
  const { t } = useTranslation(translations)

  const handleSelection = (option: AbsenceRequestOption) => {
    if (!employeeId) return

    const payload: Record<string, string> = {
      employeeId,
      absenceType: option.id,
      flowType: option.flowType
    }

    if (startDate) payload.startDate = startDate
    if (endDate) payload.endDate = endDate

    startProcess({
      domain: 'employee-time',
      processName: option.processName,
      payload,
      builderType: 'NATIVE_SCREEN'
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className={className} data-testid={buttonTestId}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {label}
          <CaretDownIcon className="gba:w-4 gba:h-4 gba:ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ABSENCE_REQUEST_OPTIONS.map(option => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => handleSelection(option)}
            data-testid={`${menuTestIdPrefix}-${option.id}`}
          >
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AbsenceRequestMenuButton
