require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paypal = require('@paypal/checkout-server-sdk');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// PayPal configuration
// Use environment variables for security in production
let environment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_LIVE_CLIENT_ID,
    process.env.PAYPAL_LIVE_SECRET
);
let client = new paypal.core.PayPalHttpClient(environment);

// Create PayPal order
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        if (!amount || !currency) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: 'Amount and currency are required'
            });
        }

        let request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount.toString()
                },
                description: 'Car Sales Website Subscription'
            }]
        });

        const order = await client.execute(request);
        console.log('Order created successfully:', order.result.id);
        res.json({ id: order.result.id });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ 
            error: 'Failed to create order',
            details: err.message
        });
    }
});

// Capture PayPal order
app.post('/api/capture-order', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ 
                error: 'Missing order ID',
                details: 'Order ID is required'
            });
        }

        // First verify the order exists and is in the correct state
        let getOrderRequest = new paypal.orders.OrdersGetRequest(orderId);
        const orderDetails = await client.execute(getOrderRequest);
        
        if (!orderDetails.result) {
            return res.status(404).json({
                error: 'Order not found',
                details: 'The specified order ID does not exist'
            });
        }

        if (orderDetails.result.status !== 'APPROVED') {
            return res.status(400).json({
                error: 'Invalid order state',
                details: `Order is in ${orderDetails.result.status} state. Must be APPROVED to capture.`
            });
        }

        // Create capture request
        let request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.prefer("return=representation");
        
        // Execute capture
        const capture = await client.execute(request);
        
        if (!capture.result || capture.result.status !== 'COMPLETED') {
            return res.status(400).json({
                error: 'Capture failed',
                details: 'Failed to capture the payment'
            });
        }
        
        console.log('Order captured successfully:', capture.result.id);
        res.json({
            success: true,
            orderId: capture.result.id,
            status: capture.result.status,
            details: capture.result
        });
    } catch (err) {
        console.error('Error capturing order:', err);
        
        // Enhanced error handling
        let errorMessage = 'Failed to capture order';
        let errorDetails = err.message;
        let statusCode = err.statusCode || 500;
        
        if (err.statusCode === 422) {
            errorMessage = 'Order cannot be captured';
            errorDetails = 'The order may be invalid, expired, or already captured';
        } else if (err.statusCode === 404) {
            errorMessage = 'Order not found';
            errorDetails = 'The specified order ID does not exist';
        } else if (err.statusCode === 400) {
            errorMessage = 'Invalid request';
            errorDetails = err.message;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: errorDetails
        });
    }
});

// Serve dynamic PayPal SDK loader
app.get('/paypal-sdk.js', (req, res) => {
    const clientId = process.env.PAYPAL_LIVE_CLIENT_ID || 'YOUR_LIVE_CLIENT_ID';
    const currency = 'USD';
    res.set('Content-Type', 'application/javascript');
    res.send(`
        var script = document.createElement('script');
        script.src = "https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}";
        document.head.appendChild(script);
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('PayPal Live environment is active');
}); 