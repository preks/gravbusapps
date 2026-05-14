/**
 * Utility functions for component key generation and transformation
 * Based on App-Manager patterns for screen key management
 */

import { parseLegacyScreenKey } from './legacyScreenKeyUtils'

/**
 * Convert URL path to screen key format (url_ prefix)
 * @param urlPath - URL path in format "segment1/segment2/segment3"
 * @returns Screen key with url_ prefix
 * @example urlToScreenKey("apps/my-app") → "url_apps~my-app"
 */
export const urlPathToScreenKey = (urlPath: string): string => {
  if (!urlPath.trim()) return 'url_'
  const segments = urlPath.split('/').filter(segment => segment.trim() !== '')
  return segments.length > 0 ? `url_${segments.join('~')}` : 'url_'
}

/**
 * Convert screen key back to URL path
 * @param screenKey - Screen key with url_ prefix
 * @returns URL path
 * @example screenKeyToUrlPath("url_apps~my-app") → "apps/my-app"
 */
export const screenKeyToUrlPath = (screenKey: string): string => {
  if (!screenKey?.startsWith('url_')) return ''
  const segments = screenKey.substring(4).split('~')
  return segments.join('/')
}

/**
 * Convert url_ screen key to resource-url filter path: /platform/<a>/<b>/<c>
 * @param screenKey - Screen key with url_ prefix
 * @returns Path for resource-url/filter and hubs/filter (e.g. "/platform/apps/my-app")
 */
export const screenKeyToResourceUrlFilterPath = (screenKey: string): string => {
  const path = screenKeyToUrlPath(screenKey)
  return path ? `/platform/${path}` : '/platform'
}

/**
 * Parse user task screen key (tfrm_, twin_, tpop_) to process and user task name.
 * Format: t<prefix>_<processName>_<userTaskName>
 * @example parseUserTaskScreenKey("tfrm_myProcess_myTask") → { processName: "myProcess", userTaskName: "myTask" }
 */
export const parseUserTaskScreenKey = (screenKey: string): { processName: string; userTaskName: string } | null => {
  if (!screenKey?.startsWith('tfrm_') && !screenKey.startsWith('twin_') && !screenKey.startsWith('tpop_')) return null
  const prefix = screenKey.startsWith('tfrm_') ? 'tfrm_' : screenKey.startsWith('twin_') ? 'twin_' : 'tpop_'
  const rest = screenKey.substring(prefix.length)
  const parts = rest.split('_')
  if (parts.length < 2) return null
  return {
    processName: parts[0],
    userTaskName: parts.slice(1).join('_')
  }
}

/**
 * Category of a screen key by prefix for Bundle usage (Screens / Actions / Tasks).
 * - url_ = screen
 * - frm_, win_, pop_ = action (launching form/window/popup)
 * - tfrm_, twin_, tpop_ = task (user task form/window/popup)
 */
export const getScreenKeyCategory = (screenKey: string): 'screen' | 'action' | 'task' | null => {
  if (!screenKey?.trim()) return null
  if (screenKey.startsWith('url_') || screenKey.startsWith('sys_')) return 'screen'
  if (screenKey.startsWith('tfrm_') || screenKey.startsWith('twin_') || screenKey.startsWith('tpop_')) return 'task'
  if (screenKey.startsWith('frm_') || screenKey.startsWith('win_') || screenKey.startsWith('pop_')) return 'action'
  return null
}

/**
 * Component type from screen key prefix (Screen / Form / Window / Popup).
 * - url_ = screen
 * - frm_, tfrm_ = form
 * - win_, twin_ = window
 * - pop_, tpop_ = popup
 */
export const getScreenKeyComponentType = (screenKey: string): 'screen' | 'form' | 'window' | 'popup' | null => {
  if (!screenKey?.trim()) return null
  if (screenKey.startsWith('url_') || screenKey.startsWith('sys_')) return 'screen'
  if (screenKey.startsWith('frm_') || screenKey.startsWith('tfrm_')) return 'form'
  if (screenKey.startsWith('win_') || screenKey.startsWith('twin_')) return 'window'
  if (screenKey.startsWith('pop_') || screenKey.startsWith('tpop_')) return 'popup'
  return null
}

