export const DOCUMENT_GROUP_DEVELOPMENT = 'DocumentGroup:v1:DEVELOPMENT'

export const ACCEPTED_VERIFICATION_FILE_TYPES =
  'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

export interface AddSkillFormValues {
  targetEmployeeId?: string
  uploadedVerificationDocumentId?: string | null
  documentTypeId?: string | null
  validTo?: string | null
}

export interface SkillOption {
  id: string
  name: string
}

export interface PendingSkill extends SkillOption {
  level: number
}

export interface SelectedSkill extends SkillOption {
  isNew?: boolean
  level?: number
}
