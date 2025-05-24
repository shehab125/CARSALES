// Combined and corrected admin_enhanced.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, doc, setDoc, collection, serverTimestamp, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
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
    deleteUserCars,
    logoutUser // Assuming this is exported from auth.js or firebase-api.js
} from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js';
import { currentConfig } from './config.js';
// Assuming helper functions are available globally or imported from enhanced-functions.js
// import { showLoading, hideLoading, showError, showSuccess, showSectionLoading, hideSectionLoading } from './enhanced-functions.js';

// Placeholder error/success/loading functions if not imported
function showError(message) { console.error('Error:', message); alert(message); }
function showSuccess(message) { console.log('Success:', message); alert(message); }
function showLoading(message) { console.log('Loading:', message); document.body.style.cursor = 'wait'; }
function hideLoading() { console.log('Loading hidden'); document.body.style.cursor = 'default'; }
function showSectionLoading(sectionId, message) { console.log(`Loading section ${sectionId}:`, message); }
function hideSectionLoading(sectionId) { console.log(`Loading hidden for section ${sectionId}`); }
function logError(error, context) { console.error(`Error in ${context}:`, error); }

// Your web app's Firebase configuration - Replace with your actual config
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
const auth = getAuth(app);
const functions = initializeApp(firebaseConfig, 'functions');

// Admin credentials - Consider using custom claims instead
const ADMIN_EMAIL = "admin@carsales.com";

// Helper function to translate Arabic car makes to English
const makeTranslations = {
    'تويوتا': 'Toyota',
    'هيونداي': 'Hyundai',
    // ... (keep all translations)
    'جاك': 'JAC'
};

function getEnglishMake(make) {
    return makeTranslations[make] || make;
}

document.addEventListener('DOMContentLoaded', function() {
    const isAdminPage = window.location.pathname.includes('admin_enhanced_updated.html');
    if (isAdminPage) {
        initAdminPage();
    }
});

// Initialize Admin Page
async function initAdminPage() {
    try {
        const user = await getCurrentUser(); // Needs implementation in firebase-api.js using onAuthStateChanged
        if (!user) {
            window.location.href = 'auth.html?redirect=admin';
            return;
        }
        
        showLoading('جاري تحميل لوحة التحكم...');
        const userDataResult = await getUserData(user.uid);
        
        if (!userDataResult.success) {
            showError('حدث خطأ أثناء تحميل بيانات المستخدم.');
            hideLoading();
            return;
        }
        
        const userData = userDataResult.userData;
        // Check admin status (prefer custom claims over Firestore field for security)
        if (!userData.isAdmin && user.email !== ADMIN_EMAIL) {
             showError('ليس لديك صلاحية الوصول إلى لوحة التحكم.');
             setTimeout(() => { window.location.href = 'index.html'; }, 3000);
             return;
        }
        
        // If using email check and isAdmin field is missing, set it (less secure)
        if (user.email === ADMIN_EMAIL && !userData.isAdmin) {
            await updateUserProfile(user.uid, { isAdmin: true });
            // Consider just proceeding instead of reloading
        }

        updateAdminInfo(userData);
        initSidebarNav();
        await loadDashboardData();
        await loadPendingCars(); 
        addEventListeners(); // Add listeners after elements are loaded
        
    } catch (error) {
        console.error('Error initializing admin page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة.');
    } finally {
        hideLoading();
    }
}

// Update Admin Info in Header
function updateAdminInfo(userData) {
    // Implement based on your HTML structure (e.g., update name, avatar)
    console.log("Admin data:", userData);
}

// Initialize Sidebar Navigation
function initSidebarNav() {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu-link');
    const sections = document.querySelectorAll('.admin-section');
    if (!sidebarLinks.length || !sections.length) return;

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            if (!sectionId) return;
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const selectedSection = document.getElementById(`${sectionId}-section`);
            if (selectedSection) selectedSection.classList.add('active');
        });
    });
}

// Function to show the Add User modal
function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const form = document.getElementById('addUserModalForm');
    if (modal && form) {
        form.reset(); 
        modal.style.display = 'flex'; 
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Add User Modal or Form not found');
        showError('حدث خطأ: لم يتم العثور على نموذج إضافة المستخدم.');
    }
}

