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

  const { options: relationshipTypeOptions, relationships } = useRelationshipTypes({
    accessToken,
    userInfo,
    additionalData
  } as any)

  const fileClient = useFileClient({ accessToken, userInfo })

  const employeeId = userInfo?.employeeDetails?.employeeId

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
    if (!relationshipTypeId) {
      errors.push(
        getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.type_required', 'Relationship Type is required')
      )
    }
    if (!firstName.trim()) {
      errors.push(
        getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.first_name_required', 'First Name is required')
      )
    }
    if (!lastName.trim()) {
      errors.push(
        getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.last_name_required', 'Last Name is required')
      )
    }
    if (isEmergencyContact && !phoneNumber.trim()) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:relationship_form.phone_required',
          'Phone Number is required for emergency contacts'
        )
      )
    }
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
      employeeRelationship
    }

    // Only show modal for specific relationship types (Child or Marriage)
    const idSelected = relationshipTypeId.toLowerCase()
    const shouldShowCongrats =
      idSelected.includes('child') || idSelected.includes('marriage') || idSelected.includes('mariage')

    console.log(relationshipTypeOptions, 'relationshipTypeOptions')

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
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-0 gba:py-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <img
              src={flowSmall}
              alt="Flow Small"
              data-testid={formatDataTestId(prefixDataTestId, 'FlowIcon')}
              className="gba:w-6 gba:h-6"
              style={{ filter: 'brightness(0)' }}
            />
            <h2
              className="gba:text-xl gba:font-semibold gba:text-foreground"
              data-testid={formatDataTestId(prefixDataTestId, 'Title')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.title', 'Change Relationship Data')}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className="gba:border-t gba:border-border" />

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
          </div>

          {/* Relationship Type */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.type', 'Relationship Type')}*</Label>
            <div className="gba:mt-2">
              <Select value={relationshipTypeId} onValueChange={setRelationshipTypeId}>
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
          </div>

          {/* First Name */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.first_name', 'First Name')}*</Label>
            <div className="gba:mt-2">
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.first_name_placeholder',
                  'Enter First Name'
                )}
                data-testid="flw_changeRelationship_currentFirstName"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.last_name', 'Last Name')}*</Label>
            <div className="gba:mt-2">
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.last_name_placeholder',
                  'Enter Last Name'
                )}
                data-testid="flw_changeRelationship_currentLastName"
              />
            </div>
          </div>

          {/* Birth Date */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.birth_date', 'Birth Date')}</Label>
            <div className="gba:mt-2">
              <div data-testid="flw_changeRelationship_currentBirthDate">
                <DateInput
                  type="date"
                  value={birthDate || ''}
                  onChange={(v?: string) => setBirthDate(v || '')}
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
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:relationship_form.phone_number_placeholder',
                  'Enter Phone Number'
                )}
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
