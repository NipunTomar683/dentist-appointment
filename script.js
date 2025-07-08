const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/dental_clinic');

const Appointment = mongoose.model('Appointment', {
  name: String,
  email: String,
  phone: String,
  datetime: Date,
  message: String
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/book-appointment', async (req, res) => {
  const { name, email, phone, datetime, message } = req.body;
  const appointmentTime = new Date(datetime);

  // Check 15-minute conflict
  const conflict = await Appointment.findOne({
    datetime: {
      $gte: new Date(appointmentTime.getTime() - 14 * 60000),
      $lte: new Date(appointmentTime.getTime() + 14 * 60000)
    }
  });
  if (conflict) return res.status(409).json({ error: 'Time slot unavailable. Choose another time.' });

  // Save appointment
  const appointment = new Appointment({ name, email, phone, datetime: appointmentTime, message });
  await appointment.save();

  // Notify user
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Appointment Confirmed',
    text: `Hi ${name}, your appointment is confirmed for ${appointmentTime.toLocaleString()}.\n- Smile Dental Clinic`
  });

  // Notify doctor
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.DOCTOR_EMAIL,
    subject: 'New Appointment',
    text: `New Appointment:\nName: ${name}\nPhone: ${phone}\nTime: ${appointmentTime.toLocaleString()}\nReason: ${message}`
  });

  res.json({ message: 'Appointment booked successfully!' });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));