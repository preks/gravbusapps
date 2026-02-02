/**
 * Case List Component
 *
 * List view with filtering and search
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Spinner
} from '@newwork/nw-design-system'
import { MoreVertical, Eye, Check, Trash, Plus, Search, ArrowLeft, AlertCircle, CalendarClock } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { Case } from '../types'
import { CaseStatusBadge } from './CaseStatusBadge'
import { CaseApiClient } from '../services'
import { formatDate, formatCaseId } from '../utils'

const BASE_URL = import.meta.env.VITE_CFLOW_ENGINE_URL || window.location.origin

interface CaseListProps {
  context: BusinessAppContextProps
  appTag: string
  onViewCase: (caseId: string) => void
  onCreateCase: () => void
  onCompleteCase: (caseId: string) => Promise<void>
  onBack?: () => void
  allowCreate?: boolean
  allowDelete?: boolean
}

export const CaseList: React.FC<CaseListProps> = ({
  context,
  appTag,
  onViewCase,
  onCreateCase,
  onCompleteCase,
  onBack,
  allowCreate = true,
  allowDelete = false
}) => {
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadCases = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const client = new CaseApiClient(BASE_URL, context.accessToken)
      const response = await client.getCasesList({
        tags: { app: appTag },
        search: searchTerm
      })
      setCases(response.cases)
    } catch (err) {
      console.error('Failed to load cases:', err)
      setError('Failed to load cases. Please try again.')
      setCases([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [searchTerm, appTag])

  const filteredCases = cases.filter(c => {
    if (!searchTerm) return true
    const title = c.state.metadata?.title?.toLowerCase() || ''
    const description = c.state.metadata?.description?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return title.includes(search) || description.includes(search) || c.caseId.toLowerCase().includes(search)
  })

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:p-6">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="gba:text-2xl gba:font-bold">All Cases</h1>
            <p className="gba:text-muted-foreground">Browse and manage all cases</p>
          </div>
        </div>
        {allowCreate && (
          <Button onClick={onCreateCase}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            Create Case
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="gba:relative gba:max-w-md">
        <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <Input
          placeholder="Search cases..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="gba:pl-10"
        />
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Cases ({filteredCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner />
              <span className="gba:ml-2 gba:text-muted-foreground">Loading cases...</span>
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-12">
              <p className="gba:text-destructive">{error}</p>
              <Button variant="outline" onClick={loadCases} className="gba:mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="gba:text-center gba:py-12">
              <p className="gba:text-muted-foreground gba:mb-4">No cases found</p>
              {allowCreate && (
                <Button onClick={onCreateCase}>
                  <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
                  Create First Case
                </Button>
              )}
            </div>
          ) : (
            <div className="gba:space-y-2">
              {/* Table Header */}
              <div className="gba:grid gba:grid-cols-8 gba:gap-4 gba:px-4 gba:py-2 gba:bg-muted/50 gba:rounded-lg gba:text-sm gba:font-medium gba:text-muted-foreground">
                <div>Case ID</div>
                <div className="gba:col-span-2">Title</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Due Date</div>
                <div>Created</div>
                <div className="gba:text-right">Actions</div>
              </div>

              {/* Table Body */}
              {filteredCases.map(caseItem => {
                const dueDate = caseItem.state.metadata?.dueDate
                const status = caseItem.state.metadata?.status
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const dueDateObj = dueDate ? new Date(dueDate) : null
                const isOverdue = dueDateObj && dueDateObj < today && status !== 'completed'
                const isDueSoon =
                  dueDateObj &&
                  !isOverdue &&
                  dueDateObj <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) &&
                  status !== 'completed'

                return (
                  <div
                    key={caseItem.caseId}
                    className={`gba:grid gba:grid-cols-8 gba:gap-4 gba:px-4 gba:py-3 gba:border gba:rounded-lg hover:gba:bg-muted/30 gba:transition-colors gba:items-center ${isOverdue ? 'gba:border-destructive/50 gba:bg-destructive/5' : ''}`}
                  >
                    {/* Clickable area - all columns except Actions */}
                    <div
                      className="gba:col-span-7 gba:grid gba:grid-cols-7 gba:gap-4 gba:cursor-pointer gba:items-center"
                      onClick={() => onViewCase(caseItem.caseId)}
                    >
                      <div className="gba:font-mono gba:text-xs gba:text-primary">{formatCaseId(caseItem.caseId)}</div>
                      <div className="gba:col-span-2">
                        <p className="gba:font-medium gba:text-sm">{caseItem.state.metadata?.title || 'Untitled'}</p>
                        {caseItem.state.metadata?.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {caseItem.state.metadata.description}
                          </p>
                        )}
                      </div>
                      <div>
                        {caseItem.state.metadata?.status ? (
                          <CaseStatusBadge status={caseItem.state.metadata.status} />
                        ) : (
                          <span className="gba:text-xs gba:text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="gba:capitalize gba:text-sm">{caseItem.state.metadata?.priority || 'medium'}</div>
                      <div className="gba:text-sm">
                        {dueDate ? (
                          <span
                            className={`gba:flex gba:items-center gba:gap-1 ${isOverdue ? 'gba:text-destructive gba:font-medium' : isDueSoon ? 'gba:text-orange-600' : 'gba:text-muted-foreground'}`}
                          >
                            {isOverdue && <AlertCircle className="gba:h-3.5 gba:w-3.5" />}
                            {isDueSoon && !isOverdue && <CalendarClock className="gba:h-3.5 gba:w-3.5" />}
                            {formatDate(dueDate)}
                          </span>
                        ) : (
                          <span className="gba:text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground">{formatDate(caseItem.createdAt)}</div>
                    </div>
                    {/* Actions column - not clickable for row navigation */}
                    <div onClick={e => e.stopPropagation()} className="gba:flex gba:justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="gba:h-4 gba:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewCase(caseItem.caseId)}>
                            <Eye className="gba:h-4 gba:w-4 gba:mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCompleteCase(caseItem.caseId)}>
                            <Check className="gba:h-4 gba:w-4 gba:mr-2" />
                            Complete Case
                          </DropdownMenuItem>
                          {allowDelete && (
                            <DropdownMenuItem className="gba:text-destructive">
                              <Trash className="gba:h-4 gba:w-4 gba:mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
