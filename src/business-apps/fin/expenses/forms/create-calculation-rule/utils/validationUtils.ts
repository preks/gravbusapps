export const getDatesWithinRange = (data: any[], validFrom: Date, validTo: Date, type: 'Plan' | 'Request') => {
  const matchingItems: any[] = []
  data.forEach(item => {
    const createdAtDate = new Date(item.createdAt)
    if (createdAtDate >= validFrom && createdAtDate <= validTo) {
      const newItem = {
        ...item,
        type,
        requestType: item?.requestType?.value,
        createdAt: (item?.createdAt || '').split('T')[0]
      }
      matchingItems.push(newItem)
    }
  })
  return matchingItems
}

export const getCollidingDates = (data: any[], validFrom?: Date | null, validTo?: Date | null) => {
  if (!validFrom || !validTo) return [] as any[]
  const validFromDate = new Date(validFrom)
  const validToDate = new Date(validTo)
  const collidingItems: any[] = []
  data.forEach(item => {
    const itemFrom = new Date((item?.activeFrom || '').split('T')[0] || item?.activeFrom)
    const itemTo = new Date((item?.activeTo || '').split('T')[0] || item?.activeTo)
    if (itemFrom < validToDate && itemTo > validFromDate && item?.standard === true) {
      const newItem = {
        ...item,
        name: item?.name,
        code: item?.code,
        activeFrom: (item?.activeFrom || '').split('T')[0],
        activeTo: (item?.activeTo || '').split('T')[0]
      }
      collidingItems.push(newItem)
    }
  })
  return collidingItems
}
