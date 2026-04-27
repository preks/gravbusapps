import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { Button, DateInputField, Divider, InputField, SelectField, Switch } from '@newwork/gravity-ui-catalog'
import { Form, Row, Col, Alert, Upload } from 'antd'
import { Badge } from '@newwork/nw-design-system'
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from '../../types'
import UploadComponent from '../UploadComponent'
import SinglePositionComponent from './SinglePositionComponent'
import MultiPositionComponent from './MultiPositionComponent'
import { useExpenseItem } from '../../context/ExpenseItemContext'

import {
  getCurrentActiveUserLocale,
  getDateFormat,
  getTranslationFromI18nKeyAndLabel
} from '../../../../../../../common/utils/windowUtils'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { DEFAULT_CURRENCY_ID } from '../../constants/constants'

interface FormScreenComponentProps {
  form: any
  fileList: any[]
  setFileList: (files: any[]) => void
  positions: ExpensePosition[]
  setPositions: (positions: ExpensePosition[]) => void
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies: Currency[]
  expenseRequests: any[]
  multiPosition: boolean
  setCurrentSelectedDate: (date: Date | null) => void
  setMultiPosition: (isMulti: boolean) => void
  handleSubmit: () => Promise<void>
  handleCancel: () => void
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>
  handleAddPosition: () => void
  handleRemovePosition: (positionId: string) => void
  loading: boolean
  calculateTotal: () => number
}

