const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/user');
const { requireAuth } = require('../middleware/authMiddleware');

// Format INR currency
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);

router.post('/sendBudgetAlert', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const userDetails = await User.findById(user._id);
    if (!userDetails || !userDetails.email) {
      return res.status(404).json({ success: false, error: 'User email not found' });
    }

    const { budgetPercentage, totalSpent, totalBudget } = req.body;

    // Validate input
    if (
      typeof budgetPercentage !== 'number' ||
      typeof totalSpent !== 'number' ||
      typeof totalBudget !== 'number'
    ) {
      return res.status(400).json({ success: false, error: 'Invalid input types' });
    }

    if (budgetPercentage < 50) {
      return res.status(400).json({ success: false, error: 'Budget usage below alert threshold' });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      return res.status(500).json({ success: false, error: 'Email credentials not set in environment variables' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const formattedSpent = formatCurrency(totalSpent);

    const mailOptions = {
      from: emailUser,
      to: userDetails.email,
      subject: `⚠️ Budget Alert: You've Used ${budgetPercentage}% of Your Monthly Budget`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #e53e3e;">Budget Alert Notification</h2>
          <p>Hello ${userDetails.name || 'there'},</p>
          <p>This is a friendly reminder that you've used <strong>${budgetPercentage}%</strong> of your monthly budget.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Amount Spent:</strong> ${formattedSpent}</p>
            <div style="height: 20px; background-color: #edf2f7; border-radius: 10px; margin: 10px 0;">
              <div style="height: 100%; width: ${budgetPercentage}%; background-color: ${
        budgetPercentage > 80 ? '#f56565' : '#ed8936'
      }; border-radius: 10px;"></div>
            </div>
          </div>
          <p>Please review your expenses on your dashboard to stay within budget.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #718096;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Budget alert email sent successfully' });
  } catch (error) {
    console.error('Error sending budget alert email:', error);
    res.status(500).json({ success: false, error: 'Failed to send budget alert email' });
  }
});

module.exports = router;
