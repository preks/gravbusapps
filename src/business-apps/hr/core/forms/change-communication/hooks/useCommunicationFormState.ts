import { useState, useEffect, useMemo, useRef } from 'react'
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
  type CountryCallingCode
} from 'libphonenumber-js'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { normalizePhoneNumber } from '../utils/phoneUtils'
import { normalizeLocalPhoneNumber } from '@/common/utils/validation/phoneNumberValidation'

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
  initialCommunicationId?: string
  defaultCountryCode?: CountryCode | ''
}

const normalizeCatalogValue = (value: string | undefined): string => {
  return (value || '').toString().split(':').pop()?.trim().toLowerCase() || ''
}

export const useCommunicationFormState = ({
  channels,
  types,
  communications,
  loading,
  initialCommunicationId,
  defaultCountryCode = ''
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
  const previousCountryRef = useRef<CountryCode | ''>('')
  const isManualCountryChangeRef = useRef<boolean>(false)
  const skipNextParseRef = useRef<boolean>(false)
  const initialAppliedRef = useRef<boolean>(false)

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
    return normalizeCatalogValue(selected?.label || selected?.value)
  }, [channels, channelType])

  const shouldDefaultPrimaryType = useMemo(() => {
    const selected = channels.find(c => c.id === channelType)
    const channelValue = normalizeCatalogValue(selected?.value || selected?.label)
    return channelValue === 'phone' || channelValue === 'mobile'
  }, [channels, channelType])

  const isPhoneType = useMemo(() => {
    if (!channelType || !channels || channels.length === 0) return false
    const selected = channels.find(c => c.id === channelType)
    if (!selected) return false
    const normalizedValue = normalizeCatalogValue(selected.value || selected.label)
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

  const pendingInit = Boolean(initialCommunicationId) && !initialAppliedRef.current

  useEffect(() => {
    if (initialAppliedRef.current || !initialCommunicationId) return
    if (!communications?.length || !channels?.length) return

    const entry = communications.find((c: any) => c.id === initialCommunicationId)
    if (!entry) return

    initialAppliedRef.current = true

    const typeId = entry.typeRef && types.some(t => t.id === entry.typeRef) ? entry.typeRef : undefined

    const prefillValue = normalizePhoneNumber(entry.value || '', entry.channelRef, channels)
    const prefillPurpose = entry.purpose || 'PRIVATE'

    setChannelType(entry.channelRef)
    if (typeId) setValueType(typeId)
    setValue(prefillValue)
    setPurpose(prefillPurpose)
    setBaseline({
      channelRef: entry.channelRef,
      typeRefId: typeId,
      value: prefillValue,
      purpose: prefillPurpose,
      version: typeof entry.version === 'number' ? entry.version : undefined,
      id: entry.id
    })
  }, [initialCommunicationId, communications, channels, types])

  useEffect(() => {
    if (pendingInit) return
    if (!channelType && channels && channels.length > 0) {
      setChannelType(channels[0].id)
    }
  }, [channelType, channels, pendingInit])

  useEffect(() => {
    if (pendingInit) return
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
      const nextTypeId = shouldDefaultPrimaryType ? primaryTypeId : undefined
      setValueType(nextTypeId)
      setValue('')
      setPurpose('PRIVATE')
      setBaseline({
        channelRef: channelType,
        typeRefId: nextTypeId,
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
    const nextTypeId = shouldDefaultPrimaryType && primaryTypeId ? primaryTypeId : typeId
    setValueType(nextTypeId)
    setValue(prefillValue)
    setPurpose(prefillPurpose)
    setBaseline({
      channelRef: channelType,
      typeRefId: nextTypeId,
      value: prefillValue,
      purpose: prefillPurpose,
      version: typeof existing?.version === 'number' ? existing.version : undefined,
      id: existing?.id
    })
  }, [
    channelType,
    channels,
    types,
    latestByChannelRef,
    baseline,
    communications,
    pendingInit,
    shouldDefaultPrimaryType,
    primaryTypeId
  ])

  useEffect(() => {
    if (pendingInit) return
    if (!channelType || !valueType) return
    if (baseline && baseline.channelRef === channelType && baseline.typeRefId === valueType) return

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
      const prefillPurpose = latest?.purpose || 'PRIVATE'

      if (isPhoneType) {
        setPhoneNumber('')
      }

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

    if (isPhoneType) {
      setPhoneNumber('')
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
  }, [channelType, valueType, purpose, communications, baseline, channels, isPhoneType, pendingInit])

  useEffect(() => {
    if (pendingInit) return
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
  }, [channelType, valueType, purpose, communications, baseline, channels, pendingInit])

  useEffect(() => {
    if (pendingInit) return
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

  useEffect(() => {
    if (!isPhoneType) {
      setSelectedCountryCode('')
      setPhoneNumber('')
      isManualCountryChangeRef.current = false
      skipNextParseRef.current = false
      return
    }

    if (skipNextParseRef.current) {
      skipNextParseRef.current = false
      return
    }

    const defaultCountry = countries.some(country => country.code === defaultCountryCode) ? defaultCountryCode : ''

    if (!value) {
      setSelectedCountryCode(selectedCountryCode || defaultCountry)
      setPhoneNumber('')
      return
    }

    if (countries.length === 0) {
      return
    }

    if (isManualCountryChangeRef.current) {
      isManualCountryChangeRef.current = false
      return
    }

    const parsed = parsePhoneNumberFromString(value)
    if (parsed && parsed.country) {
      setSelectedCountryCode(parsed.country)
      setPhoneNumber(parsed.nationalNumber)
      return
    }

    if (value.startsWith('+')) {
      const valueWithoutPlus = value.substring(1).trim()

      const sortedCountries = [...countries].sort((a, b) => {
        const codeA = String(a.callingCode).length
        const codeB = String(b.callingCode).length
        return codeB - codeA
      })

      for (const country of sortedCountries) {
        const callingCode = String(country.callingCode)
        if (valueWithoutPlus.startsWith(callingCode)) {
          const remaining = valueWithoutPlus.substring(callingCode.length).trim()
          setSelectedCountryCode(country.code)
          setPhoneNumber(normalizeLocalPhoneNumber(remaining))
          return
        }
      }
    }

    if (!selectedCountryCode) {
      setSelectedCountryCode('')
      setPhoneNumber(normalizeLocalPhoneNumber(value))
    }
  }, [isPhoneType, value, countries, defaultCountryCode, selectedCountryCode])

  useEffect(() => {
    if (
      isPhoneType &&
      selectedCountryCode &&
      previousCountryRef.current &&
      selectedCountryCode !== previousCountryRef.current
    ) {
      setPhoneNumber('')
      skipNextParseRef.current = true
    }
    previousCountryRef.current = selectedCountryCode
  }, [selectedCountryCode, isPhoneType])

  useEffect(() => {
    if (!isPhoneType) {
      setValue(phoneNumber)
    }
  }, [isPhoneType, phoneNumber])

  return {
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
    setPhoneNumber: (num: string) => {
      skipNextParseRef.current = true
      setPhoneNumber(normalizeLocalPhoneNumber(num))
    },
    setSelectedCountryCode: (code: CountryCode | '') => {
      if (code) {
        isManualCountryChangeRef.current = true
      }
      setSelectedCountryCode(code)
    },
    setChannelTouched,
    setTypeTouched,
    primaryTypeId,
    secondaryTypeId,
    normalizedChannelType,
    isPhoneType,
    countries,
    hasPrimaryForSelection,
    loading
  }
}
