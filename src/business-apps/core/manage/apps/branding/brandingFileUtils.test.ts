import {
  BRANDING_WORDMARK_FILE_NAME,
  BRANDING_WORDMARK_MAX_SIZE_BYTES,
  createBrandingWordmarkUploadFile,
  resolveBrandingFolderPath,
  validateBrandingWordmarkFile
} from './brandingFileUtils'

describe('brandingFileUtils', () => {
  it('accepts svg wordmarks within the size limit', () => {
    const file = new File(['<svg></svg>'], 'brand.svg', { type: 'image/svg+xml' })

    expect(validateBrandingWordmarkFile(file)).toEqual({ isValid: true })
  })

  it('rejects non-svg files', () => {
    const file = new File(['wordmark'], 'brand.png', { type: 'image/png' })

    expect(validateBrandingWordmarkFile(file)).toEqual({ isValid: false, error: 'invalid-type' })
  })

  it('rejects svg files above the size limit', () => {
    const oversizedSvg = new File(['x'.repeat(BRANDING_WORDMARK_MAX_SIZE_BYTES + 1)], 'brand.svg', {
      type: 'image/svg+xml'
    })

    expect(validateBrandingWordmarkFile(oversizedSvg)).toEqual({ isValid: false, error: 'too-large' })
  })

  it('renames uploaded wordmarks to the expected backend filename', () => {
    const file = new File(['<svg></svg>'], 'custom-wordmark.svg', { type: 'image/svg+xml' })

    const uploadFile = createBrandingWordmarkUploadFile(file)

    expect(uploadFile.name).toBe(BRANDING_WORDMARK_FILE_NAME)
    expect(uploadFile.type).toBe('image/svg+xml')
  })

  it('resolves the branding folder path from the tenant key', () => {
    expect(resolveBrandingFolderPath('gravity')).toBe('/gravity/logo')
    expect(resolveBrandingFolderPath(' /gravity/ ')).toBe('/gravity/logo')
  })
})
