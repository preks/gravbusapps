import { useMemo } from 'react'
import { isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { CountryCode } from 'libphonenumber-js'

interface UseCommunicationValidationProps {
  normalizedChannelType: string
  value: string
  isPhoneType: boolean
  phoneNumber: string
  selectedCountryCode: CountryCode | ''
  channelType?: string
  valueType?: string
}

export const useCommunicationValidation = ({
  normalizedChannelType,
  value,
  isPhoneType,
  phoneNumber,
  selectedCountryCode,
  channelType,
  valueType
}: UseCommunicationValidationProps) => {
  const valueValidationMessage = useMemo(() => {
    const type = normalizedChannelType
    if (isPhoneType) {
      const v = (phoneNumber || '').trim()
      if (!v) {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.add_request_trip_details.valid_number',
          'Please enter a valid number'
        )
      }
      try {
        let phoneToValidate = v
        if (selectedCountryCode) {
          const callingCode = getCountryCallingCode(selectedCountryCode)
          phoneToValidate = `+${callingCode}${v}`
        }
        if (isValidPhoneNumber(phoneToValidate)) return ''
      } catch {}
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.valid_number',
        'Please enter a valid number'
      )
    }
    const v = (value || '').trim()
    switch (type.toLowerCase()) {
      case 'phone':
      case 'mobile':
      case 'fax':
      case 'pager':
        if (!v) {
          return getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.add_request_trip_details.valid_number',
            'Please enter a valid number'
          )
        }
        try {
          if (isValidPhoneNumber(v)) return ''
        } catch {}
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.add_request_trip_details.valid_number',
          'Please enter a valid number'
        )
      case 'email':
      case 'e-mail':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:communication_form.email_error_message',
          'Please enter a valid email address (e.g., example@domain.com).'
        )
      case 'messenger':
        if (v !== '') return ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:communication_form.messenger_error_message',
          'Please enter a valid messenger username or ID.'
        )
      case 'social media':
      case 'slack':
      case 'xing':
      case 'linkedin':
      case 'facebook':
      case 'instagram':
      case 'youtube':
      case 'x':
        if (
          /^(https?:\/\/)?([a-zA-Z0-9\u00C0-\uFFFF-]+\.)+[a-zA-Z\u00C0-\uFFFF-]{2,}(\/[a-zA-Z0-9\u00C0-\uFFFF-._~%]*)*\/?$/.test(
            v
          )
        )
          return ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:communication_form.social_media_error_message',
          'Please enter a valid social media profile URL (e.g., https://www.example.com/profile).'
        )
      default:
        if (v !== '') return ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:communication_form.channel_type_error_message',
          'Choose a valid channel type.'
        )
    }
  }, [normalizedChannelType, value, isPhoneType, phoneNumber, selectedCountryCode])

  const channelRequiredMessage = useMemo(() => {
    if (channelType) return ''
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:communication_form.channel_error_message',
      'The Channel field is required. Please select the communication channel.'
    )
  }, [channelType])

  const typeRequiredMessage = useMemo(() => {
    if (valueType) return ''
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:communication_form.type_error_message',
      'The Type field is required. Please select the communication type.'
    )
  }, [valueType])

  const isValid = useMemo(() => {
    if (!channelType || !valueType) return false
    if (channelRequiredMessage || typeRequiredMessage || valueValidationMessage) return false
    if (isPhoneType) {
      return phoneNumber.trim().length > 0
    }
    return value.trim().length > 0
  }, [
    channelType,
    valueType,
    value,
    isPhoneType,
    phoneNumber,
    channelRequiredMessage,
    typeRequiredMessage,
    valueValidationMessage
  ])

  return {
    valueValidationMessage,
    channelRequiredMessage,
    typeRequiredMessage,
    isValid
  }
}
