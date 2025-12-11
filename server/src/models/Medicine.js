const mongoose = require('mongoose');

const { Schema } = mongoose;

const medicineSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    symptoms: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema);


