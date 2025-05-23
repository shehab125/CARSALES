/**
 * ملف تكامل التحسينات مع لوحة التحكم الإدارية
 */

import { initEnhancements, dataCache, enhanceRealTimeSearch, implementLazyLoading } from './enhanced-functions.js';

document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود لوحة التحكم الإدارية
    const isAdminPage = window.location.pathname.includes('admin_enhanced_updated.html');
    
    if (isAdminPage) {
        // إضافة ملف الأنماط المحسنة
        addEnhancedStyles();
        
        // تهيئة التحسينات بعد تهيئة الصفحة الأصلية
        const originalInitAdminPage = window.initAdminPage;
        
        if (typeof originalInitAdminPage === 'function') {
            window.initAdminPage = async function() {
                try {
                    // تنفيذ التهيئة الأصلية أولاً
                    await originalInitAdminPage();
                    
                    // ثم تهيئة التحسينات
                    initEnhancements();
                    
                    // تحسين وظائف البحث
                    enhanceSearchFunctions();
                    
                    // تنفيذ التحميل الكسول للجداول
                    implementLazyLoadingForTables();
                    
                    console.log('تم تهيئة لوحة التحكم المحسنة بنجاح');
                } catch (error) {
                    console.error('خطأ في تهيئة لوحة التحكم المحسنة:', error);
                }
            };
        } else {
            console.error('لم يتم العثور على دالة تهيئة لوحة التحكم الأصلية');
        }
    }
});

// إضافة ملف الأنماط المحسنة
function addEnhancedStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'enhanced-styles.css';
    document.head.appendChild(link);
}

// تحسين وظائف البحث
function enhanceSearchFunctions() {
    // تحسين البحث في جدول السيارات
    enhanceRealTimeSearch('carsSearchInput', 'carsTableContainer', async (searchTerm) => {
        try {
            // محاولة استرداد البيانات من التخزين المؤقت أولاً
            const cacheKey = `cars_search_${searchTerm}`;
            const cachedData = dataCache.get(cacheKey);
            
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData,
                    displayFunction: updateCarsTable
                };
            }
            
            // إذا لم تكن البيانات في التخزين المؤقت، قم بجلبها من Firebase
            const result = await getCarListings({ searchTerm }, 'createdAt', 'desc', 100);
            
            if (result.success) {
                // تخزين البيانات في التخزين المؤقت
                dataCache.set(cacheKey, result.cars, 60000); // صالحة لمدة دقيقة واحدة
                
                return {
                    success: true,
                    data: result.cars,
                    displayFunction: updateCarsTable
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('خطأ في البحث عن السيارات:', error);
            return { success: false, error: error.message };
        }
    });
    
    // تحسين البحث في جدول المستخدمين
    enhanceRealTimeSearch('usersSearchInput', 'usersTableContainer', async (searchTerm) => {
        try {
            // محاولة استرداد البيانات من التخزين المؤقت أولاً
            const cacheKey = `users_search_${searchTerm}`;
            const cachedData = dataCache.get(cacheKey);
            
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData,
                    displayFunction: updateUsersTable
                };
            }
            
            // إذا لم تكن البيانات في التخزين المؤقت، قم بجلبها من Firebase
            const result = await getAllUsers({ searchTerm });
            
            if (result.success) {
                // تخزين البيانات في التخزين المؤقت
                dataCache.set(cacheKey, result.users, 60000); // صالحة لمدة دقيقة واحدة
                
                return {
                    success: true,
                    data: result.users,
                    displayFunction: updateUsersTable
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('خطأ في البحث عن المستخدمين:', error);
            return { success: false, error: error.message };
        }
    });
}

// تنفيذ التحميل الكسول للجداول
function implementLazyLoadingForTables() {
    // تنفيذ التحميل الكسول لجدول السيارات
    const carsLazyLoader = implementLazyLoading('carsTable', async (page, pageSize) => {
        try {
            // محاولة استرداد البيانات من التخزين المؤقت أولاً
            const cacheKey = `cars_page_${page}_${pageSize}`;
            const cachedData = dataCache.get(cacheKey);
            
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData
                };
            }
            
            // إذا لم تكن البيانات في التخزين المؤقت، قم بجلبها من Firebase
            const result = await getCarListings({}, 'createdAt', 'desc', pageSize, (page - 1) * pageSize);
            
            if (result.success) {
                // تخزين البيانات في التخزين المؤقت
                dataCache.set(cacheKey, result.cars, 60000); // صالحة لمدة دقيقة واحدة
                
                return {
                    success: true,
                    data: result.cars
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات السيارات:', error);
            return { success: false, error: error.message };
        }
    });
    
    // تنفيذ التحميل الكسول لجدول المستخدمين
    const usersLazyLoader = implementLazyLoading('usersTable', async (page, pageSize) => {
        try {
            // محاولة استرداد البيانات من التخزين المؤقت أولاً
            const cacheKey = `users_page_${page}_${pageSize}`;
            const cachedData = dataCache.get(cacheKey);
            
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData
                };
            }
            
            // إذا لم تكن البيانات في التخزين المؤقت، قم بجلبها من Firebase
            const result = await getAllUsers({ page, pageSize });
            
            if (result.success) {
                // تخزين البيانات في التخزين المؤقت
                dataCache.set(cacheKey, result.users, 60000); // صالحة لمدة دقيقة واحدة
                
                return {
                    success: true,
                    data: result.users
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدمين:', error);
            return { success: false, error: error.message };
        }
    });
    
    // إضافة دوال التحديث إلى النافذة للاستخدام الخارجي
    window.refreshCarsTable = function() {
        if (carsLazyLoader && typeof carsLazyLoader.refresh === 'function') {
            // مسح التخزين المؤقت المتعلق بالسيارات
            Object.keys(dataCache.data).forEach(key => {
                if (key.startsWith('cars_')) {
                    dataCache.remove(key);
                }
            });
            
            // تحديث الجدول
            carsLazyLoader.refresh();
        }
    };
    
    window.refreshUsersTable = function() {
        if (usersLazyLoader && typeof usersLazyLoader.refresh === 'function') {
            // مسح التخزين المؤقت المتعلق بالمستخدمين
            Object.keys(dataCache.data).forEach(key => {
                if (key.startsWith('users_')) {
                    dataCache.remove(key);
                }
            });
            
            // تحديث الجدول
            usersLazyLoader.refresh();
        }
    };
}

