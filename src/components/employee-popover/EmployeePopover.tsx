import React, { useState, useEffect, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button
} from '@newwork/nw-design-system'
import { Mail, Phone, Building2, Briefcase, ExternalLink } from 'lucide-react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import { useEmployeePopoverData } from './useEmployeePopoverData'
import { FileInfo } from '@/common/types/FileTypes'

// Cache for employee pictures to avoid fetching the same file twice
// LRU cache with automatic cleanup to prevent memory leaks
const MAX_CACHE_SIZE = 50
const pictureCache = new Map<string, string>()

const addToCache = (key: string, blobUrl: string) => {
  // Evict oldest entry if cache is full (LRU)
  if (pictureCache.size >= MAX_CACHE_SIZE) {
    const firstKey = pictureCache.keys().next().value
    if (firstKey !== undefined) {
      const oldUrl = pictureCache.get(firstKey)
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl)
      }
      pictureCache.delete(firstKey)
    }
  }
  pictureCache.set(key, blobUrl)
}

export interface EmployeePopoverProps {
  /** Employee data object - if provided, use directly */
  employee?: EmployeeRef
  /** Employee ID - if provided, fetch employee data */
  employeeId?: string
  /** Access token - REQUIRED if employeeId is provided, also required for picture loading */
  accessToken?: string
  /** Children to trigger the popover */
  children: React.ReactNode
}