const FORM_SCREEN_KEY_PREFIXES = ['frm_', 'win_', 'pop_', 'tfrm_', 'twin_', 'tpop_'] as const

/**
 * Get the suffix of a form/popup/window screen key (part after the prefix).
 * e.g. frm_myProcess -> myProcess; tfrm_myProcess_MyTask -> myProcess_MyTask
 */
export const getFormScreenKeySuffix = (screenKey: string): string => {
  if (!screenKey?.trim()) return ''
  for (const p of FORM_SCREEN_KEY_PREFIXES) {
    if (screenKey.startsWith(p)) return screenKey.slice(p.length)
  }
  return ''
}

/** Action screen key prefix by type: form -> frm, window -> win, popup -> pop */
export type ActionScreenKeyPrefix = 'frm' | 'win' | 'pop'

/**
 * Get action screen key prefix from combined type (native-form -> frm, native-window -> win, native-popup -> pop).
 * Lowcoder-form and formio-form use frm.
 */
export const getActionScreenKeyPrefix = (combinedType: string): ActionScreenKeyPrefix => {
  if (combinedType === 'native-window') return 'win'
  if (combinedType === 'native-popup') return 'pop'
  return 'frm'
}

/**
 * Generate form-based screen key with configurable prefix (frm_, win_, pop_).
 * @param formName - Form name or custom key suffix
 * @param prefix - Prefix (frm, win, pop). Default frm.
 * @returns Screen key with given prefix
 */
export const generateFormScreenKey = (formName: string, prefix: ActionScreenKeyPrefix = 'frm'): string => {
  if (!formName.trim()) return `${prefix}_`
  const suffix = normalizeScreenKeySuffixPreserveCase(formName)
  return suffix ? `${prefix}_${suffix}` : `${prefix}_`
}

/**
 * Generate component path from module and type
 * @param module - Module (hr, fin, crm, etc.)
 * @param type - Combined type (native-screen, native-form, etc.)
 * @param screenKey - Screen key (can be url_ or frm_ format)
 * @returns Component path suggestion
 */
export const generateComponentPath = (module: string, type: string, screenKey: string): string => {
  if (!module || !type || !screenKey) return ''

  // Determine folder based on type
  const isForm = type.includes('form')
  const isPopup = type.includes('popup')
  const folder = (() => {
    if (isForm) return 'forms'
    if (isPopup) return 'popups'
    return 'apps'
  })()

  // Extract last segment from screen key for path name
  let pathName = screenKey
  if (screenKey.startsWith('url_')) {
    const urlPath = screenKeyToUrlPath(screenKey)
    const segments = urlPath.split('/').filter(Boolean)
    pathName = segments[segments.length - 1] || screenKey
  } else if (screenKey.startsWith('frm_') || screenKey.startsWith('win_') || screenKey.startsWith('pop_')) {
    pathName = screenKey.substring(4)
  }

  return `/${module}/core/${folder}/${pathName}`
}

/**
 * String conversion utilities
 */
export const kebabToNormal = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const normalToKebab = (str: string): string => {
  const result = str.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')

  // Trim leading and trailing dashes without unbounded quantifiers
  return result.replace(/^-/, '').replace(/-$/, '')
}

/**
 * Suffix after `sys_`: preserve casing; non-alphanumeric runs → single underscore (legacy system-key shape).
 */
export const normalizeSystemScreenKeySuffix = (str: string): string => {
  const trimmed = String(str).trim()
  if (!trimmed) return ''
  const result = trimmed.replaceAll(/[^a-zA-Z0-9]+/g, '_')
  return result.replace(/^_+/, '').replace(/_+$/, '')
}

/**
 * User-facing screen key suffix: keep letter casing (matches process/task names and SMS registry).
 * Collapse runs of non-alphanumeric characters to a single hyphen (same shape as legacy kebab keys, without lowercasing).
 */
export const normalizeScreenKeySuffixPreserveCase = (str: string): string => {
  const trimmed = String(str).trim()
  if (!trimmed) return ''
  const result = trimmed.replaceAll(/[^a-zA-Z0-9]+/g, '-')
  return result.replace(/^-+/, '').replace(/-+$/, '')
}

/**
 * Split combined type into builder type and screen type
 * @param combinedType - Combined type (e.g., "native-form", "lowcoder-screen")
 * @returns Object with builderType and screenType
 */