// Function to hide the Add User modal
function hideAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Add User function
async function handleAddUserSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.addUserEmail.value;
    const password = form.addUserPassword.value;
    const isSubscribed = form.addUserSubscription.value === 'true';
    const isAdmin = form.addUserIsAdmin.value === 'true';

    if (!email || !password) {
        showError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
        return;
    }
    if (password.length < 6) {
        showError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
        return;
    }

    showLoading('جاري إنشاء المستخدم...');
    try {
        // Create user in Firebase Auth
        // Note: Creating users directly client-side is generally discouraged for security.
        // Ideally, this should be handled by a backend function (e.g., Firebase Functions).
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        console.log('User created in Auth:', newUser.uid);

        // Save user details in Firestore
        const userDocRef = doc(db, 'users', newUser.uid);
        await setDoc(userDocRef, {
            email: email,
            uid: newUser.uid,
            isAdmin: isAdmin,
            isSubscribed: isSubscribed,
            createdAt: serverTimestamp(), // Use server timestamp
            name: email.split('@')[0], // Default name from email prefix
            phone: '',
            location: ''
        });
        console.log('User data saved in Firestore');

        // Optionally set custom claims (requires backend function)
        // await setAdminClaim(newUser.uid, isAdmin);

        hideLoading();
        showSuccess('تم إنشاء المستخدم بنجاح!');
        hideAddUserModal();

        // Reload users list
        const usersResult = await getAllUsers();
        if (usersResult.success) {
            displayUsers(usersResult.users);
        }

    } catch (error) {
        hideLoading();
        console.error('Error creating user:', error);
        let errorMessage = 'حدث خطأ أثناء إنشاء المستخدم.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'هذا البريد الإلكتروني مستخدم بالفعل.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'كلمة المرور ضعيفة جداً.';
        }
        showError(errorMessage);
    }
}

