import React, { Dispatch, SetStateAction, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  DateInput,
  Checkbox
} from '@newwork/nw-design-system'
import { PiMagnifyingGlass } from 'react-icons/pi'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { Project } from '../../apps/project-management/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { Account } from '../../apps/project-management/hooks/useProjects'
import { useProjectManagers, ProjectManager } from '../../apps/project-management/hooks/useProjectManagers'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const DATA_TEST_ID_PREFIX = 'ProjectForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Custom manager option renderer
const ManagerSelectItem: React.FC<{ manager: ProjectManager; selectedManagerId?: string | null }> = ({
  manager,
  selectedManagerId
}) => {
  const displayName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.fullName || 'Unknown'
  const initials =
    displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:w-full">
      {/* Manager Avatar */}
      <Avatar size="sm">
        {manager.picture_thumbnail ? (
          <AvatarImage src={`data:image/jpeg;base64,${manager.picture_thumbnail}`} alt={displayName} />
        ) : null}
        <AvatarFallback className="gba:bg-linear-to-br gba:from-blue-500 gba:to-purple-600 gba:text-primary-foreground gba:font-semibold gba:text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Manager Information */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{displayName}</div>
        {manager.email && <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{manager.email}</div>}
      </div>

      {/* Selection indicator */}
      {selectedManagerId && selectedManagerId === manager.id && (
        <div className="gba:w-4 gba:h-4 gba:bg-primary gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shrink-0">
          <div className="gba:w-1.5 gba:h-1.5 gba:bg-primary-foreground gba:rounded-full"></div>
        </div>
      )}
    </div>
  )
}

// Zod validation schema
const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    projectType: z.enum(['INTERNAL', 'EXTERNAL'], {
      message: 'Project type is required'
    }),
    customerId: z.string().optional(),
    projectManagerId: z.string().optional(),
    validFrom: z.string().min(1, 'Valid from date is required'),
    validTo: z.string().min(1, 'Valid to date is required'),
    projectStatus: z.string().optional()
  })
  .refine(
    data => {
      // If project type is EXTERNAL, customerId is required
      if (data.projectType === 'EXTERNAL') {
        return !!data.customerId && data.customerId.length > 0
      }
      return true
    },
    {
      message: 'Customer account is required for external projects',
      path: ['customerId']
    }
  )
  .refine(
    data => {
      // Validate that validFrom is before or equal to validTo
      if (data.validFrom && data.validTo) {
        const fromDate = new Date(data.validFrom)
        const toDate = new Date(data.validTo)
        return fromDate <= toDate
      }
      return true
    },
    {
      message: 'Valid from date must be before or equal to valid to date',
      path: ['validFrom']
    }
  )

export interface ProjectFormProps extends BusinessAppContextProps {
  project?: Project
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch: () => void
  isDrawerActive?: boolean
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  parentNodeId?: string
  accounts: Account[]
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  accounts
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const { t } = useTranslation('master-data')
  const { getProjectManagers } = useProjectManagers(accessToken)

  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string>(project?.projectType || '')
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>('')
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([])
  const [projectManagerSearchTerm, setProjectManagerSearchTerm] = useState<string>('')
  const [selectedProjectManagerId, setSelectedProjectManagerId] = useState<string | null>(null)
  const [isLoadingManagers, setIsLoadingManagers] = useState(false)
  const [hasMoreManagers, setHasMoreManagers] = useState(false)
  const [currentManagerPage, setCurrentManagerPage] = useState(0)
  const [isManagerSelectOpen, setIsManagerSelectOpen] = useState(false)
  const [cachedSelectedManager, setCachedSelectedManager] = useState<ProjectManager | null>(null)
  const managerListRef = useRef<HTMLDivElement>(null)
  const pageSize = 50

  const accountOptions = useMemo(() => {
    return accounts
      .filter(account => account.name?.toLowerCase().includes(accountSearchTerm.toLowerCase()))
      .map(account => ({
        value: account.id,
        label: account.name
      }))
  }, [accounts, accountSearchTerm])

  // Load project managers with pagination
  const loadProjectManagers = useCallback(
    async (page: number, search: string, append: boolean = false) => {
      if (!structureId) return

      try {
        setIsLoadingManagers(true)
        const managers = await getProjectManagers({
          structureId,
          isPlanningMode: false,
          searchCriteria: search,
          page,
          size: pageSize
        })

        if (append) {
          setProjectManagers(prev => [...prev, ...(managers || [])])
        } else {
          setProjectManagers(managers || [])
        }

        setHasMoreManagers((managers || []).length === pageSize)
      } catch (error) {
        console.error('Error loading project managers:', error)
        if (!append) {
          setProjectManagers([])
        }
      } finally {
        setIsLoadingManagers(false)
      }
    },
    [structureId, getProjectManagers, pageSize]
  )

