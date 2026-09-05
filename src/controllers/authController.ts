import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { AuthRequest } from '../types';
import { sendPasswordResetEmail } from '../utils/mailer';

const signToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, name, email, password, phone, storeName, storeAddress, storeGST, storeDLNo, storeUpiId } = req.body;

    if (!username || !name || !email || !password) {
      res.status(400).json({ success: false, message: 'Username, name, email and password are required.' });
      return;
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      res.status(400).json({ success: false, message: 'Username is already taken.' });
      return;
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      res.status(400).json({ success: false, message: 'Email is already registered.' });
      return;
    }

    const user = await User.create({
      username: username.toLowerCase(),
      name, email, password, phone,
      storeName, storeAddress, storeGST, storeDLNo, storeUpiId,
      status: 'pending',
      role: 'user',
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Your account is under review. You will be able to log in once approved.',
      data: { userId: user._id, username: user.username, status: user.status },
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      res.status(400).json({ success: false, message: 'Username or email already exists.' });
    } else {
      res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required.' });
      return;
    }

    // Accepts either username or email in the same field — both are stored
    // lowercase, so a case-insensitive match on either is enough to tell them
    // apart without needing the client to say which one it typed.
    const identifier = username.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin approval after payment confirmation.',
        code: 'PENDING_APPROVAL',
      });
      return;
    }

    if (user.status === 'rejected') {
      res.status(403).json({
        success: false,
        message: `Your account has been rejected. Reason: ${user.rejectionReason || 'Please contact support.'}`,
        code: 'ACCOUNT_REJECTED',
      });
      return;
    }

    const token = signToken(user._id.toString(), user.role);
    res.json({ success: true, message: 'Login successful.', data: { token, user } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, message: 'Profile fetched.', data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, storeName, storeAddress, storeGST, storeDLNo, storeUpiId, defaultDiscountPercent } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, storeName, storeAddress, storeGST, storeDLNo, storeUpiId, defaultDiscountPercent },
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, message: 'Profile updated.', data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const markAlertsSeen = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { expiredIds, expiringIds, lowStockIds } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        seenAlerts: {
          expiredIds: Array.isArray(expiredIds) ? expiredIds : [],
          expiringIds: Array.isArray(expiringIds) ? expiringIds : [],
          lowStockIds: Array.isArray(lowStockIds) ? lowStockIds : [],
        },
      },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, message: 'Alerts marked as seen.', data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    if (!(await user.comparePassword(currentPassword))) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success anyway to prevent email enumeration
      res.json({ success: true, message: 'If that email is registered, a reset token has been generated.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const emailSent = await sendPasswordResetEmail(user.email, resetToken);

    // Dev mode returns the token directly for local testing without real SMTP.
    // In production the token is NEVER echoed back — even if sending failed —
    // since that would let anyone with a known email address self-serve the
    // reset code from the API response. A failed send is logged server-side
    // (see mailer.ts) so it's visible in PM2 logs, not returned to the client.
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      success: true,
      message: emailSent
        ? 'Password reset code sent to your email.'
        : 'Password reset token generated. Check your email.',
      ...(isDev && { resetToken }),
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ success: false, message: 'Token and new password are required.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const jwtToken = signToken(user._id.toString(), user.role);
    res.json({ success: true, message: 'Password reset successfully.', data: { token: jwtToken } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
