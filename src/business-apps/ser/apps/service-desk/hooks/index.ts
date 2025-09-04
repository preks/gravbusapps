export { useUserCapabilities } from './useUserCapabilities';
export { useDeskTickets } from './useDeskTickets';
export { useTicketDetail } from './useTicketDetail';
export { useTicketActions } from './useTicketActions';

// New GraphQL-based hooks
export { useUserCapabilitiesGraphQL } from '../../hooks/useUserCapabilitiesGraphQL';
export { useDesksForUser } from '../../hooks/useDesksForUser';
export { useEmployeeDetails } from '../../hooks/useEmployeeDetails';

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