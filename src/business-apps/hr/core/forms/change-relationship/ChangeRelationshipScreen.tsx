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
  DateInput,
  FileUpload
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, formatDateToISO } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import flowSmall from '@/assets/icons/flowSmall.svg'
import FormHeader from '../components/FormHeader'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import dayjs from 'dayjs'
import { useFileClient } from '@/common/network/files/useFileClient'

import { useRelationshipTypes } from './hooks/useRelationshipTypes'
import { env } from '@/common/env/EnvUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { CongratulationsModal } from './CongratulationsModal'

const prefixDataTestId = 'ChangeRelationshipScreen'

const ChangeRelationshipScreen: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo, accessToken }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('')
  const [birthDate, setBirthDate] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isEmergencyContact, setIsEmergencyContact] = useState(false)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>('new')
  const [fileList, setFileList] = useState<any[]>([])
  const [, setIsUploading] = useState(false)
  const [firstNameTouched, setFirstNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [relationshipTypeTouched, setRelationshipTypeTouched] = useState(false)

  const {
    options: relationshipTypeOptions,
    relationships,
    employee
  } = useRelationshipTypes({
    accessToken,
    userInfo,
    additionalData
  } as any)

  const fileClient = useFileClient({ accessToken, userInfo })

  const employeeId =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId || userInfo?.employeeDetails?.employeeId

  const initialPayload = useMemo(() => (additionalData as any) || {}, [additionalData])
  const [successOpen, setSuccessOpen] = useState(false)
  const preSubmitResolverRef = useRef<((payload: any) => void) | null>(null)
  const pendingPayloadRef = useRef<any>(null)

  const isValid = useMemo(() => {
    const requiredOk = relationshipTypeId && firstName.trim() && lastName.trim()
    const phoneOk = !isEmergencyContact || phoneNumber.trim().length > 0
    return Boolean(requiredOk && phoneOk)
  }, [relationshipTypeId, firstName, lastName, isEmergencyContact, phoneNumber])

  // Map for relationship type labels
  const relationshipTypeLabelById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const opt of relationshipTypeOptions) map[opt.id] = opt.label
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

  // Determine if form values equal the prefilled values for an existing relationship
  const isUnchanged = useMemo(() => {
    if (!selectedExisting) return false
    const normalizedCurrentBirth = birthDate ? dayjs(birthDate).format('YYYY-MM-DD') : ''
    const normalizedOriginalBirth = selectedExisting.birthDate
      ? dayjs(selectedExisting.birthDate).format('YYYY-MM-DD')
      : ''
    return (
      (firstName || '') === (selectedExisting.firstName || '') &&
      (lastName || '') === (selectedExisting.lastName || '') &&
      (phoneNumber || '') === (selectedExisting.phoneNumber || '') &&
      Boolean(isEmergencyContact) === Boolean(selectedExisting.isEmergencyContact) &&
      (relationshipTypeId || '') === (selectedExisting.typeRef || '') &&
      normalizedCurrentBirth === normalizedOriginalBirth &&
      fileList.length === 0
    )
  }, [selectedExisting, firstName, lastName, phoneNumber, isEmergencyContact, relationshipTypeId, birthDate, fileList])

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
    const regexTest = /^\+?\d+$/
    const trimmed = (receivedValue || '').trim()
    if (trimmed.length === 0) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.phone_required_error',
        'The Phone Number field is required. Please enter a phone number.'
      )
    }
    if (!regexTest.test(trimmed)) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:change_relationship.container_relationship.phone_only_numbers_error',
        'The Phone Number field is invalid. Please use only numbers.'
      )
    }
    return ''
  }

  const validateNameFunction = (name: string, which: 'first' | 'last'): string => {
    const nameRegex =
      /^[A-Za-zÀ-ÿ\u00f1\u00d1\u0100-\u017F\u0218-\u021B]{2,}(?:(?:\s*-\s*|\s)[A-Za-zÀ-ÿ\u00f1\u00d1\u0100-\u017F\u0218-\u021B]{2,})*$/
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

  // Initialize selection and fields if flow provided an existing relationship
  useEffect(() => {
    const rel = initialPayload?.relationship
    if (rel && rel.id) {
      setSelectedRelationshipId(rel.id)
      setFirstName(rel.firstName || '')
      setLastName(rel.lastName || '')
      setRelationshipTypeId(rel.typeRef || '')
      setBirthDate(rel.birthDate ? dayjs(rel.birthDate).format('YYYY-MM-DD') : '')
      setPhoneNumber(rel.phoneNumber || '')
      setIsEmergencyContact(Boolean(rel.isEmergencyContact))
    }
  }, [initialPayload])

  // When user changes the relationship selection, prefill the form
  const handleRelationshipSelection = (value: string) => {
    setSelectedRelationshipId(value)
    // Reset uploaded file state when switching selection
    setFileList([])
    if (value === 'new') {
      setFirstName('')
      setLastName('')
      setRelationshipTypeId('')
      setBirthDate('')
      setPhoneNumber('')
      setIsEmergencyContact(false)
      return
    }
    const selected = (relationships || []).find((r: any) => r.id === value)
    if (selected) {
      setFirstName(selected.firstName || '')
      setLastName(selected.lastName || '')
      setRelationshipTypeId(selected.typeRef || '')
      setBirthDate(selected.birthDate ? dayjs(selected.birthDate).format('YYYY-MM-DD') : '')
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

    // Optional document upload (single file). If provided upload and attach meta.
    let uploadedDocumentId: string | undefined
    if (fileList.length > 0 && fileList[0].originFileObj) {
      try {
        setIsUploading(true)
        const pathParams = { accessScope: 'public' } as const
        const appName = 'userProfile'
        const folderPath = `/pics/${employeeId}`
        const uploadResponse = await fileClient.uploadFile(fileList[0].originFileObj as File, pathParams, {
          appName,
          folderPath
        })
        const rawFileId = String(uploadResponse.fileInfo.fileId || '')
        const fileIdNoExt = rawFileId.replace(/\.[^/.]+$/, '')

        // Create EmployeeDocument via processes API (same pattern as ChangePersonalData)
        try {
          const processesBase = env('NEXT_PUBLIC_PROCESSES_ENDPOINT') || 'https://newwork-dev.newwork.com/processes'
          const createDocUrl = `${processesBase}/employee/employeeDocuments`
          const body = {
            employeeDocument: {
              employeeId: employeeId,
              documentGroup: 'DocumentGroup:v1:PERSONAL',
              type: 'DocumentType:v1:20',
              description: '',
              name: uploadResponse?.fileInfo?.fileMetadata?.originalFileName || fileList[0].name,
              file: rawFileId,
              mimeType: uploadResponse?.fileInfo?.fileMetadata?.mimeType || fileList[0].type || '',
              fileSize: (fileList[0].originFileObj as File).size || 0,
              validFrom: new Date().toISOString()
            }
          } as any

          const r = await fetch(createDocUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: accessToken ? `Bearer ${accessToken}` : ''
            },
            body: JSON.stringify(body)
          })
          const json = await r.json().catch(() => null)
          uploadedDocumentId = json?.employeeDocument?.id || fileIdNoExt
        } catch {
          // Fallback to file id without extension if processes API fails
          uploadedDocumentId = fileIdNoExt
        }
      } catch {
        // Silent fail for upload; form can continue without a document
      } finally {
        setIsUploading(false)
      }
    }

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
      phoneNumber: phoneNumber.trim() || undefined,
      typeRef: relationshipTypeId || undefined,
      birthDate: birthDate ? (formatDateToISO(new Date(birthDate)) as string) : undefined,
      emergencyContact: isEmergencyContact,
      relationshipDocument: uploadedDocumentId
    } as any

    const relationshipChange = {
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
            birthDate: selectedExisting.birthDate || '',
            emergencyContact: Boolean(selectedExisting.isEmergencyContact),
            relationshipDocument: selectedExisting.relationshipDocumentId || ''
          }
        : {}
    }

    // Only show modal for specific relationship types (Child or Marriage)
    const idSelected = relationshipTypeId.toLowerCase()
    const shouldShowCongrats =
      idSelected.includes('child') || idSelected.includes('marriage') || idSelected.includes('mariage')

    if (shouldShowCongrats) {
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
      // Prevent platform hooks here; let outer flow listen to pse events
      submitEventType={undefined as any}
      cancelEventType={undefined as any}
      businessAppContext={{ accessToken, userInfo, additionalData }}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={isSubmitDisabled}
      // Pre-submit modal controls the flow; no need for post success modal
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      onCancel={() => {
        dispatchProcessContinueEvent('pse_abort', {
          event: 'pse_abort',
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
            )
          }
        })
      }}
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
              <Select value={selectedRelationshipId} onValueChange={handleRelationshipSelection}>
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
                  {(relationships || []).map((rel: any) => (
                    <SelectItem key={rel.id} value={rel.id}>
                      {`${rel.firstName || ''} ${rel.lastName || ''}`.trim() || '—'}
                      {rel.typeRef && relationshipTypeLabelById[rel.typeRef]
                        ? ` – ${relationshipTypeLabelById[rel.typeRef]}`
                        : ''}
                    </SelectItem>
                  ))}
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

          {/* Birth Date */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.birth_date', 'Birth Date')}</Label>
            <div className="gba:mt-2">
              <div data-testid="flw_changeRelationship_currentBirthDate">
                <DateInput
                  type="date"
                  value={birthDate || ''}
                  onChange={value => setBirthDate(Array.isArray(value) ? (value?.[0] ?? '') : (value ?? ''))}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:relationship_form.birth_date_placeholder',
                    'YYYY-MM-DD'
                  )}
                  className="gba:w-full"
                />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.phone_number', 'Phone Number')}
              {isEmergencyContact ? '*' : ''}
            </Label>
            <div className="gba:mt-2">
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                onBlur={() => setPhoneTouched(true)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.phone_number_placeholder',
                  'Enter Phone Number'
                )}
                data-testid="flw_changeRelationship_currentPhoneNumber"
              />
            </div>
            {isEmergencyContact && phoneTouched && phoneError && (
              <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changeRelationship_phoneNumberError">
                {phoneError}
              </div>
            )}
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
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.upload_document', 'Upload Document')}
            </Label>
            <div className="gba:mt-2" data-testid={formatDataTestId(prefixDataTestId, 'UploadDocument')}>
              <FileUpload
                multiple={false}
                maxFiles={1}
                accept={'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}
                layout="list"
                preview="icon"
                onFilesChange={(files: any[]) => {
                  const mapped = (files || []).map((f: any) => ({
                    uid: f.id,
                    name: f.file?.name || 'file',
                    status: 'done',
                    originFileObj: f.file as File,
                    type: (f.file as File)?.type
                  }))
                  setFileList(mapped)
                }}
              />
            </div>
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
          if (resolver) resolver(payload)
        }}
        dataTestId="flw_changeRelationship_successModal"
        confirmButtonTestId="flw_changeRelationship_successClose"
      />
    </AppActionForm>
  )
}

export default ChangeRelationshipScreen
