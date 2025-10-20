import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  BarChart3,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  ExternalLink
} from 'lucide-react'
import { SurveyDataService, SurveyFlow } from '../services/SurveyDataService'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'

interface SurveyDataTabProps extends BusinessAppContextProps {}

export const SurveyDataTab: React.FC<SurveyDataTabProps> = ({ accessToken, ...context }) => {
  const [surveys, setSurveys] = useState<SurveyFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isExporting, setIsExporting] = useState<{ [key: string]: boolean }>({})

  const loadSurveys = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await SurveyDataService.getSurveyFlows(accessToken, 20, 0)
      setSurveys(response.flows)
    } catch (err) {
      console.error('Error loading surveys:', err)
      setError(err instanceof Error ? err.message : 'Failed to load surveys')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken) {
      loadSurveys()
    }
  }, [accessToken, loadSurveys])

  // Listen for survey creation events
  useEffect(() => {
    const handleSurveyCreated = () => loadSurveys()
    window.addEventListener('survey-flow-created', handleSurveyCreated)
    return () => window.removeEventListener('survey-flow-created', handleSurveyCreated)
  }, [loadSurveys])

  const handleExportSurvey = async (surveyId: string, surveyName: string) => {
    try {
      setIsExporting(prev => ({ ...prev, [surveyId]: true }))

      // Fetch survey responses
      const responses = await SurveyDataService.getSurveyResponses(accessToken, surveyId)

      if (responses.length === 0) {
        alert('No responses found for this survey')
        return
      }

      // Convert responses to CSV
      const csvContent = convertToCSV(responses, surveyName)

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `survey-${surveyName.replace(/[^a-zA-Z0-9]/g, '_')}-responses.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error exporting survey:', err)
      alert(`Failed to export survey: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsExporting(prev => ({ ...prev, [surveyId]: false }))
    }
  }

  const convertToCSV = (responses: any[], surveyName: string): string => {
    if (responses.length === 0) return ''

    // Get all unique keys from responses to create headers
    const allKeys = new Set<string>()
    responses.forEach(response => {
      Object.keys(response).forEach(key => allKeys.add(key))
    })

    const headers = Array.from(allKeys)
    const csvHeaders = ['Survey Name', 'Response ID', 'Submitted At', ...headers].join(',')

    // Convert each response to CSV row
    const csvRows = responses.map((response, index) => {
      const responseId = response.id || `response_${index + 1}`
      const submittedAt = response.submittedAt || response.createdAt || new Date().toISOString()

      const values = [
        `"${surveyName}"`,
        `"${responseId}"`,
        `"${submittedAt}"`,
        ...headers.map(header => {
          const value = response[header]
          if (value === null || value === undefined) return '""'
          return `"${String(value).replace(/"/g, '""')}"`
        })
      ]

      return values.join(',')
    })

    return [csvHeaders, ...csvRows].join('\n')
  }

  // Filter surveys based on search and filters
  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch =
      !searchTerm ||
      survey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || survey.status === statusFilter
    const matchesType = typeFilter === 'all' || survey.surveyType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return (
          <Badge variant="default" className="gba:bg-green-100 gba:text-green-800">
            Active
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="gba:bg-blue-100 gba:text-blue-800">
            Completed
          </Badge>
        )
      case 'PAUSED':
        return (
          <Badge variant="outline" className="gba:bg-yellow-100 gba:text-yellow-800">
            Paused
          </Badge>
        )
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSurveyTypeLabel = (type?: string) => {
    switch (type) {
      case 'feedback':
        return 'Feedback'
      case 'research':
        return 'Research'
      case 'assessment':
        return 'Assessment'
      case 'poll':
        return 'Poll'
      case 'custom':
        return 'Custom'
      default:
        return 'Survey'
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="survey-data-tab-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="survey-data-tab-error">
        <div>
          <h3>Error Loading Survey Data</h3>
          <p>{error}</p>
          <Button onClick={loadSurveys} variant="secondary" className="gba:mt-2" data-testid="survey-data-retry-button">
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="survey-data-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Survey Data Management</h2>
          <p className="gba:text-gray-600">List, view, and export survey responses and data</p>
        </div>
        <Button onClick={loadSurveys} variant="outline" size="sm" data-testid="survey-data-refresh-button">
          <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
          Refresh
        </Button>
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
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Search Surveys</label>
              <DebouncedInput
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={setSearchTerm}
                debounceDelay={300}
                data-testid="survey-search-input"
                className="gba:w-full"
              />
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="survey-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="RUNNING">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="survey-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surveys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            Survey Data ({filteredSurveys.length} surveys)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="gba:w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSurveys.map(survey => (
                    <TableRow key={survey.id} data-testid={`survey-row-${survey.id}`}>
                      <TableCell>
                        <div>
                          <div className="gba:font-medium">{survey.name}</div>
                          {survey.description && (
                            <div className="gba:text-sm gba:text-gray-500 gba:truncate gba:max-w-xs">
                              {survey.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSurveyTypeLabel(survey.surveyType)}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(survey.status)}</TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Users className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {survey.participantCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <MessageSquare className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {survey.responseCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {survey.startTime ? new Date(survey.startTime).toLocaleDateString() : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSurvey(survey.id, survey.name)}
                            disabled={isExporting[survey.id]}
                            data-testid={`export-survey-${survey.id}`}
                            title="Export survey responses to CSV"
                          >
                            {isExporting[survey.id] ? (
                              <Spinner className="gba:w-4 gba:h-4" />
                            ) : (
                              <Download className="gba:w-4 gba:h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/platform/apps/flow/apps/inbox?flowId=${survey.id}`, '_blank')}
                            data-testid={`view-survey-${survey.id}`}
                            title="View survey details"
                          >
                            <Eye className="gba:w-4 gba:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <FileText className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
              <p>No surveys found</p>
              <p className="gba:text-sm">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first survey to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
