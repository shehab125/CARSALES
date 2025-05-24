const config = {
    // Development
    development: {
        apiUrl: 'http://localhost:5001/api'
    },
    // Production
    production: {
        apiUrl: 'https://car-sales-backend.onrender.com/api'
    }
};

// Use production config if not in development
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const currentConfig = isDevelopment ? config.development : config.production; 