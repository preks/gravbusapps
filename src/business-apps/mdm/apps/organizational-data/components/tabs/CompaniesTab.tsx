import React, { useCallback, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCompanies } from '../../hooks'
import {
  TreeNode,
  TreeView,
  TreeViewAction,
  Card,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  EyeIcon,
  FolderIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  InfoIcon,
  BuildingIcon,
  UserIcon,
  BriefcaseIcon,
  BankIcon
} from '@phosphor-icons/react'
import CardTabHeaderComponent from '../../../generic-components/card'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import CompanyForm from '@/business-apps/irm/core/forms/company-form/CompanyForm'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import { CompanyAddress, Director, Company } from '../../types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface CompaniesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'CompaniesTab'

const CompaniesTab: React.FC<CompaniesTabProps> = context => {
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(context.accessToken)
  const { t } = useTranslation(translations)

  const { rootCompanies, structureId, allCompanies, isLoading, error, refetch } = useCompanies(context)

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [isRemoveCompanyOpen, setIsRemoveCompanyOpen] = useState(false)
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false)
  const [isAddSubsidiaryOpen, setIsAddSubsidiaryOpen] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const handleDeleteCompany = async (company: Company) => {
    await orgchartClient.deleteCompany(company.id, {
      headers: { Authorization: `Bearer ${context.accessToken}` }
    })

    refetch()
    setIsRemoveCompanyOpen(false)
    setSelectedCompany(null)
  }

  // Find parent node IDs for a given company ID
  const findParentNodeIds = useCallback((companyId: string, companies: Company[]): string[] => {
    const parentIds: string[] = []

    const findParents = (companyList: Company[], targetId: string, currentPath: string[] = []): boolean => {
      for (const company of companyList) {
        const newPath = [...currentPath, company.id]

        if (company.id === targetId) {
          parentIds.push(...currentPath)
          return true
        }

        if (company.children.length > 0) {
          if (findParents(company.children, targetId, newPath)) {
            return true
          }
        }
      }
      return false
    }

    findParents(companies, companyId)
    return parentIds
  }, [])

  // Find matching companies based on search term
  const findMatchingCompanies = useCallback((searchTerm: string, companies: Company[]): Company[] => {
    const matches: Company[] = []
    const searchLower = searchTerm.toLowerCase()

    const searchInCompanies = (companyList: Company[]) => {
      for (const company of companyList) {
        const matchesSearch =
          company.name.toLowerCase().includes(searchLower) ||
          (company.code && company.code.toLowerCase().includes(searchLower)) ||
          (company.description && company.description.toLowerCase().includes(searchLower))

        if (matchesSearch) {
          matches.push(company)
        }

        if (company.children.length > 0) {
          searchInCompanies(company.children)
        }
      }
    }

    searchInCompanies(companies)
    return matches
  }, [])

  // Handle search with auto-expansion
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        const matchingCompanies = findMatchingCompanies(query, rootCompanies)
        const newExpandedKeys = new Set<string>()

        // For each matching company, expand all its parent nodes
        matchingCompanies.forEach(company => {
          const parentIds = findParentNodeIds(company.id, rootCompanies)
          parentIds.forEach(id => newExpandedKeys.add(id))
        })

        setExpandedKeys(newExpandedKeys)
      } else {
        setExpandedKeys(new Set())
      }
    },
    [rootCompanies, findMatchingCompanies, findParentNodeIds]
  )

  // Handle expand/collapse
  const handleExpand = useCallback((expandedIds: string[]) => {
    setExpandedKeys(new Set(expandedIds))
  }, [])

  const handleCompanyNameClick = useCallback((companyId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = buildPlatformUrl('/platform/irm/company-record', { companyId })
    navigateTo(url)
  }, [])

  const formatCampanyNodes = useCallback(
    (companies: Company[]): TreeNode[] => {
      return companies.map(company => ({
        id: company.id,
        values: {
          holding: company.percentage ?? '-',
          code: company.code,
          name: (
            <button
              onClick={e => handleCompanyNameClick(company.id, e)}
              className="gba:text-left gba:font-medium gba:text-primary hover:gba:text-primary/80 gba:underline gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0"
              data-testid={`${prefixDataTestId || ''}-company-name-link-${company.id}`}
            >
              {company.name}
            </button>
          ),
          employees: company.numberOfAssignedEmployees,
          jobPositions: company.numberOfAssignedJobPositions,
          openJobPositions: company.numberOfOpenJobPositions,
          totalJobPositions: company.numberOfTotalJobPositions,
          childUnits: company.numberOfChildUnits,
          description: company.description ?? '-'
        },
        icon: FolderIcon,
        children: company.children.length > 0 ? formatCampanyNodes(company.children) : []
      }))
    },
    [handleCompanyNameClick, prefixDataTestId]
  )

  const nodes = useMemo(() => formatCampanyNodes(rootCompanies), [rootCompanies, formatCampanyNodes])

  const treeColumns = useMemo(() => {
    const isAssignedEmployeesColumnVisible = allCompanies.some(company => company.numberOfAssignedEmployees > 0)
    const isAssignedJobPositionsColumnVisible = allCompanies.some(company => company.numberOfAssignedJobPositions > 0)
    const isChildUnitsColumnVisible = allCompanies.some(company => company.numberOfChildUnits > 0)
    const isOpenJobPositionsColumnVisible = allCompanies.some(company => company.numberOfOpenJobPositions > 0)
    const isTotalJobPositionsColumnVisible = allCompanies.some(company => company.numberOfTotalJobPositions > 0)

    const columns = [
      { key: 'name', header: 'Name', sortable: true, align: 'left' as const },
      { key: 'code', header: 'Code', sortable: true, align: 'center' as const },
      { key: 'holding', header: 'Holding', sortable: true, align: 'center' as const }
    ]

    if (isAssignedEmployeesColumnVisible) {
      columns.push({
        key: 'employees',
        header: 'Employees',
        sortable: true,
        align: 'center' as const
      })
    }
    if (isAssignedJobPositionsColumnVisible) {
      columns.push({
        key: 'jobPositions',
        header: 'Job Positions',
        sortable: true,
        align: 'center' as const
      })
    }
    if (isChildUnitsColumnVisible) {
      columns.push({
        key: 'childUnits',
        header: 'Child Units',
        sortable: true,
        align: 'center' as const
      })
    }
    if (isOpenJobPositionsColumnVisible) {
      columns.push({
        key: 'openJobPositions',
        header: 'Open Job Positions',
        sortable: true,
        align: 'center' as const
      })
    }
    if (isTotalJobPositionsColumnVisible) {
      columns.push({
        key: 'totalJobPositions',
        header: 'Total Job Positions',
        sortable: true,
        align: 'center' as const
      })
    }
    columns.push({
      key: 'description',
      header: 'Description',
      sortable: true,
      align: 'center' as const
    })

    return columns
  }, [allCompanies])

  // Helper function to format address
  const formatAddress = useCallback((address: CompanyAddress): string => {
    const parts: string[] = []
    if (address.addressLine) {
      if (address.addressLine.streetAddress) parts.push(address.addressLine.streetAddress)
      if (address.addressLine.addressLine2) parts.push(address.addressLine.addressLine2)
      if (address.addressLine.addressLine3) parts.push(address.addressLine.addressLine3)
      if (address.addressLine.addressLine4) parts.push(address.addressLine.addressLine4)
    }
    if (address.postalCode) parts.push(address.postalCode)
    if (address.locality) parts.push(address.locality)
    return parts.join(', ') || '-'
  }, [])

  // Helper function to display director information (similar to showProjectManager in ProjectSetup.tsx)
  const showDirector = useCallback((company: Company) => {
    const director = company.director as Director
    const directorName =
      director?.displayName ??
      (director?.firstName || director?.lastName
        ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
        : undefined)
    const directorPicture = director?.pictureThumbnail

    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        {directorPicture ? (
          <Avatar size="default" className="gba:h-10 gba:w-10" data-testid={`director-avatar-${directorName}`}>
            <AvatarImage
              src={
                directorPicture && !directorPicture.startsWith('{')
                  ? `data:image/jpeg;base64,${directorPicture}`
                  : undefined
              }
              alt={directorName}
            />
            <AvatarFallback>
              {`${director?.firstName?.[0] || ''}${director?.lastName?.[0] || ''}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : directorName ? (
          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
            {directorName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        ) : null}
        <span className="gba:font-semibold">
          {directorName || <span className="gba:text-muted-foreground">-</span>}
        </span>
      </div>
    )
  }, [])

  const drawerItems = useMemo(() => {
    if (!selectedCompany) return []

    const basicInfoItems: Array<{ label: string; value: string | number | React.ReactElement }> = [
      {
        label: 'Name',
        value: selectedCompany.name
      },
      {
        label: 'Code',
        value: selectedCompany.code ?? '-'
      }
    ]

    // Add description if exists
    if (selectedCompany.description) {
      basicInfoItems.push({
        label: 'Description',
        value: selectedCompany.description
      })
    }

    // Add holding if exists
    if (selectedCompany.percentage) {
      basicInfoItems.push({
        label: 'Holding',
        value: `${selectedCompany.percentage}%`
      })
    }

    // Add director if exists
    if (selectedCompany.directorId) {
      basicInfoItems.push({
        label: 'Director',
        value: showDirector(selectedCompany)
      })
    }

    // Add commercial registration number if exists
    if (selectedCompany.commercialRegistrationNumber) {
      basicInfoItems.push({
        label: 'Commercial Registration Number',
        value: selectedCompany.commercialRegistrationNumber
      })
    }

    // Add currency if exists
    if (selectedCompany.currencyRef) {
      const currencyCode = extractCurrencyCode(selectedCompany.currencyRef)
      if (currencyCode) {
        basicInfoItems.push({
          label: 'Currency',
          value: currencyCode
        })
      }
    }

    const items: Array<{
      icon: React.ReactElement
      title: string
      items: Array<{ label: string; value: string | number | React.ReactElement }>
    }> = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: basicInfoItems
      },
      {
        icon: <InfoIcon />,
        title: 'Statistics',
        items: [
          { label: 'Assigned Employees', value: selectedCompany.numberOfAssignedEmployees ?? '-' },
          {
            label: 'Assigned Job Positions',
            value: selectedCompany.numberOfAssignedJobPositions ?? '-'
          },
          { label: 'Open Job Positions', value: selectedCompany.numberOfOpenJobPositions ?? '-' },
          { label: 'Total Job Positions', value: selectedCompany.numberOfTotalJobPositions ?? '-' },
          { label: 'Child Units', value: selectedCompany.numberOfChildUnits ?? '-' },
          {
            label: 'Company Assigned Units',
            value: selectedCompany.children.length ?? 0
          }
        ]
      }
    ]

    // Add Tax Details section if any tax field exists
    const taxItems: Array<{ label: string; value: string }> = []
    if (selectedCompany.taxIdentificationNumber) {
      taxItems.push({
        label: 'Tax Identification Number',
        value: selectedCompany.taxIdentificationNumber
      })
    }
    if (selectedCompany.taxNumber) {
      taxItems.push({
        label: 'Tax Number',
        value: selectedCompany.taxNumber
      })
    }
    if (selectedCompany.valueAddedTaxNumber) {
      taxItems.push({
        label: 'Value Added Tax Number',
        value: selectedCompany.valueAddedTaxNumber
      })
    }
    if (taxItems.length > 0) {
      items.push({
        icon: <InfoIcon />,
        title: 'Tax Details',
        items: taxItems
      })
    }

    // Add Address Information section if addresses exist
    if (selectedCompany.addresses && selectedCompany.addresses.length > 0) {
      const addressItems: Array<{ label: string; value: string }> = []
      selectedCompany.addresses.forEach((address, index) => {
        const formattedAddress = formatAddress(address)
        if (formattedAddress !== '-') {
          const addressTypeLabel =
            address.addressType === 'PRIMARY_ADDRESS'
              ? t('address-type-PRIMARY_ADDRESS')
              : address.addressType === 'SECONDARY_ADDRESS'
                ? t('address-type-SECONDARY_ADDRESS')
                : t('address-type-index', { index: index + 1 })
          addressItems.push({
            label: addressTypeLabel,
            value: formattedAddress
          })
        }
      })
      if (addressItems.length > 0) {
        items.push({
          icon: <InfoIcon />,
          title: t('section-address-information'),
          items: addressItems
        })
      }
    }

    // Add Additional Properties / Key Figures section if exists
    if (selectedCompany.additionalProperties && Object.keys(selectedCompany.additionalProperties).length > 0) {
      const additionalItems: Array<{ label: string; value: string | number }> = []
      Object.entries(selectedCompany.additionalProperties).forEach(([key, value]) => {
        // Only add if value is not empty/null/undefined
        if (value !== null && value !== undefined && value !== '') {
          const displayValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
          if (displayValue.trim() !== '') {
            // Format key: convert camelCase to Title Case
            const formattedKey = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim()
            additionalItems.push({
              label: formattedKey,
              value: displayValue
            })
          }
        }
      })
      if (additionalItems.length > 0) {
        items.push({
          icon: <InfoIcon />,
          title: 'Additional Information',
          items: additionalItems
        })
      }
    }

    return items
  }, [selectedCompany, formatAddress, showDirector, t])

  const navigationItems = useMemo(() => {
    if (!selectedCompany) return []

    const items = [
      {
        title: 'View Departments',
        description: 'View departments in the company',
        color: 'blue',
        icon: BuildingIcon,
        redirectLink: `/organizational-data/departments?companyId=${selectedCompany.id}`,
        dataTestId: `${prefixDataTestId}-company-departments-link`
      },
      {
        title: 'View Employees',
        description: 'View employees in the company',
        color: 'green',
        icon: UserIcon,
        redirectLink: `/employee-directory?companyId=${selectedCompany.id}`,
        dataTestId: `${prefixDataTestId}-company-employees-link`
      },
      {
        title: 'View Job Positions',
        description: 'View job positions in the company',
        color: 'purple',
        icon: BriefcaseIcon,
        redirectLink: `/job-positions?companyId=${selectedCompany.id}`,
        dataTestId: `${prefixDataTestId}-company-jobs-link`
      },
      {
        title: 'View Cost Centers',
        description: 'View cost centers in the company',
        color: 'orange',
        icon: BankIcon,
        redirectLink: `/organizational-data/cost-centers?companyId=${selectedCompany.id}`,
        dataTestId: `${prefixDataTestId}-company-cost-centers-link`
      }
    ]

    return items
  }, [selectedCompany, prefixDataTestId])

  const treeActions: TreeViewAction[] = [
    {
      id: 'view-company',
      label: 'View Company',
      icon: EyeIcon,
      onClick: node => {
        const targetCompany = allCompanies.find(company => company.id === node?.id)
        if (!targetCompany) {
          return
        }
        setDrawerVisible(true)
        setSelectedCompany(targetCompany)
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'add-subsidiary',
      label: 'Add Subsidiary',
      icon: PlusIcon,
      onClick: node => {
        const company = allCompanies.find(company => company.id === node?.id)
        if (company) {
          setSelectedCompany(company)
          setIsAddSubsidiaryOpen(true)
        }
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'edit-company',
      label: 'Edit Company',
      icon: PencilSimpleLineIcon,
      onClick: node => {
        const company = allCompanies.find(company => company.id === node?.id)
        if (company) {
          setSelectedCompany(company)
          setIsEditCompanyOpen(true)
        }
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'remove-company',
      label: 'Delete Company',
      icon: TrashIcon,
      onClick: node => {
        const company = allCompanies.find(company => company.id === node?.id)
        if (company) {
          setSelectedCompany(company)
          setIsRemoveCompanyOpen(true)
        }
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    }
  ]

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Companies
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
    <Card data-testid={`${prefixDataTestId || ''}-JobProfilesTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <CompanyForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId}-add-root-company`}
                >
                  <PlusIcon /> Add Root Company
                </Button>
              }
              refetch={refetch}
              accessToken={context.accessToken}
              structureId={structureId}
            />
          }
          cardTitle={`Companies (${allCompanies.length})`}
          cardDescription="Manage companies in a hierarchical structure. Companies represent the organizational structure of your business."
        />
      )}

      <CardContent>
        {rootCompanies.length === 0 && !isLoading ? (
          <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <BankIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
            <p className="gba:font-normal gba:text-gray-500">No companies found</p>
            <div className="gba:mt-2">
              <CompanyForm
                childAddButton={
                  <Button
                    variant="default"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId}-add-root-company`}
                  >
                    <PlusIcon /> Create First Company
                  </Button>
                }
                refetch={refetch}
                accessToken={context.accessToken}
                structureId={structureId}
              />
            </div>
          </div>
        ) : isLoading && rootCompanies.length === 0 ? (
          <div data-testid={`${dataTestId}-Spinner`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner />
          </div>
        ) : (
          <TreeView
            data={nodes}
            columns={treeColumns}
            className="gba:px-6"
            searchPlaceholder="Search company"
            showSelectColumn={false}
            actions={treeActions}
            multipleSelection={false}
            expandedNodes={Array.from(expandedKeys)}
            onExpandItem={handleExpand}
            onSearch={handleSearch}
          />
        )}

        {selectedCompany && isRemoveCompanyOpen && (
          <DeleteButton
            onDelete={() => handleDeleteCompany(selectedCompany)}
            itemName={selectedCompany?.name}
            itemTitle="Company"
            open={isRemoveCompanyOpen}
            setOpen={setIsRemoveCompanyOpen}
            showCancelButton={false}
          />
        )}

        {selectedCompany && isEditCompanyOpen && (
          <CompanyForm
            refetch={refetch}
            accessToken={context.accessToken}
            structureId={structureId}
            company={selectedCompany}
            open={isEditCompanyOpen}
            setOpen={setIsEditCompanyOpen}
            isRootCompany={rootCompanies.includes(selectedCompany)}
          />
        )}

        {selectedCompany && isAddSubsidiaryOpen && (
          <CompanyForm
            refetch={refetch}
            accessToken={context.accessToken}
            structureId={structureId}
            parentNodeId={selectedCompany.nodeId}
            open={isAddSubsidiaryOpen}
            setOpen={setIsAddSubsidiaryOpen}
          />
        )}

        {selectedCompany && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedCompany(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Company Profile Details"
            titleIcon={BankIcon}
            drawerItems={drawerItems}
            navigationItems={navigationItems}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CompaniesTab
export { CompaniesTab }
