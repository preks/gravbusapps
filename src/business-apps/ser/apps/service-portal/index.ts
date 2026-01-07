import { ServicePortal } from './ServicePortal';

export { ServicePortal };
export type { ServicePortalProps, ServicePortalView } from './ServicePortal';

// Re-export components for flexibility
export * from './components';

// Re-export hooks for external usage
export * from './hooks';

// Default export required by platform's dynamic screen loader
export default ServicePortal;
