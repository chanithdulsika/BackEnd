require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const port = process.env.PORT || 4000;
// const twilio = require('twilio');
app.use(express.json());

const mongoUrl = process.env.MONGO_URL;

mongoose.connect(mongoUrl)
  .then(() => console.log('DATABASE CONNECTED'))
  .catch((e) => console.log(e));

require('./UserDetails');
const User = mongoose.model("UserInfo");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const verificationCodes = {}; // Store codes temporarily

// const vonage = new Vonage({
//   apiKey: process.env.NEXMO_API_KEY,
//   apiSecret: process.env.NEXMO_API_SECRET
// });

// function sendSms(to, message) {
//   return new Promise((resolve, reject) => {
//     vonage.sms.send({ to, from: process.env.NEXMO_PHONE_NUMBER, text: message }, (err, responseData) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(responseData);
//       }
//     });
//   });
// }

app.post("/send-verification", async (req, res) => {
  const { email, mobile } = req.body;
  const oldUser = await User.findOne({ $or: [{ email }, { mobile }] });


  if (oldUser) {
    return res.send({ data: 'User already exists!' });
  }

  const code = crypto.randomInt(100000, 999999).toString();
  verificationCodes[email] = code;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification Code',
    text: `Your verification code is: ${code}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.send({ status: "error", data: error.message });
    }
    res.send({ status: "OK", data: "Verification email sent" });
  });


//   // Add logic to send verification code to mobile number
//   // Assuming you have a function sendSms to send SMS
//   sendSms(mobile, `Your verification code is: ${code}`)
//     .then(() => {
//       res.send({ status: "OK", data: "Verification email and SMS sent" });
//     })
//     .catch((error) => {
//       res.send({ status: "error", data: error.message });
//     });
});

app.post("/register", async (req, res) => {
  const { name, email, mobile, password, code } = req.body;

  if (verificationCodes[email] !== code) {
    return res.send({ status: "error", data: "Invalid verification code" });
  }

  console.log("password during registration:", password);

  try {
    await User.create({ name, email, mobile, password});
    delete verificationCodes[email];
    res.send({ status: "OK", data: "User Created" });
  } catch (error) {
    res.send({ status: "error", data: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.send({ status: "error", data: "User not found" });
    }

    console.log("Stored hashed password:", user.password);
    console.log("Entered plain text password:", password);

    if (password !== user.password) {
      return res.send({ status: "error", data: "Invalid password" });
    }


    res.send({ status: "OK", data: "Login successful"});
  } catch (error) {
    console.log("Error during login:", error.message);
    res.send({ status: "error", data: error.message });
  }
});

app.listen(4000, () => console.log("Server started on port 4000"));
