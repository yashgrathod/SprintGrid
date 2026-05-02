import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../server';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';
import axios from 'axios';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, systemRole } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        systemRole: systemRole || 'MEMBER'
      },
    });

    const token = generateToken(user.id, user.systemRole);
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, systemRole: user.systemRole }, token });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.systemRole);
    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, systemRole: user.systemRole }, token });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    console.log(`[Mock Email] Password reset link for ${email}: http://localhost:3000/reset-password?token=${resetToken}`);
    res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password reset' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, name } = googleResponse.data;

    if (!email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email,
          passwordHash: null,
          systemRole: 'MEMBER'
        },
      });
    }

    const jwtToken = generateToken(user.id, user.systemRole);
    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, systemRole: user.systemRole }, token: jwtToken });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
