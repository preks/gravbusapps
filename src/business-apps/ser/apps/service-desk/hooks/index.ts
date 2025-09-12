export { useUserCapabilities } from './useUserCapabilities';
export { useDeskTickets } from './useDeskTickets';
export { useTicketDetail } from './useTicketDetail';
export { useTicketActions } from './useTicketActions';
export { useEmployeeName } from './useEmployeeName';
export { useCompletedTickets } from './useCompletedTickets';

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