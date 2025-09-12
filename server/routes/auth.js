const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateProfileUpdate,
  validatePasswordChange 
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, validateProfileUpdate, authController.updateProfile);
router.put('/change-password', authMiddleware, validatePasswordChange, authController.changePassword);

module.exports = router;