export const FormScreenComponent: React.FC<FormScreenComponentProps> = ({
  form,
  fileList,
  setFileList,
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  expenseRequests,
  multiPosition,
  setCurrentSelectedDate,
  setMultiPosition,
  handleSubmit,
  handleCancel,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleAddPosition,
  handleRemovePosition,
  calculateTotal
}) => {
  const t = getTranslationFromI18nKeyAndLabel
  const ALLOWED_FILE_TYPES = ['.pdf', '.PDF', '.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG']
  const {
    isProcessingFiles,
    isFormDisabled,
    isCreating,
    expenseRuleError,
    receiptCurrencyError,
    hasLinkedExpenseRequest,
    handleCurrencyChange,
    isEditMode,
    additionalData,
    supportingFileList,
    setSupportingFileList,
    requiredAttachmentInstructions
  } = useExpenseItem()

  // Calculate isEmbeddedInRequestWizard from additionalData
  const isEmbeddedInRequestWizard = Boolean(additionalData?.expenseRequestId && additionalData.expenseRequestId !== '0')

  const selectedExpenseRequestId = Form.useWatch('expenseRequestId', form)
  const hadBackendRequestRef = useRef(false)
  const prevPositionsLengthRef = useRef(positions.length)
  const lastPositionCardRef = useRef<HTMLDivElement | null>(null)
  const supportingUploadUidRef = useRef(0)
  const requiresSupportingDocument = requiredAttachmentInstructions.length > 0

  const createSupportingUploadUid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    supportingUploadUidRef.current += 1
    return `supporting-upload-${Date.now()}-${supportingUploadUidRef.current}`
  }

  const validateSupportingFileType = (file: File) => {
    const isValidType = ALLOWED_FILE_TYPES.some(type => {
      const extension = `.${file.name.split('.').pop()}`
      return type.toLowerCase() === extension.toLowerCase()
    })

    if (!isValidType) {
      showToast(
        t(
          'lowcoder:create_expense_type_item.error_file_type_message',
          'File type not supported. Please upload PDF, JPG, JPEG, or PNG files only.'
        ),
        'error'
      )
    }

    return isValidType
  }

  const handleSupportingBeforeUpload = (file: File) => {
    if (!validateSupportingFileType(file)) {
      return Upload.LIST_IGNORE
    }

    setSupportingFileList([
      ...supportingFileList,
      {
        uid: createSupportingUploadUid(),
        name: file.name,
        status: 'done',
        originFileObj: file
      }
    ])
    return false
  }

  const handleSupportingRemove = (file: any) => {
    setSupportingFileList(supportingFileList.filter(item => item.uid !== file.uid))
  }

  useEffect(() => {
    if (hadBackendRequestRef.current || !isEditMode) {
      return
    }

    const initialRequestId = selectedExpenseRequestId || form.getFieldValue('expenseRequestId')
    if (initialRequestId && initialRequestId !== '0') {
      hadBackendRequestRef.current = true
    }
  }, [form, isEditMode, selectedExpenseRequestId])

  // When a new position is added in multi-position mode, scroll to it and focus the card (ref-based, no DOM query)
  useEffect(() => {
    if (!multiPosition || positions.length <= prevPositionsLengthRef.current) {
      prevPositionsLengthRef.current = positions.length
      return
    }
    prevPositionsLengthRef.current = positions.length
    const frameId = requestAnimationFrame(() => {
      lastPositionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      lastPositionCardRef.current?.focus()
    })
    return () => cancelAnimationFrame(frameId)
  }, [multiPosition, positions.length])

  const expenseRequestOptions = useMemo(() => {
    return expenseRequests.map(request => {
      // For "None" option, return simple text
      if (request.id === '0') {
        return {
          id: request.id,
          name: request.title || request.code
        }
      }

      // For expense requests with status, create a React element with Badge
      const statusDisplay = request.statusDisplay
      const formattedDate = request.formattedDate || ''
      const title = request.title || request.code || ''

      const badgeVariant = statusDisplay?.badgeVariant || 'outline'
      const statusLabel = statusDisplay?.label || ''

      // Map badge variant to text color token
      const getTextColorClass = (variant: string) => {
        switch (variant) {
          case 'offline':
            return 'gba:text-offline'
          case 'warning':
            return 'gba:text-warning'
          case 'info':
            return 'gba:text-info'
          case 'success':
            return 'gba:text-success'
          default:
            return ''
        }
      }

      const textColorClass = statusDisplay ? getTextColorClass(badgeVariant) : ''

      return {
        id: request.id,
        name: (
          <div className="gba:flex gba:items-center gba:gap-2">
            {statusLabel && (
              <Badge variant={badgeVariant} className="gba:shrink-0">
                {statusLabel}
              </Badge>
            )}
            <span className={`${textColorClass} gba:min-w-0 gba:truncate`}>
              {formattedDate} - {title}
            </span>
          </div>
        )
      }
    })
  }, [expenseRequests])

  const hasBackendPreselectedRequest =
    hadBackendRequestRef.current ||
    !!(additionalData?.expenseRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.expenseRequest)

  const filteredExpenseRequestOptions = hasBackendPreselectedRequest
    ? expenseRequestOptions.filter(option => option.id !== '0')
    : expenseRequestOptions

  // Memoize the submit handler to prevent re-creating on every render
  const handleCreateClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      try {
        await form.validateFields()

        if (expenseRuleError) {
          return
        }

        if (requiresSupportingDocument && supportingFileList.length === 0) {
          showToast(
            t(
              'lowcoder:create_expense_item.missing_additional_attachment',
              'Please upload the required supporting document.'
            ),
            'error'
          )
          return
        }

        await handleSubmit()
      } catch (errorInfo: any) {
        // Handle form validation errors - scroll to first invalid field
        const firstErrorField = errorInfo?.errorFields?.[0]?.name?.[0]
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
        // Currency/submission errors are already handled by context with toast
      }
    },
    [form, expenseRuleError, handleSubmit, requiresSupportingDocument, supportingFileList.length]
  )

  return (
    <Form
      form={form}
      layout="vertical"
      data-testid="expense-form"
      className="gba:flex gba:flex-col gba:flex-grow"
      validateTrigger={['onChange', 'onBlur']}
      initialValues={{
        date: new Date(),
        currency: DEFAULT_CURRENCY_ID
      }}
    >
      <div className="gba:m-0 gba:mb-[30px]" data-testid="form-upload-container">
        <UploadComponent fileList={fileList} setFileList={setFileList} />
      </div>

      {requiresSupportingDocument && (
        <div className="gba:mb-4" data-testid="supporting-document-container">
          {requiredAttachmentInstructions.map(instruction => (
            <Alert
              key={instruction}
              message={instruction}
              type="info"
              showIcon
              className="gba:mb-2"
              data-testid="supporting-document-instruction"
            />
          ))}
          <Upload
            listType="text"
            fileList={supportingFileList}
            beforeUpload={handleSupportingBeforeUpload}
            onRemove={handleSupportingRemove}
            multiple={true}
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG"
            disabled={isProcessingFiles || isFormDisabled}
            data-testid="supporting-document-upload"
          >
            <Button variant="secondary" data-testid="supporting-document-upload-button">
              {t('lowcoder:create_expense_item.attach_supporting_document', 'Attach Supporting Document')}
            </Button>
          </Upload>
        </div>
      )}

      {receiptCurrencyError && fileList && fileList.length > 0 && (
        <div
          className="gba:mb-4 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:px-4 gba:py-3"
          data-testid="receipt-currency-error-container"
        >
          {receiptCurrencyError}
        </div>
      )}

      <div className="gba:mb-4" data-testid="title-field-container">
        <div className="gba:relative">
          <Form.Item
            name="title"
            rules={[
              {
                required: true,
                message: t('lowcoder:create_expense_type_item.current_title_custom_rule', 'Please enter a title')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <InputField
              label={t('lowcoder:create_expense_type_item.current_title_label', 'Title')}
              name="title"
              disabled={isFormDisabled || isProcessingFiles}
              placeholder={t('lowcoder:create_expense_type_item.current_title_placeholder', 'Enter Title')}
              onChange={field => form.setFieldsValue({ title: field.value })}
              required={true}
              data-testid="title-input"
            />
          </Form.Item>
        </div>
      </div>

      <div className="gba:mb-4" data-testid="date-field-container">
        <div className="gba:relative">
          <Form.Item
            shouldUpdate
            name="date"
            rules={[
              {
                required: true,
                message: t('lowcoder:create_expense_type_item.current_date_custom_rule', 'Please select a date')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <DateInputField
              label={t('lowcoder:create_expense_item.change_expense_item_container.current_date_label', 'Date')}
              name="date"
              placeholder={t(
                'lowcoder:create_expense_item.change_expense_item_container.current_date_placeholder',
                'Select date'
              )}
              data-testid="date-input"
              onChange={field => {
                if (field.value) setCurrentSelectedDate(field.value as Date)
                form.setFieldsValue({ date: field.value })
              }}
              language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
              required={true}
              format={getDateFormat('date.long')}
              value={form.getFieldValue('date')}
            />
          </Form.Item>
          {expenseRuleError && (
            <Alert
              message={t(
                'lowcoder:create_expense_item.missing_expense_rule_message',
                'No expense rule found for this date. Please contact your administrator.'
              )}
              type="error"
              style={{ marginTop: 8 }}
              showIcon
              data-testid="expense-rule-error-alert"
            />
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="multi-position-switch-container">
        <div className="gba:relative">
          <div>
            <Switch
              label={t('lowcoder:create_expense_type_item.multi_position_item', 'Multi Position Item')}
              name="multiPosition"
              value={multiPosition}
              data-testid="multi-position-switch"
              onChange={checked => {
                const newMultiPositionValue = checked.value as boolean
                if (!newMultiPositionValue && positions.length > 1) {
                  const firstPosition = positions[0]
                  setPositions([firstPosition])
                  if (
                    firstPosition.expenseType &&
                    firstPosition.customField &&
                    customFields[firstPosition.expenseType]
                  ) {
                    setTimeout(() => {
                      form.setFieldsValue({
                        [`customField-0`]: firstPosition.customField
                      })
                    }, 100)
                  }
                } else if (newMultiPositionValue) {
                  setTimeout(() => {
                    positions.forEach((position, index) => {
                      if (position.expenseType && position.customField && customFields[position.expenseType]) {
                        form.setFieldsValue({
                          [`customField-${index}`]: position.customField
                        })
                      }
                    })
                  }, 100)
                }

                setMultiPosition(newMultiPositionValue)
              }}
            />
          </div>
        </div>
      </div>

      {!multiPosition ? (
        <SinglePositionComponent
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          currencies={currencies}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
        />
      ) : (
        <MultiPositionComponent
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleRemovePosition={handleRemovePosition}
          lastPositionCardRef={lastPositionCardRef}
        />
      )}

      {multiPosition && (
        <Button
          variant="ghost"
          className="gba:flex gba:!justify-start"
          onClick={handleAddPosition}
          data-testid="add-position-button"
          disabled={isProcessingFiles}
        >
          <img
            src={ICONS.ADD_CIRCLE}
            alt={t('lowcoder:create_expense_type_item.add_position_button', 'Add Position')}
            style={{ width: '17px', height: '17px' }}
            data-testid="add-position-icon"
          />
          {isProcessingFiles
            ? t('lowcoder:create_expense_item.file_add_document_processing', 'Processing...')
            : t('lowcoder:create_expense_type_item.add_position_button', 'Add Position')}
        </Button>
      )}

      {/* Total amount and currency row - only visible in multi-position mode */}
      {multiPosition && (
        <Row gutter={16} className="gba:mt-4 gba:mb-4" data-testid="total-row">
          <Col span={12} data-testid="total-amount-col">
            <Form.Item className="gba:mb-0" data-testid="total-amount-form-item">
              <InputField
                label={t('lowcoder:create_expense_item.change_expense_item_container.current_amount_label', 'Amount')}
                name="amount"
                type="text"
                inputMode="decimal"
                data-testid="total-amount-input"
                value={calculateTotal().toFixed(2)}
                placeholder={t(
                  'lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder',
                  'Enter Amount'
                )}
                required={true}
              />
            </Form.Item>
          </Col>
          <Col span={12} data-testid="total-currency-col">
            {hasLinkedExpenseRequest && !isEmbeddedInRequestWizard && (
              <Alert
                message={t(
                  'lowcoder:create_expense_item.linked_request_currency_warning',
                  'Currency cannot be changed while the expense item is linked to an expense request. Please change or remove the expense request first.'
                )}
                type="warning"
                showIcon
                className="gba:mb-2"
                data-testid="linked-request-currency-warning"
              />
            )}
            <Form.Item
              name="currency"
              rules={[
                {
                  required: true,
                  message: t(
                    'lowcoder:create_expense_item.change_expense_item_container.current_currency_custom_rule',
                    'Please select a currency'
                  )
                }
              ]}
              className="gba:mb-0"
              data-testid="total-currency-form-item"
            >
              <SelectField
                allowClear
                label={t(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                  'Currency'
                )}
                disabled={isProcessingFiles || !!form.getFieldValue('fixedCurrency') || hasLinkedExpenseRequest}
                name="currency"
                data-testid="total-currency-select"
                isDataSorted={false}
                data={currencies.map(currency => ({
                  id: currency.id,
                  name: currency.code
                }))}
                onChange={(value: any) => {
                  form.setFieldsValue({ currency: value.value })

                  if (value && value.value) {
                    handleCurrencyChange(value.value)
                  }
                }}
                placeholder={t(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_placeholder',
                  'Select Currency'
                )}
                required={true}
              />
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Only show expense request select if NOT embedded in ExpenseRequestWizard */}
      {!isEmbeddedInRequestWizard ? (
        <Form.Item
          name="expenseRequestId"
          rules={[
            {
              required: true,
              message: t(
                'lowcoder:create_expense_item.change_expense_item_container.current_request_custom_rule',
                'Please select a request'
              )
            }
          ]}
          className="gba:mb-4"
          data-testid="expense-request-container"
        >
          <SelectField
            allowClear
            name="expenseRequestId"
            data-testid="expense-request-select"
            data={filteredExpenseRequestOptions}
            value={
              selectedExpenseRequestId
                ? {
                    id: selectedExpenseRequestId,
                    name:
                      filteredExpenseRequestOptions.find(option => option.id === selectedExpenseRequestId)?.name ||
                      expenseRequestOptions.find(option => option.id === selectedExpenseRequestId)?.name ||
                      selectedExpenseRequestId
                  }
                : undefined
            }
            onChange={(value: any) => {
              form.setFieldsValue({ expenseRequestId: value.value })
            }}
            label={t('lowcoder:create_expense_type_item.current_request', 'Add Expense Request')}
            placeholder={t(
              'lowcoder:create_expense_item.change_expense_item_container.current_request_placeholder',
              'Select Request'
            )}
            disabled={isProcessingFiles}
          />
        </Form.Item>
      ) : null}

      {/* Spacer to push content to the bottom */}
      <div className="gba:flex-grow" data-testid="expense-item-spacer" />

      <Divider color="border" horizontal size={1} className="gba:mt-[30px] gba:mb-[30px]" data-testid="form-divider" />
      <div
        className="gba:flex gba:justify-between gba:py-4"
        style={{ width: '100%' }}
        data-testid="expense-item-actions"
      >
        <Button
          variant="outline"
          onClick={handleCancel}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', height: '40px' }}
          data-testid="cancel-button"
        >
          {t('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateClick}
          disabled={
            isCreating ||
            isProcessingFiles ||
            (!isEmbeddedInRequestWizard && isEditMode && hadBackendRequestRef.current && !selectedExpenseRequestId) ||
            !!receiptCurrencyError
          }
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="submit-button"
        >
          {isEditMode
            ? t(
                'lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_update',
                'Update'
              )
            : t(
                'lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_save',
                'Create'
              )}
        </Button>
      </div>
    </Form>
  )
}

export default FormScreenComponent