// تحديث جدول السيارات
function updateCarsTable(cars) {
    const tableBody = document.querySelector('#carsTable tbody');
    if (!tableBody) return;
    
    // تحديث الجدول
    tableBody.innerHTML = '';
    
    if (cars.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">لا توجد سيارات مطابقة لبحثك</td>
            </tr>
        `;
        return;
    }
    
    cars.forEach(car => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ والسعر
        const formattedDate = formatDate(car.createdAt);
        const formattedPrice = formatCurrency(car.price);
        
        // تحديد لون الحالة
        let statusClass = '';
        let statusText = '';
        
        switch (car.status) {
            case 'active':
                statusClass = 'active';
                statusText = 'نشط';
                break;
            case 'pending':
                statusClass = 'pending';
                statusText = 'معلق';
                break;
            case 'rejected':
                statusClass = 'inactive';
                statusText = 'مرفوض';
                break;
            default:
                statusClass = '';
                statusText = car.status || 'غير معروف';
        }
        
        row.innerHTML = `
            <td data-label="العنوان">${car.title || 'غير متوفر'}</td>
            <td data-label="الماركة/الموديل">${car.make || 'غير متوفر'} ${car.model || ''}</td>
            <td data-label="السنة">${car.year || 'غير متوفر'}</td>
            <td data-label="السعر">${formattedPrice}</td>
            <td data-label="المالك">${car.contactName || 'غير متوفر'}</td>
            <td data-label="التاريخ">${formattedDate}</td>
            <td data-label="الحالة"><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td data-label="الإجراءات">
                <div class="table-actions">
                    <a href="car-detail.html?id=${car.id}" class="table-action view" title="عرض">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="#" class="table-action edit" title="تعديل" data-id="${car.id}">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="#" class="table-action delete" title="حذف" data-id="${car.id}">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعات الأحداث للأزرار
    addTableActionListeners();
}

// تحديث جدول المستخدمين
function updateUsersTable(users) {
    const tableBody = document.querySelector('#usersTable tbody');
    if (!tableBody) return;
    
    // تحديث الجدول
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">لا يوجد مستخدمين مطابقين لبحثك</td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ
        const formattedDate = formatDate(user.createdAt);
        
        // تحديد حالة الاشتراك
        const subscriptionStatus = user.isSubscribed ? 
            '<span class="status-badge active">نشط</span>' : 
            '<span class="status-badge inactive">غير مشترك</span>';
        
        // تحديد الصلاحية
        const roleStatus = user.isAdmin ? 
            '<span class="status-badge active">مشرف</span>' : 
            '<span class="status-badge">مستخدم</span>';
        
        row.innerHTML = `
            <td data-label="الاسم">${user.name || 'غير متوفر'}</td>
            <td data-label="البريد الإلكتروني">${user.email || 'غير متوفر'}</td>
            <td data-label="الهاتف">${user.phone || 'غير متوفر'}</td>
            <td data-label="الموقع">${user.location || 'غير متوفر'}</td>
            <td data-label="تاريخ التسجيل">${formattedDate}</td>
            <td data-label="الاشتراك">${subscriptionStatus}</td>
            <td data-label="الصلاحية">${roleStatus}</td>
            <td data-label="الإجراءات">
                <div class="table-actions">
                    <a href="#" class="table-action view" title="عرض" data-id="${user.id}">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="#" class="table-action edit" title="تعديل" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="#" class="table-action delete" title="حذف" data-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعات الأحداث للأزرار
    addTableActionListeners();
}

// إضافة مستمعات الأحداث لأزرار الجدول
function addTableActionListeners() {
    // أزرار التعديل
    const editButtons = document.querySelectorAll('.table-action.edit');
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            // تنفيذ إجراء التعديل
            console.log('تعديل العنصر:', id);
            // يمكن إضافة كود لفتح نافذة التعديل هنا
        });
    });
    
    // أزرار الحذف
    const deleteButtons = document.querySelectorAll('.table-action.delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            // تنفيذ إجراء الحذف بعد التأكيد
            if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
                console.log('حذف العنصر:', id);
                // يمكن إضافة كود للحذف هنا
            }
        });
    });
}
