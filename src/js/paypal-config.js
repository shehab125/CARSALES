// PayPal Configuration
export const paypalConfig = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture'
};

// Initialize PayPal Buttons
export function initPayPalButtons(containerId, amount, onSuccess) {
    if (!window.paypal) {
        console.error('PayPal SDK not loaded');
        return;
    }

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
        },
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: amount.toString()
                    },
                    description: 'اشتراك في موقع بيع وشراء السيارات'
                }]
            });
        },
        onApprove: async function(data, actions) {
            try {
                const details = await actions.order.capture();
                if (onSuccess) {
                    onSuccess(details);
                }
            } catch (error) {
                console.error('Error capturing order:', error);
                showError('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
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