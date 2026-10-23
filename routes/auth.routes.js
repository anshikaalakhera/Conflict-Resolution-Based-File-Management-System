import { Hono } from 'hono';
import {
    registerUser,
    loginUser,
    getUserByToken,
    logoutUser
} from '../services/auth.service.js';

const authRoutes = new Hono();

// Helper to extract bearer token
const extractToken = (c) => {
    const authHeader = c.req.header('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return c.req.query('token') || null;
};

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        const result = await registerUser(body);

        return c.json({
            message: 'User registered successfully',
            user: result.user,
            token: result.token
        }, 201);
    } catch (error) {
        console.error('Registration error:', error.message);
        return c.json({
            message: error.message || 'Registration failed'
        }, 400);
    }
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const result = await loginUser(body);

        return c.json({
            message: 'Login successful',
            user: result.user,
            token: result.token
        }, 200);
    } catch (error) {
        console.error('Login error:', error.message);
        return c.json({
            message: error.message || 'Login failed'
        }, 401);
    }
});

// GET /api/auth/me
authRoutes.get('/me', (c) => {
    const token = extractToken(c);
    const user = getUserByToken(token);

    if (!user) {
        return c.json({
            message: 'Not authenticated or invalid token'
        }, 401);
    }

    return c.json({
        user
    });
});

// POST /api/auth/logout
authRoutes.post('/logout', (c) => {
    const token = extractToken(c);
    if (token) {
        logoutUser(token);
    }

    return c.json({
        message: 'Logged out successfully'
    });
});

export default authRoutes;
