import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JWTPayload {
  id: string;
  iat: number;
  exp: number;
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'No token, authorization denied' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const user = await User.findById(decoded.id).populate('subscription');

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await auth(req, res, () => {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return;
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const subscriptionRequired = (req: Request, res: Response, next: NextFunction): void => {
  // Admin users bypass subscription requirements
  if (req.user?.role === 'admin') {
    return next();
  }

  if (!req.user?.subscription || !(req.user.subscription as any).isActive()) {
    res.status(403).json({
      message: 'Active subscription required',
      code: 'SUBSCRIPTION_REQUIRED'
    });
    return;
  }
  next();
};

export const generateToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET
  );
};

export default {
  auth,
  adminAuth,
  subscriptionRequired,
  generateToken
};