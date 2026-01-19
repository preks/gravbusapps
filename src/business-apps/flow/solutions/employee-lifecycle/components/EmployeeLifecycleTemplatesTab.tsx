import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  FileText,
  Plus,
  Search,
  Play,
  Users,
  UserPlus,
  UserMinus,
  Clock,
  Tag,
  Download,
  Upload,
  Eye,
  Filter,
  RefreshCw,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { EmployeeLifecycleFlowService } from '../services/EmployeeLifecycleFlowService'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

export interface EmployeeLifecycleTemplatesTabProps extends BusinessAppContextProps {}

export const EmployeeLifecycleTemplatesTab: React.FC<EmployeeLifecycleTemplatesTabProps> = context => {
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const loadTemplates = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch employee lifecycle templates
      const { templates } = await EmployeeLifecycleFlowService.listTemplates(context.accessToken, {
        limit: 100,
        offset: 0
      })

      setTemplates(templates)
      setFilteredTemplates(templates)
    } catch (err) {
      console.error('Error loading employee lifecycle templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Load templates on mount and when notified of changes
  useEffect(() => {
    loadTemplates()
    const handler = () => loadTemplates()
    window.addEventListener('employee-lifecycle-template-created', handler)
    window.addEventListener('employee-lifecycle-template-updated', handler)
    return () => {
      window.removeEventListener('employee-lifecycle-template-created', handler)
      window.removeEventListener('employee-lifecycle-template-updated', handler)
    }
  }, [context.accessToken, loadTemplates])

  // Filter templates based on search term and filters
  useEffect(() => {
    let filtered = templates

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(template => {
        const templateType = getTemplateType(template).toLowerCase()
        return templateType === typeFilter
      })
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        template =>
          template.name.toLowerCase().includes(searchLower) ||
          template.description?.toLowerCase().includes(searchLower) ||
          template.id?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm, typeFilter])

  // Calculate statistics
  const totalTemplates = templates.length
  const onboardingTemplates = templates.filter(
    t => t.name.toLowerCase().includes('onboarding') || t.description?.toLowerCase().includes('onboarding')
  ).length
  const offboardingTemplates = templates.filter(
    t => t.name.toLowerCase().includes('offboarding') || t.description?.toLowerCase().includes('offboarding')
  ).length
  const recruitingTemplates = templates.filter(
    t => t.name.toLowerCase().includes('recruiting') || t.description?.toLowerCase().includes('recruiting')
  ).length

  // Widget configuration for statistics
  const widgets: WidgetItem[] = [
    {
      key: 'total-templates',
      title: 'Total Templates',
      value: totalTemplates,
      prefix: <FileText className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#3b82f6',
      description: 'All lifecycle templates'
    },
    {
      key: 'onboarding-templates',
      title: 'Onboarding',
      value: onboardingTemplates,
      prefix: <UserPlus className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#16a34a',
      description: 'Onboarding templates'
    },
    {
      key: 'recruiting-templates',
      title: 'Recruiting',
      value: recruitingTemplates,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: 'Recruiting templates'
    },
    {
      key: 'offboarding-templates',
      title: 'Offboarding',
      value: offboardingTemplates,
      prefix: <UserMinus className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#ea580c',
      description: 'Offboarding templates'
    }
  ]

  const handleLaunchTemplate = async (template: FlowTemplate) => {
    try {
      await EmployeeLifecycleFlowService.executeTemplate(context.accessToken, template.id!, {
        initiator: context.userInfo?.id || 'unknown'
      })
      showToast(`Flow "${template.name}" started successfully`, 'success', 'Flow Started')
    } catch (e) {
      showToast(`Error starting flow: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'Start Failed')
    }
  }

  const handleViewTemplate = (template: FlowTemplate) => {
    setSelectedTemplate(template)
    setIsViewModalOpen(true)
  }

  const getTemplateType = (template: FlowTemplate): string => {
    const name = template.name.toLowerCase()
    const description = template.description?.toLowerCase() || ''

    if (name.includes('onboarding') || description.includes('onboarding')) {
      return 'Onboarding'
    }
    if (name.includes('offboarding') || description.includes('offboarding')) {
      return 'Offboarding'
    }
    if (name.includes('recruiting') || description.includes('recruiting')) {
      return 'Recruiting'
    }
    if (name.includes('training') || description.includes('training')) {
      return 'Training'
    }
    return 'General'
  }

  const getTemplateTypeColor = (type: string): string => {
    switch (type) {
      case 'Onboarding':
        return 'gba:bg-green-100 gba:text-green-800'
      case 'Offboarding':
        return 'gba:bg-orange-100 gba:text-orange-800'
      case 'Recruiting':
        return 'gba:bg-purple-100 gba:text-purple-800'
      case 'Training':
        return 'gba:bg-blue-100 gba:text-blue-800'
      default:
        return 'gba:bg-gray-100 gba:text-gray-800'
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="employee-lifecycle-templates-tab">
      {/* Statistics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadTemplates}
        skeletonCount={4}
        emptyText="No template statistics available."
        data-testid="employee-lifecycle-template-statistics"
      />

      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Lifecycle Templates</h2>
          <p className="gba:text-gray-600">Reusable employee lifecycle templates for quick deployment</p>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" size="sm" data-testid="import-templates-button">
            <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
            Import
          </Button>
          <Button
            onClick={loadTemplates}
            variant="outline"
            size="sm"
            data-testid="employee-lifecycle-templates-refresh-button"
          >
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Filter className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-4 gba:items-end">
            <div className="gba:flex-1">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Search Templates</label>
              <DebouncedInput
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={setSearchTerm}
                debounceDelay={300}
                data-testid="template-search-input"
                className="gba:w-full"
              />
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Lifecycle Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="template-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="recruiting">Recruiting</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="offboarding">Offboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="template-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            Lifecycle Templates ({filteredTemplates.length} templates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-48 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-16 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-20 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-32 gba:animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" data-testid="templates-error-alert">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <h4 className="gba:font-medium">Error Loading Templates</h4>
                  <p className="gba:text-sm">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadTemplates} data-testid="templates-retry-button">
                  Retry
                </Button>
              </div>
            </Alert>
          ) : filteredTemplates.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <FileText className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
              <p>No lifecycle templates found</p>
              <p className="gba:text-sm">
                {searchTerm || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Lifecycle templates will appear here once they are created'}
              </p>
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="gba:w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => {
                    const templateType = getTemplateType(template)
                    const typeColorClass = getTemplateTypeColor(templateType)

                    return (
                      <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                        <TableCell>
                          <div>
                            <div className="gba:font-medium">{template.name}</div>
                            {template.description && (
                              <div className="gba:text-sm gba:text-gray-500 gba:truncate gba:max-w-xs">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeColorClass}>
                            {templateType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <Users className="gba:w-4 gba:h-4 gba:text-gray-400" />
                            {template.steps?.length || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <Tag className="gba:w-4 gba:h-4 gba:text-gray-400" />
                            {template.tags ? Object.keys(template.tags).length : 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:text-sm gba:text-gray-500">v{template.version || 1}</div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLaunchTemplate(template)}
                              data-testid={`launch-template-${template.id}`}
                              title="Launch lifecycle flow from this template"
                            >
                              <Play className="gba:w-4 gba:h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTemplate(template)}
                              data-testid={`view-template-${template.id}`}
                              title="View template details"
                            >
                              <Eye className="gba:w-4 gba:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>Review template configuration and workflow steps</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="gba:space-y-4">
              {/* Template Basic Info */}
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-1">Template Name</h4>
                  <p className="gba:text-sm gba:text-gray-900">{selectedTemplate.name}</p>
                </div>
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-1">Template ID</h4>
                  <p className="gba:text-sm gba:font-mono gba:text-gray-900">{selectedTemplate.id}</p>
                </div>
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-1">Version</h4>
                  <p className="gba:text-sm gba:text-gray-900">{selectedTemplate.version || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-1">Type</h4>
                  <Badge className={getTemplateTypeColor(getTemplateType(selectedTemplate))}>
                    {getTemplateType(selectedTemplate)}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {selectedTemplate.description && (
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-2">Description</h4>
                  <p className="gba:text-sm gba:text-gray-900 gba:bg-gray-50 gba:p-3 gba:rounded">
                    {selectedTemplate.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedTemplate.tags && Object.keys(selectedTemplate.tags).length > 0 && (
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-2">Tags</h4>
                  <div className="gba:space-y-2">
                    {Object.entries(selectedTemplate.tags).map(([key, value]) => (
                      <div key={key} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                        <span className="gba:font-medium gba:text-gray-600">{key}:</span>
                        <span className="gba:text-gray-900">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              {selectedTemplate.steps && selectedTemplate.steps.length > 0 && (
                <div>
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-700 gba:mb-3">
                    Workflow Steps ({selectedTemplate.steps.length})
                  </h4>
                  <div className="gba:space-y-3">
                    {selectedTemplate.steps.map((step, index) => (
                      <div key={index} className="gba:border gba:rounded-lg gba:p-3 gba:bg-gray-50">
                        <div className="gba:flex gba:items-start gba:gap-2">
                          <div className="gba:bg-blue-100 gba:text-blue-800 gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded gba:min-w-[2rem] gba:text-center">
                            {index + 1}
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <h5 className="gba:font-medium gba:text-sm gba:text-gray-900 gba:mb-1">{step.title}</h5>
                            {step.message && <p className="gba:text-xs gba:text-gray-600 gba:mb-2">{step.message}</p>}
                            <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-500">
                              <span className="gba:bg-gray-200 gba:px-2 gba:py-1 gba:rounded">{step.type}</span>
                              {step.dueInMinutes && (
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <Clock className="gba:h-3 gba:w-3" />
                                  <span>{step.dueInMinutes}min</span>
                                </div>
                              )}
                              {step.form && step.form.length > 0 && <span>{step.form.length} form fields</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmployeeLifecycleTemplatesTab
