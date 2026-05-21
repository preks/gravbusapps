import { useState, useCallback } from 'react'

export interface CountrySelection {
  country: string
  countryId: string
}

export interface CountryAccountsState {
  selectedCountry: CountrySelection | null
  handleCountryClick: (country: string, countryId: string) => void
  handleCountryClose: () => void
}

export const useCountryAccountsState = (): CountryAccountsState => {
  const [selectedCountry, setSelectedCountry] = useState<CountrySelection | null>(null)

  const handleCountryClick = useCallback((country: string, countryId: string) => {
    setSelectedCountry({ country, countryId })
  }, [])

  const handleCountryClose = useCallback(() => {
    setSelectedCountry(null)
  }, [])

  return { selectedCountry, handleCountryClick, handleCountryClose }
}
