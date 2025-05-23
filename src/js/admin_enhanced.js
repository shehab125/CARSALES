import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { 
    getCurrentUser, 
    getUserData, 
    getAllUsers, 
    getAllSubscriptions, 
    getCarListings, 
    updateCarListing,
    updateUserProfile,
    deleteCarListing,
    getCarDetails,
    // getSubscriptionDetails
} from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';
import { doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAsh7PnIRja-A9DLmP1RfA3O7vakmXEJBw",
    authDomain: "gig2-b4dfb.firebaseapp.com",
    projectId: "gig2-b4dfb",
    storageBucket: "gig2-b4dfb.firebasestorage.app",
    messagingSenderId: "1016083025093",
    appId: "1:1016083025093:web:a1863069f1cf55537eb4ac",
    measurementId: "G-7EENTG3F0M"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Admin credentials - يجب تغييرها للإنتاج
const ADMIN_EMAIL = "admin@carsales.com";

// Helper function to translate Arabic car makes to English
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
    'بي واي دي': 'BYD',
    'جاك': 'JAC'
};

function getEnglishMake(make) {
    return makeTranslations[make] || make;
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin page
    const isAdminPage = window.location.pathname.includes('admin_enhanced_updated.html');
    
    if (isAdminPage) {
        initAdminPage();
    }
});

