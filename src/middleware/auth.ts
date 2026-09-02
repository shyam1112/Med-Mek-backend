import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../types';

interface JwtPayload {
  userId: string;
  role: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

    // The JWT itself stays valid for JWT_EXPIRES_IN (weeks), so a signature
    // check alone would let a since-rejected/deleted/suspended account keep
    // full API access until that token naturally expires. Re-checking current
    // status on every request closes that gap at the (small) cost of one
    // extra indexed lookup by _id per request.
    const user = await User.findById(decoded.userId).select('status').lean();
    if (!user || user.status !== 'approved') {
      res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
    return;
  }
  next();
};
