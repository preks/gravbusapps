import React, { useState, useMemo, useEffect } from 'react'
import { message } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Switch
} from '@newwork/nw-design-system'
import {
  MapPin,
  Home,
  Mail,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageSquare
} from 'lucide-react'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface ReviewAddressChangeDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string
}

interface AddressData {
  id?: string | null
  type?: string | null
  addressLine?: string[] | null
  poBox?: boolean | null
  postalCode?: string | null
  locality?: string | null
  regionRef?: string | null
  countryRef?: string | null
  notes?: string | null
}

export const ReviewAddressChangeDetails: React.FC<ReviewAddressChangeDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  employeeId
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [countries, setCountries] = useState<
    Array<{ id: string; value: string; translations: Array<{ value: string }> }>
  >([])
  const [regions, setRegions] = useState<Array<{ id: string; value: string; translations: Array<{ value: string }> }>>(
    []
  )
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)

  const graphqlClient = useGraphQLClient(accessToken)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      message.success('Address change reviewed successfully!')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      message.error(`Failed to review address change: ${error.message || 'Unknown error'}`)
    }
  })

  // Fetch countries and regions catalogs
  useEffect(() => {
    const fetchCatalogs = async () => {
      const locale = getCurrentActiveUserLocale()
      try {
        const query = `
          query GetCountriesAndRegions($activeUserLocale: String!) {
            countries: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Country"}}}) {
              value
              id
              translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                value
              }
            }
            regions: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "CountryRegion"}}}) {
              value
              id
              translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{
          countries: Array<{ id: string; value: string; translations: Array<{ value: string }> }>
          regions: Array<{ id: string; value: string; translations: Array<{ value: string }> }>
        }>(query, { activeUserLocale: locale })

        setCountries(result.countries || [])
        setRegions(result.regions || [])
      } catch (error) {
        console.error('Error fetching catalogs:', error)
      } finally {
        setIsLoadingCatalogs(false)
      }
    }

    fetchCatalogs()
  }, [accessToken, graphqlClient])

  // Extract address data from task parameters
  const newAddress: AddressData = taskDetails?.parameters?.address || {}
  const oldAddress: AddressData = taskDetails?.parameters?.oldAddressData || {}
  const changeMode = taskDetails?.parameters?.changeMode || 'UPDATE'
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  const isCompleted = task.status === 'COMPLETED'

  // Get display name for country from catalog
  const getCountryDisplayName = (countryRef: string | null | undefined): string => {
    if (!countryRef) return 'N/A'
    if (isLoadingCatalogs) return countryRef.split(':').pop() || countryRef

    const country = countries.find(c => c.id === countryRef)
    if (!country) return countryRef.split(':').pop() || countryRef

    // Use translation if available, otherwise use default value
    return country.translations?.[0]?.value || country.value
  }

  // Get display name for region from catalog
  const getRegionDisplayName = (regionRef: string | null | undefined): string => {
    if (!regionRef) return 'N/A'
    if (isLoadingCatalogs) return regionRef.split(':').pop() || regionRef

    const region = regions.find(r => r.id === regionRef)
    if (!region) return regionRef.split(':').pop() || regionRef

    // Use translation if available, otherwise use default value
    return region.translations?.[0]?.value || region.value
  }

  // Format address type
  const formatAddressType = (type: string | null | undefined): string => {
    if (!type) return 'N/A'
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  // Format address lines into readable string
  const formatAddressLines = (lines: string[] | null | undefined): string => {
    if (!lines || lines.length === 0) return 'N/A'
    return lines.filter(line => line && line.trim()).join(', ') || 'N/A'
  }

  // Check if address has meaningful data (not just null placeholders or empty arrays)
  const hasOldAddress = Boolean(
    oldAddress?.id ||
      oldAddress?.locality ||
      oldAddress?.postalCode ||
      (oldAddress?.addressLine &&
        Array.isArray(oldAddress.addressLine) &&
        oldAddress.addressLine.length > 0 &&
        oldAddress.addressLine.some(line => line && line.trim()))
  )

  // Compare fields to detect changes
  const fieldComparison = useMemo(() => {
    const compare = (field: keyof AddressData, newVal: any, oldVal: any) => {
      // Handle array comparisons (addressLine)
      if (Array.isArray(newVal) && Array.isArray(oldVal)) {
        const newFormatted = formatAddressLines(newVal)
        const oldFormatted = formatAddressLines(oldVal)
        return {
          changed: newFormatted !== oldFormatted,
          oldValue: oldFormatted,
          newValue: newFormatted
        }
      }

      // Handle catalog references
      if (field === 'regionRef') {
        const newDisplay = getRegionDisplayName(newVal)
        const oldDisplay = getRegionDisplayName(oldVal)
        return {
          changed: newDisplay !== oldDisplay,
          oldValue: oldDisplay,
          newValue: newDisplay
        }
      }

      if (field === 'countryRef') {
        const newDisplay = getCountryDisplayName(newVal)
        const oldDisplay = getCountryDisplayName(oldVal)
        return {
          changed: newDisplay !== oldDisplay,
          oldValue: oldDisplay,
          newValue: newDisplay
        }
      }

      // Handle type formatting
      if (field === 'type') {
        const newFormatted = formatAddressType(newVal)
        const oldFormatted = formatAddressType(oldVal)
        return {
          changed: newFormatted !== oldFormatted,
          oldValue: oldFormatted,
          newValue: newFormatted
        }
      }

      // Handle boolean
      if (typeof newVal === 'boolean' || typeof oldVal === 'boolean') {
        return {
          changed: newVal !== oldVal,
          oldValue: oldVal ? '✓ Yes' : '✗ No',
          newValue: newVal ? '✓ Yes' : '✗ No'
        }
      }

      // Handle null/undefined
      const newDisplay = newVal || 'N/A'
      const oldDisplay = oldVal || 'N/A'

      return {
        changed: newDisplay !== oldDisplay,
        oldValue: oldDisplay,
        newValue: newDisplay
      }
    }

    return {
      type: compare('type', newAddress.type, oldAddress.type),
      poBox: compare('poBox', newAddress.poBox, oldAddress.poBox),
      addressLine: compare('addressLine', newAddress.addressLine, oldAddress.addressLine),
      postalCode: compare('postalCode', newAddress.postalCode, oldAddress.postalCode),
      locality: compare('locality', newAddress.locality, oldAddress.locality),
      regionRef: compare('regionRef', newAddress.regionRef, oldAddress.regionRef),
      countryRef: compare('countryRef', newAddress.countryRef, oldAddress.countryRef),
      notes: compare('notes', newAddress.notes, oldAddress.notes)
    }
  }, [newAddress, oldAddress])

  // Count total changes
  const changesCount = useMemo(() => {
    return Object.values(fieldComparison).filter(field => field.changed).length
  }, [fieldComparison])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await continueProcess({
        domain: 'employee',
        processName: 'changeAddress',
        payload: {
          approved: true,
          approvalComment: comment || '',
          approvalDate: new Date().toISOString(),
          approvedBy: employeeId || task.sourceMetadata?.inputs?.ActorId
        }
      })
    } catch (error) {
      console.error('Error approving address change:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning('Please provide a reason for rejection')
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {
      await continueProcess({
        domain: 'employee',
        processName: 'changeAddress',
        payload: {
          approved: false,
          approvalComment: comment,
          approvalDate: new Date().toISOString(),
          approvedBy: employeeId || task.sourceMetadata?.inputs?.ActorId
        }
      })
    } catch (error) {
      console.error('Error rejecting address change:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  // Render comparison field with change indicator
  const renderComparisonField = (
    label: string,
    comparison: { changed: boolean; oldValue: string; newValue: string },
    icon?: React.ReactNode
  ) => {
    // Always show comparison view for review tasks
    // If there's no old address, all fields will be marked as changed
    const isNewAddress = !hasOldAddress || changeMode === 'INSERT'

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          {comparison.changed && (
            <Badge variant={isNewAddress ? 'success' : 'warning'} className="gba:ml-2">
              {isNewAddress ? 'New' : 'Changed'}
            </Badge>
          )}
        </Label>

        {comparison.changed ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            {!isNewAddress && (
              <>
                <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                  {comparison.oldValue}
                </div>
                <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              </>
            )}
            <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-base gba:font-medium">
              {comparison.newValue}
            </div>
          </div>
        ) : (
          <div className="gba:text-base">{comparison.newValue}</div>
        )}
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="review-address-change-details">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <MapPin className="gba:h-5 gba:w-5" />
                Review Address Change
              </CardTitle>
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Requested by {creatorName}</div>
            </div>
            <Badge variant={changeMode === 'INSERT' ? 'success' : 'info'}>
              {changeMode === 'INSERT' ? 'New Address' : 'Address Update'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <FileText className="gba:h-4 gba:w-4" />
            <span>Submitted on {dayjs(task.createdAt).format('MMM D, YYYY HH:mm')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Change Mode Alert */}
      <Alert>
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertDescription>
          {changeMode === 'INSERT'
            ? 'This is a new address being added to the employee record.'
            : hasOldAddress && changesCount > 0
              ? `This is an update with ${changesCount} ${changesCount === 1 ? 'change' : 'changes'} to the existing address. Changed fields are highlighted below.`
              : 'This is an update to an existing address in the employee record.'}
        </AlertDescription>
      </Alert>

      {/* Address Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Home className="gba:h-5 gba:w-5" />
              {changeMode === 'INSERT' ? 'New Address Details' : 'Address Changes'}
            </CardTitle>
            {hasOldAddress && changesCount > 0 && (
              <Badge variant="warning">
                {changesCount} {changesCount === 1 ? 'Change' : 'Changes'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {/* Address Type */}
            {renderComparisonField('Address Type', fieldComparison.type)}

            {/* PO Box */}
            {renderComparisonField('PO Box', fieldComparison.poBox)}
          </div>

          <Separator />

          {/* Street Address */}
          {renderComparisonField('Street Address', fieldComparison.addressLine, <Home className="gba:h-4 gba:w-4" />)}

          <Separator />

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {/* Postal Code */}
            {renderComparisonField('Postal Code', fieldComparison.postalCode, <Mail className="gba:h-4 gba:w-4" />)}

            {/* City */}
            {renderComparisonField('City', fieldComparison.locality, <MapPin className="gba:h-4 gba:w-4" />)}

            {/* Region */}
            {renderComparisonField('Region', fieldComparison.regionRef)}

            {/* Country */}
            {renderComparisonField('Country', fieldComparison.countryRef, <Globe className="gba:h-4 gba:w-4" />)}
          </div>

          {/* Notes - only show if there are notes or they changed */}
          {(newAddress.notes || fieldComparison.notes.changed) && (
            <>
              <Separator />
              {renderComparisonField('Notes', fieldComparison.notes)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approval Comment Section - Only for active tasks */}
      {!isCompleted && (
        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0">
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <MessageSquare className="gba:h-5 gba:w-5" />
              Review Comment
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Label htmlFor="show-comment" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                Add comment
              </Label>
              <Switch
                id="show-comment"
                checked={showComment}
                onCheckedChange={setShowComment}
                data-testid="comment-toggle"
              />
            </div>
          </CardHeader>
          {showComment && (
            <CardContent>
              <div className="gba:space-y-2">
                <Label htmlFor="comment">
                  Comment {isRejecting && <span className="gba:text-destructive">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  placeholder={
                    isRejecting
                      ? 'Please provide a reason for rejection...'
                      : 'Add a comment (optional for approval, required for rejection)...'
                  }
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                  data-testid="review-comment-input"
                />
                {isRejecting && !comment.trim() && (
                  <p className="gba:text-sm gba:text-destructive">
                    A comment is required when rejecting an address change
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons - Hidden for completed tasks */}
      {!isCompleted && (
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            data-testid="reject-button"
          >
            {isRejecting ? (
              <>Rejecting...</>
            ) : (
              <>
                <XCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                Reject
              </>
            )}
          </Button>

          <Button onClick={handleApprove} disabled={isApproving || isRejecting} data-testid="approve-button">
            {isApproving ? (
              <>Approving...</>
            ) : (
              <>
                <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                Approve
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
