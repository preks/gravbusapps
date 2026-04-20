export const BRANDING_APP_NAME = 'branding'
export const BRANDING_WORDMARK_FILE_NAME = 'default_wordmark'
export const BRANDING_WORDMARK_FILE_ID = 'default_wordmark.svg+xml'
export const BRANDING_LOGOMARK_FILE_NAME = 'default_logomark'
export const BRANDING_LOGOMARK_FILE_ID = 'default_logomark.svg+xml'
export const BRANDING_ASSET_MAX_SIZE_BYTES = 50 * 1024
export const BRANDING_WORDMARK_MAX_SIZE_BYTES = BRANDING_ASSET_MAX_SIZE_BYTES
export const BRANDING_WORDMARK_ACCEPT = '.svg,image/svg+xml'
export const BRANDING_LOGOMARK_ACCEPT = '.svg,image/svg+xml'

export type BrandingWordmarkValidationError = 'invalid-type' | 'too-large'
export type BrandingLogomarkValidationError = 'invalid-type' | 'too-large'

export interface BrandingWordmarkValidationResult {
  isValid: boolean
  error?: BrandingWordmarkValidationError
}

export interface BrandingLogomarkValidationResult {
  isValid: boolean
  error?: BrandingLogomarkValidationError
}

export const resolveBrandingFolderPath = (tenantKey: string): string => {
  const normalizedTenantKey = tenantKey.trim().split('/').filter(Boolean).join('/')

  return `/${normalizedTenantKey}/logo`
}

const validateBrandingAsset = (file: File): { isValid: boolean; error?: 'invalid-type' | 'too-large' } => {
  if (file.type !== 'image/svg+xml') {
    return { isValid: false, error: 'invalid-type' }
  }

  if (file.size > BRANDING_ASSET_MAX_SIZE_BYTES) {
    return { isValid: false, error: 'too-large' }
  }

  return { isValid: true }
}

export const validateBrandingWordmarkFile = (file: File): BrandingWordmarkValidationResult =>
  validateBrandingAsset(file)

export const validateBrandingLogomarkFile = (file: File): BrandingLogomarkValidationResult =>
  validateBrandingAsset(file)

export const createBrandingWordmarkUploadFile = (file: File): File =>
  new File([file], BRANDING_WORDMARK_FILE_NAME, { type: file.type })

export const createBrandingLogomarkUploadFile = (file: File): File =>
  new File([file], BRANDING_LOGOMARK_FILE_NAME, { type: file.type })

export const BRANDING_BROADCAST_CHANNEL = 'branding'
export const BRANDING_UPDATED_EVENT = 'updated'

export const notifyBrandingUpdate = (): void => {
  const channel = new BroadcastChannel(BRANDING_BROADCAST_CHANNEL)
  channel.postMessage({ type: BRANDING_UPDATED_EVENT })
  channel.close()
}
