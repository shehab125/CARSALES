const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.post('/api/delete-user', async (req, res) => {
    try {
        // Get the authorization token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        // Verify the token and check if user is admin
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists || !userDoc.data().isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Only admins can delete users' });
        }

        // Get the user ID to delete
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Delete the user
        await admin.auth().deleteUser(userId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app); 