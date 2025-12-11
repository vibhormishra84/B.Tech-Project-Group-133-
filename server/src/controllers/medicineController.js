const Medicine = require('../models/Medicine');

async function createMedicine(req, res) {
  try {
    const { name, description, price, symptoms } = req.body;
    const doc = await Medicine.create({ name, description, price, symptoms });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: 'Create failed' });
  }
}

async function listMedicines(req, res) {
  const q = req.query.q;
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
  const docs = await Medicine.find(filter).sort({ createdAt: -1 });
  res.json(docs);
}

async function getMedicine(req, res) {
  const doc = await Medicine.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}

async function updateMedicine(req, res) {
  try {
    const { name, description, price, symptoms } = req.body;
    const doc = await Medicine.findByIdAndUpdate(
      req.params.id,
      { name, description, price, symptoms },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: 'Update failed' });
  }
}

async function deleteMedicine(req, res) {
  const doc = await Medicine.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}

module.exports = { createMedicine, listMedicines, getMedicine, updateMedicine, deleteMedicine };


