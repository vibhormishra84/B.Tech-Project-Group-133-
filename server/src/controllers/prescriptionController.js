const User = require('../models/User');
const Medicine = require('../models/Medicine');

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findOrCreateMedicineByName(name) {
  const existing = await Medicine.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (existing) return existing;

  return Medicine.create({
    name,
    description: 'Imported from prescription OCR',
    price: 0,
    symptoms: []
  });
}

async function savePrescriptionFromReader(req, res) {
  const { raw_text, prescription } = req.body || {};
  const medicines = prescription?.medicines || [];

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: 'No medicines provided' });
  }

  try {
    const entries = [];

    for (const item of medicines) {
      if (!item?.name) continue;
      const med = await findOrCreateMedicineByName(item.name.trim());
      entries.push({
        medicine: med._id,
        dosage: item.dosage || '',
        frequency: item.frequency || 'as-needed',
        timing: item.timing || '',
        duration: item.duration || '',
        notes: prescription?.notes || '',
        source: 'ocr',
        rawText: raw_text || ''
      });
    }

    if (!entries.length) {
      return res.status(400).json({ error: 'No valid medicines found' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { medicinesPrescribed: { $each: entries } } },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ user, importedCount: entries.length });
  } catch (err) {
    console.error('Failed to save prescription', err);
    return res.status(500).json({ error: 'Failed to save prescription' });
  }
}

module.exports = { savePrescriptionFromReader };