// Add Event Listeners for Admin Actions
function addEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn'); // Ensure this ID exists in HTML
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await logoutUser(); // Ensure logoutUser is imported and works
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error logging out:', error);
                showError('حدث خطأ أثناء تسجيل الخروج.');
            }
        });
    }
    
    // Add car button
    const addCarBtn = document.getElementById('addCarBtn');
    if (addCarBtn) {
        addCarBtn.addEventListener('click', () => { window.location.href = 'sell.html'; });
    }
    
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', showAddUserModal);
    }

    // Add User Modal listeners
    const addUserModalForm = document.getElementById('addUserModalForm');
    const closeAddUserModalBtn = document.getElementById('closeAddUserModalBtn');
    if (addUserModalForm) {
        addUserModalForm.addEventListener('submit', handleAddUserSubmit);
    }
    if (closeAddUserModalBtn) {
        closeAddUserModalBtn.addEventListener('click', hideAddUserModal);
    }
    
    // Refresh buttons
    const refreshBtns = document.querySelectorAll('#refreshDashboardBtn, #refreshUsersBtn, #refreshSubscriptionsBtn, #refreshCarsBtn'); // Check IDs
    refreshBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const sectionId = this.id.replace('refresh', '').replace('Btn', '').toLowerCase();
            const sectionElementId = `${sectionId}-section`; // e.g., 'users-section'
            showSectionLoading(sectionElementId, 'جاري تحديث البيانات...');
            try {
                switch(sectionId) {
                    case 'dashboard': await loadDashboardData(); break;
                    case 'users': 
                        const usersResult = await getAllUsers();
                        if (usersResult.success) displayUsers(usersResult.users);
                        break;
                    case 'subscriptions': 
                        const subscriptionsResult = await getAllSubscriptions();
                        if (subscriptionsResult.success) displaySubscriptions(subscriptionsResult.subscriptions);
                        break;
                    case 'cars': 
                        const carsResult = await getCarListings({}, 'createdAt', 'desc', 100);
                        if (carsResult.success) displayCars(carsResult.cars);
                        break;
                }
                showSuccess('تم تحديث البيانات بنجاح');
            } catch (error) {
                console.error(`Error refreshing ${sectionId}:`, error);
                showError('حدث خطأ أثناء تحديث البيانات');
            } finally {
                hideSectionLoading(sectionElementId);
            }
        });
    });

    // View all buttons
    const viewAllBtns = document.querySelectorAll('#viewAllCarsBtn, #viewAllUsersBtn, #viewAllSubscriptionsBtn'); // Check IDs
    viewAllBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const sectionId = this.id.replace('viewAll', '').replace('Btn', '').toLowerCase();
            const sectionElementId = `${sectionId}-section`;
            // Navigate to the correct section first
            const sectionLink = document.querySelector(`.sidebar-menu-link[data-section="${sectionId}"]`);
            if (sectionLink) sectionLink.click();
            
            showSectionLoading(sectionElementId, 'جاري تحميل جميع البيانات...');
            try {
                 switch(sectionId) {
                    case 'cars': 
                        const carsResult = await getCarListings({}, 'createdAt', 'desc', 100); // Load all cars
                        if (carsResult.success) displayCars(carsResult.cars);
                        break;
                    case 'users': 
                        const usersResult = await getAllUsers();
                        if (usersResult.success) displayUsers(usersResult.users);
                        break;
                    case 'subscriptions': 
                        const subscriptionsResult = await getAllSubscriptions();
                        if (subscriptionsResult.success) displaySubscriptions(subscriptionsResult.subscriptions);
                        break;
                }
            } catch (error) {
                console.error(`Error loading all ${sectionId}:`, error);
                showError('حدث خطأ أثناء تحميل البيانات');
            } finally {
                hideSectionLoading(sectionElementId);
            }
        });
    });

    // Filter buttons (users, subscriptions, cars)
    const filterBtns = document.querySelectorAll('.filter-buttons button'); // Ensure this class exists
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const filter = this.dataset.filter;
            const sectionElement = this.closest('.admin-section');
            if (!sectionElement) return;
            const sectionId = sectionElement.id.replace('-section', '');
            
            // Update active state for filter buttons
            this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            showSectionLoading(sectionElement.id, 'جاري تصفية البيانات...');
            try {
                switch(sectionId) {
                    case 'users':
                        const usersResult = await getAllUsers();
                        if (usersResult.success) {
                            let filteredUsers = usersResult.users;
                            if (filter === 'admins') filteredUsers = usersResult.users.filter(u => u.isAdmin);
                            else if (filter === 'subscribers') filteredUsers = usersResult.users.filter(u => u.isSubscribed);
                            else if (filter === 'regular') filteredUsers = usersResult.users.filter(u => !u.isAdmin && !u.isSubscribed);
                            // 'all' case needs no filtering
                            displayUsers(filteredUsers);
                        }
                        break;
                    case 'subscriptions':
                        const subscriptionsResult = await getAllSubscriptions();
                        if (subscriptionsResult.success) {
                            let filteredSubs = subscriptionsResult.subscriptions;
                            if (filter === 'active') filteredSubs = subscriptionsResult.subscriptions.filter(s => s.status === 'active');
                            else if (filter === 'expired') filteredSubs = subscriptionsResult.subscriptions.filter(s => s.status === 'expired');
                            displaySubscriptions(filteredSubs);
                        }
                        break;
                    case 'cars':
                        let carFilter = {};
                        if (filter !== 'all') carFilter = { status: filter };
                        const carsResult = await getCarListings(carFilter, 'createdAt', 'desc', 100);
                        if (carsResult.success) displayCars(carsResult.cars);
                        break;
                }
            } catch (error) {
                console.error(`Error filtering ${sectionId}:`, error);
                showError('حدث خطأ أثناء تصفية البيانات');
            } finally {
                hideSectionLoading(sectionElement.id);
            }
        });
    });

    // REMOVED: Listener for addSubscriptionBtn
    // REMOVED: Listener for createReportBtn
    // REMOVED: Listener for old saveChangesBtn

    // Save Settings button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async function() {
            showLoading('جاري حفظ الإعدادات...');
            try {
                const settingsData = {
                    siteName: document.getElementById('siteName')?.value || '',
                    siteDescription: document.getElementById('siteDescription')?.value || '',
                    contactEmail: document.getElementById('contactEmail')?.value || '',
                    contactPhone: document.getElementById('contactPhone')?.value || '',
                    subscriptionPrice: parseFloat(document.getElementById('subscriptionPrice')?.value || 0),
                    subscriptionDuration: parseInt(document.getElementById('subscriptionDuration')?.value || 0),
                    maxListings: parseInt(document.getElementById('maxListings')?.value || 0),
                    updatedAt: serverTimestamp() 
                };
                
                const settingsRef = doc(db, 'settings', 'config'); // Storing settings in settings/config doc
                await setDoc(settingsRef, settingsData, { merge: true }); 

                showSuccess('تم حفظ الإعدادات بنجاح!');
            } catch (error) {
                console.error('Error saving settings:', error);
                showError('حدث خطأ أثناء حفظ الإعدادات.');
            } finally {
                hideLoading();
            }
        });
    }
    
    // Search inputs
    const searchInputs = document.querySelectorAll('.admin-search input'); // Check class
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const section = this.closest('.admin-section');
            if (!section) return;
            const tableRows = section.querySelectorAll('tbody tr');
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    });

    // Event Delegation for Table Actions (Users, Cars, Subscriptions)
    const adminContent = document.querySelector('.admin-content');
    if (adminContent) {
        adminContent.addEventListener('click', function(e) {
            const target = e.target.closest('button');
            if (!target) return;

            const tableAction = target.closest('.table-actions');
            const reviewAction = target.closest('.car-review-actions');

            if (tableAction) { // Handle actions within tables
                const id = target.dataset.id;
                if (!id) return;

                if (target.matches('.view-user-btn, .view')) { 
                    viewUserDetails(id); 
                }
                else if (target.matches('.edit-user-btn, .edit')) { 
                    editUserDetails(id); 
                }
                else if (target.matches('.delete-user-btn, .delete')) { 
                    deleteUser(id); 
                }
                else if (target.matches('.admin-toggle-btn')) { 
                    const isAdmin = target.dataset.status === 'true';
                    toggleAdminStatus(id, isAdmin);
                }
                else if (target.matches('.give-subscription-btn')) { 
                    giveFreeSubscription(id); 
                }
                else if (target.matches('.view-car-btn')) { 
                    viewCarDetails(id); 
                }
                else if (target.matches('.edit-car-btn')) { 
                    editCarDetails(id); 
                }
                else if (target.matches('.delete-car-btn')) { 
                    deleteCar(id); 
                }
                else if (target.matches('.view-sub-btn')) { 
                    viewSubscriptionDetails(id); 
                }
            }
            else if (reviewAction) { // Handle actions within review cards
                const carId = target.dataset.id;
                if (target.matches('.approve-car-btn')) { 
                    approveCar(carId); 
                }
                else if (target.matches('.reject-car-btn')) { 
                    rejectCar(carId); 
                }
                else if (target.matches('.view-car-btn')) { 
                    viewCarDetails(carId); 
                }
            }
        });
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        showSectionLoading('dashboard-section', 'جاري تحميل بيانات لوحة المعلومات...');
        console.log('Loading dashboard data...');
        const [usersResult, carsResult, subscriptionsResult] = await Promise.all([
            getAllUsers(),
            getCarListings({}, 'createdAt', 'desc', 100), // Load recent 100 cars for dashboard
            getAllSubscriptions()
        ]);

        console.log('Cars result:', carsResult);
        console.log('Users result:', usersResult);
        if (usersResult.success && carsResult.success && subscriptionsResult.success) {
            updateDashboardStats(usersResult.users, carsResult.cars, subscriptionsResult.subscriptions);
            displayRecentItems(usersResult.users, carsResult.cars);
            // Display cars in the cars section
            displayCars(carsResult.cars);
            // Display users in the users management section
            displayUsers(usersResult.users);
        } else {
            showError('فشل تحميل بعض بيانات لوحة التحكم.');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('حدث خطأ فادح أثناء تحميل لوحة التحكم.');
    } finally {
        hideSectionLoading('dashboard-section');
    }
}