// Initialize Admin Page
async function initAdminPage() {
    try {
        // Check if user is logged in
        const user = await getCurrentUser();
        
        if (!user) {
            // Redirect to login page with redirect parameter
            window.location.href = 'auth.html?redirect=admin';
            return;
        }
        
        // Show loading state
        showLoading('جاري تحميل لوحة التحكم...');
        
        // Get user data
        const userData = await getUserData(user.uid);
        
        if (!userData.success) {
            showError('حدث خطأ أثناء تحميل بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
            hideLoading();
            return;
        }
        
        // Check if user is admin or has admin email
        if (!userData.userData.isAdmin && user.email !== ADMIN_EMAIL) {
            showError('ليس لديك صلاحية الوصول إلى لوحة التحكم.');
            
            // If user has admin email but isAdmin flag is not set, update it
            if (user.email === ADMIN_EMAIL) {
                await updateUserProfile(user.uid, { isAdmin: true });
                // Reload page after updating admin status
                window.location.reload();
                return;
            }
            
            // Redirect to home page after 3 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            
            return;
        }
        
        // Update admin name in header
        updateAdminInfo(userData.userData);
        
        // Initialize sidebar navigation
        initSidebarNav();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Load pending cars for review
        await loadPendingCars();
        
        // Add event listeners for admin actions
        addEventListeners();
        
    } catch (error) {
        console.error('Error initializing admin page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Update Admin Info in Header
function updateAdminInfo(userData) {
    const adminNameDisplay = document.getElementById('adminNameDisplay');
    const adminAvatar = document.querySelector('.user-avatar');
    
    if (adminNameDisplay) {
        adminNameDisplay.textContent = userData.name || 'المشرف';
    }
    
    if (adminAvatar && userData.photoURL) {
        adminAvatar.src = userData.photoURL;
    }
}

// Initialize Sidebar Navigation
function initSidebarNav() {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu-link');
    const sections = document.querySelectorAll('.admin-section');
    
    if (!sidebarLinks.length || !sections.length) return;
    
    // Add click event to sidebar links
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get section ID from data attribute
            const sectionId = this.getAttribute('data-section');
            
            if (!sectionId) return;
            
            // Remove active class from all links
            sidebarLinks.forEach(link => link.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            
            // Show selected section
            const selectedSection = document.getElementById(`${sectionId}-section`);
            if (selectedSection) {
                selectedSection.classList.add('active');
            }
        });
    });
}

// Add Event Listeners for Admin Actions
function addEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                await logoutUser();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error logging out:', error);
                showError('حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.');
            }
        });
    }
    
    // Add car button
    const addCarBtn = document.getElementById('addCarBtn');
    if (addCarBtn) {
        addCarBtn.addEventListener('click', function() {
            window.location.href = 'sell.html';
        });
    }
    
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            showAddUserModal();
        });
    }
    
    // Search inputs
    const searchInputs = document.querySelectorAll('.admin-search input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const section = this.closest('.admin-section');
            
            if (!section) return;
            
            // Get table rows in this section
            const tableRows = section.querySelectorAll('tbody tr');
            
            // Filter rows based on search term
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        console.log('Starting to load dashboard data...');
        // Show loading state for dashboard
        showSectionLoading('dashboard-section', 'جاري تحميل البيانات...');
        
        // Get all users
        console.log('Fetching users...');
        const usersResult = await getAllUsers();
        console.log('Users result:', usersResult);
        
        // Get all cars
        console.log('Fetching cars...');
        const carsResult = await getCarListings({}, 'createdAt', 'desc', 100);
        console.log('Cars result:', carsResult);
        
        // Get all subscriptions
        console.log('Fetching subscriptions...');
        const subscriptionsResult = await getAllSubscriptions();
        console.log('Subscriptions result:', subscriptionsResult);
        
        if (usersResult.success && carsResult.success && subscriptionsResult.success) {
            console.log('All data fetched successfully');
            // Update dashboard stats
            updateDashboardStats(usersResult.users, carsResult.cars, subscriptionsResult.subscriptions);
            
            // Load users data
            displayUsers(usersResult.users);
            
            // Load cars data
            displayCars(carsResult.cars);
            
            // Load subscriptions data
            displaySubscriptions(subscriptionsResult.subscriptions);
            
            // Update charts
            updateCharts(usersResult.users, carsResult.cars, subscriptionsResult.subscriptions);
        } else {
            console.error('Error in data fetching:', {
                users: usersResult.success,
                cars: carsResult.success,
                subscriptions: subscriptionsResult.success
            });
            showError('حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideSectionLoading('dashboard-section');
    }
}

// Update Dashboard Stats
function updateDashboardStats(users, cars, subscriptions) {
    // Total users
    updateStatCard('totalUsers', users.length);
    
    // Total cars
    updateStatCard('totalCars', cars.length);
    
    // Pending cars
    const pendingCars = cars.filter(car => car.status === 'pending');
    updateStatCard('pendingCars', pendingCars.length);
    
    // Active cars
    const activeCars = cars.filter(car => car.status === 'active');
    updateStatCard('activeCars', activeCars.length);
    
    // Active subscriptions
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    updateStatCard('activeSubscriptions', activeSubscriptions.length);
    
    // Total revenue
    const revenue = activeSubscriptions.reduce((total, sub) => total + (sub.amount || 0), 0);
    updateStatCard('totalRevenue', formatCurrency(revenue));
}

// Update Stat Card
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Load Pending Cars for Review
async function loadPendingCars() {
    try {
        // Show loading state
        showSectionLoading('cars-section', 'جاري تحميل السيارات المعلقة...');
        
        // Get waiting cars
        const result = await getCarListings({ status: 'waiting' }, 'createdAt', 'desc', 100);
        
        if (result.success) {
            // Display waiting cars
            displayPendingCars(result.cars);
        } else {
            showError('حدث خطأ أثناء تحميل السيارات المعلقة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error loading pending cars:', error);
        showError('حدث خطأ أثناء تحميل السيارات المعلقة. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideSectionLoading('cars-section');
    }
}

// Display Pending Cars
function displayPendingCars(cars) {
    const pendingCarsContainer = document.getElementById('pendingCarsContainer');
    
    if (!pendingCarsContainer) return;
    
    // Clear container
    pendingCarsContainer.innerHTML = '';
    
    // Check if there are waiting cars
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
    
    // Create cards for waiting cars
    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'car-review-card';
        
        // Format date
        const formattedDate = formatDate(car.createdAt);
        
        // Format price
        const formattedPrice = formatCurrency(car.price);
        
        // Get main image
        const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'images/car-placeholder.jpg';
        
        // Create card HTML
        card.innerHTML = `
            <div class="car-review-image">
                <img src="${mainImage}" alt="${car.title}">
            </div>
            <div class="car-review-content">
                <h3 class="car-review-title">${car.title}</h3>
                <div class="car-review-details">
                    <div class="car-review-detail">
                        <i class="fas fa-car"></i>
                        <span>${car.make} ${car.model}</span>
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
        
        // Add event listeners to buttons
        const viewBtn = card.querySelector('.view-car-btn');
        const approveBtn = card.querySelector('.approve-car-btn');
        const rejectBtn = card.querySelector('.reject-car-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                window.location.href = `car-detail.html?id=${carId}`;
            });
        }
        
        if (approveBtn) {
            approveBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                approveCar(carId);
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                rejectCar(carId);
            });
        }
        
        pendingCarsContainer.appendChild(card);
    });
}

// Approve Car
async function approveCar(carId) {
    try {
        // Show loading state
        showLoading('جاري قبول السيارة...');
        
        // Update car status to active
        const result = await updateCarListing(carId, { status: 'active' });
        
        if (result.success) {
            // Show success message
            showSuccess('تم قبول السيارة بنجاح!');
            
            // Reload pending cars
            await loadPendingCars();
            
            // Reload dashboard data
            await loadDashboardData();
        } else {
            showError(result.error || 'حدث خطأ أثناء قبول السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error approving car:', error);
        showError('حدث خطأ أثناء قبول السيارة. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Reject Car
async function rejectCar(carId) {
    try {
        // Show confirmation dialog
        if (!confirm('هل أنت متأكد من رفض هذه السيارة؟')) {
            return;
        }
        
        // Show loading state
        showLoading('جاري رفض السيارة...');
        
        // Update car status to rejected
        const result = await updateCarListing(carId, { status: 'rejected' });
        
        if (result.success) {
            // Show success message
            showSuccess('تم رفض السيارة بنجاح!');
            
            // Reload pending cars
            await loadPendingCars();
            
            // Reload dashboard data
            await loadDashboardData();
        } else {
            showError(result.error || 'حدث خطأ أثناء رفض السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error rejecting car:', error);
        showError('حدث خطأ أثناء رفض السيارة. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Display Users
function displayUsers(users) {
    console.log('Displaying users:', users);
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) {
        console.error('Users table element not found');
        return;
    }
    const usersTableBody = usersTable.querySelector('tbody');
    if (!usersTableBody) {
        console.error('Users table body element not found');
        return;
    }
    usersTableBody.innerHTML = '';
    users.forEach(user => {
        console.log('Processing user:', user);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name || ''}</td>
            <td>${user.email || ''}</td>
            <td>${user.phone || ''}</td>
            <td>${user.location || ''}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.isSubscribed ? 'مشترك' : 'غير مشترك'}</td>
            <td>${user.isAdmin ? '<span class="status-badge active">مشرف</span>' : '<span class="status-badge inactive">مستخدم</span>'}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action view" title="عرض" data-id="${user.uid || user.id}"><i class="fas fa-eye"></i></button>
                    <button class="table-action edit" title="تعديل" data-id="${user.uid || user.id}"><i class="fas fa-edit"></i></button>
                    <button class="table-action delete" title="حذف" data-id="${user.uid || user.id}"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm ${user.isAdmin ? 'btn-danger' : 'btn-success'} admin-toggle-btn" data-id="${user.uid || user.id}" data-status="${user.isAdmin}">
                        ${user.isAdmin ? 'سحب صلاحية الأدمن' : 'منح صلاحية الأدمن'}
                    </button>
                    <button class="btn btn-success btn-sm give-subscription-btn" data-id="${user.uid || user.id}">إعطاء اشتراك مجاني</button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
    console.log('Finished displaying users');
}

// Add event delegation for table actions
document.addEventListener('DOMContentLoaded', function() {
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        usersTable.addEventListener('click', function(e) {
            const target = e.target.closest('button');
            if (!target) return;

            const action = target.classList.contains('view') ? 'view' :
                          target.classList.contains('edit') ? 'edit' :
                          target.classList.contains('delete') ? 'delete' :
                          target.classList.contains('admin-toggle-btn') ? 'admin-toggle' :
                          target.classList.contains('give-subscription-btn') ? 'give-subscription' : null;

            if (!action) return;

            const userId = target.dataset.id;
            if (!userId) return;

            switch (action) {
                case 'view':
                viewUserDetails(userId);
                    break;
                case 'edit':
                    editUserDetails(userId);
                    break;
                case 'delete':
                    deleteUser(userId);
                    break;
                case 'admin-toggle':
                    const isAdmin = target.dataset.status === 'true';
                    toggleAdminStatus(userId, isAdmin);
                    break;
                case 'give-subscription':
                    giveFreeSubscription(userId);
                    break;
            }
        });
    }
});

// Modal logic for user details
const userModal = document.getElementById('userModal');
const closeUserModal = document.getElementById('closeUserModal');
const cancelUserModal = document.getElementById('cancelUserModal');
const userModalForm = document.getElementById('userModalForm');
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserPhone = document.getElementById('modalUserPhone');
const modalUserLocation = document.getElementById('modalUserLocation');
let currentUserId = null;

function openUserModal(user, isEdit = false) {
    if (!user || !userModal) return;
    userModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    if (modalUserName) modalUserName.value = user.name || '';
    if (modalUserEmail) modalUserEmail.value = user.email || '';
    if (modalUserPhone) modalUserPhone.value = user.phone || '';
    if (modalUserLocation) modalUserLocation.value = user.location || '';
    if (userModalForm) {
        userModalForm.elements['modalUserName'].disabled = !isEdit;
        userModalForm.elements['modalUserPhone'].disabled = !isEdit;
        userModalForm.elements['modalUserLocation'].disabled = !isEdit;
    }
    const saveButton = document.getElementById('saveUserModal');
    if (saveButton) saveButton.style.display = isEdit ? 'inline-block' : 'none';
    currentUserId = user.uid;
}

if (closeUserModal && cancelUserModal) {
    closeUserModal.onclick = cancelUserModal.onclick = function() {
        if (userModal) {
            userModal.style.display = 'none';
            document.body.style.overflow = '';
            currentUserId = null;
        }
    };
}

if (userModalForm) {
    userModalForm.onsubmit = async function(e) {
        e.preventDefault();
        if (!currentUserId) return;
        const updatedData = {
            name: modalUserName ? modalUserName.value : '',
            phone: modalUserPhone ? modalUserPhone.value : '',
            location: modalUserLocation ? modalUserLocation.value : ''
        };
        await updateUserProfile(currentUserId, updatedData);
        showSuccess('تم حفظ التغييرات بنجاح!');
        if (userModal) {
            userModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        currentUserId = null;
        // Reload users list
        const usersResult = await getAllUsers();
        if (usersResult.success) displayUsers(usersResult.users);
    };
}

// Update view/edit user functions to use modal
function viewUserDetails(userId) {
    getUserData(userId).then(userData => {
        if (userData && userData.userData) {
            openUserModal({...userData.userData, uid: userId}, false);
        } else {
            alert('تعذر جلب بيانات المستخدم');
}
    });
}
function editUserDetails(userId) {
    getUserData(userId).then(userData => {
        if (userData && userData.userData) {
            openUserModal({...userData.userData, uid: userId}, true);
        } else {
            alert('تعذر جلب بيانات المستخدم');
        }
    });
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    try {
        showLoading('جاري حذف المستخدم...');
        const result = await deleteUserFromFirestore(userId);
        if (result.success) {
            showSuccess('تم حذف المستخدم بنجاح!');
            // Reload users list
            const usersResult = await getAllUsers();
            if (usersResult.success) displayUsers(usersResult.users);
        } else {
            showError(result.error || 'حدث خطأ أثناء حذف المستخدم.');
        }
    } catch (error) {
        logError(error, 'deleteUser');
        showError('حدث خطأ أثناء حذف المستخدم.');
    } finally {
        hideLoading();
    }
}

// Give Free Subscription
async function giveFreeSubscription(userId) {
    if (!confirm('هل أنت متأكد من إعطاء اشتراك مجاني لهذا المستخدم؟')) {
        return;
    }
    try {
        showLoading('جاري إعطاء الاشتراك المجاني...');
        const result = await updateUserProfile(userId, { isSubscribed: true });
        if (result.success) {
            showSuccess('تم إعطاء الاشتراك المجاني بنجاح!');
            // Reload users list
            const usersResult = await getAllUsers();
            if (usersResult.success) displayUsers(usersResult.users);
        } else {
            showError(result.error || 'حدث خطأ أثناء إعطاء الاشتراك المجاني.');
        }
    } catch (error) {
        logError(error, 'giveFreeSubscription');
        showError('حدث خطأ أثناء إعطاء الاشتراك المجاني.');
    } finally {
        hideLoading();
    }
}

// Toggle Admin Status
async function toggleAdminStatus(userId, currentStatus) {
    try {
        if (!confirm(`هل أنت متأكد من ${currentStatus ? 'سحب' : 'منح'} صلاحية الأدمن لهذا المستخدم؟`)) {
            return;
        }
        showLoading(`جاري ${currentStatus ? 'سحب' : 'منح'} صلاحية الأدمن...`);
        const result = await updateUserProfile(userId, { isAdmin: !currentStatus });
        if (result.success) {
            showSuccess(`تم ${currentStatus ? 'سحب' : 'منح'} صلاحية الأدمن بنجاح!`);
        } else {
            showError(result.error || `حدث خطأ أثناء تحديث صلاحية الأدمن.`);
        }
    } catch (error) {
        logError(error, 'toggleAdminStatus');
        showError('حدث خطأ أثناء تحديث صلاحية الأدمن.');
    } finally {
        hideLoading();
    }
}

// Modal logic for car details
const carModal = document.getElementById('carModal');
const closeCarModal = document.getElementById('closeCarModal');
const cancelCarModal = document.getElementById('cancelCarModal');
const carModalForm = document.getElementById('carModalForm');
const modalCarTitle = document.getElementById('modalCarTitle');
const modalCarMake = document.getElementById('modalCarMake');
const modalCarModel = document.getElementById('modalCarModel');
const modalCarYear = document.getElementById('modalCarYear');
const modalCarPrice = document.getElementById('modalCarPrice');
const modalCarLocation = document.getElementById('modalCarLocation');
const modalCarDescription = document.getElementById('modalCarDescription');
let currentCarId = null;

function openCarModal(car, isEdit = false) {
    if (!car) return;
    carModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    modalCarTitle.value = car.title || '';
    modalCarMake.value = car.make || '';
    modalCarModel.value = car.model || '';
    modalCarYear.value = car.year || '';
    modalCarPrice.value = car.price || '';
    modalCarLocation.value = car.location || '';
    modalCarDescription.value = car.description || '';
    carModalForm.elements['modalCarTitle'].disabled = !isEdit;
    carModalForm.elements['modalCarMake'].disabled = !isEdit;
    carModalForm.elements['modalCarModel'].disabled = !isEdit;
    carModalForm.elements['modalCarYear'].disabled = !isEdit;
    carModalForm.elements['modalCarPrice'].disabled = !isEdit;
    carModalForm.elements['modalCarLocation'].disabled = !isEdit;
    carModalForm.elements['modalCarDescription'].disabled = !isEdit;
    document.getElementById('saveCarModal').style.display = isEdit ? 'inline-block' : 'none';
    currentCarId = car.id;
}

closeCarModal.onclick = cancelCarModal.onclick = function() {
    carModal.style.display = 'none';
    document.body.style.overflow = '';
    currentCarId = null;
};

carModalForm.onsubmit = async function(e) {
    e.preventDefault();
    if (!currentCarId) return;
    const updatedData = {
        title: modalCarTitle.value,
        make: modalCarMake.value,
        model: modalCarModel.value,
        year: modalCarYear.value,
        price: modalCarPrice.value,
        location: modalCarLocation.value,
        description: modalCarDescription.value
    };
    await updateCarListing(currentCarId, updatedData);
    showSuccess('تم حفظ التغييرات بنجاح!');
    carModal.style.display = 'none';
    document.body.style.overflow = '';
    currentCarId = null;
    // Reload cars list
    const carsResult = await getCarListings({}, 'createdAt', 'desc', 100);
    if (carsResult.success) displayCars(carsResult.cars);
};

// Update view/edit car functions to use modal
function viewCarDetails(carId) {
    getCarDetails(carId).then(carData => {
        if (carData && carData.car) {
            openCarModal({ ...carData.car, id: carId }, false);
        } else {
            alert('تعذر جلب بيانات السيارة');
        }
    });
}
function editCarDetails(carId) {
    getCarDetails(carId).then(carData => {
        if (carData && carData.car) {
            openCarModal({ ...carData.car, id: carId }, true);
        } else {
            alert('تعذر جلب بيانات السيارة');
        }
    });
}

// Update displayCars to use modal for view/edit
function displayCars(cars) {
    const carsTable = document.getElementById('carsTable');
    if (!carsTable) return;
    const tableBody = carsTable.querySelector('tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    cars.forEach(car => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(car.createdAt);
        const formattedPrice = formatCurrency(car.price);
        let statusClass = 'inactive';
        let statusText = 'غير نشط';
        switch (car.status) {
            case 'active': statusClass = 'active'; statusText = 'نشط'; break;
            case 'pending': statusClass = 'pending'; statusText = 'معلق'; break;
            case 'rejected': statusClass = 'inactive'; statusText = 'مرفوض'; break;
        }
        row.innerHTML = `
            <td>${car.title || 'بدون عنوان'}</td>
            <td>${getEnglishMake(car.make) || ''} ${car.model || ''}</td>
            <td>${car.year || 'غير محدد'}</td>
            <td>${formattedPrice}</td>
            <td>${car.contactName || 'غير متوفر'}</td>
            <td>${formattedDate}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-action view view-car-btn" data-id="${car.id}" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action edit edit-car-btn" data-id="${car.id}" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="table-action delete delete-car-btn" data-id="${car.id}" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        const viewBtn = row.querySelector('.view-car-btn');
        const editBtn = row.querySelector('.edit-car-btn');
        const deleteBtn = row.querySelector('.delete-car-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                viewCarDetails(carId);
            });
        }
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                editCarDetails(carId);
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const carId = this.getAttribute('data-id');
                deleteCar(carId);
            });
        }
        tableBody.appendChild(row);
    });
}

