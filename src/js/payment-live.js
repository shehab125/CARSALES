// ملف تكامل الدفع الحقيقي عبر PayPal
import { paypalConfig } from './paypal-config.js';
import { getCurrentUser, getUserData, updateUserProfile } from './firebase-api.js';

// تهيئة نظام الدفع
export async function initPaymentSystem() {
    try {
        // التحقق من تحميل SDK الخاص بـ PayPal
        if (!window.paypal) {
            console.error('لم يتم تحميل PayPal SDK');
            loadPayPalScript();
            return;
        }
        
        // تهيئة حاوية أزرار PayPal
        const paypalButtonContainer = document.getElementById('paypal-button-container');
        if (!paypalButtonContainer) {
            console.error('لم يتم العثور على حاوية أزرار PayPal');
            return;
        }
        
        // الحصول على معلومات المستخدم الحالي
        const user = await getCurrentUser();
        if (!user) {
            console.log('المستخدم غير مسجل الدخول، جاري التحويل إلى صفحة تسجيل الدخول...');
            window.location.href = 'auth.html?redirect=subscription';
            return;
        }
        
        // الحصول على بيانات المستخدم
        const userData = await getUserData(user.uid);
        if (!userData.success) {
            console.error('فشل في الحصول على بيانات المستخدم:', userData.error);
            showError('حدث خطأ أثناء تحميل بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
            return;
        }
        
        // عرض حالة الاشتراك الحالية
        displayCurrentSubscription(userData.userData);
        
        // تهيئة أزرار PayPal
        const subscriptionAmount = 20; // قيمة الاشتراك بالدولار
        
        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'pay'
            },
            
            // إنشاء طلب الدفع
            createOrder: async function() {
                try {
                    // تعديل: استخدام وضع الإنتاج بدلاً من Sandbox
                    const response = await fetch('/api/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            amount: subscriptionAmount,
                            currency: paypalConfig.currency,
                            mode: 'LIVE' // تحديد وضع الإنتاج
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('فشل في إنشاء طلب الدفع');
                    }
                    
                    const order = await response.json();
                    return order.id;
                } catch (error) {
                    console.error('خطأ في إنشاء طلب الدفع:', error);
                    showError('حدث خطأ أثناء إنشاء طلب الدفع. يرجى المحاولة مرة أخرى.');
                    throw error;
                }
            },
            
            // عند الموافقة على الدفع
            onApprove: async function(data, actions) {
                try {
                    // إظهار حالة التحميل
                    showLoading('جاري تأكيد الدفع...');
                    
                    // تعديل: استخدام وضع الإنتاج بدلاً من Sandbox
                    const response = await fetch('/api/capture-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: data.orderID,
                            mode: 'LIVE' // تحديد وضع الإنتاج
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('فشل في تأكيد الدفع');
                    }
                    
                    const result = await response.json();
                    
                    // تحديث حالة اشتراك المستخدم
                    const subscriptionEndDate = new Date();
                    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3); // اشتراك لمدة 3 أشهر
                    
                    const subscriptionData = {
                        isSubscribed: true,
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: subscriptionEndDate,
                        subscriptionType: 'car_seller',
                        paymentId: result.id,
                        paymentAmount: subscriptionAmount,
                        paymentCurrency: paypalConfig.currency,
                        paymentMethod: 'paypal'
                    };
                    
                    await updateUserProfile(user.uid, subscriptionData);
                    
                    // إخفاء حالة التحميل
                    hideLoading();
                    
                    // إظهار رسالة النجاح
                    showSuccessMessage('تم الاشتراك بنجاح!', 'يمكنك الآن بدء بيع سياراتك على Syautobazar.');
                    
                    // إعادة تحميل الصفحة بعد 3 ثوانٍ
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } catch (error) {
                    console.error('خطأ في تأكيد الدفع:', error);
                    hideLoading();
                    showError('حدث خطأ أثناء تأكيد الدفع. يرجى المحاولة مرة أخرى.');
                }
            },
            
            // عند حدوث خطأ
            onError: function(err) {
                console.error('خطأ في PayPal:', err);
                hideLoading();
                showError('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
            }
        }).render('#paypal-button-container');
        
        // إضافة مستمعات الأحداث لطرق الدفع
        const paymentMethods = document.querySelectorAll('.payment-method');
        const subscribeBtn = document.getElementById('subscribeBtn');
        
        paymentMethods.forEach(method => {
            method.addEventListener('click', function() {
                // إزالة الفئة النشطة من جميع الطرق
                paymentMethods.forEach(m => m.classList.remove('active'));
                
                // إضافة الفئة النشطة للطريقة المحددة
                this.classList.add('active');
                
                // إظهار/إخفاء أزرار الدفع المناسبة
                const paymentMethod = this.getAttribute('data-method');
                
                if (paymentMethod === 'paypal') {
                    paypalButtonContainer.style.display = 'block';
                    subscribeBtn.style.display = 'none';
                } else {
                    paypalButtonContainer.style.display = 'none';
                    subscribeBtn.style.display = 'block';
                }
            });
        });
        
        // إضافة مستمع حدث لزر الاشتراك
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', function() {
                showError('طريقة الدفع هذه غير متاحة حالياً. يرجى استخدام PayPal.');
            });
        }
    } catch (error) {
        console.error('خطأ في تهيئة نظام الدفع:', error);
        showError('حدث خطأ أثناء تهيئة نظام الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
}

// عرض حالة الاشتراك الحالية
function displayCurrentSubscription(userData) {
    const currentSubscriptionStatus = document.getElementById('currentSubscriptionStatus');
    
    if (!currentSubscriptionStatus) {
        console.error('لم يتم العثور على حاوية حالة الاشتراك الحالية');
        return;
    }
    
    if (userData.isSubscribed) {
        // المستخدم مشترك
        const subscriptionEndDate = new Date(userData.subscriptionEndDate);
        const formattedEndDate = subscriptionEndDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        currentSubscriptionStatus.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <div class="alert-content">
                    <h3>أنت مشترك حالياً</h3>
                    <p>اشتراكك ساري حتى ${formattedEndDate}</p>
                    <a href="sell.html" class="btn btn-primary mt-3">أضف سيارة للبيع</a>
                </div>
            </div>
        `;
    } else {
        // المستخدم غير مشترك
        currentSubscriptionStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <div class="alert-content">
                    <h3>أنت غير مشترك حالياً</h3>
                    <p>اشترك الآن للتمكن من بيع سياراتك على Syautobazar</p>
                </div>
            </div>
        `;
    }
}

// تحميل سكريبت PayPal
function loadPayPalScript() {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=${paypalConfig.currency}`;
    script.async = true;
    
    script.onload = function() {
        console.log('تم تحميل PayPal SDK بنجاح');
        initPaymentSystem();
    };
    
    script.onerror = function() {
        console.error('فشل في تحميل PayPal SDK');
        showError('فشل في تحميل نظام الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    };
    
    document.body.appendChild(script);
}

// إظهار حالة التحميل
function showLoading(message = 'جاري التحميل...') {
    // إنشاء طبقة التحميل إذا لم تكن موجودة
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="spinner"></div>
            <p>${message}</p>
        `;
        
        document.body.appendChild(loadingOverlay);
    } else {
        // تحديث رسالة التحميل
        const loadingMessage = loadingOverlay.querySelector('p');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        
        // إظهار طبقة التحميل
        loadingOverlay.style.display = 'flex';
    }
}