// Update Dashboard Stats
function updateDashboardStats(users = [], cars = [], subscriptions = []) {
    updateStatCard('totalUsers', users.length);
    updateStatCard('totalCars', cars.length);
    const pendingCars = cars.filter(car => car.status === 'waiting'); // Only waiting
    updateStatCard('pendingCars', pendingCars.length);
    const activeCars = cars.filter(car => car.status === 'active');
    updateStatCard('activeCars', activeCars.length);
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    updateStatCard('activeSubscriptions', activeSubscriptions.length);
    // Calculate revenue (ensure subscription objects have 'amount')
    const revenue = activeSubscriptions.reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
    updateStatCard('totalRevenue', formatCurrency(revenue)); // Ensure formatCurrency is robust
}

// Update Stat Card Helper
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Dashboard stat card element with ID '${id}' not found.`);
    }
}

// Display Recent Items on Dashboard Tables
function displayRecentItems(users = [], cars = []) {
    // Display recent cars (e.g., latest 5)
    const recentCarsTableBody = document.querySelector('#recentCarsTable tbody');
    if (recentCarsTableBody) {
        const recentCars = cars.slice(0, 5);
        recentCarsTableBody.innerHTML = ''; // Clear existing
        recentCars.forEach(car => addCarRow(car, recentCarsTableBody));
    }
    // Display recent users (e.g., latest 5)
    const recentUsersTableBody = document.querySelector('#recentUsersTable tbody');
    if (recentUsersTableBody) {
        const recentUsers = users.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)).slice(0, 5);
        recentUsersTableBody.innerHTML = ''; // Clear existing
        recentUsers.forEach(user => addUserRow(user, recentUsersTableBody));
    }
}

// Load Pending Cars for Review Section
async function loadPendingCars() {
    try {
        showSectionLoading('pending-section', 'جاري تحميل السيارات المعلقة...');
        console.log('Loading pending cars...');
        
        // Get cars with 'pending' status
        const pendingResult = await getCarListings({ status: 'pending' }, 'createdAt', 'asc');
        // Get cars with 'waiting' status
        const waitingResult = await getCarListings({ status: 'waiting' }, 'createdAt', 'asc');
        
        console.log('Pending cars result:', pendingResult);
        console.log('Waiting cars result:', waitingResult);
        
        if (pendingResult.success && waitingResult.success) {
            // Combine both results
            const allPendingCars = [...pendingResult.cars, ...waitingResult.cars];
            // Sort by creation date
            allPendingCars.sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
            displayPendingCars(allPendingCars);
        } else {
            showError('حدث خطأ أثناء تحميل السيارات المعلقة.');
        }
    } catch (error) {
        console.error('Error loading pending cars:', error);
        showError('حدث خطأ أثناء تحميل السيارات المعلقة.');
    } finally {
        hideSectionLoading('pending-section');
    }
}

// Display Pending Cars as Cards
function displayPendingCars(cars = []) {
    const container = document.getElementById('pendingCarsContainer');
    if (!container) return;
    container.innerHTML = ''; // Clear previous cards
    if (cars.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>لا توجد سيارات معلقة للمراجعة</h3></div>`;
        return;
    }
    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'car-review-card';
        const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'images/car-placeholder.jpg';
        card.innerHTML = `
            <div class="car-review-image"><img src="${mainImage}" alt="${car.title}"></div>
            <div class="car-review-content">
                <h3 class="car-review-title">${car.title || 'N/A'}</h3>
                <div class="car-review-details">
                    <div><i class="fas fa-car"></i> ${car.make || ''} ${car.model || ''}</div>
                    <div><i class="fas fa-calendar"></i> ${car.year || ''}</div>
                    <div><i class="fas fa-money-bill-wave"></i> ${formatCurrency(car.price)}</div>
                    <div><i class="fas fa-user"></i> ${car.contactName || ''}</div>
                    <div><i class="fas fa-phone"></i> ${car.contactPhone || ''}</div>
                    <div><i class="fas fa-clock"></i> ${formatDate(car.createdAt)}</div>
                </div>
                <div class="car-review-description">${car.description || ''}</div>
                <div class="car-review-actions">
                    <button class="btn btn-sm btn-primary view-car-btn" data-id="${car.id}"><i class="fas fa-eye"></i> عرض</button>
                    <button class="btn btn-sm btn-success approve-car-btn" data-id="${car.id}"><i class="fas fa-check"></i> قبول</button>
                    <button class="btn btn-sm btn-danger reject-car-btn" data-id="${car.id}"><i class="fas fa-times"></i> رفض</button>
                </div>
            </div>`;
        container.appendChild(card);
    });
}

