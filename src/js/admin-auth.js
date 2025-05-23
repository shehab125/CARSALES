// ملف ربط المصادقة مع لوحة تحكم الأدمن
import { getCurrentUser, getUserData, updateUserProfile } from './firebase-api.js';

// معلومات الأدمن - يجب تغييرها للإنتاج
const ADMIN_EMAIL = "admin@carsales.com";
const ADMIN_PASSWORD = "admin123456";

// دالة التحقق من صلاحيات الأدمن
async function checkAdminAccess() {
    try {
        // التحقق من تسجيل الدخول
        const user = await getCurrentUser();
        
        if (!user) {
            console.log('المستخدم غير مسجل الدخول، جاري التحويل إلى صفحة تسجيل الدخول...');
            // التحويل إلى صفحة تسجيل الدخول مع إضافة معلمة إعادة التوجيه
            window.location.href = 'auth.html?redirect=admin';
            return false;
        }
        
        // الحصول على بيانات المستخدم
        const userData = await getUserData(user.uid);
        
        if (!userData.success) {
            console.error('فشل في الحصول على بيانات المستخدم:', userData.error);
            showError('حدث خطأ أثناء التحقق من الصلاحيات. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
            return false;
        }
        
        // التحقق من صلاحيات الأدمن
        if (!userData.userData.isAdmin && user.email !== ADMIN_EMAIL) {
            console.log('المستخدم ليس لديه صلاحيات الأدمن، جاري التحويل إلى الصفحة الرئيسية...');
            showError('ليس لديك صلاحية الوصول إلى لوحة التحكم.');
            
            // إذا كان البريد الإلكتروني هو بريد الأدمن ولكن علامة isAdmin غير مضبوطة، قم بتحديثها
            if (user.email === ADMIN_EMAIL) {
                console.log('تم اكتشاف بريد الأدمن، جاري تحديث الصلاحيات...');
                await updateUserProfile(user.uid, { isAdmin: true });
                // إعادة تحميل الصفحة بعد تحديث حالة الأدمن
                window.location.reload();
                return true;
            }
            
            // التحويل إلى الصفحة الرئيسية بعد 3 ثوانٍ
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            
            return false;
        }
        
        console.log('تم التحقق من صلاحيات الأدمن بنجاح!');
        return true;
    } catch (error) {
        console.error('خطأ في التحقق من صلاحيات الأدمن:', error);
        showError('حدث خطأ أثناء التحقق من الصلاحيات. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        return false;
    }
}

// دالة إظهار رسالة خطأ
function showError(message) {
    // إنشاء حاوية الإشعارات إذا لم تكن موجودة
    let toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        
        document.body.appendChild(toastContainer);
    }
    
    // إنشاء الإشعار
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // إضافة مستمع حدث لزر الإغلاق
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toast.remove();
        });
    }
    
    // إضافة الإشعار إلى الحاوية
    toastContainer.appendChild(toast);
    
    // إزالة الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// تصدير الدوال
export {
    checkAdminAccess,
    ADMIN_EMAIL,
    ADMIN_PASSWORD
};