  // Initial load and search
  useEffect(() => {
    if (structureId && isManagerSelectOpen) {
      setCurrentManagerPage(0)
      loadProjectManagers(0, projectManagerSearchTerm, false)
    }
  }, [structureId, projectManagerSearchTerm, isManagerSelectOpen, loadProjectManagers])

  // Load more on scroll
  const loadMoreManagers = useCallback(() => {
    if (!isLoadingManagers && hasMoreManagers) {
      const nextPage = currentManagerPage + 1
      setCurrentManagerPage(nextPage)
      loadProjectManagers(nextPage, projectManagerSearchTerm, true)
    }
  }, [isLoadingManagers, hasMoreManagers, currentManagerPage, projectManagerSearchTerm, loadProjectManagers])

  // Handle scroll for infinite loading
  const handleManagerScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { target } = e
      if (target instanceof HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = target
        if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreManagers && !isLoadingManagers) {
          loadMoreManagers()
        }
      }
    },
    [hasMoreManagers, isLoadingManagers, loadMoreManagers]
  )

  // Find selected manager
  const selectedManager = useMemo(() => {
    if (!selectedProjectManagerId) return null
    return projectManagers.find(m => m.id === selectedProjectManagerId) || cachedSelectedManager
  }, [selectedProjectManagerId, projectManagers, cachedSelectedManager])

  // Update cached manager when found
  useEffect(() => {
    if (selectedManager) {
      setCachedSelectedManager(selectedManager)
    }
  }, [selectedManager])

  // Clear cached manager when value is cleared
  useEffect(() => {
    if (!selectedProjectManagerId) {
      setCachedSelectedManager(null)
    }
  }, [selectedProjectManagerId])

  // Debounced search
  const debouncedManagerSearch = useCallback(
    debounce((term: string) => {
      setProjectManagerSearchTerm(term)
    }, 300),
    []
  )

  // Handle search input change
  const handleManagerSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation()
      const term = e.target.value
      debouncedManagerSearch(term)
    },
    [debouncedManagerSearch]
  )

  // Prevent search input from affecting Select
  const handleManagerSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
  }, [])

  const handleManagerSearchClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle manager selection change
  const handleManagerChange = useCallback(
    (value: string) => {
      const manager = projectManagers.find(m => m.id === value) || cachedSelectedManager
      if (manager) {
        setCachedSelectedManager(manager)
      }
      setSelectedProjectManagerId(value || null)
      // Clear search after selection
      setProjectManagerSearchTerm('')
      setIsManagerSelectOpen(false)
    },
    [projectManagers, cachedSelectedManager]
  )

  // Handle dropdown open/close
  const handleManagerOpenChange = useCallback((open: boolean) => {
    setIsManagerSelectOpen(open)
    if (!open) {
      setProjectManagerSearchTerm('')
    }
  }, [])

  useEffect(() => {
    setSelectedAccountId(null)
  }, [projectType])

  useEffect(() => {
    if (project) {
      setProjectType(project.projectType || '')
      if (project.customerId) {
        const account = accounts.find(acc => acc.id === project.customerId)
        setSelectedAccountId(account?.id || null)
      }
      if (project.projectManagerId) {
        setSelectedProjectManagerId(project.projectManagerId)
      }
    }
  }, [project, accounts])

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      let formattedValidFrom = values.validFrom
      if (values.validFrom) {
        if (values.validFrom instanceof Date) {
          formattedValidFrom = values.validFrom.toISOString()
        } else if (typeof values.validFrom === 'string') {
          // If already in ISO format, use as is, otherwise format it
          if (values.validFrom.includes('T')) {
            formattedValidFrom = values.validFrom
          } else {
            formattedValidFrom = `${values.validFrom}:00.000Z`
          }
        }
      }

      let formattedValidTo = values.validTo
      if (values.validTo) {
        if (values.validTo instanceof Date) {
          formattedValidTo = values.validTo.toISOString()
        } else if (typeof values.validTo === 'string') {
          // If already in ISO format, use as is, otherwise format it
          if (values.validTo.includes('T')) {
            formattedValidTo = values.validTo
          } else {
            formattedValidTo = `${values.validTo}:00.000Z`
          }
        }
      }

      const projectData = {
        name: values.name,
        description: values.description,
        projectType: values.projectType,
        validFrom: formattedValidFrom,
        validTo: formattedValidTo,
        structureId: structureId,
        ...(values.projectType === 'EXTERNAL' && selectedAccountId ? { customerId: selectedAccountId } : {}),
        ...(selectedProjectManagerId ? { projectManagerId: selectedProjectManagerId } : {}),
        ...(values.projectStatus ? { projectStatus: values.projectStatus } : {}),
        ...(project ? { id: project.id } : {})
      }

      if (project) {
        await restClient.put(`/projects/${project.id}`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/projects`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSelectedProjectManagerId(null)
      setLoading(false)
      setOpen?.(false)
    }
  }

  const defaultValues = useMemo(() => {
    return {
      ...project,
      validFrom: project?.validFrom ? new Date(project.validFrom).toISOString().slice(0, 16) : undefined,
      validTo: project?.validTo ? new Date(project.validTo).toISOString().slice(0, 16) : undefined,
      customerId: project?.customerId || undefined,
      projectManagerId: project?.projectManagerId || undefined,
      projectStatus: project?.projectStatus || undefined
    }
  }, [project])

  // Create Zod resolver
  const resolver = useMemo(() => zodResolver(projectFormSchema) as any, [])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={project ? 'Edit Project' : 'Create Project'}
      description="Configure project details and information"
      onSubmit={handleSubmit}
      onCancel={() => {
        onCancel?.()
        setSelectedProjectManagerId(null)
      }}
      defaultValues={defaultValues}
      isEditing={!!project}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
      resolver={resolver}
    >
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.project.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.project.fields.name.placeholder', {
                  defaultValue: 'Enter project name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.project.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.project.fields.description.placeholder', {
                  defaultValue: 'Enter project description (optional)'
                })}
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="projectManagerId"
        render={({ field }) => {
          const displayManager = selectedManager || cachedSelectedManager
          const displayName = displayManager
            ? `${displayManager.firstName || ''} ${displayManager.lastName || ''}`.trim() ||
              displayManager.fullName ||
              'Unknown'
            : ''

          return (
            <FormItem className="gba:w-1/2">
              <FormLabel>
                {t('forms.project.fields.projectManager.label', { defaultValue: 'Select Project Manager' })}
              </FormLabel>
              <FormControl>
                <Select
                  value={selectedProjectManagerId || field.value || ''}
                  onValueChange={value => {
                    handleManagerChange(value)
                    field.onChange(value)
                  }}
                  onOpenChange={handleManagerOpenChange}
                  open={isManagerSelectOpen}
                  data-testid={`${dataTestId}-projectManager-select`}
                >
                  <SelectTrigger className="gba:w-full gba:border-gray-300 gba:bg-background gba:min-h-[60px]">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:h-full">
                      {displayManager ? (
                        <>
                          {/* Selected Manager Avatar */}
                          <Avatar key={displayManager.id} size="sm" className="gba:shrink-0">
                            {displayManager.picture_thumbnail ? (
                              <AvatarImage
                                src={`data:image/jpeg;base64,${displayManager.picture_thumbnail}`}
                                alt={displayName}
                              />
                            ) : null}
                            <AvatarFallback className="gba:bg-linear-to-br gba:from-blue-500 gba:to-purple-600 gba:text-primary-foreground gba:font-semibold gba:text-xs">
                              {displayName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '??'}
                            </AvatarFallback>
                          </Avatar>

                          {/* Selected Manager Info */}
                          <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                            <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                              {displayName}
                            </div>
                            {displayManager.email && (
                              <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {displayManager.email}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="gba:text-muted-foreground gba:text-sm">
                          {t('forms.project.fields.projectManager.placeholder', {
                            defaultValue: 'Select project manager'
                          })}
                        </div>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="gba:w-full gba:min-w-[300px] gba:max-w-[500px] gba:border-gray-300 gba:bg-background">
                    {/* Search input */}
                    <div className="gba:p-2 gba:border-b gba:border-border">
                      <div className="gba:relative">
                        <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                          <PiMagnifyingGlass className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        </div>
                        <Input
                          value={projectManagerSearchTerm}
                          onChange={handleManagerSearchChange}
                          onKeyDown={handleManagerSearchKeyDown}
                          onClick={handleManagerSearchClick}
                          placeholder={t('forms.project.fields.projectManager.search', {
                            defaultValue: 'Search project managers...'
                          })}
                          className="gba:border-gray-300 gba:bg-background gba:text-sm"
                          style={{
                            paddingLeft: '28px'
                          }}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Managers list */}
                    <div
                      ref={managerListRef}
                      onScroll={handleManagerScroll}
                      className="gba:max-h-60 gba:overflow-y-auto"
                    >
                      {projectManagers.length > 0
                        ? projectManagers.map((manager, index) => (
                            <SelectItem
                              key={`${manager.id}-${index}`}
                              value={manager.id}
                              className="gba:p-0 gba:h-auto"
                            >
                              <ManagerSelectItem manager={manager} selectedManagerId={selectedProjectManagerId} />
                            </SelectItem>
                          ))
                        : !isLoadingManagers &&
                          projectManagerSearchTerm && (
                            <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
                              {t('forms.project.fields.projectManager.empty', {
                                defaultValue: 'No project manager found.'
                              })}
                            </div>
                          )}

                      {/* Load more indicator */}
                      {isLoadingManagers && (
                        <div className="gba:p-2 gba:text-center gba:border-t gba:border-border">
                          <Spinner size="sm" className="gba:mr-2" />
                          <span className="gba:text-muted-foreground">
                            {t('forms.project.fields.projectManager.loading', { defaultValue: 'Loading...' })}
                          </span>
                        </div>
                      )}

                      {/* Has more indicator */}
                      {hasMoreManagers && !isLoadingManagers && (
                        <div className="gba:p-2 gba:text-center gba:text-muted-foreground gba:text-sm gba:border-t gba:border-border">
                          {t('forms.project.fields.projectManager.loadMore', {
                            defaultValue: 'Scroll down to load more...'
                          })}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:gap-4">
          <FormField
            name="projectType"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.projectType.label', { defaultValue: 'Project Type' })}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={value => {
                      field.onChange(value)
                      setProjectType(value)
                    }}
                    value={field.value}
                    data-testid={`${dataTestId}-projectType-select`}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('forms.project.fields.projectType.placeholder', {
                          defaultValue: 'Select project type'
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">
                        {t('forms.project.fields.projectType.options.internal', {
                          defaultValue: 'Internal'
                        })}
                      </SelectItem>
                      <SelectItem value="EXTERNAL">
                        {t('forms.project.fields.projectType.options.external', {
                          defaultValue: 'External'
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {projectType === 'EXTERNAL' && (
            <FormField
              name="customerId"
              render={({ field }) => (
                <FormItem className="gba:w-1/2">
                  <FormLabel>
                    {t('forms.project.fields.customer.label', { defaultValue: 'Customer Account' })}
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      value={selectedAccountId || field.value || ''}
                      onValueChange={(value: string) => {
                        const account = accountOptions.find(acc => acc.value === value)
                        setSelectedAccountId(account?.value || null)
                        field.onChange(value)
                      }}
                      options={accountOptions}
                      onSearch={value => setAccountSearchTerm(value)}
                      placeholder={t('forms.project.fields.customer.placeholder', {
                        defaultValue: 'Select account'
                      })}
                      data-testid={`${dataTestId}-customer-combobox`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="gba:flex gba:gap-4">
          <FormField
            name="validFrom"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.validFrom.label', { defaultValue: 'Valid From' })}</FormLabel>
                <FormControl>
                  <DateInput
                    {...field}
                    mode="single"
                    data-testid={`${dataTestId}-validFrom-input`}
                    placeholder={t('forms.project.fields.validFrom.placeholder', {
                      defaultValue: 'Select start date'
                    })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="validTo"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.validTo.label', { defaultValue: 'Valid Until' })}</FormLabel>
                <FormControl>
                  <DateInput
                    {...field}
                    mode="single"
                    data-testid={`${dataTestId}-validTo-input`}
                    placeholder={t('forms.project.fields.validTo.placeholder', {
                      defaultValue: 'Select end date'
                    })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="projectStatus"
          render={({ field }) => (
            <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === 'Closed'}
                  onCheckedChange={checked => {
                    field.onChange(checked ? 'Closed' : undefined)
                  }}
                  data-testid={`${dataTestId}-projectStatus-checkbox`}
                />
              </FormControl>
              <div className="gba:space-y-1 gba:leading-none">
                <FormLabel>
                  {t('forms.project.fields.projectStatus.label', { defaultValue: 'Mark project as closed' })}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}

export default ProjectForm
