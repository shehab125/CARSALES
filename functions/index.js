const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
    // Check if the request is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Check if the caller is an admin
    const callerUid = context.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users.');
    }

    const userId = data.userId;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a userId.');
    }

    try {
        // Delete the user from Firebase Auth
        await admin.auth().deleteUser(userId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new functions.https.HttpsError('internal', 'Error deleting user: ' + error.message);
    }
}); 