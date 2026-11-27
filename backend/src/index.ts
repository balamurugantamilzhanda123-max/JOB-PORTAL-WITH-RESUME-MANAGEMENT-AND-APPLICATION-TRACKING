import express from 'express';
import { createApp } from './app';

const app = express();
app.set('trust proxy', 1);
app.use(createApp());

// Default export consumed by Vercel Functions / Vercel Services Express runtime
export default app;
