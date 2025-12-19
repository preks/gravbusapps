/**
 * InstanceTable Component
 * Displays flow engine instances with search and actions
 */

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { FlowEngineInstance } from '../../types/instance'
import { InstanceHealthIndicator } from '../instance/InstanceHealthIndicator'
import { Search, Filter, Edit, Trash2, ExternalLink } from 'lucide-react'

interface InstanceTableProps {
  instances: FlowEngineInstance[]
  onEdit: (instance: FlowEngineInstance) => void
  onDelete: (instance: FlowEngineInstance) => void
  isLoading: boolean
  accessToken: string
}

export const InstanceTable: React.FC<InstanceTableProps> = ({
  instances,
  onEdit,
  onDelete,
  isLoading,
  accessToken
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')

  // Filter instances
  const filteredInstances = useMemo(() => {
    return instances.filter(instance => {
      const matchesSearch =
        instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.baseUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEnvironment = environmentFilter === 'all' || instance.environment === environmentFilter

      return matchesSearch && matchesEnvironment
    })
  }, [instances, searchTerm, environmentFilter])

  // Sort by display order
  const sortedInstances = useMemo(() => {
    return [...filteredInstances].sort((a, b) => (a.order || 999) - (b.order || 999))
  }, [filteredInstances])

  const getEnvironmentColor = (environment: string): 'default' | 'success' | 'warning' | 'secondary' => {
    switch (environment) {
      case 'PROD':
        return 'success'
      case 'STAGING':
        return 'warning'
      case 'DEV':
        return 'default'
      case 'LOCAL':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const canEdit = (instance: FlowEngineInstance): boolean => {
    // Cannot edit current platform or local dev instances (they're auto-generated)
    return instance.id !== 'instance:flow:current-platform' && instance.id !== 'instance:flow:local-dev'
  }

  if (instances.length === 0 && !isLoading) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
        <div className="gba:text-muted-foreground gba:mb-4">
          <ExternalLink className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
          <p className="gba:text-lg gba:font-medium">No instances configured</p>
          <p className="gba:text-sm">Add your first instance to start syncing templates between environments.</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="gba:space-y-4">
        {/* Filters */}
        <div className="gba:flex gba:flex-wrap gba:gap-4">
          <div className="gba:flex-1 gba:min-w-64">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search by name, URL, or description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="gba:pl-10"
                data-testid="instance-search-input"
              />
            </div>
          </div>
          <div className="gba:w-48">
            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger>
                <Filter className="gba:h-4 gba:w-4 gba:mr-2" />
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="DEV">DEV</SelectItem>
                <SelectItem value="STAGING">STAGING</SelectItem>
                <SelectItem value="PROD">PROD</SelectItem>
                <SelectItem value="LOCAL">LOCAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="gba:text-center gba:py-8">
                    Loading instances...
                  </TableCell>
                </TableRow>
              ) : sortedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    No instances found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                sortedInstances.map(instance => (
                  <TableRow key={instance.id}>
                    {/* Icon */}
                    <TableCell>
                      <div className="gba:text-2xl">{instance.icon}</div>
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium">{instance.name}</span>
                        {instance.description && (
                          <span className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1">
                            {instance.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Code */}
                    <TableCell>
                      <Badge variant="outline" className="gba:font-mono">
                        {instance.code}
                      </Badge>
                    </TableCell>

                    {/* Environment */}
                    <TableCell>
                      <Badge variant={getEnvironmentColor(instance.environment)}>{instance.environment}</Badge>
                    </TableCell>

                    {/* Base URL */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={instance.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-sm gba:text-primary gba:hover:underline gba:flex gba:items-center gba:gap-1 gba:max-w-xs gba:truncate"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="gba:truncate">{instance.baseUrl}</span>
                            <ExternalLink className="gba:h-3 gba:w-3 gba:flex-shrink-0" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{instance.baseUrl}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Health */}
                    <TableCell>
                      <InstanceHealthIndicator instance={instance} accessToken={accessToken} compact />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                        {canEdit(instance) ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onEdit(instance)}
                                  data-testid={`instance-edit-${instance.id}`}
                                >
                                  <Edit className="gba:h-4 gba:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit instance</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDelete(instance)}
                                  data-testid={`instance-delete-${instance.id}`}
                                  className="gba:text-destructive gba:hover:text-destructive"
                                >
                                  <Trash2 className="gba:h-4 gba:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete instance</TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="gba:text-xs">
                                Auto
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Auto-generated instance (cannot be edited)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <div className="gba:text-sm gba:text-muted-foreground">
          Showing {sortedInstances.length} of {instances.length} instances
        </div>
      </div>
    </TooltipProvider>
  )
}
