import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { notification } from 'antd'

/**
 * Show a toast notification
 * @param message Message content
 * @param type Notification type (success, error, info, warning)
 * @param title Optional title for the notification
 */
export const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  title?: string
): void => {
  notification[type]({
    message: title || getDefaultTitle(type),
    description: message,
    placement: 'bottomRight',
    duration: 5,
    className: `gba:${type}-toast`
  })
}

/**
 * Get default title for notification based on type
 * @param type Notification type
 * @returns Translated title
 */
const getDefaultTitle = (type: string): string => {
  switch (type) {
    case 'success':
      return getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.success_title', 'Success')
    case 'error':
      return getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.error_title', 'Error')
    case 'warning':
      return getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.warning_title', 'Warning')
    case 'info':
    default:
      return getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.information_title', 'Information')
  }
}
