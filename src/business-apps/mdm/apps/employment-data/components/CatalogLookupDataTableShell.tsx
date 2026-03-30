import React from 'react'

/**
 * Clips table cells so wrapped catalog text cannot paint over neighbouring columns.
 */
export const CatalogLookupDataTableShell: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="gba:min-w-0 gba:w-full gba:[&_td]:overflow-hidden gba:[&_td]:align-top">{children}</div>
)
