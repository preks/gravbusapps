import React, { useMemo, useRef, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Calendar,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import flowSmall from '@/assets/icons/flowSmall.svg'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import dayjs from 'dayjs'
import { useFileClient } from '@/common/network/files/useFileClient'
import { Upload } from 'antd'
import type { UploadFile } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useRelationshipTypes } from './hooks/useRelationshipTypes'
import { env } from '@/common/env/EnvUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { CongratulationsModal } from './CongratulationsModal'

interface ChangeRelationshipScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'ChangeRelationshipScreen'

const ChangeRelationshipScreen: React.FC<ChangeRelationshipScreenProps> = ({
  additionalData,
  userInfo,
  accessToken
}) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('')
  const [birthDate, setBirthDate] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isEmergencyContact, setIsEmergencyContact] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const { options: relationshipTypeOptions } = useRelationshipTypes({ accessToken, userInfo, additionalData } as any)

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
        } catch (_) {
          // Fallback to file id without extension if processes API fails
          uploadedDocumentId = fileIdNoExt
        }
      } catch (e) {
        // Silent fail for upload; form can continue without a document
      } finally {
        setIsUploading(false)
      }
    }

    // Build payload with uploaded file info (like ChangeProfilePictureScreen)
    const employeeRelationship = {
      ...(initialPayload?.relationship?.id ? { id: initialPayload.relationship.id } : {}),
      ...(typeof initialPayload?.relationship?.version === 'number'
        ? { version: initialPayload.relationship.version }
        : {}),
      businessKey: initialPayload?.relationship?.businessKey || '',
      additionalProperties: initialPayload?.relationship?.additionalProperties || {},
      employeeId,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      typeRef: relationshipTypeId || undefined,
      birthDate: birthDate ? dayjs(birthDate).toISOString() : undefined,
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
      isSubmitDisabled={!isValid}
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
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <img
              src={flowSmall}
              alt="Flow Small"
              data-testid={formatDataTestId(prefixDataTestId, 'FlowIcon')}
              className="gba:w-6 gba:h-6"
              style={{ filter: 'brightness(0)' }}
            />
            <h2
              className="gba:text-xl gba:font-semibold"
              style={{ color: 'var(--nw-color-text-primary)' }}
              data-testid={formatDataTestId(prefixDataTestId, 'Title')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.title', 'Change Relationship Data')}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className="gba:border-t" style={{ borderColor: 'var(--nw-color-border-default)' }} />

        {/* Content */}
        <div className="gba:p-6 gba:flex gba:flex-col gba:gap-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Relationship selector (Add New or Edit provided by process) */}
          <div>
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.relationship', 'Relationship')}
            </Label>
            <div className="gba:mt-2">
              <Select value={initialPayload?.relationship?.id ? 'existing' : 'new'} disabled>
                <SelectTrigger data-testid="flw_changeRelationship_currentRelationship">
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
                  <SelectItem value="existing">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.update_existing', 'Update Existing')}
                  </SelectItem>
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

          {/* Last Name */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.last_name', 'Last Name')}*</Label>
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

          {/* Birth Date */}
          <div>
            <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.birth_date', 'Birth Date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="gba:justify-between"
                  data-testid="flw_changeRelationship_currentBirthDate"
                >
                  {birthDate
                    ? dayjs(birthDate).format('YYYY-MM-DD')
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:relationship_form.birth_date_placeholder',
                        'Select Birth Date'
                      )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="gba:w-auto">
                <Calendar
                  mode="single"
                  selected={birthDate ? new Date(birthDate) : undefined}
                  onSelect={(d: Date | undefined) => setBirthDate(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Phone Number */}
          <div>
            <Label>
              {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.phone_number', 'Phone Number')}
              {isEmergencyContact ? '*' : ''}
            </Label>
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
            <div className="gba:mt-2">
              <Upload
                fileList={fileList}
                onChange={({ fileList: list }) => setFileList(list)}
                beforeUpload={() => false}
                maxCount={1}
                data-testid={formatDataTestId(prefixDataTestId, 'UploadDocument')}
              >
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isUploading}
                  data-testid="flw_changeRelationship_fileAddDocument"
                >
                  {isUploading ? <Spinner size="sm" className="gba:mr-2" /> : null}
                  <UploadOutlined />
                  <span className="gba:ml-2">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.upload', 'Upload Document')}
                  </span>
                </Button>
              </Upload>
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
