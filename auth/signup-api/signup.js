const express = require('express');
const bcrypt = require('bcryptjs');
const pg = require('pg');
const { body, validationResult } = require('express-validator');
const { error } = require('console');

const router = express();

router.use(express.json());

const pool1 = new pg.Pool({
    connectionString: process.env.userver1_DATABASE_URL,
});

const pool2 = new pg.Pool({
    connectionString: process.env.userver2_DATABASE_URL,
});

const checkIfUserExists = async (username, email) => {
    try {
        const server1Result = await pool1.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        const server2Result = await pool2.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (server1Result.rows.length > 0 || server2Result.rows.length > 0) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking if user exists:', error);
        throw error;
    }
};

// Signup API
router.post('/v1/auth/signup', async (req, res) => {
    console.log('Request recieved at /v1/auth/signup');
    console.log('Request body:', req.body);
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.status(400).json({ errors: validationErrors.array() });
    }

    const { display_name, username, email, password } = req.body;
    const errors = [];
    if (!username || username.length < 3 || username.length > 20) {
        errors.push({ message: 'Username must be between 3 and 20 characters long' });
    } else if (!/^[a-z0-9_]+$/.test(username)) {
        errors.push({ message: 'Username can only contain lowercase letters, numbers and underscores' });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        errors.push({ message: 'Invalid email' });
    }
    if (!password || password.length < 10) {
        errors.push({ message: 'Password must be at least 10 characters long' });
    }
    if (!display_name || display_name.length < 3 || display_name.length > 30) {
        errors.push({ message: 'Display name must be between 3 and 30 characters long' });
    }

    if (errors.length > 0) {
        console.log('Validation failed:', errors);
        return res.status(400).json({ errors });
    }

    try {
        const userExists = await checkIfUserExists(username, email);
        if (userExists) {
            return res.status(400).json({ message: 'User with that username or email already exists' });
        }

        console.log('Hashing password');
        const hashedPassword = await bcrypt.hash(password, 15);

        const selectedPool = Math.random() < 0.5 ? pool1 : pool2;
        const selectedServer = selectedPool === pool1 ? 'U-SERVER-1' : 'U-SERVER-2';

        console.log(`Creating user on ${selectedServer}`);
        const result = await selectedPool.query(
            'INSERT INTO users (display_name, username, email, password, role_perms, is_staff, is_suspended) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                display_name,
                username,
                email,
                hashedPassword,
                'user',
                false,
                false,
            ]
        );

        console.log('User successfully created', selectedServer);

        res.status(201).json({
            message: 'Proxiaforge account created',
            server: selectedServer,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;