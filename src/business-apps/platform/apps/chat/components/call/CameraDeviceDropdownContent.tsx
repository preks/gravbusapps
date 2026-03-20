/**
 * Dropdown content for camera device selection. Reusable in call control bar and pre-call setup.
 */

import React from 'react'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@newwork/nw-design-system'
import { VideoCameraIcon, CheckIcon } from '@phosphor-icons/react'
import type { MediaDeviceInfo } from '../../hooks/useMediaDevices'

export interface CameraDeviceDropdownContentProps {
  videoInputDevices: MediaDeviceInfo[]
  selectedVideoInputId: string | null
  onSelect: (deviceId: string) => void
  t?: (key: string) => string
}

const defaultT = (key: string) => key

export const CameraDeviceDropdownContent: React.FC<CameraDeviceDropdownContentProps> = ({
  videoInputDevices,
  selectedVideoInputId,
  onSelect,
  t = defaultT
}) => (
  <DropdownMenuContent
    side="top"
    align="center"
    className="gba:w-72 gba:bg-background gba:border-border gba:text-foreground"
  >
    <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
      <VideoCameraIcon className="gba:w-4 gba:h-4" weight="fill" />
      {t('call-selectCamera')}
    </DropdownMenuLabel>
    {videoInputDevices.length > 0 ? (
      videoInputDevices.map(device => (
        <DropdownMenuItem
          key={device.deviceId}
          onClick={() => onSelect(device.deviceId)}
          className="gba:flex gba:items-center gba:gap-2 gba:text-foreground hover:gba:bg-accent hover:gba:text-accent-foreground"
        >
          {selectedVideoInputId === device.deviceId && (
            <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
          )}
          <span className={selectedVideoInputId === device.deviceId ? '' : 'gba:ml-6'}>{device.label}</span>
        </DropdownMenuItem>
      ))
    ) : (
      <DropdownMenuItem disabled className="gba:text-muted-foreground">
        {t('call-noDevicesFound')}
      </DropdownMenuItem>
    )}
  </DropdownMenuContent>
)