export const EmployeePopover: React.FC<EmployeePopoverProps> = ({
  employee: providedEmployee,
  employeeId,
  accessToken,
  children
}) => {
  // Fetch employee data if only employeeId is provided
  const { employee: fetchedEmployee } = useEmployeePopoverData({
    employeeId: employeeId || '',
    accessToken: accessToken || ''
  })

  // Use provided employee or fetched employee
  const employee = providedEmployee || fetchedEmployee

  // State for popover open/close
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // State for picture blob URL
  const [pictureUrl, setPictureUrl] = useState<string | null>(null)
  const [isLoadingPicture, setIsLoadingPicture] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  // Load picture only when popover opens (lazy loading with caching)
  useEffect(() => {
    // Only load picture when popover is open
    if (!isPopoverOpen) {
      return
    }

    if (!employee?.picture || !accessToken) {
      setPictureUrl(null)
      setIsLoadingPicture(false)
      return
    }

    // Check cache first
    const pictureKey = typeof employee.picture === 'string' ? employee.picture : JSON.stringify(employee.picture)
    const cachedUrl = pictureCache.get(pictureKey)
    if (cachedUrl) {
      setPictureUrl(cachedUrl)
      setIsLoadingPicture(false)
      return
    }

    let fileInfo: FileInfo | null = null
    try {
      fileInfo = typeof employee.picture === 'string' ? JSON.parse(employee.picture) : employee.picture
    } catch {
      if (typeof employee.picture === 'string' && employee.picture.startsWith('data:')) {
        setPictureUrl(employee.picture)
        setIsLoadingPicture(false)
        return
      }
      setPictureUrl(null)
      setIsLoadingPicture(false)
      return
    }

    if (!fileInfo?.path) {
      setPictureUrl(null)
      setIsLoadingPicture(false)
      return
    }

    setIsLoadingPicture(true)
    let isCancelled = false

    const fetchPicture = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo!, accessToken)
        if (!isCancelled) {
          // Cache the blob URL with LRU eviction
          addToCache(pictureKey, blobUrl)
          blobUrlRef.current = blobUrl
          setPictureUrl(blobUrl)
          setIsLoadingPicture(false)
        } else {
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[EmployeePopover] Error fetching picture:', error)
          setPictureUrl(null)
          setIsLoadingPicture(false)
        }
      }
    }

    fetchPicture()

    return () => {
      isCancelled = true
      // Don't revoke cached URLs - they're reused
    }
  }, [isPopoverOpen, employee?.picture, accessToken])

  if (!employee) {
    return <>{children}</>
  }

  const employeeName = employee.displayName || employee.fullName || 'Unknown'
  const employeeJobPosition = employee.employeePosition?.jobPosition?.name
  const employeeOrganizationalUnit = employee.employeePosition?.organizationalUnit?.name

  const emailCommunication = employee.communication?.find(
    comm => comm.purpose === 'INTERNAL' && comm.channel?.value === 'Email'
  )
  const phoneCommunication = employee.communication?.find(
    comm => comm.purpose === 'INTERNAL' && (comm.channel?.value === 'Phone' || comm.channel?.value === 'Mobile')
  )

  const employeeWorkEmail = emailCommunication?.value
  const employeeWorkPhone = phoneCommunication?.value

  const handleViewProfile = () => {
    const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
    navigateTo(employeeUrl)
  }

  const isValidEmail = (email: string): boolean => {
    // Simple pattern without backtracking risk - prevents ReDoS
    // Checks: something@something.something
    const emailPattern = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailPattern.test(email)
  }

  const isValidPhone = (phone: string): boolean => {
    // Strict validation for phone numbers - prevents Open Redirect
    // Allows: digits, +, -, spaces, parentheses only
    // Must start with + or digit, max 20 chars
    const phonePattern = /^[+]?[\d\s\-()]{7,20}$/
    return phonePattern.test(phone.trim())
  }

  const handleEmailClick = () => {
    if (employeeWorkEmail && isValidEmail(employeeWorkEmail)) {
      globalThis.window.location.href = `mailto:${encodeURIComponent(employeeWorkEmail)}`
    }
  }

  const handlePhoneClick = () => {
    if (employeeWorkPhone && isValidPhone(employeeWorkPhone)) {
      // Only allow validated phone numbers - extra safety layer
      const sanitized = employeeWorkPhone.replace(/[^\d+\-\s()]/g, '')
      if (sanitized) {
        globalThis.window.location.href = `tel:${encodeURIComponent(sanitized)}`
      }
    }
  }

  const initials = employeeName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hasContactInfo = employeeWorkEmail || employeeWorkPhone

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="gba:w-80 gba:p-4" align="start" sideOffset={5}>
        {/* Avatar and Name Section */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-4">
          <div className="gba:relative">
            <Avatar className="gba:w-12 gba:h-12 gba:ring-2 gba:ring-border">
              {pictureUrl && !isLoadingPicture ? <AvatarImage src={pictureUrl} alt={employeeName} /> : null}
              <AvatarFallback className="gba:text-sm gba:font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:bg-success gba:rounded-full gba:ring-2 gba:ring-card" />
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-0.5 gba:truncate">
              {employeeName}
            </h3>
            {employeeJobPosition && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:mb-0.5">
                <Briefcase className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
                <span className="gba:truncate">{employeeJobPosition}</span>
              </div>
            )}
            {employeeOrganizationalUnit && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground">
                <Building2 className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
                <span className="gba:truncate">{employeeOrganizationalUnit}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {hasContactInfo && (
          <div className="gba:space-y-1.5 gba:mb-4 gba:pb-4 gba:border-b gba:border-border">
            {employeeWorkEmail && (
              <button
                onClick={handleEmailClick}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-foreground hover:gba:text-primary gba:transition-colors gba:w-full gba:px-2 gba:py-1.5 gba:rounded-md hover:gba:bg-muted/50 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
              >
                <Mail className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:truncate gba:text-xs">{employeeWorkEmail}</span>
              </button>
            )}
            {employeeWorkPhone && (
              <button
                onClick={handlePhoneClick}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-foreground hover:gba:text-primary gba:transition-colors gba:w-full gba:px-2 gba:py-1.5 gba:rounded-md hover:gba:bg-muted/50 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
              >
                <Phone className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-xs">{employeeWorkPhone}</span>
              </button>
            )}
          </div>
        )}

        {/* View Profile Button */}
        <Button
          onClick={handleViewProfile}
          variant="outline"
          size="sm"
          className="gba:w-full gba:justify-center gba:gap-2"
        >
          View Profile
          <ExternalLink className="gba:w-3.5 gba:h-3.5" />
        </Button>
      </PopoverContent>
    </Popover>
  )
}
