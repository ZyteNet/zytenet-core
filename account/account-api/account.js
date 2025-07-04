const express = require('express');
const jsonwebtoken = require('jsonwebtoken');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const router = express.Router();

const pool1 = new pg.Pool({
    connectionString: process.env.userver1_DATABASE_URL,
});
const pool2 = new pg.Pool({
    connectionString: process.env.userver2_DATABASE_URL,
});

router.use(express.json());

router.get('/v1/account', async (req, res) => {
    console.log('Authorization header:', req.headers.authorization);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Auth token is required' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        const { id, server } = decoded;

        const pool = server === 'U-SERVER-1' ? pool1 : pool2;

        const result = await pool.query(
            'SELECT uuid, display_name, username, email, role_perms, is_staff, is_suspended, pfp_link, banner_link, server FROM users WHERE uuid = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            uuid: user.uuid,
            display_name: user.display_name,
            username: user.username,
            email: user.email,
            role_perms: user.role_perms,
            is_staff: user.is_staff,
            is_suspended: user.is_suspended,
            pfp_link: user.pfp_link,
            banner_link: user.banner_link,
            server: user.server
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/v1/account/update', async (req, res) => {
    console.log('Authorization header:', req.headers.authorization);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Auth token is required' });
    }

    const { display_name, username, email, password } = req.body;

    if (!display_name && !username && !email && !password) {
        return res.status(400).json({ message: 'At least one field is required for update' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        const { id, server } = decoded;

        const pool = server === 'U-SERVER-1' ? pool1 : pool2;

        const updates = [];
        const values = [];
        let index = 1;

        if (display_name) {
            updates.push(`display_name = $${index++}`);
            values.push(display_name);
        }
        if (username) {
            updates.push(`username = $${index++}`);
            values.push(username);
        }
        if (email) {
            updates.push(`email = $${index++}`);
            values.push(email);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 15);
            updates.push(`password = $${index++}`);
            values.push(hashedPassword);
        }

        values.push(id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE uuid = $${index}`;
        await pool.query(query, values);

        res.json({ message: 'User data updated successfully' });
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/v1/account/delete', async (req, res) => {
    console.log('Authorization header:', req.headers.authorization);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Auth token is required' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        const { id, server } = decoded;
        
        const pool = server === 'U-SERVER-1' ? pool1 : pool2;

        await pool.query('DELETE FROM users WHERE uuid = $1', [id]);

        res.json({ message: 'Proxiaforge account deleted successfully' });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;