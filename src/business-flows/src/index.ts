import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { templateRoutes } from './routes/templateRoutes';
import { taskRoutes } from './routes/taskRoutes';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initializeServices } from './utils/init';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/templates', templateRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services before starting the server
const startServer = async () => {
  try {
    // Initialize all required services
    await initializeServices();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start the application
startServer();

export default app;
