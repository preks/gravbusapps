import SiteLocationForm from '@/business-apps/mdm/forms/site-location-form/SiteLocationForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  Accordion,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  DataTable,
  Icon,
  Input,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import {
  ArrowsDownUpIcon,
  BankIcon,
  ClockIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  MapPinIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  UserIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CardTabHeaderComponent from '../../../generic-components/card'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { VerticalTableProps } from '../../../generic-components/table/VerticalTable'
import { useSiteLocations } from '../../hooks'
import { Employee, SiteLocation, SiteLocationCostCenter } from '../../types'

export interface SiteLocationsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'SiteLocationsTab'

const SiteLocationsTab: React.FC<SiteLocationsTabProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId, userInfo } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(context.accessToken)

  const {
    siteLocations,
    structureId,
    isLoading,
    error,
    refetch,
    totalLocations,
    countries,
    fetchRegionsForCountries,
    getRegionsForCountry,
    geoZones
  } = useSiteLocations(context, 10)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSiteLocation, setSelectedSiteLocation] = useState<SiteLocation | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([])
  const [costCenterSorting, setCostCenterSorting] = useState<SortingState>([])

  const filteredLocations = siteLocations.filter(
    location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (location.code && location.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.locality && location.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.country && location.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    if (selectedSiteLocation) {
      const updatedSelectedSiteLocation = siteLocations.find(
        siteLocation => siteLocation.id === selectedSiteLocation.id
      )

      if (updatedSelectedSiteLocation) {
        setSelectedSiteLocation(updatedSelectedSiteLocation)
      }
    }
  }, [siteLocations, selectedSiteLocation])

  const handleViewLocation = (record: SiteLocation) => {
    setSelectedSiteLocation(record)
    setDrawerVisible(true)
  }

  const handleDelete = useCallback(
    async (location: SiteLocation | undefined) => {
      if (!location) return

      await orgchartClient.deleteSiteLocation(location.id, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      refetch()
    },
    [orgchartClient, context.accessToken, refetch]
  )

  const employeeDataTable = useCallback(
    (employees: Employee[]) =>
      employees.map(employee => ({
        ...employee,
        name: `${employee.firstName} ${employee.lastName}`
      })),
    [filteredLocations]
  )

  const costCenterDataTable = useCallback(
    (costCenters: SiteLocationCostCenter[]) =>
      costCenters.map(costCenter => ({
        ...costCenter
      })),
    [filteredLocations]
  )

  const renderSiteLocationsTable = (location: SiteLocation) => {
    const costCenterColumns: ColumnDef<SiteLocationCostCenter>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{code as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Description
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const description = row.original?.description
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{description ?? 'N/A'}</div>
            </div>
          )
        }
      }
    ]

    const employeeColumns: ColumnDef<Employee>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'personnelCode',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Personnel Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => getValue() ?? 'N/A'
      },
      {
        accessorKey: 'jobPosition',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Job Position
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const jobPosition = row.original?.jobPosition?.jobPositionName

          return jobPosition ?? 'N/A'
        }
      },
      {
        accessorKey: 'organizationalUnit',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Organizational Unit
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const organizationalUnit = row.original?.organizationalUnit?.organizationalUnitName

          return organizationalUnit ?? 'N/A'
        }
      }
    ]

    return (
      <Tabs defaultValue="employees" className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="employees" data-testid={`${dataTestId}-employees-tab`}>
            Employees ({location.employeeCount})
          </TabsTrigger>
          <TabsTrigger value="cost-centers" data-testid={`${dataTestId}-cost-centers-tab`}>
            Cost Centers ({location.costCenterCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="gba:mt-4">
          <DataTable
            data={employeeDataTable(location.employees)}
            columns={employeeColumns}
            enableSorting
            enablePagination
            data-testid={`${dataTestId}-employees-table`}
            sorting={employeeSorting}
            onSortingChange={setEmployeeSorting}
          />
        </TabsContent>

        <TabsContent value="cost-centers" className="gba:mt-4">
          <DataTable
            data={costCenterDataTable(location.costCenters)}
            columns={costCenterColumns}
            enableSorting
            enablePagination
            data-testid={`${dataTestId}-cost-centers-table`}
            sorting={costCenterSorting}
            onSortingChange={setCostCenterSorting}
          />
        </TabsContent>
      </Tabs>
    )
  }

  const groupItems = useMemo(
    () =>
      filteredLocations.map(location => ({
        id: location.id,
        title: location.name,
        description: `Code: ${location.code || 'N/A'}`,
        buttons: [
          {
            icon: () => (
              <Button
                variant="ghost"
                onClick={() => handleViewLocation(location)}
                data-testid={`${prefixDataTestId}-edit-${location.id}`}
              >
                <EyeIcon />
              </Button>
            ),
            onClick: () => {}
          },
          {
            icon: () => (
              <SiteLocationForm
                childAddButton={
                  <Button
                    variant="ghost"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-EditButton`}
                  >
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                structureId={structureId}
                isEditSiteLocation={true}
                onCancel={() => {}}
                accessToken={context.accessToken}
                countries={countries}
                fetchRegionsForCountries={fetchRegionsForCountries}
                getRegionsForCountry={getRegionsForCountry}
                geoZones={geoZones}
                siteLocation={location}
              />
            ),
            onClick: () => {}
          },
          {
            icon: () => (
              <DeleteButton
                onDelete={() => handleDelete(location)}
                itemName={location?.name ?? ''}
                itemTitle={'Location'}
              />
            ),
            onClick: () => {}
          }
        ],
        content: (
          <div className="gba:space-y-4">
            <div className="gba:flex gba:flex-col gba:items-start gba:justify-center gba:gap-2">
              {location.locality && (
                <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                  <h1 className="gba:text-sm gba:text-gray-500">City: </h1>
                  <h2 className="gba:text-sm gba:font-semibold">{location.locality}</h2>
                </div>
              )}
              {location.country && (
                <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                  <h1 className="gba:text-sm gba:text-gray-500">Country: </h1>
                  <h2 className="gba:text-sm gba:font-semibold">{location.country}</h2>
                </div>
              )}
              {location.region && (
                <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                  <h1 className="gba:text-sm gba:text-gray-500">Region: </h1>
                  <h2 className="gba:text-sm gba:font-semibold">{location.region}</h2>
                </div>
              )}
              {location.postalCode && (
                <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                  <h1 className="gba:text-sm gba:text-gray-500">Postal Code: </h1>
                  <h2 className="gba:text-sm gba:font-semibold">{location.postalCode}</h2>
                </div>
              )}
            </div>
            {renderSiteLocationsTable(location)}
          </div>
        )
      })),
    [filteredLocations, userInfo?.employeeDetails.employeeId, refetch, context.accessToken, dataTestId]
  )

  const drawerItems = useMemo(() => {
    if (!selectedSiteLocation) return []

    const items: VerticalTableProps[] = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedSiteLocation.name
          },
          {
            label: 'Code',
            value: selectedSiteLocation.code ?? 'Unknown'
          }
        ]
      }
    ]

    const addressItems = []

    if (selectedSiteLocation.address) {
      addressItems.push({
        label: 'Street Address',
        value: selectedSiteLocation.address
      })
    }

    if (selectedSiteLocation.locality) {
      addressItems.push({
        label: 'City / Locality',
        value: selectedSiteLocation.locality
      })
    }

    if (selectedSiteLocation.postalCode) {
      addressItems.push({
        label: 'Postal Code',
        value: selectedSiteLocation.postalCode
      })
    }

    if (selectedSiteLocation.region) {
      addressItems.push({
        label: 'Region',
        value: selectedSiteLocation.region
      })
    }

    if (selectedSiteLocation.country) {
      addressItems.push({
        label: 'Country',
        value: selectedSiteLocation.country
      })
    }

    if (addressItems.length > 0) {
      items.push({
        icon: <InfoIcon />,
        title: 'Address',
        items: addressItems
      })
    }

    items.push({
      icon: <InfoIcon />,
      title: 'Statistics',
      items: [
        {
          label: 'Number of Employees',
          value: selectedSiteLocation.employeeCount ?? '-'
        },
        {
          label: 'Number of Cost Centers',
          value: selectedSiteLocation.costCenterCount ?? '-'
        }
      ]
    })

    return items
  }, [selectedSiteLocation])

  const navigationItems = useMemo(() => {
    if (!selectedSiteLocation) return []

    return [
      {
        redirectLink: `/employee-management/employees?siteLocationId=${selectedSiteLocation.id}`,
        color: 'blue',
        icon: UserIcon,
        title: 'View Employees',
        description: 'View all employees assigned to this location'
      },
      {
        redirectLink: `/finance/cost-centers?siteLocationId=${selectedSiteLocation.id}`,
        color: 'green',
        icon: BankIcon,
        title: 'View Cost Centers',
        description: 'View all cost centers associated with this location'
      },
      {
        redirectLink: selectedSiteLocation.fullAddress
          ? `https://maps.google.com/?q=${encodeURIComponent(selectedSiteLocation.fullAddress)}`
          : '#',
        color: 'cyan',
        icon: GlobeIcon,
        title: 'View on Map',
        description: 'View this location on Google Maps'
      },
      {
        redirectLink: `/mdm/location-data/history?locationId=${selectedSiteLocation.id}`,
        color: 'purple',
        icon: ClockIcon,
        title: 'Location History',
        description: 'View historical changes for this location'
      }
    ]
  }, [selectedSiteLocation])

  if (isLoading && siteLocations.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Icon icon={XCircleIcon} />
            Error Loading Site Locations
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

  return (
    <Card data-testid={`${prefixDataTestId || ''}-SiteLocationsTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <SiteLocationForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-AddButton`}
                >
                  <PlusIcon /> Add Site Location
                </Button>
              }
              refetch={refetch}
              structureId={structureId}
              isEditSiteLocation={false}
              onCancel={() => {}}
              accessToken={context.accessToken}
              countries={countries}
              fetchRegionsForCountries={fetchRegionsForCountries}
              getRegionsForCountry={getRegionsForCountry}
              geoZones={geoZones}
              open={isFormOpen}
              setOpen={setIsFormOpen}
            />
          }
          cardTitle={`${t('hr.organizational_data', 'Locations')} (${totalLocations})`}
          cardDescription="Manage locations and their details"
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        <Accordion
          className="gba:w-full"
          value={accordionValue}
          onValueChange={value => setAccordionValue(value)}
          items={groupItems}
        />

        {selectedSiteLocation && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedSiteLocation(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Location Details"
            titleIcon={MapPinIcon}
            drawerItems={drawerItems}
            navigationItems={navigationItems}
            footerButtons={[
              <SiteLocationForm
                key="site-location-edit-form"
                childAddButton={
                  <Button data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-EditButton`}>
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                refetch={refetch}
                structureId={structureId}
                isEditSiteLocation={true}
                onCancel={() => {}}
                accessToken={context.accessToken}
                countries={countries}
                fetchRegionsForCountries={fetchRegionsForCountries}
                getRegionsForCountry={getRegionsForCountry}
                geoZones={geoZones}
                siteLocation={selectedSiteLocation}
                isDrawerActive={true}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default SiteLocationsTab
export { SiteLocationsTab }