// Approve Car
async function approveCar(carId) {
    showLoading('جاري قبول السيارة...');
    try {
        const result = await updateCarListing(carId, { status: 'active' });
        if (result.success) {
            showSuccess('تم قبول السيارة بنجاح!');
            await loadPendingCars(); // Refresh pending list
            await loadDashboardData(); // Refresh dashboard stats
        } else {
            showError(result.error || 'فشل قبول السيارة.');
        }
    } catch (error) {
        console.error('Error approving car:', error);
        showError('حدث خطأ أثناء قبول السيارة.');
    } finally {
        hideLoading();
    }
}

// Reject Car
async function rejectCar(carId) {
    if (!confirm('هل أنت متأكد من رفض هذه السيارة؟')) return;
    showLoading('جاري رفض السيارة...');
    try {
        const result = await updateCarListing(carId, { status: 'rejected' });
        if (result.success) {
            showSuccess('تم رفض السيارة بنجاح!');
            await loadPendingCars(); // Refresh pending list
            await loadDashboardData(); // Refresh dashboard stats
        } else {
            showError(result.error || 'فشل رفض السيارة.');
        }
    } catch (error) {
        console.error('Error rejecting car:', error);
        showError('حدث خطأ أثناء رفض السيارة.');
    } finally {
        hideLoading();
    }
}

