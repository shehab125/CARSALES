/**
 * تحسينات الوظائف الديناميكية للوحة التحكم الإدارية
 */

// تهيئة القائمة الجانبية القابلة للطي
function initCollapsibleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (!sidebar) return;
    
    // إضافة زر التبديل للقائمة الجانبية
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    sidebar.appendChild(toggleButton);
    
    // التحقق من حالة القائمة المحفوظة
    const sidebarState = localStorage.getItem('adminSidebarState');
    
    if (sidebarState === 'collapsed') {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('expanded');
        toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    } else {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
    
    // إضافة مستمع حدث لزر التبديل
    toggleButton.addEventListener('click', function() {
        if (sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            localStorage.setItem('adminSidebarState', 'collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
            toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            localStorage.setItem('adminSidebarState', 'expanded');
        }
    });
    
    // تكييف القائمة الجانبية تلقائيًا مع حجم الشاشة
    function adjustSidebar() {
        if (window.innerWidth <= 992 && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            sidebar.classList.remove('expanded');
            toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        } else if (window.innerWidth > 992 && sidebarState !== 'collapsed' && !sidebar.classList.contains('expanded')) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
            toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        }
    }
    
    // تنفيذ التكييف عند تحميل الصفحة وتغيير حجم النافذة
    adjustSidebar();
    window.addEventListener('resize', adjustSidebar);
}

// تحسين الجداول المتجاوبة
function enhanceResponsiveTables() {
    const tables = document.querySelectorAll('.admin-table');
    
    tables.forEach(table => {
        table.classList.add('responsive-table');
        
        // إضافة سمات البيانات للخلايا
        const headerCells = table.querySelectorAll('thead th');
        const headerTexts = Array.from(headerCells).map(cell => cell.textContent.trim());
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (index < headerTexts.length) {
                    cell.setAttribute('data-label', headerTexts[index]);
                }
            });
        });
    });
}

// تنفيذ التحميل الكسول للجداول
function implementLazyLoading(tableId, fetchFunction, pageSize = 10) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tableBody = table.querySelector('tbody');
    if (!tableBody) return;
    
    let currentPage = 1;
    let isLoading = false;
    let hasMoreData = true;
    
    // إضافة صف التحميل
    function addLoadingRow() {
        const loadingRow = document.createElement('tr');
        loadingRow.id = `${tableId}-loading-row`;
        loadingRow.innerHTML = `
            <td colspan="${table.querySelectorAll('thead th').length}" style="text-align: center; padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i> جاري تحميل المزيد...
            </td>
        `;
        tableBody.appendChild(loadingRow);
    }
    
    // إزالة صف التحميل
    function removeLoadingRow() {
        const loadingRow = document.getElementById(`${tableId}-loading-row`);
        if (loadingRow) {
            loadingRow.remove();
        }
    }
    
    // تحميل المزيد من البيانات
    async function loadMoreData() {
        if (isLoading || !hasMoreData) return;
        
        isLoading = true;
        addLoadingRow();
        
        try {
            const result = await fetchFunction(currentPage, pageSize);
            
            removeLoadingRow();
            
            if (result.success) {
                if (result.data.length === 0) {
                    hasMoreData = false;
                    return;
                }
                
                // إضافة الصفوف الجديدة
                result.data.forEach(item => {
                    const row = createTableRow(item);
                    tableBody.appendChild(row);
                });
                
                currentPage++;
            } else {
                console.error('خطأ في تحميل البيانات:', result.error);
                showError('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
                hasMoreData = false;
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            showError('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
            hasMoreData = false;
        } finally {
            isLoading = false;
            removeLoadingRow();
        }
    }
    
    // مراقبة التمرير للتحميل التلقائي
    function handleScroll() {
        const tableContainer = table.closest('.admin-table-container');
        if (!tableContainer) return;
        
        const rect = tableContainer.getBoundingClientRect();
        const isVisible = rect.bottom <= window.innerHeight + 200;
        
        if (isVisible && !isLoading && hasMoreData) {
            loadMoreData();
        }
    }
    
    // إضافة مستمع حدث التمرير
    window.addEventListener('scroll', handleScroll);
    
    // تحميل البيانات الأولية
    loadMoreData();
    
    // إعادة الدالة للاستخدام الخارجي
    return {
        refresh: async function() {
            currentPage = 1;
            hasMoreData = true;
            tableBody.innerHTML = '';
            await loadMoreData();
        }
    };
}

// تحسين وظيفة البحث في الوقت الفعلي
function enhanceRealTimeSearch(searchInputId, targetElementId, searchFunction) {
    const searchInput = document.getElementById(searchInputId);
    const targetElement = document.getElementById(targetElementId);
    
    if (!searchInput || !targetElement) return;
    
    let debounceTimer;
    let lastSearchTerm = '';
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        
        // تجاهل البحث إذا كان المصطلح هو نفسه
        if (searchTerm === lastSearchTerm) return;
        
        lastSearchTerm = searchTerm;
        
        // إلغاء المؤقت السابق
        clearTimeout(debounceTimer);
        
        // إظهار مؤشر التحميل
        searchInput.classList.add('searching');
        
        // تأخير البحث لتجنب الطلبات المتكررة
        debounceTimer = setTimeout(async () => {
            try {
                // إظهار حالة التحميل
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'section-loading';
                loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                targetElement.style.position = 'relative';
                targetElement.appendChild(loadingIndicator);
                
                // تنفيذ البحث
                const result = await searchFunction(searchTerm);
                
                // إزالة مؤشر التحميل
                targetElement.removeChild(loadingIndicator);
                searchInput.classList.remove('searching');
                
                // عرض النتائج
                if (result.success) {
                    // تنفيذ الدالة المخصصة لعرض النتائج
                    result.displayFunction(result.data);
                } else {
                    showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
                }
            } catch (error) {
                console.error('خطأ في البحث:', error);
                searchInput.classList.remove('searching');
                showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
            }
        }, 300);
    });
}

