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
 * Generate form-based screen key (frm_ prefix)
 * For form/popup types
 * @param formName - Form name (simplified for now, can be extended with process logic later)
 * @returns Screen key with frm_ prefix
 */
export const generateFormScreenKey = (formName: string): string => {
  if (!formName.trim()) return 'frm_'
  const kebab = normalToKebab(formName)
  return `frm_${kebab}`
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
  } else if (screenKey.startsWith('frm_')) {
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
  return str
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+/, '')
    .replaceAll(/-+$/, '')
}

/**
 * Split combined type into builder type and screen type
 * @param combinedType - Combined type (e.g., "native-form", "lowcoder-screen")
 * @returns Object with builderType and screenType
 */
export const splitCombinedType = (combinedType: string): { builderType: string; screenType: string } => {
  const mapping: Record<string, { builderType: string; screenType: string }> = {
    'native-screen': { builderType: 'NATIVE_SCREEN', screenType: 'SCREEN' },
    'native-form': { builderType: 'NATIVE_SCREEN', screenType: 'FORM' },
    'native-popup': { builderType: 'NATIVE_SCREEN', screenType: 'POPUP' },
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

  // New format: tfrm_<processName>_<userTaskName>
  if (screenKey.startsWith('tfrm_')) {
    const parts = screenKey.substring(5).split('_') // Remove "tfrm_"
    if (parts.length >= 2) {
      const processName = parts[0]
      const userTaskName = parts.slice(1).join('_') // In case taskName has underscores

      const domain = findDomainByProcess(processName)

      return {
        process: processName,
        userTaskName,
        domain: domain?.id || '',
        isLaunchingForm: false
      }
    }
  }

  // Legacy/Launching format: frm_<processName> or frm_<processName><CapitalizedTaskName>
  if (screenKey.startsWith('frm_')) {
    const keyPart = screenKey.substring(4) // Remove "frm_"
    return parseLegacyScreenKey(keyPart, domains)
  }

  return null
}
