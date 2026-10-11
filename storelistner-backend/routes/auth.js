// routes/auth.js - JWT Authentication & Store Admin / Sales Manager Verification
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {
  seedDefaultUsers,
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  getAllUsers,
  getPendingSalesManagers,
  approveSalesManager,
  rejectSalesManager
} = require('../services/userStore');
const { verifyToken, requireStoreAdmin, JWT_SECRET } = require('../middleware/auth');

// Helper to sign JWT token
function generateToken(user) {
  const userId = user.id || user._id;
  return jwt.sign(
    {
      id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      storeCode: user.storeCode,
      storeName: user.storeName
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Format safe user payload (omit password)
function sanitizeUser(user) {
  return {
    id: user.id || user._id,
    _id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    storeCode: user.storeCode,
    storeName: user.storeName,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
    rejectionReason: user.rejectionReason,
    createdAt: user.createdAt
  };
}

// ---------------- PUBLIC AUTH ENDPOINTS ----------------

/**
 * POST /api/auth/register
 * Supports roles: 'store_admin' and 'sales_manager'
 * - 'store_admin': Immediate verification, no approval needed!
 * - 'sales_manager': Must be verified & approved by Store Admin before login.
 */
router.post('/register', async (req, res) => {
  try {
    await seedDefaultUsers();
    const {
      name,
      email,
      password,
      role = 'sales_manager',
      storeCode = 'STORE-NYC-01',
      storeName = 'Apple Authorized Store'
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.'
      });
    }

    if (!['store_admin', 'sales_manager'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be either "store_admin" or "sales_manager".'
      });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const newUser = await createUser({
      name,
      email,
      password,
      role,
      storeCode,
      storeName
    });

    const safeUser = sanitizeUser(newUser);

    // If Store Admin: Auto-verified immediately! Generate token right away.
    if (newUser.role === 'store_admin') {
      const token = generateToken(newUser);
      return res.status(201).json({
        success: true,
        role: 'store_admin',
        status: 'approved',
        token,
        user: safeUser,
        message: 'Store Admin registered and verified automatically. You are signed in!'
      });
    }

    // If Sales Manager: Requires Store Admin verification. Do not return token yet.
    const io = req.app.get('io');
    if (io) {
      io.emit('sales_manager_registered', {
        user: safeUser,
        timestamp: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      role: 'sales_manager',
      status: 'pending',
      user: safeUser,
      message: 'Registration successful! Your Sales Manager account is pending verification by a Store Admin. You will be able to log in once approved.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and verifies that Sales Managers are approved.
 */
router.post('/login', async (req, res) => {
  try {
    await seedDefaultUsers();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Role verification check:
    // Store Admin does not need verification.
    // Sales Manager MUST be approved by a Store Admin.
    if (user.role === 'sales_manager') {
      if (user.status === 'pending') {
        return res.status(403).json({
          success: false,
          status: 'pending',
          error: 'Your Sales Manager account is pending verification by a Store Admin. Please wait for an administrator to approve your account before logging in.'
        });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({
          success: false,
          status: 'rejected',
          error: `Your Sales Manager account registration was rejected by Store Admin. ${user.rejectionReason ? `Reason: ${user.rejectionReason}` : ''}`
        });
      }
    }

    // Generate JWT token
    const token = generateToken(user);
    const safeUser = sanitizeUser(user);

    return res.json({
      success: true,
      token,
      user: safeUser,
      message: `Welcome back, ${user.name}!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- PROTECTED ENDPOINTS ----------------

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
router.get('/me', verifyToken, async (req, res) => {
  return res.json({
    success: true,
    user: sanitizeUser(req.user)
  });
});

/**
 * GET /api/auth/pending-sales-managers
 * Store Admin only: View all Sales Managers awaiting verification
 */
router.get('/pending-sales-managers', verifyToken, requireStoreAdmin, async (req, res) => {
  try {
    const pending = await getPendingSalesManagers();
    const safePending = pending.map(sanitizeUser);
    return res.json({
      success: true,
      count: safePending.length,
      users: safePending
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/users
 * Store Admin only: View all users (Store Admins and Sales Managers)
 */
router.get('/users', verifyToken, requireStoreAdmin, async (req, res) => {
  try {
    const all = await getAllUsers();
    const safeUsers = all.map(sanitizeUser);
    return res.json({
      success: true,
      count: safeUsers.length,
      users: safeUsers
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/users/:id/approve
 * Store Admin only: Verify and approve a Sales Manager
 */
router.post('/users/:id/approve', verifyToken, requireStoreAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminName = req.user.name || 'Store Admin';
    const updatedUser = await approveSalesManager(id, adminName);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Sales Manager user not found.'
      });
    }

    const safeUser = sanitizeUser(updatedUser);

    // Broadcast live event to all connected dashboards and terminals
    const io = req.app.get('io');
    if (io) {
      io.emit('sales_manager_status_changed', {
        userId: safeUser.id,
        email: safeUser.email,
        status: 'approved',
        approvedBy: adminName,
        timestamp: new Date()
      });
    }

    return res.json({
      success: true,
      message: `Sales Manager ${safeUser.name} (${safeUser.email}) has been approved! They can now log in.`,
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/users/:id/reject
 * Store Admin only: Reject a Sales Manager verification request
 */
router.post('/users/:id/reject', verifyToken, requireStoreAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Not authorized by Store Admin' } = req.body;
    const updatedUser = await rejectSalesManager(id, reason);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Sales Manager user not found.'
      });
    }

    const safeUser = sanitizeUser(updatedUser);

    // Broadcast live event
    const io = req.app.get('io');
    if (io) {
      io.emit('sales_manager_status_changed', {
        userId: safeUser.id,
        email: safeUser.email,
        status: 'rejected',
        reason,
        timestamp: new Date()
      });
    }

    return res.json({
      success: true,
      message: `Sales Manager ${safeUser.name} registration was rejected.`,
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  router,
  seedDefaultUsers
};
