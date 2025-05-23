// ملف ربط مراجعة السيارات مع لوحة تحكم الأدمن
import { getCarListings, updateCarListing, deleteCarListing, getCarDetails } from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';
import { checkAdminAccess } from './admin-auth.js';

// تهيئة صفحة مراجعة السيارات
async function initCarReviewPage() {
    try {
        // التحقق من صلاحيات الأدمن
        const hasAccess = await checkAdminAccess();
        
        if (!hasAccess) {
            return;
        }
        
        // إظهار حالة التحميل
        showLoading('جاري تحميل السيارات المعلقة...');
        
        // الحصول على السيارات المعلقة
        const result = await getCarListings({ status: 'pending' }, 'createdAt', 'desc', 100);
        
        if (result.success) {
            // عرض السيارات المعلقة
            displayPendingCars(result.cars);
            
            // إضافة مستمعات الأحداث لأزرار القبول والرفض
            addReviewEventListeners();
        } else {
            showError('حدث خطأ أثناء تحميل السيارات المعلقة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('خطأ في تهيئة صفحة مراجعة السيارات:', error);
        showError('حدث خطأ أثناء تحميل صفحة المراجعة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } finally {
        // إخفاء حالة التحميل
        hideLoading();
    }
}

// عرض السيارات المعلقة
function displayPendingCars(cars) {
    const pendingCarsContainer = document.getElementById('pendingCarsContainer');
    
    if (!pendingCarsContainer) {
        console.error('لم يتم العثور على حاوية السيارات المعلقة!');
        return;
    }
    
    // تفريغ الحاوية
    pendingCarsContainer.innerHTML = '';
    
    // التحقق من وجود سيارات معلقة
    if (cars.length === 0) {
        pendingCarsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>لا توجد سيارات معلقة</h3>
                <p>جميع السيارات تمت مراجعتها.</p>
            </div>
        `;
        return;
    }
    
    // إنشاء بطاقات للسيارات المعلقة
    cars.forEach(car => {
        console.log('Pending car:', car); // Debug log
        // Skip cars with missing id or title
        if (!car.id || !car.title) return;
        const card = document.createElement('div');
        card.className = 'car-review-card';
        card.dataset.id = car.id;
        
        // تنسيق التاريخ
        const formattedDate = formatDate(car.createdAt);
        
        // تنسيق السعر
        const formattedPrice = formatCurrency(car.price);
        
        // الحصول على الصورة الرئيسية
        const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'images/car-placeholder.jpg';
        
        // إنشاء HTML البطاقة
        card.innerHTML = `
            <div class="car-review-image">
                <img src="${mainImage}" alt="${car.title}">
            </div>
            <div class="car-review-content">
                <h3 class="car-review-title">${car.title}</h3>
                <div class="car-review-details">
                    <div class="car-review-detail">
                        <i class="fas fa-car"></i>
                        <span>${getEnglishMake(car.make)} ${car.model}</span>
                    </div>
                    <div class="car-review-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${car.year}</span>
                    </div>
                    <div class="car-review-detail">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>${formattedPrice}</span>
                    </div>
                    <div class="car-review-detail">
                        <i class="fas fa-user"></i>
                        <span>${car.contactName}</span>
                    </div>
                    <div class="car-review-detail">
                        <i class="fas fa-phone"></i>
                        <span>${car.contactPhone}</span>
                    </div>
                    <div class="car-review-detail">
                        <i class="fas fa-clock"></i>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                <div class="car-review-description">
                    ${car.description}
                </div>
                <div class="car-review-actions">
                    <button class="btn btn-primary view-car-btn" data-id="${car.id}">
                        <i class="fas fa-eye"></i>
                        <span>عرض التفاصيل</span>
                    </button>
                    <button class="btn btn-success approve-car-btn" data-id="${car.id}">
                        <i class="fas fa-check"></i>
                        <span>قبول</span>
                    </button>
                    <button class="btn btn-danger reject-car-btn" data-id="${car.id}">
                        <i class="fas fa-times"></i>
                        <span>رفض</span>
                    </button>
                </div>
            </div>
        `;
        
        pendingCarsContainer.appendChild(card);
    });
}

// إضافة مستمعات الأحداث لأزرار المراجعة
function addReviewEventListeners() {
    // أزرار عرض التفاصيل
    const viewButtons = document.querySelectorAll('.view-car-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            console.log('Clicked View Details for carId:', carId); // Debug log
            window.location.href = `car-detail.html?id=${carId}`;
        });
    });
    
    // أزرار القبول
    const approveButtons = document.querySelectorAll('.approve-car-btn');
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            approveCar(carId);
        });
    });
    
    // أزرار الرفض
    const rejectButtons = document.querySelectorAll('.reject-car-btn');
    rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            rejectCar(carId);
        });
    });
}

// قبول السيارة
async function approveCar(carId) {
    try {
        // إظهار حالة التحميل
        showLoading('جاري قبول السيارة...');
        
        // تحديث حالة السيارة إلى نشطة
        const result = await updateCarListing(carId, { status: 'active' });
        
        if (result.success) {
            // إظهار رسالة نجاح
            showSuccess('تم قبول السيارة بنجاح!');
            
            // إزالة بطاقة السيارة من العرض
            const carCard = document.querySelector(`.car-review-card[data-id="${carId}"]`);
            if (carCard) {
                carCard.remove();
                
                // التحقق مما إذا كانت هناك سيارات معلقة متبقية
                const remainingCards = document.querySelectorAll('.car-review-card');
                if (remainingCards.length === 0) {
                    const pendingCarsContainer = document.getElementById('pendingCarsContainer');
                    if (pendingCarsContainer) {
                        pendingCarsContainer.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-check-circle"></i>
                                <h3>لا توجد سيارات معلقة</h3>
                                <p>جميع السيارات تمت مراجعتها.</p>
                            </div>
                        `;
                    }
                }
            }
            
            // تحديث إحصائيات لوحة المعلومات
            updateDashboardStats();
        } else {
            showError(result.error || 'حدث خطأ أثناء قبول السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('خطأ في قبول السيارة:', error);
        showError('حدث خطأ أثناء قبول السيارة. يرجى المحاولة مرة أخرى.');
    } finally {
        // إخفاء حالة التحميل
        hideLoading();
    }
}

// رفض السيارة
async function rejectCar(carId) {
    try {
        // عرض مربع حوار التأكيد
        if (!confirm('هل أنت متأكد من رفض هذه السيارة؟')) {
            return;
        }
        
        // إظهار حالة التحميل
        showLoading('جاري رفض السيارة...');
        
        // تحديث حالة السيارة إلى مرفوضة
        const result = await updateCarListing(carId, { status: 'rejected' });
        
        if (result.success) {
            // إظهار رسالة نجاح
            showSuccess('تم رفض السيارة بنجاح!');
            
            // إزالة بطاقة السيارة من العرض
            const carCard = document.querySelector(`.car-review-card[data-id="${carId}"]`);
            if (carCard) {
                carCard.remove();
                
                // التحقق مما إذا كانت هناك سيارات معلقة متبقية
                const remainingCards = document.querySelectorAll('.car-review-card');
                if (remainingCards.length === 0) {
                    const pendingCarsContainer = document.getElementById('pendingCarsContainer');
                    if (pendingCarsContainer) {
                        pendingCarsContainer.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-check-circle"></i>
                                <h3>لا توجد سيارات معلقة</h3>
                                <p>جميع السيارات تمت مراجعتها.</p>
                            </div>
                        `;
                    }
                }
            }
            
            // تحديث إحصائيات لوحة المعلومات
            updateDashboardStats();
        } else {
            showError(result.error || 'حدث خطأ أثناء رفض السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('خطأ في رفض السيارة:', error);
        showError('حدث خطأ أثناء رفض السيارة. يرجى المحاولة مرة أخرى.');
    } finally {
        // إخفاء حالة التحميل
        hideLoading();
    }
}

// تحديث إحصائيات لوحة المعلومات
async function updateDashboardStats() {
    try {
        // الحصول على جميع السيارات
        const result = await getCarListings({}, 'createdAt', 'desc', 100);
        
        if (result.success) {
            // تحديث إجمالي السيارات
            updateStatCard('totalCars', result.cars.length);
            
            // تحديث السيارات المعلقة
            const pendingCars = result.cars.filter(car => car.status === 'pending');
            updateStatCard('pendingCars', pendingCars.length);
            
            // تحديث السيارات النشطة
            const activeCars = result.cars.filter(car => car.status === 'active');
            updateStatCard('activeCars', activeCars.length);
        }
    } catch (error) {
        console.error('خطأ في تحديث إحصائيات لوحة المعلومات:', error);
    }
}

// تحديث بطاقة الإحصائيات
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
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
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span id="loadingMessage">${message}</span>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    } else {
        // تحديث رسالة التحميل
        const loadingMessage = document.getElementById('loadingMessage');
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

// إظهار رسالة نجاح
function showSuccess(message) {
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
    toast.className = 'toast toast-success';
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-check-circle"></i>
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

// Helper function to translate Arabic car makes to English (copy from search_final_fix.js)
const makeTranslations = {
  'تويوتا': 'Toyota',
  'هيونداي': 'Hyundai',
  'نيسان': 'Nissan',
  'كيا': 'Kia',
  'شيفروليه': 'Chevrolet',
  'مرسيدس': 'Mercedes',
  'بي إم دبليو': 'BMW',
  'فورد': 'Ford',
  'هوندا': 'Honda',
  'جيلي': 'Geely',
  'إم جي': 'MG',
  'رينو': 'Renault',
  'ميتسوبيشي': 'Mitsubishi',
  'جي إم سي': 'GMC',
  'لكزس': 'Lexus',
  'أودي': 'Audi',
  'فولكس فاجن': 'Volkswagen',
  'دودج': 'Dodge',
  'مازدا': 'Mazda',
  'سوزوكي': 'Suzuki',
  'سوبارو': 'Subaru',
  'بورش': 'Porsche',
  'تسلا': 'Tesla',
  'بيجو': 'Peugeot',
  'كرايسلر': 'Chrysler',
  'جيب': 'Jeep',
  'اوبل': 'Opel',
  'سكودا': 'Skoda',
  'سيات': 'Seat',
  'لاند روفر': 'Land Rover',
  'جاكوار': 'Jaguar',
  'إنفينيتي': 'Infiniti',
  'شيري': 'Chery',
  'شانجان': 'Changan',
  'هافال': 'Haval',
  'بيستون': 'Bestune',
  'سانج يونج': 'SsangYong',
  'فاو': 'FAW',
  'زوتي': 'Zotye',
  'بايك': 'BAIC',
  'سيتروين': 'Citroen',
  'بروتون': 'Proton',
  'داتسون': 'Datsun',
  'لادا': 'Lada',
  'سوبارو': 'Subaru',
  'سيتروين': 'Citroen',
  'بي واي دي': 'BYD',
  'جاك': 'JAC',
  'شانجان': 'Changan',
  'شيري': 'Chery',
  'هافال': 'Haval',
  'بيستون': 'Bestune',
  'سانج يونج': 'SsangYong',
  'فاو': 'FAW',
  'زوتي': 'Zotye',
  'بايك': 'BAIC',
  'بروتون': 'Proton',
  'داتسون': 'Datsun',
  'لادا': 'Lada',
  'BYD': 'BYD',
  'JAC': 'JAC',
  'Changan': 'Changan',
  'Chery': 'Chery',
  'Haval': 'Haval',
  'Bestune': 'Bestune',
  'SsangYong': 'SsangYong',
  'FAW': 'FAW',
  'Zotye': 'Zotye',
  'BAIC': 'BAIC',
  'Proton': 'Proton',
  'Datsun': 'Datsun',
  'Lada': 'Lada',
};
function getEnglishMake(make) {
  return makeTranslations[make] || make;
}

// تصدير الدوال
export {
    initCarReviewPage,
    approveCar,
    rejectCar,
    updateDashboardStats
};
