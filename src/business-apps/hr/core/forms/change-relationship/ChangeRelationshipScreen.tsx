import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import flowSmall from '@/assets/icons/flowSmall.svg'
import FormHeader from '../components/FormHeader'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import translations from '../../apps/employee-record/_i18n'

import { useRelationshipTypes } from './hooks/useRelationshipTypes'
import { CongratulationsModal } from './CongratulationsModal'
import { PhoneInput } from './components/PhoneInput'
import { useEmployeeDocumentSync } from '../document-sync/useEmployeeDocumentSync'
import { EmployeeDocumentUploadField } from '../document-sync/EmployeeDocumentUploadField'
import { useRelationshipCongratulationsMessage } from './hooks/useRelationshipCongratulationsMessage'
import { isValidPhoneNumberWithMetadata, normalizePhoneNumber } from '@/common/utils/validation/phoneNumberValidation'

const prefixDataTestId = 'ChangeRelationshipScreen'

function toValidEmployeeDocumentId(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return ''
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(trimmed) ? trimmed : ''
}

const ChangeRelationshipScreen: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo, accessToken }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isEmergencyContact, setIsEmergencyContact] = useState(false)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>('new')
  const [firstNameTouched, setFirstNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [relationshipTypeTouched, setRelationshipTypeTouched] = useState(false)
  const { t } = useTranslation(translations)

  const {
    options: relationshipTypeOptions,
    relationships,
    employee
  } = useRelationshipTypes({
    accessToken,
    userInfo,
    additionalData
  } as any)

  const employeeId =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId || userInfo?.employeeDetails?.employeeId

  const initialPayload = useMemo(
    () => (additionalData as any)?.psi_taskPayload?.psi_initialParameters ?? (additionalData as any) ?? {},
    [additionalData]
  )
  const isEditMode = Boolean(initialPayload?.relationship?.id)
  const [successOpen, setSuccessOpen] = useState(false)
  const preSubmitResolverRef = useRef<((payload: any) => void) | null>(null)
  const pendingPayloadRef = useRef<any>(null)
  const relationshipCongratulationsMessage = useRelationshipCongratulationsMessage(accessToken)

  const isValid = useMemo(() => {
    const requiredOk = relationshipTypeId && firstName.trim() && lastName.trim()
    const phoneOk = !isEmergencyContact || phoneNumber.trim().length > 0
    return Boolean(requiredOk && phoneOk)
  }, [relationshipTypeId, firstName, lastName, isEmergencyContact, phoneNumber])

  const relationshipTypeLabelById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const opt of relationshipTypeOptions) map[opt.id] = opt.label
    return map
  }, [relationshipTypeOptions])

  const relationshipTypeCodeById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const opt of relationshipTypeOptions) map[opt.id] = opt.code
    return map
  }, [relationshipTypeOptions])

  // Currently selected existing relationship (if any)
  const selectedExisting = useMemo(
    () =>
      selectedRelationshipId !== 'new'
        ? (relationships || []).find((r: any) => r.id === selectedRelationshipId) || null
        : null,
    [selectedRelationshipId, relationships]
  )
  const selectedRelationshipDocumentId = toValidEmployeeDocumentId(selectedExisting?.relationshipDocumentId)
  const relationshipDocumentSync = useEmployeeDocumentSync({
    accessToken,
    employeeId,
    existingDocumentIds: selectedRelationshipDocumentId ? [selectedRelationshipDocumentId] : [],
    enabled: Boolean(employeeId && selectedRelationshipDocumentId),
    appName: 'employee-profile',
    folderPath: employeeId ? `/documents/${employeeId}` : undefined
  })

  useEffect(() => {
    if (!selectedRelationshipDocumentId) {
      relationshipDocumentSync.setManagedFiles([])
    }
  }, [selectedRelationshipDocumentId, relationshipDocumentSync.setManagedFiles])

  // Determine if form values equal the prefilled values for an existing relationship
  const isUnchanged = useMemo(() => {
    if (!selectedExisting) return false
    return (
      (firstName || '') === (selectedExisting.firstName || '') &&
      (lastName || '') === (selectedExisting.lastName || '') &&
      (phoneNumber || '') === (selectedExisting.phoneNumber || '') &&
      Boolean(isEmergencyContact) === Boolean(selectedExisting.isEmergencyContact) &&
      (relationshipTypeId || '') === (selectedExisting.typeRef || '') &&
      !relationshipDocumentSync.hasPendingNewUpload &&
      !relationshipDocumentSync.hasRemovedInitialFiles
    )
  }, [
    selectedExisting,
    firstName,
    lastName,
    phoneNumber,
    isEmergencyContact,
    relationshipTypeId,
    relationshipDocumentSync.hasPendingNewUpload,
    relationshipDocumentSync.hasRemovedInitialFiles
  ])

  const isSubmitDisabled = useMemo(() => {
    if (!isValid) return true
    if (selectedExisting && isUnchanged) return true
    return false
  }, [isValid, selectedExisting, isUnchanged])

  // Determine if an emergency contact already exists for the employee
  const hasExistingEmergencyContact = useMemo(() => {
    return (relationships || []).some((rel: any) => rel?.isEmergencyContact === true)
  }, [relationships])

  // Field validations
  const validatePhoneForEmergency = (receivedValue: string): string => {
    if (!isEmergencyContact) return ''
    const trimmed = (receivedValue || '').trim()
    if (trimmed.length === 0) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.phone_required_error',
        'The Phone Number field is required. Please enter a phone number.'
      )
    }
    if (!isValidPhoneNumberWithMetadata(trimmed)) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.phone_only_numbers_error',
        'The Phone Number field is invalid. Please enter a valid phone number.'
      )
    }
    return ''
  }

  const validateNameFunction = (name: string, which: 'first' | 'last'): string => {
    const nameRegex =
      /^[A-Za-zÀ-ÿ\u0100-\u017F\u0218-\u021B]{2,}(?:(?:\s*-\s*|\s)[A-Za-zÀ-ÿ\u0100-\u017F\u0218-\u021B]{2,})*$/
    const trimmed = (name || '').trim()
    if (trimmed.length === 0) {
      return which === 'first'
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.first_name_empty_error',
            'The First Name field is required. Please enter a first name.'
          )
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.last_name_empty_error',
            'The Last Name field is required. Please enter a last name.'
          )
    }
    if (trimmed.length < 2) {
      return which === 'first'
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.first_name_few_char_error',
            'The First Name field should have more than 2 characters. Please enter your first name.'
          )
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.last_name_few_char_error',
            'The Last Name field should have more than 2 characters. Please enter your last name.'
          )
    }
    if (!nameRegex.test(trimmed)) {
      return which === 'first'
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.first_name_numbers_error',
            'The First Name field is invalid. Please use only alphabetic characters.'
          )
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_relationship.container_relationship.last_name_numbers_error',
            'The Last Name field is invalid. Please use only alphabetic characters.'
          )
    }
    return ''
  }

  const firstNameError = validateNameFunction(firstName, 'first')
  const lastNameError = validateNameFunction(lastName, 'last')
  const phoneError = validatePhoneForEmergency(phoneNumber)
  const relationshipTypeError = !relationshipTypeId
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.relationship_type_error',
        'The Type field is required. Please select the relationship type.'
      )
    : ''
  const relationshipSelectionError = !selectedRelationshipId
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.relationship_error',
        'The Relationship field is required. Please select the relationship type.'
      )
    : ''

  // Initialize selection and fields if flow provided an existing relationship.
  // Waits for `relationships` to load so the form can resolve the full record
  // (including typeRef) from its own GraphQL data.
  useEffect(() => {
    const relPayload = initialPayload?.relationship
    if (!relPayload?.id) return

    const loaded = (relationships || []).find((r: any) => r.id === relPayload.id)
    if (loaded) {
      setSelectedRelationshipId(loaded.id)
      setFirstName(loaded.firstName || '')
      setLastName(loaded.lastName || '')
      setRelationshipTypeId(loaded.typeRef || '')
      setPhoneNumber(loaded.phoneNumber || '')
      setIsEmergencyContact(Boolean(loaded.isEmergencyContact))
    } else {
      setSelectedRelationshipId(relPayload.id)
      setFirstName(relPayload.firstName || '')
      setLastName(relPayload.lastName || '')
      setRelationshipTypeId(relPayload.typeRef || '')
      setPhoneNumber(relPayload.phoneNumber || '')
      setIsEmergencyContact(Boolean(relPayload.isEmergencyContact))
    }
  }, [initialPayload, relationships])

  // When user changes the relationship selection, prefill the form
  const handleRelationshipSelection = (value: string) => {
    setSelectedRelationshipId(value)
    relationshipDocumentSync.setManagedFiles([])
    if (value === 'new') {
      setFirstName('')
      setLastName('')
      setRelationshipTypeId('')
      setPhoneNumber('')
      setIsEmergencyContact(false)
      return
    }
    const selected = (relationships || []).find((r: any) => r.id === value)
    if (selected) {
      setFirstName(selected.firstName || '')
      setLastName(selected.lastName || '')
      setRelationshipTypeId(selected.typeRef || '')
      setPhoneNumber(selected.phoneNumber || '')
      setIsEmergencyContact(Boolean(selected.isEmergencyContact))
    }
  }

  const validateForm = () => {
    const errors: string[] = []
    if (relationshipSelectionError) errors.push(relationshipSelectionError)
    if (relationshipTypeError) errors.push(relationshipTypeError)
    if (firstNameError) errors.push(firstNameError)
    if (lastNameError) errors.push(lastNameError)
    if (phoneError) errors.push(phoneError)
    return errors.length ? errors : null
  }

  const handlePreSubmit = async () => {
    if (!employeeId) return {}

    const shouldClearRelationshipDocument =
      relationshipDocumentSync.hasRemovedInitialFiles && !relationshipDocumentSync.hasPendingNewUpload

    const syncResult = await relationshipDocumentSync.syncDocuments({
      documentGroup: 'DocumentGroup:v1:PERSONAL',
      documentType: 'DocumentType:v1:20',
      deleteFirst: true
    })
    const uploadedDocumentId = shouldClearRelationshipDocument ? null : syncResult.primaryDocumentId

    // Build payload with uploaded file info (like ChangeProfilePictureScreen)
    const selectedExisting =
      selectedRelationshipId !== 'new' ? (relationships || []).find((r: any) => r.id === selectedRelationshipId) : null
    const employeeRelationship = {
      ...(selectedExisting?.id ? { id: selectedExisting.id } : {}),
      ...(typeof selectedExisting?.version === 'number' ? { version: selectedExisting.version } : {}),
      businessKey: initialPayload?.relationship?.businessKey || '',
      additionalProperties: initialPayload?.relationship?.additionalProperties || {},
      employeeId,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phoneNumber: normalizePhoneNumber(phoneNumber) || undefined,
      typeRef: relationshipTypeId || undefined,
      emergencyContact: isEmergencyContact,
      relationshipDocument: uploadedDocumentId || null
    } as any

    const relationshipChange = {
      event: 'pse_submit',
      employeeRelationship,
      oldEmployeeRelationship: selectedExisting
        ? {
            id: selectedExisting.id,
            version: selectedExisting.version,
            businessKey: initialPayload?.relationship?.businessKey || '',
            additionalProperties: initialPayload?.relationship?.additionalProperties || {},
            employeeId,
            firstName: selectedExisting.firstName || '',
            lastName: selectedExisting.lastName || '',
            phoneNumber: selectedExisting.phoneNumber || '',
            typeRef: selectedExisting.typeRef || '',
            emergencyContact: Boolean(selectedExisting.isEmergencyContact),
            relationshipDocumentId: selectedExisting.relationshipDocumentId || '',
            relationshipDocument: selectedExisting.relationshipDocumentId || ''
          }
        : {},
      completeNotification: {
        type: 'success',
        message: t('notification-relationship-updated-success')
      }
    }

    // Show congratulations modal for every newly added relationship type.
    const shouldShowCongrats = !isEditMode && Boolean(relationshipTypeId)

    if (shouldShowCongrats) {
      relationshipCongratulationsMessage.clear()
      void relationshipCongratulationsMessage.generateMessage({
        companyName: employee?.companyName || '',
        personName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        relationshipType:
          relationshipTypeLabelById[relationshipTypeId] ||
          relationshipTypeCodeById[relationshipTypeId] ||
          relationshipTypeId
      })

      // Show Congratulations modal first and resolve payload after user confirms
      pendingPayloadRef.current = relationshipChange
      setSuccessOpen(true)
      return new Promise(resolve => {
        preSubmitResolverRef.current = resolve
      })
    }

    // Otherwise, proceed immediately
    return relationshipChange
  }

  return (
    <AppActionForm
      processType={initialPayload?.relationship?.id ? 'update' : 'create'}
      formData={{}}
      onSubmit={data => data}
      submitEventType="pse_submit"
      cancelEventType="pse_abort"
      businessAppContext={{ accessToken, userInfo, additionalData }}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={isSubmitDisabled}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:w-full gba:max-w-xl gba:max-h-[90vh] gba:overflow-hidden">
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.title', 'Change Relationship Data')}
          flowIconUrl={flowSmall}
          employee={
            employee
              ? {
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  pictureThumbnail: employee.pictureThumbnail,
                  jobTitle: employee.jobTitle
                }
              : undefined
          }
        />

        {/* Content */}
        <div className="gba:px-0 gba:py-6 gba:flex gba:flex-col gba:gap-4">
          {/* Relationship selector (Add New or choose existing) */}
          <div>
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.relationship', 'Relationship')}
            </Label>
            <div className="gba:mt-2">
              <Select value={selectedRelationshipId} onValueChange={handleRelationshipSelection} disabled={!isEditMode}>
                <SelectTrigger data-testid="flw_changeRelationship_selectRelationship">
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:relationship_form.relationship_placeholder',
                      'Select Relationship'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.add_new', 'Add New Relationship')}
                  </SelectItem>
                  {isEditMode
                    ? (relationships || []).map((rel: any) => (
                        <SelectItem key={rel.id} value={rel.id}>
                          {`${rel.firstName || ''} ${rel.lastName || ''}`.trim() || '—'}
                          {rel.typeRef && relationshipTypeLabelById[rel.typeRef]
                            ? ` – ${relationshipTypeLabelById[rel.typeRef]}`
                            : ''}
                        </SelectItem>
                      ))
                    : null}
                </SelectContent>
              </Select>
            </div>
            {!selectedRelationshipId && (
              <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_relationshipError">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:change_relationship.container_relationship.relationship_error',
                  'The Relationship field is required. Please select the relationship type.'
                )}
              </div>
            )}
          </div>

          {/* Relationship Type */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.type', 'Relationship Type')}*</Label>
            <div className="gba:mt-2">
              <Select
                value={relationshipTypeId}
                onValueChange={v => {
                  setRelationshipTypeTouched(true)
                  setRelationshipTypeId(v)
                }}
              >
                <SelectTrigger data-testid="flw_changeRelationship_currentRelationshipType">
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:relationship_form.type_placeholder',
                      'Select Relationship Type'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypeOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {relationshipTypeTouched && relationshipTypeError && (
              <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_relationshipTypeError">
                {relationshipTypeError}
              </div>
            )}
          </div>

          {/* First Name */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.first_name', 'First Name')}*</Label>
            <div className="gba:mt-2">
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                onBlur={() => setFirstNameTouched(true)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.first_name_placeholder',
                  'Enter First Name'
                )}
                data-testid="flw_changeRelationship_currentFirstName"
              />
            </div>
            {firstNameTouched && firstNameError && (
              <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_firstNameError">
                {firstNameError}
              </div>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.last_name', 'Last Name')}*</Label>
            <div className="gba:mt-2">
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onBlur={() => setLastNameTouched(true)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.last_name_placeholder',
                  'Enter Last Name'
                )}
                data-testid="flw_changeRelationship_currentLastName"
              />
            </div>
            {lastNameTouched && lastNameError && (
              <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_lastNameError">
                {lastNameError}
              </div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.phone_number', 'Phone Number')}
              {isEmergencyContact ? '*' : ''}
            </Label>
            <div className="gba:mt-2">
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                onBlur={() => setPhoneTouched(true)}
                error={isEmergencyContact ? phoneError : undefined}
                touched={phoneTouched}
                data-testid="flw_changeRelationship_currentPhoneNumber"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.emergency_contact', 'Emergency Contact')}
            </Label>
            <Switch
              checked={isEmergencyContact}
              onCheckedChange={setIsEmergencyContact}
              data-testid="flw_changeRelationship_currentEmergencyContact"
            />
          </div>
          {isEmergencyContact && hasExistingEmergencyContact && (
            <div data-testid="flw_changeRelationship_emergencyNote">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:change_relationship.container_relationship.emergency_note',
                'Note: This will overwrite your current emergency contact!'
              )}
            </div>
          )}

          {/* Upload Document */}
          <div>
            <EmployeeDocumentUploadField
              key={`relationship-document-${selectedRelationshipId}-${selectedRelationshipDocumentId || 'none'}`}
              name="relationshipDocumentUpload"
              label={getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.upload_document', 'Upload Document')}
              isLoading={relationshipDocumentSync.shouldShowInitialDocumentLoading}
              isResolvingInitialDocuments={relationshipDocumentSync.isResolvingInitialDocuments}
              hasExistingDocumentHint={Boolean(selectedRelationshipDocumentId)}
              hasInitialDocumentCandidates={relationshipDocumentSync.hasInitialDocumentCandidates}
              loadingMessage={getTranslationFromI18nKeyAndLabel(
                'lowcoder:relationship_form.loading_document',
                'Loading document...'
              )}
              initialFiles={relationshipDocumentSync.initialUploadFiles}
              onFilesChange={relationshipDocumentSync.onFilesChange}
              accept={'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}
              maxFiles={1}
              multiple={false}
              dataTestId={formatDataTestId(prefixDataTestId, 'UploadDocument')}
            />
          </div>
        </div>
      </div>
      {/* Success modal */}
      <CongratulationsModal
        open={successOpen}
        onConfirm={() => {
          const resolver = preSubmitResolverRef.current
          const payload = pendingPayloadRef.current || {}
          preSubmitResolverRef.current = null
          pendingPayloadRef.current = null
          setSuccessOpen(false)
          relationshipCongratulationsMessage.clear()
          if (resolver) resolver(payload)
        }}
        generatedMessage={relationshipCongratulationsMessage.message}
        dataTestId="flw_changeRelationship_successModal"
        confirmButtonTestId="flw_changeRelationship_successClose"
      />
    </AppActionForm>
  )
}

export default ChangeRelationshipScreen
