import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobFamilies } from '../../hooks'
import { JobFamily } from '../../types'
import {
  Card,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  TreeView,
  Badge,
  TreeViewAction
} from '@newwork/nw-design-system'
import { CardTabHeaderComponent } from '../../../generic-components/card/CardTabHeaderComponent'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import JobFamilyForm from '@/business-apps/mdm/forms/job-family-form'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  InfoIcon,
  TreeStructureIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  FolderSimpleIcon,
  GraphIcon,
  FileCodeIcon,
  XCircleIcon,
  FolderIcon,
  EyeIcon,
  TrashIcon,
  CopyIcon
} from '@phosphor-icons/react'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import {
  JOB_FAMILY_CATALOG,
  JOB_FAMILY_VERSION
} from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/hooks/useJobFamilyFilters'

export interface JobFamiliesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobFamiliesTab'

const JobFamiliesTab: React.FC<JobFamiliesTabProps> = context => {
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { rootFamilies, isLoading, error, refetch, getFamilyById } = useJobFamilies(context)

  const [selectedFamily, setSelectedFamily] = useState<JobFamily | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [isRemoveFamilyOpen, setIsRemoveFamilyOpen] = useState(false)
  const [isEditFamilyOpen, setIsEditFamilyOpen] = useState(false)

  const catalogClient = useCatalogManagerClient(accessToken)
  const usedCodes = useMemo(() => {
    return rootFamilies.map(family => family.code)
  }, [rootFamilies])

  useEffect(() => {
    if (selectedFamily) {
      const newFamily = getFamilyById(selectedFamily.id)

      if (newFamily) {
        setSelectedFamily(newFamily)
      }
    }
  }, [rootFamilies])

  const handleDeleteFamily = async (family: JobFamily) => {
    await catalogClient.deleteCatalogEntry(JOB_FAMILY_CATALOG, JOB_FAMILY_VERSION, family.id)

    refetch()
    setIsRemoveFamilyOpen(false)
    setSelectedFamily(null)
  }

  // Handle job family selection and drawer open/close
  const handleFamilySelect = useCallback(
    (selectedKeys: string) => {
      if (selectedKeys.length === 0) return
      const family = getFamilyById(selectedKeys.toString())
      if (family) {
        setSelectedFamily(family)
        setDrawerVisible(true)
      }
    },
    [getFamilyById]
  )

  const nodes = useMemo(() => {
    return rootFamilies.map(family => ({
      id: family.id,
      values: {
        code: family.code,
        name: family.name,
        level: family.level,
        status: family.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
        description: family.description ?? '-'
      },
      icon: FolderIcon,
      children: []
    }))
  }, [rootFamilies])

  const treeColumns = [
    { key: 'name', header: 'Name', sortable: true, align: 'left' as const },
    { key: 'code', header: 'Code', sortable: true, align: 'center' as const },
    { key: 'level', header: 'Level', sortable: true, align: 'center' as const },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center' as const
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      align: 'center' as const
    }
  ]

  const treeActions: TreeViewAction[] = [
    {
      id: 'view-root-family',
      label: 'View Job Family',
      icon: EyeIcon,
      onClick: node => {
        handleFamilySelect(node?.id ?? '')
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'edit-root-family',
      label: 'Edit Job Family',
      icon: PencilSimpleLineIcon,
      onClick: node => {
        const family = getFamilyById(node?.id ?? '')
        if (family) {
          setSelectedFamily(family)
          setIsEditFamilyOpen(true)
        }
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'remove-root-family',
      label: 'Delete Job Family',
      icon: TrashIcon,
      onClick: node => {
        const family = getFamilyById(node?.id ?? '')
        if (family) {
          setSelectedFamily(family)
          setIsRemoveFamilyOpen(true)
        }
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    }
  ]

  const drawerItems = useMemo(() => {
    if (!selectedFamily) return []
    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedFamily.name ?? '-'
          },
          {
            label: 'Code',
            value: <Badge variant="info">{selectedFamily.code || 'N/A'}</Badge>
          },
          {
            label: 'Description',
            value: selectedFamily?.description ?? '-'
          },
          {
            label: 'Hierarchy Level',
            value: `Level ${selectedFamily.level}  ${selectedFamily.level === 0 ? ' (Root)' : ''}`
          },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedFamily.isActive ? 'success' : 'destructive'}>
                {selectedFamily.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      },
      {
        icon: <TreeStructureIcon />,
        title: 'Hierarchy Information',
        verticalTable: true,
        items: [
          {
            label: 'Parent Family',
            value: selectedFamily.parentFamily
              ? selectedFamily.parentFamily.code && <Badge variant="info">{selectedFamily.parentFamily.code}</Badge>
              : 'No parent (Root level)'
          },
          {
            label: 'Child Families',
            value:
              selectedFamily.children.length > 0 ? (
                <div className="gba:flex gba:flex-col gba:gap-2">
                  {selectedFamily.children.map(child => (
                    <div className="gba:flex gba:items-center gba:space-x-2 gba:w-full" key={child.id}>
                      <div>
                        <GraphIcon className="gba:text-green-500" />
                      </div>
                      <div className="gba:w-full gba:flex gba:items-center gba:justify-between gba:gap-2 gba:overflow-hidden">
                        <div className="gba:flex-1 gba:flex gba:gap-1 gba:items-center gba:overflow-hidden gba:truncate">
                          <p className="gba:font-medium gba:overflow-hidden gba:truncate">{child.name}</p>
                          {child.code && (
                            <Badge variant="info" className="gba:max-w-2/3">
                              {child.code}
                            </Badge>
                          )}
                        </div>
                        {child.children.length > 0 && <Badge variant="success">{child.children.length} children</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:text-center gba:py-8 gba:flex gba:flex-col gba:items-center gba:justify-center">
                  <FolderSimpleIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
                  <p className="gba:font-normal gba:text-gray-500">No child families</p>
                </div>
              )
          }
        ]
      }
    ]

    if (selectedFamily.parentEntryId) {
      items[2].items.push({
        label: 'Parent ID',
        value: (
          <div className="gba:flex gba:items-center gba:gap-1 gba:w-full gba:overflow-hidden">
            <p className="gba:font-medium gba:truncate">{selectedFamily.parentEntryId}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(selectedFamily.parentEntryId!)
              }}
              data-testid={`${dataTestId}-copy-children-text`}
            >
              <CopyIcon className="gba:h-4 gba:w-4 gba:text-blue-400" />
            </Button>
          </div>
        )
      })
    }

    if (selectedFamily.children.length > 0) {
      items[2].items.push({
        label: 'Child Count',
        value: (
          <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
            <TreeStructureIcon className="gba:text-blue-500" />
            <p className="gba:font-medium">{selectedFamily?.children?.length}</p>
            <p className="gba:font-normal gba:text-gray-500">direct children</p>
          </div>
        )
      })
    }

    return items
  }, [selectedFamily])

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-PayGradesTab`} className="gba:p-4">
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

  if (isLoading && rootFamilies.length === 0) {
    return (
      <div data-testid={`${dataTestId}`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <Card>
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <JobFamilyForm
              usedCodes={usedCodes}
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${dataTestId}-add-root-family`}
                >
                  <PlusIcon /> Add Root Family
                </Button>
              }
              prefixDataTestId={dataTestId}
              loading={isLoading}
              accessToken={context.accessToken}
              refetch={refetch}
            />
          }
          cardTitle={`Job Families (${rootFamilies.length})`}
          cardDescription="Manage job families in a hierarchical structure. Job families help
            categorize and organize different types of roles."
        />
      )}

      <div className="gba:min-h-96">
        {rootFamilies.length === 0 && !isLoading ? (
          <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <FolderSimpleIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
            <p className="gba:font-normal gba:text-gray-500">No job families found</p>
            <div className="gba:mt-2">
              <JobFamilyForm
                usedCodes={usedCodes}
                childAddButton={
                  <Button
                    variant="default"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId}-add-root-family`}
                  >
                    <PlusIcon /> Create First Job Family
                  </Button>
                }
                prefixDataTestId={`${prefixDataTestId}`}
                loading={isLoading}
                accessToken={context.accessToken}
                refetch={refetch}
              />
            </div>
          </div>
        ) : (
          <TreeView
            data={nodes}
            columns={treeColumns}
            className="gba:px-6"
            searchPlaceholder="Search job families..."
            showSelectColumn={false}
            actions={treeActions}
            multipleSelection={false}
          />
        )}
      </div>
      {selectedFamily && isRemoveFamilyOpen && (
        <DeleteButton
          onDelete={() => handleDeleteFamily(selectedFamily)}
          itemName={selectedFamily?.name}
          itemTitle="Job Family"
          open={isRemoveFamilyOpen}
          setOpen={setIsRemoveFamilyOpen}
          showCancelButton={false}
        />
      )}
      {selectedFamily && isEditFamilyOpen && (
        <JobFamilyForm
          usedCodes={usedCodes}
          jobFamily={selectedFamily}
          prefixDataTestId={`${prefixDataTestId}`}
          loading={isLoading}
          accessToken={context.accessToken}
          refetch={refetch}
          open={isEditFamilyOpen}
          setOpen={setIsEditFamilyOpen}
        />
      )}

      {selectedFamily && (
        <SheetWrapperComponent
          prefixDataTestId={dataTestId}
          isDrawerVisible={drawerVisible}
          onOpenChange={openStatus => {
            if (!openStatus) {
              setSelectedFamily(null)
            }
            setDrawerVisible(openStatus)
          }}
          title="Job Family Details"
          titleIcon={FileCodeIcon}
          drawerItems={drawerItems}
          footerButtons={[
            <JobFamilyForm
              usedCodes={usedCodes}
              childAddButton={
                <Button data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-EditButton`}>
                  <PencilSimpleLineIcon /> Edit
                </Button>
              }
              jobFamily={selectedFamily}
              prefixDataTestId={`${prefixDataTestId}`}
              loading={isLoading}
              accessToken={context.accessToken}
              refetch={refetch}
              isDrawerActive={true}
              key={selectedFamily.id}
            />
          ]}
        />
      )}
    </Card>
  )
}

export default JobFamiliesTab
