import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import cron from 'node-cron';
import errorHandler from './middleware/errorHandler.js';
import providersRouter from './routes/providers.js';
import categoriesRouter from './routes/categories.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRouter from './routes/admin.js';
import monitorRouter from './routes/monitor.js';
import simulationRouter from './routes/simulation.js';
import { runEnrichment } from './jobs/enrichment.js';
import { checkMissingRecommendations, checkRenewalDue } from './jobs/alerts.js';

dotenv.config();
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// API routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/providers', providersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/sim', simulationRouter);

// Serve React app in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Mishelanu server running on port ${PORT}`);

  // Run enrichment every 2 minutes for pending providers
  cron.schedule('*/2 * * * *', () => {
    console.log('Running enrichment job...');
    runEnrichment().catch(err => console.error('Enrichment job error:', err.message));
  });

  // Daily checks at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily alert checks...');
    checkMissingRecommendations().catch(err => console.error('Recommendation check error:', err.message));
    checkRenewalDue().catch(err => console.error('Renewal check error:', err.message));
  });

  // Also run enrichment on startup for any pending providers
  runEnrichment().catch(err => console.error('Startup enrichment error:', err.message));
});
