const express = require('express');
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

const pool1 = new pg.Pool({
    connectionString: process.env.userver1_DATABASE_URL,
});

const pool2 = new pg.Pool({
    connectionString: process.env.userver2_DATABASE_URL,
});

app.get('/v1/account/profile', async (req, res) => {
    const { username, name } = req.query;
    
    if (!username && !name) {
        return res.status(400).json({ message: 'Username or display name is required' });
    }

    const fetchUserByUsername = async (username) => {
        try {
            const server1Result = await pool1.query(
                "SELECT uuid, display_name, username, account_created, role_perms, is_staff, is_suspended, pfp_link, banner_link, server FROM users WHERE username = $1",
                [username]
            );
            const server2Result = await pool2.query(
                "SELECT uuid, display_name, username, account_created, role_perms, is_staff, is_suspended, pfp_link, banner_link, server FROM users WHERE username = $1",
                [username]
            );
            return [...server1Result.rows, ...server2Result.rows];
        } catch (error) {
            console.error('Error fetching user by username:', error);
            throw error;
        }
    };

    const fetchUsersByDisplayName = async (name) => {
        try {
            const server1Result = await pool1.query(
                "SELECT uuid, display_name, username, account_created, role_perms, is_staff, is_suspended, pfp_link, banner_link, server FROM users WHERE display_name ILIKE $1",
                [`%${name}%`]
            );
            const server2Result = await pool2.query(
                "SELECT uuid, display_name, username, account_created, role_perms, is_staff, is_suspended, pfp_link, banner_link, server FROM users WHERE display_name ILIKE $1",
                [`%${name}%`]
            );
            return [...server1Result.rows, ...server2Result.rows];
        } catch (error) {
            console.error('Error fetching users by display name:', error);
            throw error;
        }
    };

    try {
        let users = [];

        if (username) {
            console.log('Fetching users by username:', username);
            const usernameResults = await fetchUserByUsername(username);
            users = [...users, ...usernameResults];
        }

        if (name) {
            console.log('Fetching users by display name:', name);
            const displayNameResults = await fetchUsersByDisplayName(name);
            users = [...users, ...displayNameResults];
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        const uniqueUsers = users.reduce((acc, user) => {
            if (!acc.find((u) => u.uuid === user.uuid)) {
                acc.push(user);
            }
            return acc;
        }, []);

        const response = uniqueUsers.map((user) => ({
            uuid: user.uuid,
            display_name: user.display_name,
            username: user.username,
            account_created: user.account_created,
            role_perms: user.role_perms,
            is_staff: user.is_staff,
            is_suspended: user.is_suspended,
            pfp_link: user.pfp_link,
            banner_link: user.banner_link,
            server: user.server,
        }));

        res.json(response);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = app;