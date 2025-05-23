// Subscription and PayPal integration JavaScript file
import { getCurrentUser, getUserData, createSubscription, getUserSubscription } from './firebase-api.js';
import { formatDate, formatCurrency } from './main.js';
import { initPayPalButtons } from './paypal-config.js';

// Update header UI based on authentication state
export async function updateHeaderAuthUI() {
    const user = await getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const sellCarNavBtn = document.getElementById('sellCarNavBtn');
    const sellCarCtaBtn = document.getElementById('sellCarCtaBtn');

    if (user) {
        if (sellCarNavBtn) sellCarNavBtn.style.display = 'inline-block';
        if (sellCarCtaBtn) sellCarCtaBtn.style.display = 'inline-block';
    } else {
        if (sellCarNavBtn) sellCarNavBtn.style.display = 'none';
        if (sellCarCtaBtn) sellCarCtaBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await updateHeaderAuthUI();
    try {
        // Check if user is logged in
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html?redirect=subscription';
            return;
        }

        // Load current subscription status
        await loadCurrentSubscription(user.uid);

        // Initialize payment method selection
        initPaymentMethods();

        // Initialize subscribe button
        initSubscribeButton();
    } catch (error) {
        console.error('Error initializing subscription page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
});

// Load Current Subscription
async function loadCurrentSubscription(userId) {
    try {
        const subscription = await getUserSubscription(userId);
        const subscriptionStatus = document.getElementById('currentSubscriptionStatus');
        
        if (subscription && subscription.active) {
            subscriptionStatus.innerHTML = `
                <div class="subscription-active">
                    <i class="fas fa-check-circle"></i>
                    <h3>اشتراكك نشط</h3>
                    <p>ينتهي في: ${formatDate(subscription.endDate)}</p>
                </div>
            `;
        } else {
            subscriptionStatus.innerHTML = `
                <div class="subscription-inactive">
                    <i class="fas fa-info-circle"></i>
                    <h3>لا يوجد اشتراك نشط</h3>
                    <p>اشترك الآن للتمتع بجميع المميزات</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading subscription:', error);
        showError('حدث خطأ أثناء تحميل حالة الاشتراك');
    }
}

// Initialize Payment Methods
function initPaymentMethods() {
    const paypalMethod = document.getElementById('paypalMethod');
    const creditCardMethod = document.getElementById('creditCardMethod');
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    const subscribeBtn = document.getElementById('subscribeBtn');

    paypalMethod.addEventListener('click', function() {
        paypalMethod.classList.add('active');
        creditCardMethod.classList.remove('active');
        paypalButtonContainer.style.display = 'block';
        subscribeBtn.style.display = 'none';
        // Clear previous PayPal buttons before rendering a new one
        paypalButtonContainer.innerHTML = '';
        initPayPalButtons('#paypal-button-container', 20, function(result) {
            window.location.href = 'profile.html?subscription=success';
        });
    });

    creditCardMethod.addEventListener('click', function() {
        creditCardMethod.classList.add('active');
        paypalMethod.classList.remove('active');
        paypalButtonContainer.style.display = 'none';
        subscribeBtn.style.display = 'block';
    });
}

// Initialize PayPal Button
function initPayPalButton() {
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    
    if (!paypalButtonContainer) return;
    
    // Clear existing buttons
    paypalButtonContainer.innerHTML = '';
    
    // Get redirect URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect') || 'profile.html';
    
    // Initialize PayPal button
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
                        value: '20.00'
                    },
                    description: 'اشتراك في موقع بيع وشراء السيارات لمدة 3 أشهر'
                }]
            });
        },
        onApprove: async function(data, actions) {
            try {
                // Show loading state
                showLoading();
                
                // Capture the order
                const details = await actions.order.capture();
                
                // Get current user
                const user = await getCurrentUser();
                
                if (!user) {
                    showError('حدث خطأ أثناء تحديث بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
                    return;
                }
                
                // Calculate subscription end date (3 months from now)
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
                
                // Create subscription data
                const subscriptionData = {
                    planId: 'car_selling_plan',
                    planName: 'باقة بيع السيارات',
                    amount: 20,
                    currency: 'USD',
                    startDate,
                    endDate,
                    paymentMethod: 'PayPal',
                    paymentId: details.id,
                    autoRenew: true
                };
                
                // Create subscription in Firebase
                const result = await createSubscription(user.uid, subscriptionData);
                
                if (result.success) {
                    // Show success message
                    showSuccess('تم الاشتراك بنجاح! جاري تحويلك...');
                    
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        if (redirectUrl === 'sell') {
                            window.location.href = 'sell.html';
                        } else {
                            window.location.href = 'profile.html?tab=subscription';
                        }
                    }, 2000);
                } else {
                    showError(result.error || 'حدث خطأ أثناء إنشاء الاشتراك. يرجى المحاولة مرة أخرى.');
                }
            } catch (error) {
                console.error('Error processing payment:', error);
                showError('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
            } finally {
                // Hide loading state
                hideLoading();
            }
        },
        onError: function(err) {
            console.error('PayPal Error:', err);
            showError('حدث خطأ أثناء عملية الدفع. يرجى المحاولة مرة أخرى.');
        }
    }).render('#paypal-button-container');
}

// Initialize Subscribe Button
function initSubscribeButton() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            const selectedMethod = document.querySelector('.payment-method.active').dataset.method;
            if (selectedMethod === 'credit-card') {
                showError('سيتم تفعيل الدفع ببطاقة الائتمان قريباً');
            }
        });
    }
}

// Handle Subscription
async function handleSubscription(paymentMethod) {
    showError('الدفع ببطاقة الائتمان غير متاح حالياً. استخدم PayPal.');
}

// Toggle Auto Renew
async function toggleAutoRenew(subscriptionId, enable) {
    try {
        // Here you would typically call your backend API to toggle auto-renew
        // For now, we'll just show a success message
        showSuccess(`تم ${enable ? 'تفعيل' : 'إلغاء'} التجديد التلقائي بنجاح`);
        // Reload the page to show updated subscription status
        window.location.reload();
    } catch (error) {
        console.error('Error toggling auto-renew:', error);
        showError('حدث خطأ أثناء تحديث إعدادات التجديد التلقائي');
    }
}

// Confirm Cancel Subscription
function confirmCancelSubscription(subscriptionId) {
    if (confirm('هل أنت متأكد من إلغاء اشتراكك؟ لن تتمكن من بيع سياراتك بعد إلغاء الاشتراك.')) {
        cancelSubscription(subscriptionId);
    }
}

// Cancel Subscription
async function cancelSubscription(subscriptionId) {
    try {
        // Here you would typically call your backend API to cancel the subscription
        // For now, we'll just show a success message
        showSuccess('تم إلغاء الاشتراك بنجاح');
        // Reload the page to show updated subscription status
        window.location.reload();
    } catch (error) {
        console.error('Error canceling subscription:', error);
        showError('حدث خطأ أثناء إلغاء الاشتراك');
    }
}

// Show Loading State
function showLoading() {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>جاري معالجة الدفع...</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
}

// Hide Loading State
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
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

document.addEventListener('DOMContentLoaded', function() {
    // Initialize PayPal buttons for each plan
    const plans = document.querySelectorAll('.plan-card');
    plans.forEach(plan => {
        const price = plan.querySelector('.plan-price').textContent;
        const amount = parseFloat(price.replace(/[^0-9.]/g, ''));
        const containerId = `paypal-button-container-${plan.dataset.planId}`;
        
        // Create container for PayPal button
        const buttonContainer = document.createElement('div');
        buttonContainer.id = containerId;
        plan.querySelector('.plan-actions').appendChild(buttonContainer);
        
        // Initialize PayPal button
        initPayPalButtons(containerId, amount, function(result) {
            // Handle successful payment
            console.log('Payment successful:', result);
            // Update UI to show subscription is active
            plan.classList.add('active');
            // Update subscription status
            updateSubscriptionStatus(plan.dataset.planId);
        });
    });
});

// Update subscription status
function updateSubscriptionStatus(planId) {
    const subscriptionDetails = document.getElementById('subscriptionDetails');
    if (subscriptionDetails) {
        const plan = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
        const planName = plan.querySelector('.plan-name').textContent;
        const planPrice = plan.querySelector('.plan-price').textContent;
        
        subscriptionDetails.innerHTML = `
            <div class="subscription-status">
                <div class="subscription-header">
                    <h3 class="subscription-title">${planName}</h3>
                    <span class="subscription-badge active">نشط</span>
                </div>
                <div class="subscription-details">
                    <div class="subscription-detail">
                        <span class="subscription-detail-label">المبلغ:</span>
                        <span class="subscription-detail-value">${planPrice}</span>
                    </div>
                    <div class="subscription-detail">
                        <span class="subscription-detail-label">تاريخ البدء:</span>
                        <span class="subscription-detail-value">${new Date().toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div class="subscription-detail">
                        <span class="subscription-detail-label">تاريخ الانتهاء:</span>
                        <span class="subscription-detail-value">${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA')}</span>
                    </div>
                </div>
            </div>
        `;
    }
}
