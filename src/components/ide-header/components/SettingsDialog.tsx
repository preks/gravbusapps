import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
  Label,
  Switch
} from '@newwork/nw-design-system'
import { CheckCircleIcon, WarningIcon, XCircleIcon, ClockIcon } from '@phosphor-icons/react'

export interface UserInfoProps {
  id?: string
  name?: string
  email?: string
  [key: string]: any
}

export interface TokenStatus {
  isExpired: boolean
  expiresAt: Date | null
  remainingTime: string
  variant: 'success' | 'warning' | 'destructive'
}

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userInfo: string
  onUserInfoChange: (value: string) => void
  userInfoError?: string
  accessToken: string
  onAccessTokenChange: (value: string) => void
  tokenStatus: TokenStatus | null
  additionalData: string
  onAdditionalDataChange: (value: string) => void
  additionalDataError?: string
  enableStructureIdAutofill: boolean
  onEnableStructureIdAutofillChange: (value: boolean) => void
  onSave: () => void
  onLogout: () => void
  onCancel: () => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  userInfo,
  onUserInfoChange,
  userInfoError,
  accessToken,
  onAccessTokenChange,
  tokenStatus,
  additionalData,
  onAdditionalDataChange,
  additionalDataError,
  enableStructureIdAutofill,
  onEnableStructureIdAutofillChange,
  onSave,
  onLogout,
  onCancel
}) => {
  const tokenStatusIcon = (size: number) =>
    tokenStatus?.isExpired ? (
      <XCircleIcon size={size} weight="fill" />
    ) : tokenStatus?.variant === 'warning' ? (
      <WarningIcon size={size} weight="fill" />
    ) : (
      <CheckCircleIcon size={size} weight="fill" />
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[700px] gba:max-h-[100vh] gba:flex gba:flex-col gba:overflow-hidden">
        <DialogHeader className="gba:flex-shrink-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your IDE settings</DialogDescription>
        </DialogHeader>

        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
          <div className="gba:space-y-4">
            <div className="gba:space-y-2">
              <Label htmlFor="userInfo">User Info (JSON format)</Label>
              <Textarea
                id="userInfo"
                placeholder="Enter user info in JSON format"
                rows={4}
                value={userInfo}
                onChange={e => onUserInfoChange(e.target.value)}
                className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${userInfoError ? 'gba:border-red-500' : ''}`}
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
              {userInfoError && <p className="gba:text-sm gba:text-red-500">{userInfoError}</p>}
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Textarea
                id="accessToken"
                placeholder="Enter your access token"
                rows={3}
                value={accessToken}
                onChange={e => onAccessTokenChange(e.target.value)}
                className="gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
              {tokenStatus && (
                <div
                  className={`gba:p-3 gba:rounded-lg gba:flex gba:items-start gba:gap-2 ${
                    tokenStatus.variant === 'destructive'
                      ? 'gba:bg-destructive-secondary gba:text-destructive-secondary'
                      : tokenStatus.variant === 'warning'
                        ? 'gba:bg-warning-secondary gba:text-warning-secondary'
                        : 'gba:bg-success-secondary gba:text-success-secondary'
                  }`}
                  data-testid="TokenStatusInfo"
                >
                  <div className="gba:flex-shrink-0 gba:mt-0.5">{tokenStatusIcon(18)}</div>
                  <div className="gba:flex-1 gba:space-y-1">
                    <div className="gba:font-semibold gba:text-sm">
                      {tokenStatus.isExpired
                        ? 'Token Expired'
                        : tokenStatus.variant === 'warning'
                          ? 'Token Expiring Soon'
                          : 'Token Valid'}
                    </div>
                    {tokenStatus.expiresAt && (
                      <div className="gba:text-xs">
                        <div>Expires: {tokenStatus.expiresAt.toLocaleString()}</div>
                        <div className="gba:font-medium gba:mt-0.5">
                          {tokenStatus.isExpired
                            ? 'Please update your token'
                            : `${tokenStatus.remainingTime} remaining`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!tokenStatus && accessToken && (
                <div
                  className="gba:p-3 gba:rounded-lg gba:flex gba:items-start gba:gap-2 gba:bg-secondary gba:text-secondary-foreground"
                  data-testid="TokenStatusInfo-Invalid"
                >
                  <div className="gba:flex-shrink-0 gba:mt-0.5">
                    <ClockIcon size={18} />
                  </div>
                  <div className="gba:flex-1">
                    <div className="gba:font-semibold gba:text-sm">Invalid Token Format</div>
                    <div className="gba:text-xs gba:mt-1">
                      The token format is invalid or cannot be decoded. Please ensure you're using a valid JWT token.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="additionalData">Additional Data (JSON format)</Label>
              <Textarea
                id="additionalData"
                placeholder='Enter additional data in JSON format (e.g., {"employeeId": "123", "jobPositionId": "456", "platformContext": {"structureId": "uuid-here"}})'
                rows={4}
                value={additionalData}
                onChange={e => onAdditionalDataChange(e.target.value)}
                className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${additionalDataError ? 'gba:border-red-500' : ''}`}
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
              {additionalDataError && <p className="gba:text-sm gba:text-red-500">{additionalDataError}</p>}
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
              <Label htmlFor="enableStructureIdAutofill">Auto-fill structure ID from local environment variables</Label>
              <Switch
                id="enableStructureIdAutofill"
                checked={enableStructureIdAutofill}
                onCheckedChange={onEnableStructureIdAutofillChange}
                data-testid="ide-settings-structure-id-autofill-toggle"
              />
            </div>

            <p className="gba:text-sm gba:text-gray-600">
              These settings will be saved in your browser's local storage and persisted between sessions. Additional
              Data is used to pass context information like employeeId, jobPositionId, etc.
            </p>
          </div>
        </div>

        <DialogFooter className="gba:gap-2 gba:flex-row gba:justify-between gba:flex-shrink-0">
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save Settings</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
