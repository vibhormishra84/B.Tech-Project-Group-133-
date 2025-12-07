const mongoose = require('mongoose');

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const reminderDismissalSchema = new Schema(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true }, // Time string like "08:00"
    dismissedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const prescribedMedicineSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    dosage: { type: String },
    frequency: { type: String, enum: ['daily', 'twice-daily', 'thrice-daily', 'weekly', 'as-needed'], default: 'daily' },
    times: [{ type: String }], // Array of time strings like "08:00", "20:00"
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    lastTaken: { type: Date },
    nextDose: { type: Date },
    dismissedReminders: [reminderDismissalSchema] // Track dismissed reminders
  },
  { _id: true } // Enable _id for subdocuments so we can reference them
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    weight: { type: Number, min: 0 }, // in kg
    height: { type: Number, min: 0 }, // in cm
    bmi: { type: Number, min: 0, max: 100 },
    phoneNumber: { type: String, trim: true },
    profilePicture: { type: String, trim: true },
    medicalConditions: [{ type: String, trim: true }],
    allergies: [{ type: String, trim: true }],
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true }
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      calendar: { type: Boolean, default: false }
    },
    role: { type: String, enum: ['buyer', 'retailer'], default: 'buyer' },
    diabetesStatus: { type: String, enum: ['none', 'prediabetes', 'type1', 'type2'], default: 'none' },
    bloodPressureStatus: { type: String, enum: ['normal', 'elevated', 'hypertension1', 'hypertension2'], default: 'normal' },
    medicinesPrescribed: [prescribedMedicineSchema],
    orderHistory: [orderItemSchema],
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);


