import React, { useMemo, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Label,
  Separator
} from '@newwork/nw-design-system'
import { PiUser, PiBuilding, PiFolder, PiHash } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EmployeeInfoSectionProps {
  code: string
  costCenterName?: string
  projectName?: string
  employee: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name?: string
      }
    }
  }
  prefixDataTestId?: string
}

/**
 * Convert base64 image data to Object URL for browser caching
 * Similar to every-box implementation
 */
const base64ToObjectURL = (base64Data: string): string | undefined => {
  try {
    // Skip if data is JSON or invalid
    if (!base64Data || base64Data.startsWith('{')) {
      return undefined
    }

    // Extract base64 data if it includes data URL prefix
    let base64 = base64Data
    if (base64Data.includes('base64,')) {
      base64 = base64Data.split('base64,')[1]
    }

    // Decode base64 to binary
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create blob and generate Object URL
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  } catch {
    return undefined
  }
}

const EmployeeInfoSection: React.FC<EmployeeInfoSectionProps> = ({
  code,
  costCenterName,
  projectName,
  employee,
  prefixDataTestId = 'approve-expense'
}) => {
  const displayName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || '?'

  // Convert base64 avatar to URL (like in every-box)
  const avatarUrl = useMemo(() => {
    if (employee.pictureThumbnail) {
      return base64ToObjectURL(employee.pictureThumbnail)
    }
    return undefined
  }, [employee.pictureThumbnail])

  // Cleanup Object URL on unmount or when avatar changes
  useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl)
      }
    }
  }, [avatarUrl])

  return (
    <Card data-testid={`${prefixDataTestId}-employee-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiUser className="gba:h-5 gba:w-5" />
          Employee Information
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Employee Profile */}
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${prefixDataTestId}-employee-profile`}>
          <Avatar className="gba:h-10 gba:w-10" data-testid={`${prefixDataTestId}-employee-avatar`}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-medium gba:text-sm gba:truncate" data-testid={`${prefixDataTestId}-employee-name`}>
              {displayName}
            </div>
            {employee.employeePosition?.jobPosition?.name && (
              <div className="gba:text-xs gba:text-muted-foreground" data-testid={`${prefixDataTestId}-employee-role`}>
                {employee.employeePosition.jobPosition.name}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Request Details */}
        <div className="gba:space-y-3" data-testid={`${prefixDataTestId}-employee-details`}>
          <div className="gba:flex gba:items-start gba:gap-2">
            <PiHash className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Request ID</Label>
              <p className="gba:text-sm">{code}</p>
            </div>
          </div>

          {costCenterName && (
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiBuilding className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:approve_expense_plan.id_cost_center_text',
                    'Cost Center'
                  )}
                </Label>
                <p className="gba:text-sm">{costCenterName}</p>
              </div>
            </div>
          )}

          {projectName && (
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiFolder className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.main_project',
                    'Project'
                  )}
                </Label>
                <p className="gba:text-sm">{projectName}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default EmployeeInfoSection
