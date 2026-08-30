import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { seedSuperAdmin } from './config/seed';
import { seedMedicineCatalog } from './config/catalogSeed';
import { syncModelIndexes } from './config/syncIndexes';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import dashboardRoutes from './routes/dashboard';
import medicineRoutes from './routes/medicines';
import inventoryRoutes from './routes/inventory';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import customerRoutes from './routes/customers';
import doctorRoutes from './routes/doctors';
import billingRoutes from './routes/billing';
import returnRoutes from './routes/returns';
import expiryRoutes from './routes/expiry';
import reportRoutes from './routes/reports';
import catalogRoutes from './routes/catalog';

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// A busy single store can easily run several terminals/dashboards behind one
// shared NAT IP, each polling the dashboard/notifications and firing several
// debounced searches per keystroke in Billing — 500 req/15min was too tight
// for that legitimate case, not just abuse.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/catalog', catalogRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;
// Defaults to all interfaces for local dev convenience. In production, set
// HOST=127.0.0.1 so the Node process only accepts connections from Nginx on
// the same machine — the public internet should only ever reach Nginx.
const HOST = process.env.HOST || '0.0.0.0';

connectDB().then(async () => {
  await syncModelIndexes();
  await seedSuperAdmin();
  await seedMedicineCatalog();
  app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});

export default app;
