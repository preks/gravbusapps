import React from 'react'
import { Tag } from 'antd'
import { PiCheckCircle, PiXCircle, PiClock, PiArchive, PiWarning } from 'react-icons/pi'
import dayjs from 'dayjs'

interface BomStatusTagProps {
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'OBSOLETE'
  activeFrom?: string
  activeTo?: string
  size?: 'small' | 'default'
  showIcon?: boolean
  className?: string
  'data-testid'?: string
}

const BomStatusTag: React.FC<BomStatusTagProps> = ({
  status,
  activeFrom,
  activeTo,
  size = 'default',
  showIcon = true,
  className = '',
  'data-testid': dataTestId
}) => {
  // Check if BOM is currently active based on dates
  const isCurrentlyActive = () => {
    if (status !== 'ACTIVE') return false

    const now = dayjs()
    const activeFromDate = activeFrom ? dayjs(activeFrom) : null
    const activeToDate = activeTo ? dayjs(activeTo) : null

    return (!activeFromDate || activeFromDate.isBefore(now)) && (!activeToDate || activeToDate.isAfter(now))
  }

  // Get status configuration
  const getStatusConfig = () => {
    const currentlyActive = isCurrentlyActive()

    switch (status) {
      case 'ACTIVE':
        return {
          color: currentlyActive ? 'green' : 'orange',
          icon: currentlyActive ? <PiCheckCircle /> : <PiWarning />,
          text: currentlyActive ? 'Active' : 'Active (Not Current)',
          description: currentlyActive ? 'Currently active and valid' : 'Active but outside validity period'
        }
      case 'INACTIVE':
        return {
          color: 'red',
          icon: <PiXCircle />,
          text: 'Inactive',
          description: 'Not currently active'
        }
      case 'PENDING':
        return {
          color: 'blue',
          icon: <PiClock />,
          text: 'Pending',
          description: 'Awaiting activation'
        }
      case 'OBSOLETE':
        return {
          color: 'gray',
          icon: <PiArchive />,
          text: 'Obsolete',
          description: 'No longer in use'
        }
      default:
        return {
          color: 'default',
          icon: <PiWarning />,
          text: status,
          description: 'Unknown status'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Tag
      color={config.color}
      icon={showIcon ? config.icon : undefined}
      className={className}
      data-testid={dataTestId}
      title={config.description}
      size={size}
    >
      {config.text}
    </Tag>
  )
}

export default BomStatusTag