// إخفاء حالة التحميل
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// إظهار رسالة خطأ
function showError(message) {
    // إنشاء طبقة الخطأ إذا لم تكن موجودة
    let errorMessage = document.getElementById('errorMessage');
    
    if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.id = 'errorMessage';
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <h3>حدث خطأ</h3>
            <p>${message}</p>
            <button class="btn btn-primary mt-3" onclick="this.parentNode.style.display='none'">إغلاق</button>
        `;
        
        document.body.appendChild(errorMessage);
    } else {
        // تحديث رسالة الخطأ
        const errorText = errorMessage.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
        
        // إظهار طبقة الخطأ
        errorMessage.style.display = 'block';
    }
}

// إظهار رسالة نجاح
function showSuccessMessage(title, message) {
    // إنشاء طبقة النجاح إذا لم تكن موجودة
    let successMessage = document.getElementById('successMessage');
    
    if (!successMessage) {
        successMessage = document.createElement('div');
        successMessage.id = 'successMessage';
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        `;
        
        document.body.appendChild(successMessage);
    } else {
        // تحديث رسالة النجاح
        const successTitle = successMessage.querySelector('h3');
        const successText = successMessage.querySelector('p');
        
        if (successTitle) {
            successTitle.textContent = title;
        }
        
        if (successText) {
            successText.textContent = message;
        }
        
        // إظهار طبقة النجاح
        successMessage.style.display = 'block';
    }
}

// تصدير الدوال
export {
    initPaymentSystem,
    loadPayPalScript
};
