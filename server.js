const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const pg = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// Configure session middleware
app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true
}));

// Database connection
const pool = new pg.Pool({
    connectionString: 'postgresql://postgres:S%40%40d7643@localhost:5432/user_panel',
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve registration form
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve login form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const query = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)';
        await pool.query(query, [email, hashedPassword, name]);
        res.send('User registered successfully!');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user. Please try again later.');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).send('Invalid email or password');
        }
        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
            req.session.userId = user.id; // Store user ID in session
            res.redirect('/userlist');
        } else {
            return res.status(401).send('Invalid email or password');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in. Please try again later.');
    }
});

// Route to serve user list page
app.get('/userlist', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/');
    }
    try {
        const query = 'SELECT * FROM users';
        const result = await pool.query(query);
        const users = result.rows;
        res.render('userlist.ejs', { users });
    } catch (error) {
        console.error('Error fetching user list:', error);
        res.status(500).send('Error fetching user list. Please try again later.');
    }
});

// Handle user edit
// Handle user edit
app.get('/edit/:userId', async (req, res) => {
    const userId = req.params.userId;

    // Check if user is logged in (replace this with your actual authentication logic)
    const loggedInUserId = req.session.userId; 
    // Assuming you're using sessions
    if (!loggedInUserId) {
        return res.redirect('/'); // Redirect to login if not logged in
    }

    console.log("saad");
    // Check if the logged-in user matches the requested user ID
    if (loggedInUserId !== userId) {
        return res.status(403).send('You are not authorized to edit this user'); // Unauthorized access
    }

    // Retrieve user data from the database based on user ID
    try {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = result.rows[0];
        res.render('edit', { user }); // Render edit page with user data
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Error fetching user data. Please try again later.');
    }
});

// Handle user update
app.post('/update/:userId', async (req, res) => {
    const userId = req.params.userId;
    const { name, email } = req.body;
    const loggedInUserId = req.session.userId;
    if (!loggedInUserId) {
        return res.redirect('/');
    }
    if (loggedInUserId !== userId) {
        return res.status(403).send('You are not authorized to edit this user');
    }
    try {
        const query = 'UPDATE users SET name = $1, email = $2 WHERE id = $3';
        await pool.query(query, [name, email, userId]);
        res.redirect('/userlist');
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).send('Error updating user data. Please try again later.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
