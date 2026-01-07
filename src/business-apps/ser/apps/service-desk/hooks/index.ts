export { useUserCapabilities } from './useUserCapabilities';
export { useDeskTickets } from './useDeskTickets';
export { useMultipleDeskCounts } from './useMultipleDeskCounts';
export { useTicketDetail } from './useTicketDetail';
export { useTicketActions } from './useTicketActions';
export { useEmployeeName } from './useEmployeeName';
export { useCompletedTickets } from './useCompletedTickets';
export { useServiceDeskCatalog } from './useServiceDeskCatalog';

// New GraphQL-based hooks
// export { useDesksForUser } from '../../hooks/useDesksForUser';

export type { 
  UseUserCapabilitiesProps, 
  UseUserCapabilitiesReturn,
  UserCapability 
} from './useUserCapabilities';

export type { 
  UseDeskTicketsProps, 
  UseDeskTicketsReturn 
} from './useDeskTickets';

export type { 
  UseMultipleDeskCountsProps, 
  UseMultipleDeskCountsReturn 
} from './useMultipleDeskCounts';

export type { 
  UseTicketDetailProps, 
  UseTicketDetailReturn 
} from './useTicketDetail';

export type { 
  UseTicketActionsProps, 
  UseTicketActionsReturn 
} from './useTicketActions';

export type { 
  UseCompletedTicketsProps, 
  UseCompletedTicketsReturn 
} from './useCompletedTickets';

export type { 
  UseEmployeeNameProps, 
  UseEmployeeNameReturn,
  EmployeeData 
} from './useEmployeeName';

export type { 
  ServiceDeskCatalogEntry,
  ServiceDeskCatalog,
  UseServiceDeskCatalogResult
} from './useServiceDeskCatalog';