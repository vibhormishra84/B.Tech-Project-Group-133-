const User = require('../models/User');

async function getMe(req, res) {
  const user = await User.findById(req.user.userId).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
}

async function listUsers(req, res) {
  const docs = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json(docs);
}

async function addPrescription(req, res) {
  const { userId } = req.params;
  const { medicine, dosage, frequency } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { medicinesPrescribed: { medicine, dosage, frequency } } },
    { new: true }
  ).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
}

async function addOrder(req, res) {
  const { medicine, quantity, priceAtPurchase } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $push: { orderHistory: { medicine, quantity, priceAtPurchase } } },
    { new: true }
  ).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { weight, height, age, phoneNumber, medicalConditions, allergies, emergencyContact, notificationPreferences, name, diabetesStatus, bloodPressureStatus } = req.body;
    
    // Calculate BMI if weight and height are provided
    let bmi = null;
    if (weight && height && height > 0) {
      const heightInMeters = height / 100;
      bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    
    const updateData = {
      ...(name && { name }),
      ...(age !== undefined && { age }),
      ...(weight !== undefined && { weight }),
      ...(height !== undefined && { height }),
      ...(bmi !== null && { bmi }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(medicalConditions && { medicalConditions }),
      ...(allergies && { allergies }),
      ...(emergencyContact && { emergencyContact }),
      ...(notificationPreferences && { notificationPreferences }),
      ...(diabetesStatus && { diabetesStatus }),
      ...(bloodPressureStatus && { bloodPressureStatus })
    };
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

module.exports = { getMe, listUsers, addPrescription, addOrder, getProfile, updateProfile };


