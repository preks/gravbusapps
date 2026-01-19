'use client'

import React from 'react'
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer'
import { PiBriefcase } from 'react-icons/pi'

/**
 * JobDetailsDrawer Props Interface
 */
interface JobDetailsDrawerProps {
  open: boolean
  title: string
  content: React.ReactElement
  onClose: () => void
  icon?: React.ReactNode // Optional icon component
}

/**
 * JobDetailsDrawer Component
 * A reusable drawer component for displaying job-related details
 */
const JobDetailsDrawer: React.FC<JobDetailsDrawerProps> = ({
  open,
  title,
  content,
  onClose,
  icon = <PiBriefcase className="gba:h-5 gba:w-5" /> // Default icon is briefcase
}) => {
  // Clone the content element and pass the isVisible prop
  const contentWithVisibilityProp = React.cloneElement(content, { isVisible: open })

  return (
    <DataDetailsDrawer
      title={title}
      icon={icon}
      open={open}
      onClose={onClose}
      width={400}
      placement="right"
      data-testid="job-details-drawer"
    >
      {contentWithVisibilityProp}
    </DataDetailsDrawer>
  )
}

export default JobDetailsDrawer