// إضافة تخزين مؤقت للبيانات
const dataCache = {
    data: {},
    
    // الحصول على البيانات من التخزين المؤقت
    get: function(key) {
        const cachedItem = this.data[key];
        
        if (!cachedItem) return null;
        
        // التحقق من صلاحية التخزين المؤقت
        if (Date.now() > cachedItem.expiry) {
            delete this.data[key];
            return null;
        }
        
        return cachedItem.value;
    },
    
    // تخزين البيانات في التخزين المؤقت
    set: function(key, value, ttl = 300000) { // افتراضيًا 5 دقائق
        this.data[key] = {
            value: value,
            expiry: Date.now() + ttl
        };
    },
    
    // حذف عنصر من التخزين المؤقت
    remove: function(key) {
        delete this.data[key];
    },
    
    // مسح التخزين المؤقت بالكامل
    clear: function() {
        this.data = {};
    }
};

// تحسين معالجة الأخطاء
function enhanceErrorHandling() {
    // معالجة الأخطاء غير المتوقعة
    window.addEventListener('error', function(event) {
        console.error('خطأ غير متوقع:', event.error);
        showError('حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        return false;
    });
    
    // معالجة رفض الوعود
    window.addEventListener('unhandledrejection', function(event) {
        console.error('وعد مرفوض غير معالج:', event.reason);
        showError('حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
        return false;
    });
    
    // معالجة أخطاء الاتصال بالإنترنت
    window.addEventListener('online', function() {
        showSuccess('تم استعادة الاتصال بالإنترنت.');
        // إعادة تحميل البيانات
        if (typeof refreshDashboardData === 'function') {
            refreshDashboardData();
        }
    });
    
    window.addEventListener('offline', function() {
        showError('تم فقدان الاتصال بالإنترنت. سيتم استخدام البيانات المخزنة مؤقتًا.');
    });
}

// إضافة وضع مظلم
function implementDarkMode() {
    // إنشاء زر تبديل الوضع المظلم
    const darkModeToggle = document.createElement('button');
    darkModeToggle.className = 'dark-mode-toggle';
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    document.body.appendChild(darkModeToggle);
    
    // التحقق من الوضع المحفوظ
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // تطبيق الوضع المحفوظ
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // إضافة مستمع حدث لزر التبديل
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        const isDarkModeNow = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkModeNow);
        
        if (isDarkModeNow) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
}

// تحسين التفاعل باللمس
function enhanceTouchInteraction() {
    // تحسين التفاعل باللمس للقائمة الجانبية
    const sidebarLinks = document.querySelectorAll('.sidebar-menu-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        link.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });
    
    // تحسين التفاعل باللمس للأزرار
    const buttons = document.querySelectorAll('.btn, .table-action');
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        button.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });
}

