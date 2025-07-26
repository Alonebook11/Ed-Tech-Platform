const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting for scalability
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Compression for better performance
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/student-navigator',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-navigator', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  googleId: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// UserProgress Schema
const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  stepsCompleted: { type: Number, default: 0 },
  roadmap: { type: String, required: true }, // e.g., 'web-development', 'ai-ml', etc.
});

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile.displayName, profile.emails[0].value);
    
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (!user) {
      // Create new user from Google
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: 'GOOGLE_OAUTH_' + Math.random().toString(36).substr(2, 9),
        googleId: profile.id
      });
      await user.save();
      console.log('✅ New Google user created:', user.email);
    } else {
      // Update existing user's Google ID if not set
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      console.log('✅ Existing user logged in via Google:', user.email);
    }
    
    return done(null, user);
  } catch (err) {
    console.error('❌ Google OAuth error:', err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.use(passport.initialize());
app.use(passport.session());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.use(express.static(path.join(__dirname, './')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body.email);
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    console.log('✅ User registered successfully:', email);

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    console.log('✅ User logged in successfully:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Google OAuth endpoints
app.get('/api/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

app.get('/api/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login.html?error=google_auth_failed',
  session: true
}), (req, res) => {
  try {
    // Generate JWT for frontend
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Google OAuth successful for:', req.user.email);
    
    // Redirect to frontend with token
    res.redirect(`/login.html?token=${token}&success=true`);
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error);
    res.redirect('/login.html?error=token_generation_failed');
  }
});

// Protected route example
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  });
});

// Seed demo users and progress (for demo only)
async function seedDemoUsers() {
  const demoUsers = [
    { name: 'Alice', email: 'alice@example.com', password: await bcrypt.hash('password1', 12) },
    { name: 'Bob', email: 'bob@example.com', password: await bcrypt.hash('password2', 12) },
    { name: 'Charlie', email: 'charlie@example.com', password: await bcrypt.hash('password3', 12) },
  ];
  for (const demo of demoUsers) {
    let user = await User.findOne({ email: demo.email });
    if (!user) {
      user = await User.create(demo);
    }
    // Seed progress for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      // Simulate random progress
      const stepsCompleted = Math.floor(Math.random() * 4); // 0-3 steps
      const roadmap = ['web-development', 'ai-ml', 'dsa'][i % 3];
      await UserProgress.updateOne(
        { userId: user._id, date: dateStr, roadmap },
        { $set: { stepsCompleted } },
        { upsert: true }
      );
    }
  }
}

// Call seed function on server start
seedDemoUsers().catch(console.error);

// API endpoint: Get user progress calendar
app.get('/api/user/:userId/progress', async (req, res) => {
  try {
    const { userId } = req.params;
    const { roadmap } = req.query;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().slice(0, 10);
    const filter = { userId };
    if (roadmap) filter.roadmap = roadmap;
    filter.date = { $gte: startStr };
    const progress = await UserProgress.find(filter).lean();
    res.json({ success: true, progress });
  } catch (err) {
    console.error('❌ Progress fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
});

module.exports = app; 