const express = require('express');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pg = require('pg');
const nodemailer = require('nodemailer');

dotenv.config();

const router = express.Router();

router.use(express.json());

const pool1 = new pg.Pool({
    connectionString: process.env.userver1_DATABASE_URL,
});

const pool2 = new pg.Pool({
    connectionString: process.env.userver2_DATABASE_URL,
});

router.post('/v1/auth/login', async (req, res) => {
	const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required'});
    }

    try {
        const server1Result = await pool1.query(
            'SELECT * FROM users WHERE username = $1', [username]);
        const server2Result = await pool2.query(
            'SELECT * FROM users WHERE username = $1', [username]);

        let user = null;
        let server = null;

        if (server1Result.rows.length > 0) {
            user = server1Result.rows[0];
            server = 'U-SERVER-1';
        } else if (server2Result.rows.length > 0) {
            user = server2Result.rows[0];
            server = 'U-SERVER-2';
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.uuid, username: user.username, email: user.email, server: user.server },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ message: 'Login successful', uuid: user.uuid, username: user.username, token, server });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;