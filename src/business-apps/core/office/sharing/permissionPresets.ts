import { ChatCircle, Eye, PencilSimple, ShieldCheck } from '@phosphor-icons/react'
import type { PermissionOption } from './types'

export const OFFICE_CONTENT_SHARE_PERMISSIONS: PermissionOption[] = [
  {
    id: 'view',
    labelKey: 'share-permission-view',
    descriptionKey: 'share-permission-view-desc',
    badgeLabelKey: 'share-permission-view',
    icon: Eye
  },
  {
    id: 'comment',
    labelKey: 'share-permission-comment',
    descriptionKey: 'share-permission-comment-desc',
    badgeLabelKey: 'share-permission-comment',
    icon: ChatCircle
  },
  {
    id: 'edit',
    labelKey: 'share-permission-edit',
    descriptionKey: 'share-permission-edit-desc',
    badgeLabelKey: 'share-permission-edit',
    icon: PencilSimple
  },
  {
    id: 'admin',
    labelKey: 'share-permission-admin',
    descriptionKey: 'share-permission-admin-desc',
    badgeLabelKey: 'share-permission-admin',
    icon: ShieldCheck
  }
]

export const SPREADSHEET_SHARE_PERMISSIONS: PermissionOption[] = [
  {
    id: 'view',
    labelKey: 'share-permission-view',
    descriptionKey: 'share-permission-view-desc',
    badgeLabelKey: 'share-permission-view',
    icon: Eye
  },
  {
    id: 'edit',
    labelKey: 'share-permission-edit',
    descriptionKey: 'share-permission-edit-desc',
    badgeLabelKey: 'share-permission-edit',
    icon: PencilSimple
  },
  {
    id: 'admin',
    labelKey: 'share-permission-admin',
    descriptionKey: 'share-permission-admin-desc',
    badgeLabelKey: 'share-permission-admin',
    icon: ShieldCheck
  }
]

export const NOTE_SHARE_PERMISSIONS = OFFICE_CONTENT_SHARE_PERMISSIONS
export const SLIDE_SHARE_PERMISSIONS = OFFICE_CONTENT_SHARE_PERMISSIONS
export const DOCUMENT_SHARE_PERMISSIONS = OFFICE_CONTENT_SHARE_PERMISSIONS
export const WHITEBOARD_SHARE_PERMISSIONS = OFFICE_CONTENT_SHARE_PERMISSIONS
