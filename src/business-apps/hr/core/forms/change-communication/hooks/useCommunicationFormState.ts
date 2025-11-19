import { useState, useEffect, useMemo } from 'react'
import {
  parseNumber,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
  type CountryCallingCode
} from 'libphonenumber-js'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { normalizePhoneNumber } from '../utils/phoneUtils'

interface Baseline {
  channelRef?: string
  typeRefId?: string
  value?: string
  purpose?: string
  version?: number
  id?: string
}

interface UseCommunicationFormStateProps {
  channels: Array<{ id: string; label: string; value?: string }>
  types: Array<{ id: string; label: string; value?: string }>
  communications: any[]
  loading: boolean
}

export const useCommunicationFormState = ({
  channels,
  types,
  communications,
  loading
}: UseCommunicationFormStateProps) => {
  const [channelType, setChannelType] = useState<string | undefined>(undefined)
  const [valueType, setValueType] = useState<string | undefined>(undefined)
  const [value, setValue] = useState<string>('')
  const [purpose, setPurpose] = useState<string>('PRIVATE')
  const [channelTouched, setChannelTouched] = useState(false)
  const [typeTouched, setTypeTouched] = useState(false)
  const [valueTouched, setValueTouched] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode | ''>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [baseline, setBaseline] = useState<Baseline | null>(null)

  const primaryTypeId = useMemo(() => {
    const t = types.find(x => (x.label || x.value || '').toLowerCase() === 'primary')
    return t?.id
  }, [types])

  const secondaryTypeId = useMemo(() => {
    const t = types.find(x => (x.label || x.value || '').toLowerCase() === 'secondary')
    return t?.id
  }, [types])

  const latestByChannelRef = useMemo(() => {
    return (communications || []).reduce(
      (acc: Record<string, any>, c: any) => {
        const key = c.channelRef
        if (!key) return acc
        const prev = acc[key]
        if (!prev) {
          acc[key] = c
        } else {
          const prevVersion = typeof prev.version === 'number' ? prev.version : -1
          const curVersion = typeof c.version === 'number' ? c.version : prevVersion + 1
          if (curVersion >= prevVersion) acc[key] = c
        }
        return acc
      },
      {} as Record<string, any>
    )
  }, [communications])

  const normalizedChannelType = useMemo(() => {
    const selected = channels.find(c => c.id === channelType)
    const raw = (selected?.label || selected?.value || '').toString()
    return raw.split(':').pop()?.trim() || ''
  }, [channels, channelType])

  const isPhoneType = useMemo(() => {
    if (!channelType || !channels || channels.length === 0) return false
    const selected = channels.find(c => c.id === channelType)
    if (!selected) return false
    const channelValue = (selected.value || '').toString().toLowerCase()
    const normalizedValue = channelValue.split(':').pop()?.trim() || channelValue
    const phoneTypes = ['phone', 'mobile', 'fax', 'pager', 'tel', 'telephone']
    return phoneTypes.includes(normalizedValue)
  }, [channels, channelType])

  const countries = useMemo(() => {
    const countryList = getCountries()
    const locale = getCurrentActiveUserLocale() || 'en'
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })

    const mapped = countryList
      .map(country => {
        try {
          const callingCode = getCountryCallingCode(country)
          const countryName = displayNames.of(country.toUpperCase()) || country
          return {
            code: country,
            callingCode,
            name: countryName
          }
        } catch {
          return null
        }
      })
      .filter((c): c is { code: CountryCode; callingCode: CountryCallingCode; name: string } => c !== null)
    return mapped.sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [])

  const hasPrimaryForSelection = useMemo(() => {
    if (!channelType || !primaryTypeId) return false
    const match = (communications || []).find(
      (c: any) =>
        c.channelRef === channelType &&
        c.typeRef === primaryTypeId &&
        c.purpose === purpose &&
        typeof c.value === 'string' &&
        c.value.trim().length > 0
    )
    return Boolean(match)
  }, [communications, channelType, purpose, primaryTypeId])

  // Initialize channel type
  useEffect(() => {
    if (!channelType && channels && channels.length > 0) {
      setChannelType(channels[0].id)
    }
  }, [channelType, channels])

  // Handle channel type change
  useEffect(() => {
    if (!channelType) return
    if (baseline && baseline.channelRef === channelType) return

    let existing = latestByChannelRef[channelType]
    if (!existing) {
      const selectedChannel = channels.find(ch => ch.id === channelType)
      if (selectedChannel) {
        existing = (communications || []).find((c: any) => c.channelRef === selectedChannel.id)
      }
    }
    if (!existing) {
      setValueType(undefined)
      setValue('')
      setPurpose('PRIVATE')
      setBaseline({
        channelRef: channelType,
        typeRefId: undefined,
        value: '',
        purpose: 'PRIVATE',
        version: undefined,
        id: undefined
      })
      return
    }
    const typeId = existing.typeRef
      ? types.find(t => t.id === existing.typeRef)
        ? existing.typeRef
        : undefined
      : undefined
    const prefillValue = normalizePhoneNumber(existing.value || '', channelType, channels)
    const prefillPurpose = existing.purpose || 'PRIVATE'
    setValueType(typeId)
    setValue(prefillValue)
    setPurpose(prefillPurpose)
    setBaseline({
      channelRef: channelType,
      typeRefId: typeId,
      value: prefillValue,
      purpose: prefillPurpose,
      version: typeof existing?.version === 'number' ? existing.version : undefined,
      id: existing?.id
    })
  }, [channelType, channels, types, latestByChannelRef, baseline, communications])

  // Handle type change
  useEffect(() => {
    if (!channelType || !valueType) return
    if (baseline && baseline.channelRef === channelType && baseline.typeRefId === valueType) return

    const matches = (communications || []).filter((c: any) => c.channelRef === channelType && c.typeRef === valueType)
    if (matches.length > 0) {
      const latest = matches.reduce((prev: any, cur: any) => {
        const prevV = typeof prev?.version === 'number' ? prev.version : -1
        const curV = typeof cur?.version === 'number' ? cur.version : prevV + 1
        return curV >= prevV ? cur : prev
      }, null as any)

      const prefillValue = normalizePhoneNumber(latest?.value || '', channelType, channels)
      const prefillPurpose = latest?.purpose || 'PRIVATE'
      setValue(prefillValue)
      setPurpose(prefillPurpose)
      setBaseline({
        channelRef: channelType,
        typeRefId: valueType,
        value: prefillValue,
        purpose: prefillPurpose,
        version: typeof latest?.version === 'number' ? latest.version : undefined,
        id: latest?.id
      })
      return
    }

    setValue('')
    setPurpose('PRIVATE')
    setBaseline({
      channelRef: channelType,
      typeRefId: valueType,
      value: '',
      purpose: 'PRIVATE',
      version: undefined,
      id: undefined
    })
  }, [channelType, valueType, communications, baseline, channels])

  // Handle purpose change
  useEffect(() => {
    if (!channelType || !valueType || !purpose) return
    if (
      baseline &&
      baseline.channelRef === channelType &&
      baseline.typeRefId === valueType &&
      baseline.purpose === purpose
    ) {
      return
    }

    const matches = (communications || []).filter(
      (c: any) => c.channelRef === channelType && c.typeRef === valueType && c.purpose === purpose
    )

    if (matches.length > 0) {
      const latest = matches.reduce((prev: any, cur: any) => {
        const prevV = typeof prev?.version === 'number' ? prev.version : -1
        const curV = typeof cur?.version === 'number' ? cur.version : prevV + 1
        return curV >= prevV ? cur : prev
      }, null as any)

      const prefillValue = normalizePhoneNumber(latest?.value || '', channelType, channels)
      setValue(prefillValue)
      setBaseline({
        channelRef: channelType,
        typeRefId: valueType,
        value: prefillValue,
        purpose,
        version: typeof latest?.version === 'number' ? latest.version : undefined,
        id: latest?.id
      })
      return
    }

    setValue('')
    setBaseline({
      channelRef: channelType,
      typeRefId: valueType,
      value: '',
      purpose,
      version: undefined,
      id: undefined
    })
  }, [channelType, valueType, purpose, communications, baseline, channels])

  // Reset secondary type if no primary
  useEffect(() => {
    if (valueType === secondaryTypeId && !hasPrimaryForSelection) {
      setValueType(undefined)
      setValue('')
      setBaseline({
        channelRef: channelType,
        typeRefId: undefined,
        value: '',
        purpose,
        version: undefined,
        id: undefined
      })
    }
  }, [hasPrimaryForSelection, valueType, secondaryTypeId, channelType, purpose])

  // Parse phone number from value
  useEffect(() => {
    if (isPhoneType && value) {
      try {
        const parsed = parseNumber(value)
        if (parsed && 'country' in parsed && parsed.country) {
          setSelectedCountryCode(parsed.country)
          if ('nationalNumber' in parsed && typeof parsed.nationalNumber === 'string') {
            setPhoneNumber(parsed.nationalNumber)
          } else {
            const callingCode = getCountryCallingCode(parsed.country)
            const numberWithoutCode = value.replace(`+${callingCode}`, '').trim()
            setPhoneNumber(numberWithoutCode)
          }
        } else {
          setSelectedCountryCode('')
          setPhoneNumber(value)
        }
      } catch {
        if (value.startsWith('+')) {
          const parts = value.split(' ')
          if (parts.length > 1) {
            const codePart = parts[0].substring(1)
            const country = countries.find(c => c.callingCode === codePart)
            if (country) {
              setSelectedCountryCode(country.code)
              setPhoneNumber(parts.slice(1).join(' '))
            } else {
              setSelectedCountryCode('')
              setPhoneNumber(value)
            }
          } else {
            setSelectedCountryCode('')
            setPhoneNumber(value)
          }
        } else {
          setSelectedCountryCode('')
          setPhoneNumber(value)
        }
      }
    } else if (!isPhoneType) {
      setSelectedCountryCode('')
      setPhoneNumber('')
    }
  }, [isPhoneType, value, countries])

  // Sync phone number to value for non-phone types
  useEffect(() => {
    if (!isPhoneType) {
      setValue(phoneNumber)
    }
  }, [isPhoneType, phoneNumber])

  return {
    // State
    channelType,
    valueType,
    value,
    purpose,
    channelTouched,
    typeTouched,
    valueTouched,
    selectedCountryCode,
    phoneNumber,
    baseline,
    // Setters
    setChannelType: (v: string) => {
      setChannelTouched(true)
      setChannelType(v)
    },
    setValueType: (v: string) => {
      setTypeTouched(true)
      setValueType(v)
    },
    setValue,
    setPurpose,
    setValueTouched,
    setPhoneNumber,
    setSelectedCountryCode,
    setChannelTouched,
    setTypeTouched,
    // Computed
    primaryTypeId,
    secondaryTypeId,
    normalizedChannelType,
    isPhoneType,
    countries,
    hasPrimaryForSelection,
    loading
  }
}
