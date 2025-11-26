import { Avatar, AvatarImage, AvatarFallback, Badge, Button } from '@newwork/nw-design-system'
import {
  PersonalDataApproval,
  getPersonalChangePriorityLabel,
  getPersonalChangePriorityVariant
} from '../hooks/usePersonalDataApprovals'
import { ClockIcon, NotePencilIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getTimeAgo } from '../hooks/useAbsencesApprovals'

export const handleApprovePersonalChange = async ({
  change,
  userId,
  accessToken,
  refetchPersonalData,
  setIsSubmitting
}: {
  change: PersonalDataApproval
  userId?: string
  accessToken?: string
  refetchPersonalData?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
}) => {
  setIsSubmitting(true)
  try {
    const urlEndpoint = `${change?.endpoint}?phase=complete&user=${userId}`

    const approvalPersonalChangePayload = {
      event: 'pse_submit',
      approvalNote: 'Acknowledged from manager dashboard'
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(approvalPersonalChangePayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchPersonalData?.()
  } catch (err) {
    console.error('Error approving personal change request:', err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const handleRejectPersonalChange = async ({
  change,
  userId,
  accessToken,
  refetchPersonalData,
  setIsSubmitting
}: {
  change: PersonalDataApproval
  userId?: string
  accessToken?: string
  refetchPersonalData?: () => void
  setIsSubmitting: (_isSubmitting: boolean) => void
}) => {
  setIsSubmitting(true)
  try {
    const urlEndpoint = `${change?.endpoint}?phase=complete&user=${userId}`

    const rejectionPersonalChangePayload = {
      event: 'pse_submit',
      approvalNote: 'Rejected from manager dashboard'
    }

    const postResponse = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(rejectionPersonalChangePayload)
    })

    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      throw new Error(`POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`)
    }
    await postResponse.json()
    refetchPersonalData?.()
  } catch (err) {
    console.error(`Error rejecting personal change:`, err)
    const defaultErrorMessage = 'Something went wrong'
    const errorMsg = err instanceof Error ? err.message : defaultErrorMessage
    toast.error(errorMsg)
  } finally {
    setIsSubmitting(false)
  }
}

export const PersonalChangeItem = ({
  change,
  userId,
  accessToken,
  refetchPersonalData
}: {
  change: PersonalDataApproval
  userId?: string
  accessToken?: string
  refetchPersonalData?: () => void
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div
      key={change.id}
      className="gba:p-3 gba:border gba:border-neutral-200 gba:rounded-lg gba:hover:border-primary-300 gba:transition-colors gba:cursor-pointer"
      data-testid={`manager-dashboard-change-${change.id}`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
        <div className="gba:flex gba:items-center gba:flex-1 gba:mr-4">
          <div className="gba:mr-3">
            <Avatar size="default" className="gba:h-10 gba:w-10">
              <AvatarImage
                src={
                  change.employee?.pictureThumbnail
                    ? `data:image/jpeg;base64,${change.employee.pictureThumbnail}`
                    : undefined
                }
                alt={change.employee?.fullName || 'Unknown Employee'}
              />
              <AvatarFallback>
                {(change.employee?.fullName || 'U E')
                  .split(' ')
                  .map(p => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="gba:flex gba:flex-col">
            <div className="gba:font-medium gba:text-neutral-900 gba:text-sm gba:mb-1">
              {change.employee?.fullName || 'Unknown Employee'}
            </div>
            <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
              <ClockIcon className="gba:mr-1" size={12} />
              {getTimeAgo(change.createdAt)}
            </div>
            <div className="gba:text-xs gba:font-medium gba:text-neutral-500 gba:flex gba:items-center gba:gap-1">
              <NotePencilIcon size={16} /> {change.title}
            </div>
          </div>
        </div>
        <div className="gba:flex gba:flex-col gba:items-end gba:space-y-1">
          <Badge variant={getPersonalChangePriorityVariant(change)} size="sm">
            {getPersonalChangePriorityLabel(change)}
          </Badge>
        </div>
      </div>
      <div className="gba:flex gba:items-center gba:justify-center">
        <Button
          size="sm"
          className="gba:w-1/2"
          disabled={isSubmitting}
          onClick={() =>
            handleApprovePersonalChange({
              change,
              userId,
              accessToken,
              refetchPersonalData,
              setIsSubmitting
            })
          }
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.acknowledge', 'Acknowledge')}
        </Button>
      </div>
    </div>
  )
}