// Delete Car
async function deleteCar(carId) {
    try {
        // Show confirmation dialog
        if (!confirm('هل أنت متأكد من حذف هذه السيارة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }
        
        // Show loading state
        showLoading('جاري حذف السيارة...');
        
        // Delete car
        const result = await deleteCarListing(carId);
        
        if (result.success) {
            // Show success message
            showSuccess('تم حذف السيارة بنجاح!');
            
            // Reload cars data
            const carsResult = await getCarListings({}, 'createdAt', 'desc', 100);
            if (carsResult.success) {
                displayCars(carsResult.cars);
            }
            
            // Reload dashboard data
            await loadDashboardData();
        } else {
            showError(result.error || 'حدث خطأ أثناء حذف السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error deleting car:', error);
        showError('حدث خطأ أثناء حذف السيارة. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Modal logic for subscription details
const subscriptionModal = document.getElementById('subscriptionModal');
const closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
const cancelSubscriptionModal = document.getElementById('cancelSubscriptionModal');
const subscriptionModalForm = document.getElementById('subscriptionModalForm');
const modalSubscriptionUser = document.getElementById('modalSubscriptionUser');
const modalSubscriptionPlan = document.getElementById('modalSubscriptionPlan');
const modalSubscriptionAmount = document.getElementById('modalSubscriptionAmount');
const modalSubscriptionStart = document.getElementById('modalSubscriptionStart');
const modalSubscriptionEnd = document.getElementById('modalSubscriptionEnd');
const modalSubscriptionStatus = document.getElementById('modalSubscriptionStatus');
let currentSubscriptionId = null;

function openSubscriptionModal(subscription, isEdit = false) {
    if (!subscription) return;
    
    subscriptionModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Fill form fields
    modalSubscriptionUser.value = subscription.userName || subscription.userId || '';
    modalSubscriptionPlan.value = subscription.planName || 'basic';
    modalSubscriptionAmount.value = subscription.amount || '';
    modalSubscriptionStart.value = subscription.startDate ? new Date(subscription.startDate).toISOString().split('T')[0] : '';
    modalSubscriptionEnd.value = subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : '';
    modalSubscriptionStatus.value = subscription.status || 'active';
    
    // Enable/disable fields based on edit mode
    const formFields = subscriptionModalForm.elements;
    for (let field of formFields) {
        if (field.id !== 'modalSubscriptionUser') {
            field.disabled = !isEdit;
        }
    }
    
    // Show/hide save button
    document.getElementById('saveSubscriptionModal').style.display = isEdit ? 'inline-block' : 'none';
    
    currentSubscriptionId = subscription.id;
}

// Close modal handlers
closeSubscriptionModal.onclick = cancelSubscriptionModal.onclick = function() {
    subscriptionModal.style.display = 'none';
    document.body.style.overflow = '';
    currentSubscriptionId = null;
};

// Save subscription changes
subscriptionModalForm.onsubmit = async function(e) {
    e.preventDefault();
    showError('تعديل الاشتراكات غير مدعوم حالياً.');
    return;
};

// Update view subscription function to use modal
function viewSubscriptionDetails(subscriptionId) {
    // Find subscription in current list
    const subscription = window.currentSubscriptions?.find(sub => sub.id === subscriptionId);
    if (subscription) {
        openSubscriptionModal(subscription, false);
    } else {
        showError('تعذر جلب بيانات الاشتراك');
    }
}

// Update displaySubscriptions to store current list and use modal
function displaySubscriptions(subscriptions) {
    // Store current subscriptions list for quick access
    window.currentSubscriptions = subscriptions;
    
    const subscriptionsTable = document.getElementById('subscriptionsTable');
    if (!subscriptionsTable) return;
    
    const tableBody = subscriptionsTable.querySelector('tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    subscriptions.forEach(subscription => {
        const row = document.createElement('tr');
        
        // Format dates
        const startDate = formatDate(subscription.startDate);
        const endDate = formatDate(subscription.endDate);
        const createdDate = formatDate(subscription.createdAt);
        
        // Format amount
        const formattedAmount = formatCurrency(subscription.amount || 0);
        
        // Get status class and text
        let statusClass = 'inactive';
        let statusText = 'غير نشط';
        
        switch (subscription.status) {
            case 'active':
                statusClass = 'active';
                statusText = 'نشط';
                break;
            case 'cancelled':
                statusClass = 'inactive';
                statusText = 'ملغي';
                break;
            case 'expired':
                statusClass = 'inactive';
                statusText = 'منتهي';
                break;
        }
        
        row.innerHTML = `
            <td>${subscription.userName || subscription.userId}</td>
            <td>${subscription.planName || 'خطة قياسية'}</td>
            <td>${formattedAmount}</td>
            <td>${startDate}</td>
            <td>${endDate}</td>
            <td>${createdDate}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-action view view-subscription-btn" data-id="${subscription.id}" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action edit edit-subscription-btn" data-id="${subscription.id}" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="table-action ${subscription.status === 'active' ? 'delete' : 'success'} toggle-subscription-btn" 
                            data-id="${subscription.id}" 
                            data-status="${subscription.status}" 
                            title="${subscription.status === 'active' ? 'إلغاء الاشتراك' : 'تفعيل الاشتراك'}">
                        <i class="fas ${subscription.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Add event listeners
        const viewBtn = row.querySelector('.view-subscription-btn');
        const editBtn = row.querySelector('.edit-subscription-btn');
        const toggleBtn = row.querySelector('.toggle-subscription-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                const subscriptionId = this.getAttribute('data-id');
                viewSubscriptionDetails(subscriptionId);
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const subscriptionId = this.getAttribute('data-id');
                const subscription = window.currentSubscriptions.find(sub => sub.id === subscriptionId);
                if (subscription) {
                    openSubscriptionModal(subscription, true);
                }
            });
        }
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const subscriptionId = this.getAttribute('data-id');
                const status = this.getAttribute('data-status');
                toggleSubscriptionStatus(subscriptionId, status);
            });
        }
        
        tableBody.appendChild(row);
    });
}

// Toggle Subscription Status
async function toggleSubscriptionStatus(subscriptionId, currentStatus) {
    try {
        if (!confirm(`هل أنت متأكد من ${currentStatus === 'active' ? 'إلغاء' : 'تفعيل'} هذا الاشتراك؟`)) {
            return;
        }
        showLoading(`جاري ${currentStatus === 'active' ? 'إلغاء' : 'تفعيل'} الاشتراك...`);
        // Here you would update the subscription status in Firestore
        // For demo, just show a message
        showSuccess(`تم ${currentStatus === 'active' ? 'إلغاء' : 'تفعيل'} الاشتراك بنجاح!`);
        // Reload subscriptions data
        const subscriptionsResult = await getAllSubscriptions();
        if (subscriptionsResult.success) {
            displaySubscriptions(subscriptionsResult.subscriptions);
        }
    } catch (error) {
        console.error('Error toggling subscription status:', error);
        showError(`حدث خطأ أثناء ${currentStatus === 'active' ? 'إلغاء' : 'تفعيل'} الاشتراك. يرجى المحاولة مرة أخرى.`);
    } finally {
        hideLoading();
    }
}

// Update Charts
function updateCharts(users, cars, subscriptions) {
    // TODO: Implement charts using Chart.js or similar library
    console.log('Charts would be updated here with:', { users, cars, subscriptions });
}

// Show Loading State
function showLoading(message = 'جاري التحميل...') {
    // Create loading overlay if it doesn't exist
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
        // Update loading message
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
    }
}

// Hide Loading State
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show Section Loading
function showSectionLoading(sectionId, message = 'جاري التحميل...') {
    const section = document.getElementById(sectionId);
    
    if (!section) return;
    
    // Create loading overlay if it doesn't exist
    let loadingOverlay = section.querySelector('.section-loading');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'section-loading';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        
        section.appendChild(loadingOverlay);
    } else {
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
    }
}

// Hide Section Loading
function hideSectionLoading(sectionId) {
    const section = document.getElementById(sectionId);
    
    if (!section) return;
    
    const loadingOverlay = section.querySelector('.section-loading');
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show Error Message
function showError(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        
        document.body.appendChild(toastContainer);
    }
    console.log('Error shown:', message); // بعد showError
    
    
    // Create toast
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
    
    // Add event listener to close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toast.remove();
        });
    }
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Show Success Message
function showSuccess(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        
        document.body.appendChild(toastContainer);
    }
    console.log('Success shown:', message); // بعد showSuccess
    
    // Create toast
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
    
    // Add event listener to close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toast.remove();
        });
    }
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Centralized error logging function
function logError(error, context = '') {
    console.error(`[AdminPanel] ${context}`, error);
    // You can extend this to send errors to Firestore or Sentry
}

// Export functions
export {
    initAdminPage,
    loadDashboardData,
    loadPendingCars,
    approveCar,
    rejectCar,
    deleteCar,
    deleteUser,
    editUserDetails,
    viewUserDetails
};

window.deleteUser = deleteUser;
window.editUserDetails = editUserDetails;
window.viewUserDetails = viewUserDetails;

async function deleteUserFromFirestore(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        return { success: true };
    } catch (error) {
        logError(error, 'deleteUserFromFirestore');
        return { success: false, error: 'حدث خطأ أثناء حذف المستخدم من Firestore.' };
    }
}
