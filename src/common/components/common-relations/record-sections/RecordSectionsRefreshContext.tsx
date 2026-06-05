import React, { createContext, useContext } from 'react'

type RecordSectionsRefreshFn = () => void

const RecordSectionsRefreshContext = createContext<RecordSectionsRefreshFn | undefined>(undefined)

export interface RecordSectionsRefreshProviderProps {
  value?: RecordSectionsRefreshFn
  children: React.ReactNode
}

export const RecordSectionsRefreshProvider: React.FC<RecordSectionsRefreshProviderProps> = ({ value, children }) => (
  <RecordSectionsRefreshContext.Provider value={value}>{children}</RecordSectionsRefreshContext.Provider>
)

export const useRecordSectionsRefresh = (): RecordSectionsRefreshFn | undefined =>
  useContext(RecordSectionsRefreshContext)
