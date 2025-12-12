/**
 * DeletedTemplatesTable Component
 * Displays a table of soft-deleted templates with restore actions
 */

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { DeletedTemplateWithName } from '../../hooks/useDeletedTemplates'
import { RotateCcw, Eye, Search, Trash2 } from 'lucide-react'

// Helper to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
}

// Helper to format date as dd.mm.yyyy HH:mm
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

interface DeletedTemplatesTableProps {
  templates: DeletedTemplateWithName[]
  onRestore: (template: DeletedTemplateWithName) => void
  onViewDetails: (template: DeletedTemplateWithName) => void
}

export const DeletedTemplatesTable: React.FC<DeletedTemplatesTableProps> = ({
  templates,
  onRestore,
  onViewDetails
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter templates by search term
  const filteredTemplates = templates.filter(
    template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.templateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.deletionReason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (templates.length === 0) {
    return (
      <Alert>
        <Trash2 className="gba:h-4 gba:w-4" />
        <AlertDescription>
          No deleted templates found. Templates you delete will appear here and can be restored.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-4">
      {/* Search Input */}
      <div className="gba:relative">
        <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <Input
          placeholder="Search deleted templates..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="gba:pl-10"
          data-testid="deleted-templates-search"
        />
      </div>

      {/* Table */}
      <div className="gba:border gba:rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Deleted By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="gba:text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  No templates match your search criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map(template => (
                <TableRow key={template.templateId} data-testid={`deleted-template-row-${template.templateId}`}>
                  <TableCell className="gba:font-medium">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Trash2 className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      <div>
                        <div>{template.name}</div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:font-mono">{template.templateId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{template.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="gba:cursor-help gba:text-sm">{formatRelativeTime(template.deletedAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{formatDate(template.deletedAt)}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="gba:text-sm">{template.deletedByName}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="gba:max-w-xs gba:truncate gba:text-sm">{template.deletionReason}</div>
                      </TooltipTrigger>
                      <TooltipContent className="gba:max-w-sm">{template.deletionReason}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDetails(template)}
                            data-testid={`view-details-button-${template.templateId}`}
                          >
                            <Eye className="gba:h-4 gba:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onRestore(template)}
                            data-testid={`restore-button-${template.templateId}`}
                          >
                            <RotateCcw className="gba:h-4 gba:w-4 gba:mr-1" />
                            Restore
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore this template</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Summary */}
      {filteredTemplates.length > 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center">
          Showing {filteredTemplates.length} of {templates.length} deleted template
          {templates.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
