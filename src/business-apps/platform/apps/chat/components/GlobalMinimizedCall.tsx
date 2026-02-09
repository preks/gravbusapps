/**
 * DEPRECATED: This file is kept for rollback purposes only.
 *
 * The vanilla HTML renderer has been replaced by GlobalCallContainer.tsx
 * which provides a persistent React-based solution mounted at the app root.
 *
 * This file is commented out and should not be used in production.
 * It remains here temporarily as a safety measure during the migration.
 *
 * TODO: Remove this file entirely after the new architecture is stable.
 *
 * Migration date: 2026-02-06
 * Replaced by: GlobalCallContainer.tsx (mounted in BusinessAppIDE.tsx)
 */

/*
import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Users } from 'lucide-react'
import { globalCallManager, type GlobalCallState } from '../services/globalCallManager'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'
import { rtkDebug } from '../utils/rtkDebug'

// All exports are commented out - this module is deprecated
// See GlobalCallContainer.tsx for the new implementation

export const GlobalMinimizedCall: React.FC = () => {
  return null // Disabled - use GlobalCallContainer instead
}

export function initGlobalMinimizedCallRenderer() {
  console.warn(
    'initGlobalMinimizedCallRenderer is deprecated. GlobalCallContainer is now used instead. ' +
    'This function is a no-op and will be removed in a future update.'
  )
  // No-op - GlobalCallContainer handles call persistence now
}

export default GlobalMinimizedCall
*/

// Temporary placeholder exports to prevent import errors during migration
export const GlobalMinimizedCall: React.FC = () => null
export function initGlobalMinimizedCallRenderer() {
  console.warn(
    'initGlobalMinimizedCallRenderer is deprecated. GlobalCallContainer is now used instead. ' +
      'This function is a no-op and will be removed in a future update.'
  )
}
export default GlobalMinimizedCall