// Display Users in Table
function displayUsers(users = []) {
    const tableBody = document.querySelector('#usersTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    users.forEach(user => addUserRow(user, tableBody));
}

// Add User Row Helper
function addUserRow(user, tableBody) {
    if (!user || !tableBody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${user.name || user.email.split('@')[0]}</td>
        <td>${user.email || ''}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${user.location || 'N/A'}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td>${user.isSubscribed ? '<span class="status-badge active">مشترك</span>' : '<span class="status-badge inactive">غير مشترك</span>'}</td>
        <td>${user.isAdmin ? '<span class="status-badge active">مشرف</span>' : '<span class="status-badge inactive">مستخدم</span>'}</td>
        <td>
            <div class="table-actions">
                <button class="table-action view view-user-btn" title="عرض" data-id="${user.uid || user.id}"><i class="fas fa-eye"></i></button>
                <button class="table-action edit edit-user-btn" title="تعديل" data-id="${user.uid || user.id}"><i class="fas fa-edit"></i></button>
                <button class="table-action delete delete-user-btn" title="حذف" data-id="${user.uid || user.id}"><i class="fas fa-trash"></i></button>
                <button class="btn btn-sm ${user.isAdmin ? 'btn-warning' : 'btn-success'} admin-toggle-btn" data-id="${user.uid || user.id}" data-status="${user.isAdmin}">
                    <i class="fas fa-user-shield"></i> ${user.isAdmin ? 'إزالة الأدمن' : 'منح الأدمن'}
                </button>
                ${!user.isSubscribed ? `<button class="btn btn-sm btn-info give-subscription-btn" data-id="${user.uid || user.id}"><i class="fas fa-star"></i> منح اشتراك</button>` : ''}
                ${user.isSubscribed ? `<button class="btn btn-danger btn-sm remove-subscription-btn" data-id="${user.uid || user.id}">سحب الاشتراك</button>` : ''}
            </div>
        </td>
    `;
    tableBody.appendChild(tr);
}

// User Details Modal Logic
const userModal = document.getElementById('userModal');
const closeUserModal = document.getElementById('closeUserModal');
const cancelUserModal = document.getElementById('cancelUserModal');
const userModalForm = document.getElementById('userModalForm');
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserPhone = document.getElementById('modalUserPhone');
const modalUserLocation = document.getElementById('modalUserLocation');
let currentEditUserId = null;

function openUserModal(user, isEditMode = false) {
    if (!user || !userModal || !userModalForm) return;
    currentEditUserId = user.uid;
    modalUserName.value = user.name || '';
    modalUserEmail.value = user.email || '';
    modalUserPhone.value = user.phone || '';
    modalUserLocation.value = user.location || '';

    // Disable/enable fields
    modalUserName.disabled = !isEditMode;
    modalUserEmail.disabled = true; // Email cannot be edited
    modalUserPhone.disabled = !isEditMode;
    modalUserLocation.disabled = !isEditMode;

    userModalForm.querySelector('button[type="submit"]').style.display = isEditMode ? 'inline-block' : 'none';
    userModal.style.display = 'flex'; // Use flex for centering
    document.body.style.overflow = 'hidden';
}

if (closeUserModal) closeUserModal.onclick = () => { userModal.style.display = 'none'; document.body.style.overflow = ''; currentEditUserId = null; };
if (cancelUserModal) cancelUserModal.onclick = () => { userModal.style.display = 'none'; document.body.style.overflow = ''; currentEditUserId = null; };

if (userModalForm) {
    userModalForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentEditUserId) return;
        const updatedData = {
            name: modalUserName.value.trim(),
            phone: modalUserPhone.value.trim(),
            location: modalUserLocation.value.trim()
        };
        showLoading('جاري حفظ التعديلات...');
        try {
            const result = await updateUserProfile(currentEditUserId, updatedData);
            if (result.success) {
                showSuccess('تم حفظ التغييرات بنجاح!');
                userModal.style.display = 'none';
                document.body.style.overflow = '';
                // Reload users list to reflect changes
                const usersResult = await getAllUsers();
                if (usersResult.success) displayUsers(usersResult.users);
            } else {
                showError(result.error || 'فشل حفظ التعديلات.');
            }
        } catch (error) {
            logError(error, 'saveUserModal');
            showError('حدث خطأ أثناء حفظ التعديلات.');
        } finally {
            hideLoading();
            currentEditUserId = null;
        }
    };
}

// View/Edit User Actions
async function viewUserDetails(userId) {
    showLoading('جاري تحميل بيانات المستخدم...');
    try {
        const result = await getUserData(userId);
        if (result.success) {
            openUserModal({ ...result.userData, uid: userId }, false); // View mode
        } else {
            showError('تعذر جلب بيانات المستخدم.');
        }
    } catch (error) { logError(error, 'viewUserDetails'); showError('خطأ في عرض بيانات المستخدم.'); } finally { hideLoading(); }
}

async function editUserDetails(userId) {
    showLoading('جاري تحميل بيانات المستخدم للتعديل...');
    try {
        const result = await getUserData(userId);
        if (result.success) {
            openUserModal({ ...result.userData, uid: userId }, true); // Edit mode
        } else {
            showError('تعذر جلب بيانات المستخدم.');
        }
    } catch (error) { logError(error, 'editUserDetails'); showError('خطأ في تحميل بيانات المستخدم للتعديل.'); } finally { hideLoading(); }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم نهائيًا؟ لا يمكن التراجع عن هذه العملية!')) {
        return;
    }

    try {
        console.log('Starting admin user deletion process for user:', userId);
        
        // First delete all user's cars
        console.log('Deleting user cars...');
        const deleteCarsResult = await deleteUserCars(userId);
        if (!deleteCarsResult.success) {
            console.error('Failed to delete cars:', deleteCarsResult.error);
            showError('حدث خطأ أثناء حذف إعلانات السيارات: ' + deleteCarsResult.error);
            return;
        }
        console.log('Successfully deleted all user cars');

        // Delete user document from Firestore
        console.log('Deleting user document from Firestore...');
        try {
            const userDocRef = doc(db, "users", userId);
            await deleteDoc(userDocRef);
            console.log('Successfully deleted user document from Firestore');
        } catch (firestoreError) {
            console.error('Error deleting user document:', firestoreError);
            showError('حدث خطأ أثناء حذف بيانات المستخدم: ' + firestoreError.message);
            return;
        }

        // Delete user from Firebase Auth
        console.log('Deleting user authentication account...');
        try {
            // Get the current user's token
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }

            // Create a custom token for admin operations
            const adminToken = await currentUser.getIdToken(true);
            
            // Make a request to your backend endpoint
            const response = await fetch(`${currentConfig.apiUrl}/delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

            console.log('Successfully deleted user authentication account');
            showSuccess('تم حذف المستخدم وجميع بياناته بنجاح.');
            
            // Refresh the users list
            const usersResult = await getAllUsers();
            if (usersResult.success) displayUsers(usersResult.users);
        } catch (authError) {
            console.error('Error deleting auth account:', authError);
            showError('حدث خطأ أثناء حذف حساب المستخدم: ' + authError.message);
        }
    } catch (error) {
        console.error('Error in admin user deletion process:', error);
        showError('حدث خطأ أثناء حذف المستخدم: ' + error.message);
    }
}

