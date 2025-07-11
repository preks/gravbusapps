import { logger } from './logger';
import { initializeConductor } from '../services/conductorService';
import { initializeTemplates } from '../services/templateService';

/**
 * Initialize all services required for the application
 */
export const initializeServices = async (): Promise<void> => {
  try {
    logger.info('Initializing services...');
    
    // Initialize Conductor with custom task types
    await initializeConductor();
    
    // Initialize sample templates
    initializeTemplates();
    
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', error);
    throw new Error('Service initialization failed');
  }
};