// تحديث البيانات في الوقت الفعلي باستخدام Firebase
async function setupRealtimeUpdates() {
    try {
        // استيراد وحدة onSnapshot من Firebase
        const { onSnapshot, collection, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
        
        // تحديث إحصائيات لوحة المعلومات في الوقت الفعلي
        function setupDashboardStatsUpdates(db) {
            // الاستماع للتغييرات في مجموعة السيارات
            const carsQuery = query(collection(db, "cars"), limit(1000));
            
            onSnapshot(carsQuery, (snapshot) => {
                const cars = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // تحديث إجمالي السيارات
                updateStatCard('totalCars', cars.length);
                
                // تحديث السيارات النشطة
                const activeCars = cars.filter(car => car.status === 'active');
                updateStatCard('activeCars', activeCars.length);
                
                // تحديث السيارات المعلقة
                const pendingCars = cars.filter(car => car.status === 'pending');
                updateStatCard('pendingCars', pendingCars.length);
                
                // تحديث جدول أحدث السيارات
                updateRecentCarsTable(cars.slice(0, 5));
            }, (error) => {
                console.error("خطأ في الاستماع للتغييرات في السيارات:", error);
            });
            
            // الاستماع للتغييرات في مجموعة المستخدمين
            const usersQuery = query(collection(db, "users"), limit(1000));
            
            onSnapshot(usersQuery, (snapshot) => {
                const users = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // تحديث إجمالي المستخدمين
                updateStatCard('totalUsers', users.length);
                
                // تحديث الاشتراكات النشطة
                const activeSubscriptions = users.filter(user => user.isSubscribed);
                updateStatCard('activeSubscriptions', activeSubscriptions.length);
                
                // تحديث جدول أحدث المستخدمين
                updateRecentUsersTable(users.slice(0, 5));
            }, (error) => {
                console.error("خطأ في الاستماع للتغييرات في المستخدمين:", error);
            });
        }
        
        // تحديث جدول أحدث السيارات
        function updateRecentCarsTable(cars) {
            const tableBody = document.querySelector('#recentCarsTable tbody');
            if (!tableBody) return;
            
            // ترتيب السيارات حسب تاريخ الإنشاء (الأحدث أولاً)
            cars.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
            
            // تحديث الجدول
            tableBody.innerHTML = '';
            
            if (cars.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">لا توجد سيارات</td>
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
        
        // تحديث جدول أحدث المستخدمين
        function updateRecentUsersTable(users) {
            const tableBody = document.querySelector('#recentUsersTable tbody');
            if (!tableBody) return;
            
            // ترتيب المستخدمين حسب تاريخ التسجيل (الأحدث أولاً)
            users.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
            
            // تحديث الجدول
            tableBody.innerHTML = '';
            
            if (users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">لا يوجد مستخدمين</td>
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
                            <a href="#" class="table-action view view-user-btn" title="عرض" data-id="${user.id}"><i class="fas fa-eye"></i></a>
                            <button class="table-action edit edit-user-btn" title="تعديل" data-id="${user.id}"><i class="fas fa-edit"></i></button>
                            <button class="table-action delete delete-user-btn" title="حذف" data-id="${user.id}"><i class="fas fa-trash"></i></button>
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
        
        // تصدير الدالة لاستخدامها خارجيًا
        window.setupRealtimeUpdates = function(db) {
            setupDashboardStatsUpdates(db);
        };
    } catch (error) {
        console.error("Error setting up realtime updates:", error);
    }
}

// تهيئة جميع التحسينات
function initEnhancements() {
    // تهيئة القائمة الجانبية القابلة للطي
    initCollapsibleSidebar();
    
    // تحسين الجداول المتجاوبة
    enhanceResponsiveTables();
    
    // إضافة وضع مظلم
    implementDarkMode();
    
    // تحسين التفاعل باللمس
    enhanceTouchInteraction();
    
    // تحسين معالجة الأخطاء
    enhanceErrorHandling();
    
    // إعداد التحديثات في الوقت الفعلي
    setupRealtimeUpdates();
    
    console.log('تم تهيئة جميع التحسينات بنجاح');
}

// تصدير الدوال
export {
    initEnhancements,
    dataCache,
    enhanceRealTimeSearch,
    implementLazyLoading
};
