const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function register(req, res) {
  try {
    const { name, age, weight, height, role, diabetesStatus, bloodPressureStatus, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      age,
      weight,
      height,
      role: role || 'buyer',
      diabetesStatus: diabetesStatus || 'none',
      bloodPressureStatus: bloodPressureStatus || 'normal',
      email,
      passwordHash
    });
    return res.status(201).json({ id: user._id });
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id.toString(), role: user.role, name: user.name }, process.env.JWT_SECRET || 'dev_secret', {
      expiresIn: '7d'
    });
    return res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (e) {
    return res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login };


