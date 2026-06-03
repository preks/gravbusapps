export type SheetDeltaCatchUpReason =
  | 'collaboration_join'
  | 'collaboration_reconnect'
  | 'sheet_activation'
  | 'visibility'
  | 'focus'
  | 'version_gap'
  | 'version_conflict'
  | 'remote_structural'
  | 'row_identity_mismatch'
  | 'stale_version_data_op'

export type SheetDeltaCatchUpOptions = { sinceVersion?: number; incomingVersion?: number }
