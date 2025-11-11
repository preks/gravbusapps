/**
 * ApprovePersonalInformationChangeDetails Component
 * Displays personal information change approval task with before/after comparison
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  Alert,
  AlertDescription,
  Label,
  Textarea,
  Switch,
  Separator,
  Spinner
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, User, Mail, MapPin, Calendar, Info, MessageSquare } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

interface ApprovePersonalInformationChangeDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  onClose: () => void
  employeeId?: string
}

// Type definition for personal information structure (unused but kept for documentation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _PersonalInfo {
  firstName?: string
  lastName?: string
  birthName?: string
  preferredName?: string
  birthDate?: string
  academicTitleRef?: string[]
  salutationRef?: string
  maritalStatusRef?: string
  genderRef?: string
  languageRef?: string
  nationalityRef?: string
}

interface AddressInfo {
  id?: string
  type?: string
  addressLine?: string[]
  postalCode?: string
  locality?: string
  regionRef?: string
  countryRef?: string
}

interface CommunicationInfo {
  id?: string
  purpose?: string
  typeRef?: string
  channelRef?: string
  value?: string
}

export const ApprovePersonalInformationChangeDetails: React.FC<ApprovePersonalInformationChangeDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onTaskCompleted,
  onTaskUpdated,
  onClose
}) => {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [catalogValues, setCatalogValues] = useState<Record<string, string>>({})
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)

  const graphqlClient = useGraphqlClient(accessToken)

  // Extract data from task
  const newPersonalInfo = taskDetails?.parameters?.personalInformation
  const oldPersonalInfo = taskDetails?.parameters?.oldPersonalInformation
  const creatorName = task.sourceMetadata?.inputs?.creatorName || 'Unknown'

  // Fetch catalog values for all reference fields
  useEffect(() => {
    const fetchCatalogValues = async () => {
      if (!accessToken) return

      setIsLoadingCatalog(true)
      try {
        const catalogRefs = new Set<string>()

        // Collect all catalog references from both old and new data
        const collectRefs = (data: any) => {
          if (!data) return

          // Academic titles (array)
          if (data.academicTitleRef && Array.isArray(data.academicTitleRef)) {
            data.academicTitleRef.forEach((ref: string) => catalogRefs.add(ref))
          }
          // Single reference fields
          if (data.salutationRef) catalogRefs.add(data.salutationRef)
          if (data.maritalStatusRef) catalogRefs.add(data.maritalStatusRef)
          if (data.genderRef) catalogRefs.add(data.genderRef)
          if (data.languageRef) catalogRefs.add(data.languageRef)
          if (data.nationalityRef) catalogRefs.add(data.nationalityRef)

          // Address references
          if (data.addresses && Array.isArray(data.addresses)) {
            data.addresses.forEach((addr: AddressInfo) => {
              if (addr.regionRef) catalogRefs.add(addr.regionRef)
              if (addr.countryRef) catalogRefs.add(addr.countryRef)
            })
          }
        }

        collectRefs(oldPersonalInfo)
        collectRefs(newPersonalInfo)

        if (catalogRefs.size === 0) {
          setIsLoadingCatalog(false)
          return
        }

        // Fetch all catalog entries in one query
        const catalogRefsArray = Array.from(catalogRefs)
        const query = `
          query GetCatalogValues($ids: [String!]!) {
            CatalogEntry(where: { id: { _in: $ids } }) {
              id
              value
              code
            }
          }
        `

        const response = await graphqlClient.request<{
          CatalogEntry: Array<{ id: string; value: string; code: string }>
        }>(query, { ids: catalogRefsArray })

        // Build a map of id -> value
        const valueMap: Record<string, string> = {}
        response.CatalogEntry.forEach(entry => {
          valueMap[entry.id] = entry.value
        })

        setCatalogValues(valueMap)
      } catch (error) {
        console.error('Error fetching catalog values:', error)
      } finally {
        setIsLoadingCatalog(false)
      }
    }

    fetchCatalogValues()
  }, [accessToken, oldPersonalInfo, newPersonalInfo, graphqlClient])

  const handleApprove = async () => {
    if (!task.id) return

    setIsApproving(true)
    try {
      const endpoint = task.sourceMetadata?.endpoint as string
      if (!endpoint) throw new Error('Task endpoint not found')

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          approval: true,
          note: comment || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve personal information change')
      }

      message.success({
        content: '✓ Personal information change approved successfully!',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        onTaskCompleted(task.id!)
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (error) {
      console.error('Error approving change:', error)
      message.error({
        content: `Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning({
        content: 'Please provide a reason for rejection',
        duration: 3
      })
      setShowComment(true)
      return
    }

    if (!task.id) return

    setIsRejecting(true)
    try {
      const endpoint = task.sourceMetadata?.endpoint as string
      if (!endpoint) throw new Error('Task endpoint not found')

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          approval: false,
          note: comment
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reject personal information change')
      }

      message.success({
        content: '✓ Personal information change rejected',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        onTaskCompleted(task.id!)
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (error) {
      console.error('Error rejecting change:', error)
      message.error({
        content: `Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5
      })
    } finally {
      setIsRejecting(false)
    }
  }

  // Helper to check if field changed
  const hasChanged = (oldVal: any, newVal: any): boolean => {
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal)
    }
    return oldVal !== newVal
  }

  // Helper to format reference values using catalog data
  const formatRef = (ref: string | string[] | undefined): string => {
    if (!ref) return '-'
    if (Array.isArray(ref)) {
      return ref.map(r => catalogValues[r] || r.split(':').pop() || r).join(', ')
    }
    return catalogValues[ref] || ref.split(':').pop() || ref
  }

  // Helper to format date
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  const renderFieldComparison = (label: string, oldValue: any, newValue: any, icon?: React.ReactNode) => {
    const changed = hasChanged(oldValue, newValue)

    return (
      <div className="gba:py-3 gba:border-b gba:border-border last:gba:border-0">
        <div className="gba:flex gba:items-start gba:gap-3">
          {icon && <div className="gba:mt-1 gba:text-muted-foreground">{icon}</div>}
          <div className="gba:flex-1">
            <div className="gba:text-sm gba:font-medium gba:mb-2">{label}</div>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">Previous</div>
                <div className={`gba:text-sm ${changed ? 'gba:text-destructive gba:line-through' : ''}`}>
                  {oldValue || '-'}
                </div>
              </div>
              <div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">New</div>
                <div className={`gba:text-sm gba:font-medium ${changed ? 'gba:text-success' : ''}`}>
                  {newValue || '-'}
                  {changed && (
                    <Badge variant="success" className="gba:ml-2">
                      Changed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAddressComparison = (oldAddresses: AddressInfo[] = [], newAddresses: AddressInfo[] = []) => {
    const addressTypes = ['PRIMARY', 'SECONDARY']

    return (
      <div className="gba:space-y-4">
        {addressTypes.map(type => {
          const oldAddr = oldAddresses.find(a => a.type === type)
          const newAddr = newAddresses.find(a => a.type === type)

          if (!oldAddr && !newAddr) return null

          const formatAddress = (addr: AddressInfo | undefined): string => {
            if (!addr) return '-'
            const parts = [
              ...(addr.addressLine || []).filter(Boolean),
              addr.postalCode,
              addr.locality,
              formatRef(addr.countryRef)
            ].filter(Boolean)
            return parts.join(', ')
          }

          return (
            <div key={type}>
              {renderFieldComparison(
                `${type} Address`,
                formatAddress(oldAddr),
                formatAddress(newAddr),
                <MapPin className="gba:h-4 gba:w-4" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderCommunicationComparison = (oldComm: CommunicationInfo[] = [], newComm: CommunicationInfo[] = []) => {
    const purposes = ['INTERNAL', 'PRIVATE']

    return (
      <div className="gba:space-y-4">
        {purposes.map(purpose => {
          const oldContact = oldComm.find(c => c.purpose === purpose)
          const newContact = newComm.find(c => c.purpose === purpose)

          if (!oldContact && !newContact) return null

          return (
            <div key={purpose}>
              {renderFieldComparison(
                `${purpose} Email`,
                oldContact?.value,
                newContact?.value,
                <Mail className="gba:h-4 gba:w-4" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Show loading state while fetching catalog values
  if (isLoadingCatalog) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="loading-catalog-values">
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-muted-foreground">Loading personal information details...</span>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="approve-personal-info-change-details">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="personal-info-change-title">
            {task.referenceTaskName || 'Approve Personal Information Change'}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            Requested by <strong>{creatorName}</strong>
          </p>
        </div>
        <Badge variant="warning" data-testid="personal-info-change-status-badge">
          Pending Approval
        </Badge>
      </div>

      <Separator />

      {/* Header Info */}
      <Alert data-testid="change-request-info">
        <Info className="gba:h-4 gba:w-4" />
        <AlertDescription>
          <strong>{creatorName}</strong> has requested changes to their personal information. Please review the changes
          below and approve or reject.
        </AlertDescription>
      </Alert>

      {/* Personal Information Section */}
      <Card data-testid="personal-info-section">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:h-5 gba:w-5" />
            <h3 className="gba:text-lg gba:font-semibold">Personal Information</h3>
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-1">
          {renderFieldComparison('First Name', oldPersonalInfo?.firstName, newPersonalInfo?.firstName)}
          {renderFieldComparison('Last Name', oldPersonalInfo?.lastName, newPersonalInfo?.lastName)}
          {renderFieldComparison('Birth Name', oldPersonalInfo?.birthName, newPersonalInfo?.birthName)}
          {renderFieldComparison('Preferred Name', oldPersonalInfo?.preferredName, newPersonalInfo?.preferredName)}
          {renderFieldComparison(
            'Birth Date',
            formatDate(oldPersonalInfo?.birthDate),
            formatDate(newPersonalInfo?.birthDate),
            <Calendar className="gba:h-4 gba:w-4" />
          )}
          {renderFieldComparison(
            'Academic Title',
            formatRef(oldPersonalInfo?.academicTitleRef),
            formatRef(newPersonalInfo?.academicTitleRef)
          )}
          {renderFieldComparison(
            'Salutation',
            formatRef(oldPersonalInfo?.salutationRef),
            formatRef(newPersonalInfo?.salutationRef)
          )}
          {renderFieldComparison(
            'Marital Status',
            formatRef(oldPersonalInfo?.maritalStatusRef),
            formatRef(newPersonalInfo?.maritalStatusRef)
          )}
          {renderFieldComparison(
            'Gender',
            formatRef(oldPersonalInfo?.genderRef),
            formatRef(newPersonalInfo?.genderRef)
          )}
          {renderFieldComparison(
            'Language',
            formatRef(oldPersonalInfo?.languageRef),
            formatRef(newPersonalInfo?.languageRef)
          )}
          {renderFieldComparison(
            'Nationality',
            formatRef(oldPersonalInfo?.nationalityRef),
            formatRef(newPersonalInfo?.nationalityRef)
          )}
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card data-testid="contact-info-section">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Mail className="gba:h-5 gba:w-5" />
            <h3 className="gba:text-lg gba:font-semibold">Contact Information</h3>
          </div>
        </CardHeader>
        <CardContent>
          {renderCommunicationComparison(oldPersonalInfo?.communication, newPersonalInfo?.communication)}
        </CardContent>
      </Card>

      {/* Address Information Section */}
      <Card data-testid="address-info-section">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <MapPin className="gba:h-5 gba:w-5" />
            <h3 className="gba:text-lg gba:font-semibold">Address Information</h3>
          </div>
        </CardHeader>
        <CardContent>{renderAddressComparison(oldPersonalInfo?.addresses, newPersonalInfo?.addresses)}</CardContent>
      </Card>

      <Separator />

      {/* Comment Section and Action Buttons (only for non-completed tasks) */}
      {task.status !== 'COMPLETED' && (
        <>
          {/* Comment Section */}
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <MessageSquare className="gba:h-4 gba:w-4" />
              <Label htmlFor="approval-comment" className="gba:text-sm gba:font-medium">
                Add Comment (Required for rejection)
              </Label>
              <Switch
                id="approval-comment"
                checked={showComment}
                onCheckedChange={checked => {
                  setShowComment(checked)
                  if (!checked) {
                    setComment('')
                  }
                }}
              />
            </div>
            {showComment && (
              <Textarea
                rows={3}
                placeholder="Add your approval comment or rejection reason..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
                className="gba:w-full"
                data-testid="approval-note-input"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              data-testid="reject-button"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <XCircle className="gba:h-4 gba:w-4" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              data-testid="approve-button"
              className="gba:flex gba:items-center gba:gap-2 gba:bg-success gba:text-success-foreground hover:gba:bg-success/90"
            >
              <ThumbsUp className="gba:h-4 gba:w-4" />
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
