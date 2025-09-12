const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAuthAction, createAlert } = require('../middleware/audit');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password, company, phone, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        const error = new Error('Email já está em uso');
        error.status = 400;
        return next(error);
      }

      // Create new user
      const user = await User.create({ name, email, password, company, phone, role });
      const token = generateToken(user.id);

      // Log registro de usuário
      await logAuthAction(
        user.id, 
        'create', 
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
        { email, company, role }
      );

      // Criar alerta de novo usuário
      await createAlert({
        userId: 1, // Admin user
        type: 'user_registration',
        severity: 'info',
        title: 'Novo Usuário Registrado',
        message: `Novo usuário ${name} (${email}) se registrou no sistema`,
        metadata: { userId: user.id, email, company }
      });

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user,
        token
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      
      if (!user) {
        const error = new Error('Credenciais inválidas');
        error.status = 401;
        return next(error);
      }

      // Validate password
      const isValidPassword = await User.validatePassword(password, user.password);
      
      if (!isValidPassword) {
        const error = new Error('Credenciais inválidas');
        error.status = 401;
        return next(error);
      }

      // Generate token
      const token = generateToken(user.id);

      // Log login bem-sucedido
      await logAuthAction(
        user.id,
        'login',
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
        { email, loginTime: new Date().toISOString() }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error('Usuário não encontrado');
        error.status = 404;
        return next(error);
      }

      res.json({ 
        success: true,
        user 
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const user = await User.update(req.userId, updates);
      
      if (!user) {
        const error = new Error('Usuário não encontrado');
        error.status = 404;
        return next(error);
      }

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        const error = new Error('Usuário não encontrado');
        error.status = 404;
        return next(error);
      }

      // Validate current password
      const isValidPassword = await User.validatePassword(currentPassword, user.password);
      if (!isValidPassword) {
        const error = new Error('Senha atual incorreta');
        error.status = 400;
        return next(error);
      }

      // Update password
      await User.update(userId, { password: newPassword });

      // Log password change
      await logAuthAction(
        userId,
        'password_change',
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
        { changeTime: new Date().toISOString() }
      );

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;