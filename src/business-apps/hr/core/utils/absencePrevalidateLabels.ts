export interface PrevalidateErrorPresentation {
  messageKey: string
  messageFallback: string
  detailKey: string
  detailFallback: string
}

const PREVALIDATE_ERROR_PRESENTATIONS: Record<string, PrevalidateErrorPresentation> = {
  WORKING_HOURS_REQUIRED: {
    messageKey: 'create-absence-prevalidate-working-hours-title',
    messageFallback: 'Working hours missing',
    detailKey: 'create-absence-prevalidate-working-hours-detail',
    detailFallback:
      "We couldn't find a valid working hours definition for your profile. This is required to calculate your leave duration. Please contact HR to update your profile."
  },
  ENTITLEMENT_NOT_FOUND: {
    messageKey: 'create-absence-prevalidate-entitlement-title',
    messageFallback: 'No leave entitlement found',
    detailKey: 'create-absence-prevalidate-entitlement-detail',
    detailFallback: "You don't have an active entitlement for this type of absence. Please contact HR for assistance."
  },
  INSUFFICIENT_BALANCE: {
    messageKey: 'create-absence-prevalidate-balance-title',
    messageFallback: 'Insufficient balance',
    detailKey: 'create-absence-prevalidate-balance-detail',
    detailFallback: 'Your available balance is not enough for the selected absence period.'
  },
  INVALID_DATE_RANGE: {
    messageKey: 'create-absence-prevalidate-date-range-title',
    messageFallback: 'Invalid date range',
    detailKey: 'create-absence-prevalidate-date-range-detail',
    detailFallback: 'The selected dates cannot be validated. Please adjust the range and try again.'
  },
  INVALID_REQUEST: {
    messageKey: 'create-absence-prevalidate-invalid-request-title',
    messageFallback: 'Invalid request',
    detailKey: 'create-absence-prevalidate-invalid-request-detail',
    detailFallback: 'Please review the selected absence type and dates, then try again.'
  },
  UNAUTHORIZED: {
    messageKey: 'create-absence-prevalidate-auth-title',
    messageFallback: 'Authentication required',
    detailKey: 'create-absence-prevalidate-auth-detail',
    detailFallback: 'Your session may have expired. Please refresh the page and try again.'
  },
  FORBIDDEN: {
    messageKey: 'create-absence-prevalidate-permission-title',
    messageFallback: 'Permission required',
    detailKey: 'create-absence-prevalidate-permission-detail',
    detailFallback: 'You do not have permission to validate this absence request.'
  },
  INTERNAL_ERROR: {
    messageKey: 'create-absence-prevalidate-generic-title',
    messageFallback: 'Could not validate request',
    detailKey: 'create-absence-prevalidate-generic-detail',
    detailFallback: 'We could not validate this absence right now. Please try again in a moment.'
  }
}

const isEmploymentRegionMissingError = (errorCode: string, errorDetail?: string | null): boolean => {
  if (errorCode !== 'INTERNAL_ERROR' || !errorDetail) {
    return false
  }

  const normalizedDetail = errorDetail.toLowerCase()
  return normalizedDetail.includes('regionref') && normalizedDetail.includes('null')
}

export const getPrevalidateErrorPresentation = (
  errorCode: string,
  errorDetail?: string | null
): PrevalidateErrorPresentation => {
  if (isEmploymentRegionMissingError(errorCode, errorDetail)) {
    return {
      messageKey: 'create-absence-prevalidate-region-title',
      messageFallback: 'Employment region not assigned',
      detailKey: 'create-absence-prevalidate-region-detail',
      detailFallback:
        'To determine your public holidays, an employment region must be assigned to your profile. Please contact HR to update your profile.'
    }
  }

  return (
    PREVALIDATE_ERROR_PRESENTATIONS[errorCode] ?? {
      messageKey: 'create-absence-prevalidate-generic-title',
      messageFallback: errorCode,
      detailKey: 'create-absence-prevalidate-generic-detail',
      detailFallback: 'We could not validate this absence right now. Please try again in a moment.'
    }
  )
}
