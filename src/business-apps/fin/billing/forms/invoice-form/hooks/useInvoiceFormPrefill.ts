import { useMemo } from 'react'

interface InvoiceFormPrefill {
  initialAccountId: string | null
  initialOpportunityId: string | null
}

function readQueryParam(search: string, name: string): string | null {
  return new URLSearchParams(search).get(name)
}

export function useInvoiceFormPrefill(): InvoiceFormPrefill {
  return useMemo(() => {
    if (globalThis.window === undefined) {
      return {
        initialAccountId: null,
        initialOpportunityId: null
      }
    }

    return {
      initialAccountId: readQueryParam(globalThis.window.location.search, 'accountId'),
      initialOpportunityId: readQueryParam(globalThis.window.location.search, 'opportunityId')
    }
  }, [])
}
