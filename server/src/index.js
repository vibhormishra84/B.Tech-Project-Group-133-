const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const medicineRoutes = require('./routes/medicine');
const chatbotRoutes = require('./routes/chatbot');
const trackerRoutes = require('./routes/tracker');
const calendarRoutes = require('./routes/calendar');
const prescriptionRoutes = require('./routes/prescriptions');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medstore';
const PORT = process.env.PORT || 4000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
      // Start notification scheduler
      const { startNotificationScheduler } = require('./jobs/notificationScheduler');
      startNotificationScheduler();
    });
  })
  .catch((err) => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });


