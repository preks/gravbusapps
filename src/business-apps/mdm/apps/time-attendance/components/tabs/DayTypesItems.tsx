import React, { useCallback, useMemo, useState } from 'react'
import {
  DataTable,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { GearIcon, MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import DayTypeForm from '@/business-apps/mdm/forms/time-attendance/DayTypeForm'
import { TransformedDayTypeVersion } from '../../types/day-type-versions'
import { SimpleDayType } from '../../types/day-types'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DayTypesItemsProps {
  dayTypes: SimpleDayType[]
  dayTypeVersions: TransformedDayTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onConfigure: (dayTypeVersion: TransformedDayTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'DayTypesItems'

export const DayTypesItems: React.FC<DayTypesItemsProps> = ({
  dayTypes,
  dayTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onConfigure
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDayType, setSelectedDayType] = useState<SimpleDayType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredDayTypes = useMemo(() => {
    if (!searchTerm.trim()) return dayTypes

    return dayTypes.filter(
      dayType =>
        dayType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dayType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [dayTypes, searchTerm])

  const handleDeleteDayType = useCallback(
    async (dayType?: SimpleDayType | null) => {
      if (!dayType) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteDayType',
          {
            changeMode: 'POST',
            dayType: {
              id: dayType.id,
              version: dayType.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
        setIsDeleteDialogOpen(false)
        setSelectedDayType(null)
      } catch (error) {
        console.error('Error deleting day type:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedDayType(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Find the latest active dayTypeVersion for a given dayType
  const getLatestDayTypeVersion = useCallback(
    (dayType: SimpleDayType): TransformedDayTypeVersion | null => {
      if (!dayType.dayTypeVersion || dayType.dayTypeVersion.length === 0) {
        return null
      }

      // Get the last ID from the dayTypeVersion array (most recent)
      const latestVersionId = dayType.dayTypeVersion[dayType.dayTypeVersion.length - 1]

      // Find the corresponding dayTypeVersion in the versions list
      return dayTypeVersions.find(version => version.id === latestVersionId) || null
    },
    [dayTypeVersions]
  )

  // Handle row click to configure the latest dayTypeVersion
  const handleRowClick = useCallback(
    (dayType: SimpleDayType) => {
      const latestVersion = getLatestDayTypeVersion(dayType)

      if (latestVersion) {
        onConfigure(latestVersion)
      } else {
        const partialVersion: TransformedDayTypeVersion = {
          id: '',
          activeVersion: '',
          dayTypeVersionDetail: [],
          color: '',
          activeFrom: null,
          activeTo: null,
          status: 'inactive',
          version: 0,
          roundingRule: null,
          incrementType: null,
          breakType: null,
          dayType: {
            id: dayType.id,
            name: dayType.name,
            code: dayType.code
          }
        }
        onConfigure(partialVersion)
      }
    },
    [getLatestDayTypeVersion, onConfigure]
  )

  const columns: ColumnDef<SimpleDayType>[] = [
    {
      accessorKey: 'code',
      header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.code.label', 'Code'),
      enableSorting: true
    },
    {
      accessorKey: 'name',
      header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name'),
      enableSorting: true
    },
    {
      id: 'actions',
      header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
      enableSorting: false,
      enableHiding: true,
      cell: ({ row }) => {
        const targetDayType = dayTypes.find(dayType => dayType.id === row.original.id)

        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
            <DayTypeForm
              childAddButton={
                <Button variant="ghost" onClick={event => event.stopPropagation()}>
                  <PencilSimpleLineIcon />
                </Button>
              }
              refetch={refetch}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              dayType={targetDayType || undefined}
              usedCodes={dayTypes.map(dt => dt.code).filter((code, index, self) => self.indexOf(code) === index)}
              key={targetDayType?.id}
            />
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                if (targetDayType) {
                  handleRowClick(targetDayType)
                }
              }}
              data-testid={formatDataTestId(prefixDataTestId, `configure-button-${targetDayType?.id}`)}
            >
              <GearIcon />
            </Button>
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setSelectedDayType(targetDayType ?? null)
                setIsDeleteDialogOpen(true)
              }}
              data-testid={formatDataTestId(prefixDataTestId, `delete-button-${targetDayType?.id}`)}
            >
              <TrashIcon />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'day-types-items')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_types.actions.search_placeholder',
              'Search day types...'
            )}
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {`${filteredDayTypes.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${dayTypes.length} ${getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types.title',
            'day types'
          ).toLowerCase()}`}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredDayTypes}
        data-testid={formatDataTestId(prefixDataTestId, 'day-types-items-table')}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <WarningIcon className="gba:text-destructive" />
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_types.actions.delete_title',
                'Delete Day Type'
              )}
            </DialogTitle>
            <DialogDescription>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_types.actions.delete_message',
                'Are you sure you want to delete this day type?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                {getTranslationFromI18nKeyAndLabel('master-data:forms.common.buttons.cancel', 'Cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => handleDeleteDayType(selectedDayType)}>
              {isDeleting
                ? getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_types.actions.deleting',
                    'Deleting...'
                  )
                : getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DayTypesItems