export const splitCombinedType = (combinedType: string): { builderType: string; screenType: string } => {
  const mapping: Record<string, { builderType: string; screenType: string }> = {
    'native-screen': { builderType: 'NATIVE_SCREEN', screenType: 'SCREEN' },
    'system-component': { builderType: 'NATIVE_SCREEN', screenType: 'SCREEN' },
    'native-form': { builderType: 'NATIVE_SCREEN', screenType: 'FORM' },
    'native-popup': { builderType: 'NATIVE_SCREEN', screenType: 'POPUP' },
    'native-window': { builderType: 'NATIVE_SCREEN', screenType: 'WINDOW' },
    'lowcoder-screen': { builderType: 'LOWCODER', screenType: 'SCREEN' },
    'lowcoder-form': { builderType: 'LOWCODER', screenType: 'FORM' },
    'formio-form': { builderType: 'FORMIO', screenType: 'FORM' }
  }

  return mapping[combinedType] || { builderType: 'NATIVE_SCREEN', screenType: 'SCREEN' }
}

/**
 * Combine builder type and screen type into single type
 * @param builderType - Builder type (NATIVE_SCREEN, LOWCODER, FORMIO)
 * @param screenType - Screen type (SCREEN, FORM, POPUP)
 * @returns Combined type string
 */
export const combineBuildAndScreenType = (builderType: string, screenType: string): string => {
  const reverseMapping: Record<string, string> = {
    'NATIVE_SCREEN-SCREEN': 'native-screen',
    'NATIVE_SCREEN-FORM': 'native-form',
    'NATIVE_SCREEN-POPUP': 'native-popup',
    'NATIVE_SCREEN-WINDOW': 'native-window',
    'LOWCODER-SCREEN': 'lowcoder-screen',
    'LOWCODER-FORM': 'lowcoder-form',
    'FORMIO-FORM': 'formio-form'
  }

  const key = `${builderType}-${screenType}`
  return reverseMapping[key] || 'native-screen'
}

/**
 * Validate component path format
 * @param componentPath - Component path to validate
 * @returns Validation result
 */
export const validateComponentPath = (componentPath: string): { isValid: boolean; error?: string } => {
  if (!componentPath) {
    return { isValid: false, error: 'Component path is required' }
  }

  if (!componentPath.startsWith('/')) {
    return { isValid: false, error: 'Component path must start with /' }
  }

  const segments = componentPath.split('/').filter(s => s.trim())
  if (segments.length < 3) {
    return {
      isValid: false,
      error: 'Component path should have format: /module/domain/type/name'
    }
  }

  return { isValid: true }
}

/**
 * Parse form screen key to extract process name, user task name, and determine if it's a launching form
 * Handles both new format (tfrm_process_task) and legacy format (frm_processTask or frm_process)
 */
export const parseFormScreenKey = (
  screenKey: string,
  domains: Array<{ id: string; name: string; processes: Array<{ id?: string; name: string }> }>
): { process: string; userTaskName: string; domain: string; isLaunchingForm: boolean } | null => {
  // Helper to find domain by process name
  const findDomainByProcess = (processName: string) => {
    return domains.find(d => d.processes.some(p => p.name === processName))
  }

  // Task format: tfrm_ / twin_ / tpop_ <processName>_<userTaskName>
  const taskPrefixes = ['tfrm_', 'twin_', 'tpop_'] as const
  for (const taskPrefix of taskPrefixes) {
    if (screenKey.startsWith(taskPrefix)) {
      const parts = screenKey.substring(5).split('_')
      if (parts.length >= 2) {
        const processName = parts[0]
        const userTaskName = parts.slice(1).join('_')
        const domain = findDomainByProcess(processName)
        return {
          process: processName,
          userTaskName,
          domain: domain?.id || '',
          isLaunchingForm: false
        }
      }
      break
    }
  }

  // Action/Launching format: frm_ / win_ / pop_ <processName> or legacy concatenated task
  const actionPrefixes = ['frm_', 'win_', 'pop_'] as const
  for (const actionPrefix of actionPrefixes) {
    if (screenKey.startsWith(actionPrefix)) {
      const keyPart = screenKey.substring(4)
      return parseLegacyScreenKey(keyPart, domains)
    }
  }

  return null
}
