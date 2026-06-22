import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateToISO, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
import {
  isValidPhoneNumberForCountry,
  normalizeLocalPhoneNumber,
  normalizePhoneNumber
} from '@/common/utils/validation/phoneNumberValidation'
import { FormLocalizationProvider } from '@/common/components/form-localization-provider'
import type { CountryCode } from 'libphonenumber-js'

const prefixDataTestId = 'ChangeRelationshipScreen'

const toDateInputValue = (value?: string | null): string => {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

const isChildRelationshipType = (
  relationshipTypeId: string,
  relationshipTypeLabelById: Record<string, string>,
  relationshipTypeCodeById: Record<string, string>
): boolean => {
  const normalizedCode = (relationshipTypeCodeById[relationshipTypeId] || '').trim().toLowerCase()

  if (normalizedCode === 'child' || normalizedCode.endsWith(':child')) {
    return true
  }

  return (relationshipTypeLabelById[relationshipTypeId] || '').trim().toLowerCase() === 'child'
}

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

const ChangeRelationshipScreenContent: React.FC<BusinessAppContextProps> = ({
  additionalData,
  userInfo,
  accessToken
}) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('')
  const [birthDate, setBirthDate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode | ''>('')
  const [isEmergencyContact, setIsEmergencyContact] = useState(false)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>('new')
  const [firstNameTouched, setFirstNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
  const [birthDateTouched, setBirthDateTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [relationshipTypeTouched, setRelationshipTypeTouched] = useState(false)
  const { t } = useTranslation(translations)

  const {
    options: relationshipTypeOptions,
    relationships,
    employee,
    addressCountryCode
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
  const isChildType = useMemo(
    () => isChildRelationshipType(relationshipTypeId, relationshipTypeLabelById, relationshipTypeCodeById),
    [relationshipTypeId, relationshipTypeLabelById, relationshipTypeCodeById]
  )
  const isValid = useMemo(() => {
    const requiredOk = relationshipTypeId && firstName.trim() && lastName.trim()
    const birthDateOk = !isChildType || birthDate.trim().length > 0
    const phoneOk = !isEmergencyContact || phoneNumber.trim().length > 0
    return Boolean(requiredOk && birthDateOk && phoneOk)
  }, [relationshipTypeId, firstName, lastName, birthDate, isChildType, isEmergencyContact, phoneNumber])

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
      (birthDate || '') === toDateInputValue(selectedExisting.birthDate) &&
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
    birthDate,
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

  const handlePhoneValidationValueChange = useCallback((localNumber: string, countryCode: CountryCode | '') => {
    setPhoneLocalNumber(localNumber)
    setPhoneCountryCode(countryCode)
  }, [])

  // Field validations
  const validatePhoneNumber = (): string => {
    const localNumber = normalizeLocalPhoneNumber(phoneLocalNumber)

    if (localNumber.length === 0) {
      if (!isEmergencyContact) {
        return ''
      }

      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.phone_required_error',
        'The Phone Number field is required. Please enter a phone number.'
      )
    }

    if (!isValidPhoneNumberForCountry(localNumber, phoneCountryCode)) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.valid_number',
        'Please enter a valid number'
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
  const phoneError = validatePhoneNumber()
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
  const birthDateError =
    isChildType && !birthDate
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:relationship_form.birth_date_required_error',
          'The Date of Birth field is required for child relationships.'
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
      setBirthDate(toDateInputValue(loaded.birthDate))
      setPhoneNumber(loaded.phoneNumber || '')
      setIsEmergencyContact(Boolean(loaded.isEmergencyContact))
    } else {
      setSelectedRelationshipId(relPayload.id)
      setFirstName(relPayload.firstName || '')
      setLastName(relPayload.lastName || '')
      setRelationshipTypeId(relPayload.typeRef || '')
      setBirthDate(toDateInputValue(relPayload.birthDate))
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
      setBirthDate('')
      setBirthDateTouched(false)
      setPhoneNumber('')
      setIsEmergencyContact(false)
      return
    }
    const selected = (relationships || []).find((r: any) => r.id === value)
    if (selected) {
      setFirstName(selected.firstName || '')
      setLastName(selected.lastName || '')
      setRelationshipTypeId(selected.typeRef || '')
      setBirthDate(toDateInputValue(selected.birthDate))
      setBirthDateTouched(false)
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
    if (birthDateError) errors.push(birthDateError)
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
      birthDate: isChildType && birthDate ? formatDateToISO(new Date(birthDate)) : null,
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
            birthDate: selectedExisting.birthDate ? formatDateToISO(new Date(selectedExisting.birthDate)) : null,
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
                  setBirthDateTouched(false)

                  if (!isChildRelationshipType(v, relationshipTypeLabelById, relationshipTypeCodeById)) {
                    setBirthDate('')
                  }
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

          {isChildType && (
            <div>
              <Label>
                {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.birth_date', 'Date of Birth')}*
              </Label>
              <div className="gba:mt-2">
                <DateInput
                  type="date"
                  value={birthDate}
                  onChange={value => setBirthDate(typeof value === 'string' ? value : '')}
                  onBlur={() => setBirthDateTouched(true)}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:relationship_form.birth_date_placeholder',
                    'Select Date of Birth'
                  )}
                  className="gba:w-full"
                  data-testid="flw_changeRelationship_currentBirthDate"
                />
              </div>
              {birthDateTouched && birthDateError && (
                <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_birthDateError">
                  {birthDateError}
                </div>
              )}
            </div>
          )}

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
                onValidationValueChange={handlePhoneValidationValueChange}
                onTouched={() => setPhoneTouched(true)}
                onBlur={() => setPhoneTouched(true)}
                error={phoneError}
                touched={phoneTouched}
                defaultCountryCode={addressCountryCode}
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

const ChangeRelationshipScreen: React.FC<BusinessAppContextProps> = props => (
  <FormLocalizationProvider>
    <ChangeRelationshipScreenContent {...props} />
  </FormLocalizationProvider>
)

export default ChangeRelationshipScreen
