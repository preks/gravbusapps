// Import the default export and re-export as named export
import TeamView from './TeamView';
export { TeamView };

// Other exports
export { SalesTeamMembersList } from './SalesTeamMembersList';
export * from './types';
export * from './queries/SalesTeamQueries';
export * from './hooks/useSalesTeamDataIntegration';
export * from './hooks/useSalesTeamTrendData';

// Default export
export default TeamView; 