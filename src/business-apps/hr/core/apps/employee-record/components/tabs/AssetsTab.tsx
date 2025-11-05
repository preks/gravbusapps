'use client'

import React from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { Spin } from '@newwork/gravity-ui-catalog'
import { Employee } from '../../hooks/useEmployeeData'
import { useEmployeeAssets } from '../../hooks/useEmployeeAssets'
import { PiPackage, PiCalendar, PiWarning } from 'react-icons/pi'

interface AssetsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  isSelfView: boolean
}

/**
 * Assets Tab Component
 * Displays employee's assigned equipment/assets
 */
const AssetsTab: React.FC<AssetsTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  const effectiveEmployeeId = employeeId || employee.id
  const { assets, isLoading, error } = useEmployeeAssets(accessToken, effectiveEmployeeId)

  // Get asset status badge variant
  const getAssetStatusBadgeVariant = (status: string): 'default' | 'success' | 'destructive' | 'warning' | 'info' => {
    switch (status) {
      case 'AVAILABLE_ASSET':
        return 'success'
      case 'ALLOCATED_ASSET':
        return 'info'
      case 'IN_REPAIR_ASSET':
        return 'warning'
      case 'RETIRED_ASSET':
        return 'destructive'
      default:
        return 'default'
    }
  }

  // Format asset status for display
  const formatAssetStatus = (status: string): string => {
    return status.replace(/_/g, ' ').replace('ASSET', '').trim()
  }

  // Get asset condition badge variant
  const getConditionBadgeVariant = (condition?: string): 'default' | 'success' | 'warning' | 'destructive' => {
    if (!condition) return 'default'
    const conditionLower = condition.toLowerCase()
    if (conditionLower.includes('excellent') || conditionLower.includes('good')) return 'success'
    if (conditionLower.includes('fair') || conditionLower.includes('acceptable')) return 'warning'
    if (conditionLower.includes('poor') || conditionLower.includes('damaged')) return 'destructive'
    return 'default'
  }

  // Check if asset is currently assigned
  const isCurrentlyAssigned = (endDate?: string) => {
    return !endDate || dayjs(endDate).isAfter(dayjs())
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="assets-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Card data-testid="assets-error">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-3 gba:text-destructive">
            <PiWarning className="gba:h-5 gba:w-5 gba:mt-0.5" />
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Assets</div>
              <div className="gba:text-sm">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (assets.length === 0) {
    return (
      <Card data-testid="assets-empty-state">
        <CardContent className="gba:py-12">
          <div className="gba:text-center gba:space-y-4">
            <div className="gba:flex gba:justify-center">
              <div className="gba:rounded-full gba:bg-muted gba:p-4">
                <PiPackage className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">No Assets Assigned</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                {isSelfView
                  ? "You don't have any equipment assigned to you at the moment."
                  : "This employee doesn't have any equipment assigned at the moment."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="assets-tab-content">
      {/* Assets Summary Card */}
      <Card data-testid="assets-summary-card">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiPackage className="gba:h-5 gba:w-5" />
            Assigned Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-6 gba:text-sm">
            <div>
              <div className="gba:text-muted-foreground">Total Assets</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-foreground">{assets.length}</div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">Currently Active</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-success">
                {assets.filter(a => isCurrentlyAssigned(a.endDate)).length}
              </div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">Returned</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-muted-foreground">
                {assets.filter(a => !isCurrentlyAssigned(a.endDate)).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card data-testid="assets-table-card">
        <CardHeader>
          <CardTitle>Asset Assignment History</CardTitle>
        </CardHeader>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Brand & Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assignment Period</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => (
                <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                  <TableCell>
                    <div className="gba:font-medium gba:text-foreground">
                      {asset.asset.assetCategory?.value || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <div className="gba:font-medium gba:text-foreground">
                        {asset.asset.assetBrand?.value || 'Unknown'}
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground">{asset.asset.model}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="gba:font-mono gba:text-sm gba:text-muted-foreground">
                      {asset.asset.serialNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
                        <PiCalendar className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                        <span className="gba:text-foreground">{dayjs(asset.startDate).format('MMM D, YYYY')}</span>
                      </div>
                      {asset.endDate ? (
                        <div className="gba:text-sm gba:text-muted-foreground">
                          to {dayjs(asset.endDate).format('MMM D, YYYY')}
                        </div>
                      ) : asset.expectedEndDate ? (
                        <div className="gba:text-sm gba:text-warning">
                          Expected: {dayjs(asset.expectedEndDate).format('MMM D, YYYY')}
                        </div>
                      ) : (
                        <div className="gba:text-sm gba:text-success">Currently Active</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      {asset.startAssetCondition && (
                        <div className="gba:text-sm">
                          <Badge
                            variant={getConditionBadgeVariant(asset.startAssetCondition.value)}
                            className="gba:text-xs"
                          >
                            Start: {asset.startAssetCondition.value}
                          </Badge>
                        </div>
                      )}
                      {asset.endAssetCondition && (
                        <div className="gba:text-sm">
                          <Badge
                            variant={getConditionBadgeVariant(asset.endAssetCondition.value)}
                            className="gba:text-xs"
                          >
                            End: {asset.endAssetCondition.value}
                          </Badge>
                        </div>
                      )}
                      {!asset.startAssetCondition && !asset.endAssetCondition && (
                        <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <Badge variant={getAssetStatusBadgeVariant(asset.asset.assetStatus)}>
                        {formatAssetStatus(asset.asset.assetStatus)}
                      </Badge>
                      {!isCurrentlyAssigned(asset.endDate) && (
                        <div className="gba:text-xs gba:text-muted-foreground">Returned</div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes Section - only show assets with notes */}
      {assets.some(a => a.notes) && (
        <Card data-testid="assets-notes-card">
          <CardHeader>
            <CardTitle>Assignment Notes</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {assets
              .filter(asset => asset.notes)
              .map(asset => (
                <div
                  key={asset.id}
                  className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2"
                  data-testid={`asset-note-${asset.id}`}
                >
                  <div className="gba:font-medium gba:text-sm gba:text-foreground gba:mb-1">
                    {asset.asset.assetBrand?.value} {asset.asset.model}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">{asset.notes}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AssetsTab