// Give Free Subscription
async function giveFreeSubscription(userId) {
    if (!confirm('هل أنت متأكد من منح اشتراك مجاني لهذا المستخدم؟')) return;
    showLoading('جاري منح الاشتراك...');
    try {
        const result = await updateUserProfile(userId, { isSubscribed: true, subscriptionEndDate: null }); // Or set an end date
        if (result.success) {
            showSuccess('تم منح الاشتراك المجاني بنجاح!');
            const usersResult = await getAllUsers(); // Refresh list
            if (usersResult.success) displayUsers(usersResult.users);
        } else {
            showError(result.error || 'فشل منح الاشتراك.');
        }
    } catch (error) {
        logError(error, 'giveFreeSubscription');
        showError('حدث خطأ أثناء منح الاشتراك.');
    } finally {
        hideLoading();
    }
}

// Toggle Admin Status
async function toggleAdminStatus(userId, currentIsAdmin) {
    const actionText = currentIsAdmin ? 'إزالة صلاحية الأدمن' : 'منح صلاحية الأدمن';
    if (!confirm(`هل أنت متأكد من ${actionText} لهذا المستخدم؟`)) return;
    showLoading(`جاري ${actionText}...`);
    try {
        // IMPORTANT: Setting admin status client-side is insecure.
        // Use a backend function (Firebase Functions) to verify the caller is an admin
        // and then set custom claims or update Firestore securely.
        const result = await updateUserProfile(userId, { isAdmin: !currentIsAdmin });
        // Example backend call: await setAdminClaim(userId, !currentIsAdmin);
        if (result.success) {
            showSuccess(`تم ${actionText} بنجاح!`);
            const usersResult = await getAllUsers(); // Refresh list
            if (usersResult.success) displayUsers(usersResult.users);
        } else {
            showError(result.error || `فشل ${actionText}.`);
        }
    } catch (error) {
        logError(error, 'toggleAdminStatus');
        showError(`حدث خطأ أثناء ${actionText}.`);
    } finally {
        hideLoading();
    }
}

// Display Cars in Table
function displayCars(cars = []) {
    console.log('Displaying cars:', cars);
    const tableBody = document.querySelector('#carsTable tbody');
    console.log('Cars table body element:', tableBody);
    if (!tableBody) {
        console.error('Cars table body not found!');
        return;
    }
    tableBody.innerHTML = '';
    cars.forEach(car => addCarRow(car, tableBody));
}

// Add Car Row Helper
function addCarRow(car, tableBody) {
    if (!car || !tableBody) return;
    const tr = document.createElement('tr');
    let statusClass = 'inactive';
    let statusText = car.status ? car.status : 'غير محدد'; // Default text
    switch (car.status) {
        case 'active': statusClass = 'active'; statusText = 'نشط'; break;
        case 'pending': case 'waiting': statusClass = 'pending'; statusText = 'معلق'; break;
        case 'rejected': statusClass = 'inactive'; statusText = 'مرفوض'; break;
        case 'sold': statusClass = 'inactive'; statusText = 'مباع'; break;
    }
    tr.innerHTML = `
        <td>${car.title || 'N/A'}</td>
        <td>${getEnglishMake(car.make) || ''} ${car.model || ''}</td>
        <td>${car.year || 'N/A'}</td>
        <td>${formatCurrency(car.price)}</td>
        <td>${car.contactName || 'N/A'}</td>
        <td>${formatDate(car.createdAt)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="table-actions">
                <button class="table-action view view-car-btn" data-id="${car.id}" title="عرض"><i class="fas fa-eye"></i></button>
                <button class="table-action edit edit-car-btn" data-id="${car.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="table-action delete delete-car-btn" data-id="${car.id}" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    `;
    tableBody.appendChild(tr);

    // Add event listeners for the buttons
    const viewBtn = tr.querySelector('.view-car-btn');
    const editBtn = tr.querySelector('.edit-car-btn');
    const deleteBtn = tr.querySelector('.delete-car-btn');

    if (viewBtn) {
        viewBtn.addEventListener('click', () => viewCarDetails(car.id));
    }
    if (editBtn) {
        editBtn.addEventListener('click', () => editCarDetails(car.id));
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteCar(car.id));
    }
}

// View Car Details (Action)
async function viewCarDetails(carId) {
    showLoading('جاري تحميل بيانات السيارة...');
    try {
        console.log('Fetching car details for:', carId);
        const carDataResult = await getCarDetails(carId);
        if (carDataResult.success) {
            // Open in the same tab instead of new tab
            window.location.href = `car-detail.html?id=${carId}`;
        } else {
            showError('تعذر جلب بيانات السيارة.');
        }
    } catch (error) {
        showError('حدث خطأ أثناء جلب بيانات السيارة.');
    } finally {
        hideLoading();
    }
}

