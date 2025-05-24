const admin = require('firebase-admin');

// Path to your Firebase service account key JSON file
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'l3oJlB1nMLho2lMTrQJq001cMj43'; // <-- Replace with your admin user's UID

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Custom claim set for admin!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  });