import React, { useCallback, useMemo, useState } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import DayTypeForm from '@/business-apps/mdm/forms/time-attendance/DayTypeForm'
import { TransformedDayTypeVersion } from '../../types/day-type-versions'
import { SimpleDayType } from '../../types/day-types'

interface DayTypesItemsProps {
  dayTypes: SimpleDayType[]
  dayTypeVersions: TransformedDayTypeVersion[]
  refetch: () => void
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
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDayTypes = useMemo(() => {
    if (!searchTerm.trim()) return dayTypes

    return dayTypes.filter(
      dayType =>
        dayType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dayType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [dayTypes, searchTerm])

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
      header: 'Code',
      enableSorting: true
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'Actions',
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
              onClick={event => event.stopPropagation()}
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
            placeholder="Search day types..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredDayTypes.length} of {dayTypes.length} day types
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredDayTypes}
        data-testid={formatDataTestId(prefixDataTestId, 'day-types-items-table')}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default DayTypesItems
