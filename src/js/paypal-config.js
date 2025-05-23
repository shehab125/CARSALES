// PayPal Configuration
export const paypalConfig = {
    clientId: 'ARLWdOmGgA3pZQC0facoCapXaM4pTj-8ZQAljT2a0cOQgoIytd3AZDxxdS27-AdzN7pwJDyM6hjTaF3C',
    currency: 'USD',
    intent: 'capture'
};

// Create PayPal Order
export async function createPayPalOrder(amount) {
    try {
        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                currency: paypalConfig.currency
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create order');
        }
        
        const order = await response.json();
        return order.id;
    } catch (error) {
        console.error('Error creating PayPal order:', error);
        throw error;
    }
}

// Capture PayPal Order
export async function capturePayPalOrder(orderId) {
    try {
        const response = await fetch('/api/capture-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: orderId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to capture order');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        throw error;
    }
}

// Initialize PayPal Buttons
export function initPayPalButtons(containerId, amount, onSuccess) {
    if (!window.paypal) {
        console.error('PayPal SDK not loaded');
        return;
    }

    return window.paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
        },
        
        createOrder: async function() {
            try {
                const orderId = await createPayPalOrder(amount);
                return orderId;
            } catch (error) {
                console.error('Error creating order:', error);
                showError('حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة مرة أخرى.');
                throw error;
            }
        },
        
        onApprove: async function(data, actions) {
            try {
                const result = await capturePayPalOrder(data.orderID);
                if (result.success) {
                    showSuccess('تم الدفع بنجاح!');
                    if (onSuccess) {
                        onSuccess(result);
                    }
                } else {
                    throw new Error(result.error || 'فشل في تأكيد الدفع');
                }
            } catch (error) {
                console.error('Error capturing payment:', error);
                showError('حدث خطأ أثناء تأكيد الدفع. يرجى المحاولة مرة أخرى.');
            }
        },
        
        onError: function(err) {
            console.error('PayPal error:', err);
            showError('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
        }
    }).render(containerId);
}

// Show Error Message
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'toast error';
    errorToast.textContent = message;
    document.body.appendChild(errorToast);
    errorToast.classList.add('show');
    setTimeout(() => {
        errorToast.classList.remove('show');
        errorToast.remove();
    }, 5000);
}

// Show Success Message
function showSuccess(message) {
    const successToast = document.createElement('div');
    successToast.className = 'toast success';
    successToast.textContent = message;
    document.body.appendChild(successToast);
    successToast.classList.add('show');
    setTimeout(() => {
        successToast.classList.remove('show');
        successToast.remove();
    }, 5000);
} 