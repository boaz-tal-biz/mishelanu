import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import errorHandler from './middleware/errorHandler.js';
import providersRouter from './routes/providers.js';
import categoriesRouter from './routes/categories.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRouter from './routes/admin.js';
import monitorRouter from './routes/monitor.js';
import simulationRouter from './routes/simulation.js';

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
});
