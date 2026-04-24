import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { CardTabHeaderComponent } from '@/business-apps/mdm/apps/generic-components/card'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { GeoZone } from '../../types/GeoZone.types'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { GlobeIcon, InfoIcon, MapPinIcon, PencilSimpleLineIcon, PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import useGeoZones from '../../hooks/useGeoZones'
import GeoZoneForm from '@/business-apps/mdm/forms/geo-zone-form'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  TextCell,
  DescriptionCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'

interface GeoZoneTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'GeoZoneTab'

export default function GeoZoneTab(context: Readonly<GeoZoneTabProps>) {
  // ─── Component State ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGeoZone, setSelectedGeoZone] = useState<GeoZone | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  // ─── Context & Configuration ───────────────────────────────────────────────
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // ─── Data & Actions Hook ───────────────────────────────────────────────────
  const { geoZones, isLoading, error, refetch, deleteGeoZone } = useGeoZones(context)

  // ─── Computed Values & Effects ─────────────────────────────────────────────
  const filteredGeoZones = useMemo(() => {
    if (!searchTerm) return geoZones

    return geoZones.filter(
      geoZone =>
        geoZone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        geoZone.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        geoZone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, geoZones])

  // Update selected geo zone when data changes
  useEffect(() => {
    if (selectedGeoZone) {
      const updated = geoZones.find(gz => gz.id === selectedGeoZone.id)
      if (updated) setSelectedGeoZone(updated)
    }
  }, [geoZones])

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (geoZone: GeoZone) => {
      await deleteGeoZone(geoZone.id)
    },
    [deleteGeoZone]
  )

  const handleView = useCallback((geoZone: GeoZone) => {
    setSelectedGeoZone(geoZone)
    setIsDrawerOpen(true)
  }, [])

  // ─── Table Configuration ───────────────────────────────────────────────────
  const columns: ColumnDef<GeoZone>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => SortableHeader({ column, children: 'Code' }),
      enableSorting: true,
      cell: ({ getValue }) => BadgeCell({ value: getValue() as string, variant: 'info' })
    },

    {
      accessorKey: 'name',
      header: ({ column }) => SortableHeader({ column, children: 'Name' }),
      enableSorting: true,
      cell: ({ getValue }) => TextCell({ value: getValue() as string, className: 'gba:font-semibold' })
    },

    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => DescriptionCell({ value: getValue() as string | undefined })
    },
    {
      id: 'actions',
      header: () => ActionsColumnHeader(),
      enableSorting: false,
      cell: ({ row }) =>
        ActionsCell({
          record: row.original,
          dataTestId,
          onView: handleView,
          onEdit: setEditDialogOpen,
          onDelete: handleDelete,
          itemNameGetter: record => record.name,
          itemTitle: 'Geo Zone'
        })
    }
  ]

  // ─── Drawer Configuration ──────────────────────────────────────────────────
  const drawerItems = useMemo(() => {
    if (!selectedGeoZone) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: selectedGeoZone.name },
          { label: 'Code', value: <Badge variant="info">{selectedGeoZone.code}</Badge> },
          { label: 'Description', value: selectedGeoZone.description || '—' }
        ]
      }
    ]
  }, [selectedGeoZone])

  const navigationItems = useMemo(() => {
    if (!selectedGeoZone) return []
    return [
      {
        title: 'View Site Locations',
        redirectLink: `/site-locations?geoZoneId=${selectedGeoZone.id}`,
        icon: GlobeIcon,
        color: 'blue',
        description: 'View site locations in this geo zone'
      }
    ]
  }, [selectedGeoZone])

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-GeoZoneTab`} className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Data
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && geoZones.length === 0) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        {!isLoading && (
          <CardTabHeaderComponent
            addButton={
              <ErrorBoundary>
                <GeoZoneForm
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-geo-zone`}
                    >
                      <PlusIcon /> Add Geo Zone
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={accessToken}
                  onSuccess={refetch}
                />
              </ErrorBoundary>
            }
            cardTitle={`Geo Zones (${geoZones.length})`}
            cardDescription="Manage geographical zones and their details"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search geo zones..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {geoZones.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <MapPinIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No geo zones found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <GeoZoneForm
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-geo-zone`}
                      >
                        <PlusIcon /> Create First Geo Zone
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    onSuccess={refetch}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredGeoZones}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedGeoZone && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedGeoZone(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Geo Zone Details"
              titleIcon={MapPinIcon}
              drawerItems={drawerItems}
              navigationItems={navigationItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <GeoZoneForm
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-GeoZoneTab-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    geoZone={selectedGeoZone}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    isDrawerActive={isDrawerOpen}
                    key={selectedGeoZone.id}
                    onSuccess={refetch}
                  />
                </ErrorBoundary>
              ]}
            />
          </ErrorBoundary>
        )}
      </Card>

      {/* Edit dialog rendered outside the DataTable so it is never unmounted by table re-renders */}
      {editDialogOpen &&
        (() => {
          const recordToEdit = geoZones.find(gz => gz.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <GeoZoneForm
                key={editDialogOpen}
                geoZone={recordToEdit}
                prefixDataTestId={dataTestId}
                accessToken={accessToken}
                open={true}
                setOpen={open => setEditDialogOpen(open ? editDialogOpen : null)}
                onSuccess={refetch}
              />
            </ErrorBoundary>
          )
        })()}
    </ErrorBoundary>
  )
}