// Edit Car Details (Action)
async function editCarDetails(carId) {
    showLoading('جاري تحميل بيانات السيارة للتعديل...');
    try {
        console.log('Fetching car details for edit:', carId);
        const carDataResult = await getCarDetails(carId);
        if (carDataResult.success) {
            // Store data temporarily if needed by sell.html or pass via state/params
            localStorage.setItem('editCarData', JSON.stringify({ id: carId, ...carDataResult.car }));
            window.location.href = `sell.html?edit=true&id=${carId}`;
        } else {
            showError('تعذر جلب بيانات السيارة.');
        }
    } catch(error) {
        showError('خطأ في تحميل بيانات السيارة للتعديل.');
    } finally {
        hideLoading();
    }
}

// Delete Car
async function deleteCar(carId) {
    if (!confirm('هل أنت متأكد من حذف هذه السيارة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    showLoading('جاري حذف السيارة...');
    try {
        const result = await deleteCarListing(carId); // Ensure this handles storage deletion too
        if (result.success) {
            showSuccess('تم حذف السيارة بنجاح!');
            // Refresh car list and dashboard
            const carsResult = await getCarListings({}, 'createdAt', 'desc', 100);
            if (carsResult.success) displayCars(carsResult.cars);
            await loadDashboardData();
        } else {
            showError(result.error || 'فشل حذف السيارة.');
        }
    } catch (error) {
        logError(error, 'deleteCar');
        showError('حدث خطأ أثناء حذف السيارة.');
    } finally {
        hideLoading();
    }
}

// Display Subscriptions
function displaySubscriptions(subscriptions = []) {
    console.log("Subscriptions to display:", subscriptions);
    const tableBody = document.querySelector('#subscriptionsTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    subscriptions.forEach(sub => addSubscriptionRow(sub, tableBody));
    // Store globally if needed for view details modal
    window.currentSubscriptions = subscriptions;
}

// Add Subscription Row Helper
function addSubscriptionRow(sub, tableBody) {
    if (!sub || !tableBody) return;
    const tr = document.createElement('tr');
    const statusClass = sub.status === 'active' ? 'active' : 'inactive';
    const statusText = sub.status === 'active' ? 'نشط' : 'منتهي';
    tr.innerHTML = `
        <td>${sub.userName || sub.userId}</td>
        <td>${sub.planName || 'Basic'}</td> 
        <td>${formatCurrency(sub.amount)}</td>
        <td>${formatDate(sub.startDate)}</td>
        <td>${formatDate(sub.endDate)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="table-actions">
                 <button class="table-action view view-sub-btn" data-id="${sub.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                 <!-- Add edit/delete if needed -->
            </div>
        </td>
    `;
    tableBody.appendChild(tr);
}

// View Subscription Details (using modal)
const subscriptionModal = document.getElementById('subscriptionModal'); // Ensure this modal exists in HTML
const closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
const cancelSubscriptionModal = document.getElementById('cancelSubscriptionModal');

function viewSubscriptionDetails(subscriptionId) {
    const subscription = window.currentSubscriptions?.find(sub => sub.id === subscriptionId);
    if (subscription && subscriptionModal) {
        // Populate modal fields (ensure elements exist)
        document.getElementById('modalSubscriptionUser').textContent = subscription.userName || subscription.userId;
        document.getElementById('modalSubscriptionPlan').textContent = subscription.planName || 'Basic';
        document.getElementById('modalSubscriptionAmount').textContent = formatCurrency(subscription.amount);
        document.getElementById('modalSubscriptionStart').textContent = formatDate(subscription.startDate);
        document.getElementById('modalSubscriptionEnd').textContent = formatDate(subscription.endDate);
        document.getElementById('modalSubscriptionStatus').textContent = subscription.status === 'active' ? 'نشط' : 'منتهي';
        
        subscriptionModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        showError('تعذر العثور على تفاصيل الاشتراك.');
    }
}

if (closeSubscriptionModal) closeSubscriptionModal.onclick = () => { subscriptionModal.style.display = 'none'; document.body.style.overflow = ''; };
if (cancelSubscriptionModal) cancelSubscriptionModal.onclick = () => { subscriptionModal.style.display = 'none'; document.body.style.overflow = ''; };

// Add other functions like updateCharts if they exist

console.log("Admin Enhanced Script Loaded");

// Add event delegation for remove subscription
if (typeof window !== 'undefined') {
    document.addEventListener('click', async function(e) {
        const target = e.target.closest('.remove-subscription-btn');
        if (target) {
            const userId = target.dataset.id;
            if (!userId) return;
            if (!confirm('هل أنت متأكد من سحب الاشتراك من هذا المستخدم؟')) return;
            try {
                showLoading('جاري سحب الاشتراك...');
                await updateUserProfile(userId, { isSubscribed: false });
                showSuccess('تم سحب الاشتراك بنجاح!');
                // Refresh users list
                const usersResult = await getAllUsers();
                if (usersResult.success) displayUsers(usersResult.users);
            } catch (error) {
                showError('حدث خطأ أثناء سحب الاشتراك');
            } finally {
                hideLoading();
            }
        }
    });
}

