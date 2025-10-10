import { useState, useEffect } from 'react'
import { getCurrentActiveUserLocale } from '../utils/windowUtils'

export const useUserLocale = () => {
  const [locale, setLocale] = useState('en-US')

  useEffect(() => {
    const userLocale = getCurrentActiveUserLocale()
    setLocale(userLocale)
  }, [])

  return locale
}
