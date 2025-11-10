import { useMemo, useEffect } from 'react'
import dayjs from 'dayjs'
import roRO from 'antd/locale/ro_RO'
import enUS from 'antd/locale/en_US'
import deDE from 'antd/locale/de_DE'

export const useCalendarLocale = (userLocale: string) => {
  const { dayjsLocale, antdLocale } = useMemo(() => {
    const base = userLocale.split('-')[0].toLowerCase()

    const createRomanianLocale = () => {
      const weekdaysShort = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ']
      const monthsShort = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
      const patchedLang = {
        ...roRO.DatePicker?.lang,
        locale: 'ro_RO',
        weekdaysShort,
        weekdaysMin: weekdaysShort,
        weekdays: weekdaysShort,
        monthsShort,
        months: monthsShort,
        shortWeekDays: weekdaysShort,
        shortMonths: monthsShort
      }
      return {
        ...roRO,
        DatePicker: { ...(roRO.DatePicker || {}), lang: patchedLang },
        Calendar: { ...(roRO.Calendar || {}), lang: patchedLang }
      }
    }

    const dayjsMap: Record<string, string> = { en: 'en', de: 'de', ro: 'ro' }
    const antdMap: Record<string, any> = { en: enUS, de: deDE, ro: createRomanianLocale() }
    return { dayjsLocale: dayjsMap[base] || 'en', antdLocale: antdMap[base] || enUS }
  }, [userLocale])

  useEffect(() => {
    if (!dayjsLocale) return
    if (dayjsLocale === 'ro') {
      dayjs.updateLocale('ro', {
        weekdaysShort: ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'],
        weekdaysMin: ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'],
        monthsShort: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
      })
    }
    dayjs.locale(dayjsLocale)
  }, [dayjsLocale])

  return { dayjsLocale, antdLocale }
}
