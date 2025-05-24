// Profile page JavaScript file
import { getCurrentUser, getUserData, getUserSubscription, getCarListings, cancelSubscription, updateUserProfile, deleteCarListing, uploadImageToCloudinary, deleteUserCars } from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, deleteDoc, getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

document.addEventListener('DOMContentLoaded', async function() {
    // Check for reauth param to auto-delete account after re-authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reauth') === '1') {
        const user = await getCurrentUser();
        if (user) {
            user.delete().then(() => {
                showSuccess('تم حذف الحساب بنجاح.');
                firebase.auth().signOut().then(() => {
                    setTimeout(() => { window.location.href = 'auth.html'; }, 1500);
                });
            }).catch((error) => {
                showError('حدث خطأ أثناء حذف الحساب: ' + error.message);
                console.error('Delete account error:', error);
            });
        }
    }
    // Redirect to login if not authenticated
    if (window.firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) {
                window.location.href = 'auth.html';
            }
        });
    }
    // Check if we're on the profile page
    const isProfilePage = window.location.pathname.includes('profile.html');
    
    if (isProfilePage) {
        initProfilePage();
        // Add event listener for Edit Profile button to switch to settings tab
        document.addEventListener('click', function(e) {
            const target = e.target.closest('#editProfileBtn');
            if (target) {
                e.preventDefault();
                // Remove active from all tabs and contents
                document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                // Add active to settings tab and content
                const settingsTab = document.querySelector('.profile-tab[data-tab="settings"]');
                const settingsContent = document.getElementById('settings-tab');
                if (settingsTab) settingsTab.classList.add('active');
                if (settingsContent) settingsContent.classList.add('active');
                // Scroll to settings section
                if (settingsContent) {
                    settingsContent.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
        // Add event listener for Delete Account button in settings
        document.addEventListener('click', async function(e) {
            const btn = e.target.closest('#deleteAccountBtn');
            if (btn) {
                e.preventDefault();
                if (confirm('هل أنت متأكد أنك تريد حذف الحساب نهائيًا؟ لا يمكن التراجع عن هذه العملية!')) {
                    const user = await getCurrentUser();
                    if (user) {
                        try {
                            console.log('Starting account deletion process for user:', user.uid);
                            
                            // First delete all user's cars
                            console.log('Deleting user cars...');
                            const deleteCarsResult = await deleteUserCars(user.uid);
                            if (!deleteCarsResult.success) {
                                console.error('Failed to delete cars:', deleteCarsResult.error);
                                showError('حدث خطأ أثناء حذف إعلانات السيارات: ' + deleteCarsResult.error);
                                return;
                            }
                            console.log('Successfully deleted all user cars');

                            // Delete user document from Firestore
                            console.log('Deleting user document from Firestore...');
                            try {
                                const userDocRef = doc(db, "users", user.uid);
                                await deleteDoc(userDocRef);
                                console.log('Successfully deleted user document from Firestore');
                            } catch (firestoreError) {
                                console.error('Error deleting user document:', firestoreError);
                                showError('حدث خطأ أثناء حذف بيانات المستخدم: ' + firestoreError.message);
                                return;
                            }

                            // Then delete the user account from Firebase Auth
                            console.log('Deleting user authentication account...');
                            try {
                                await user.delete();
                                console.log('Successfully deleted user authentication account');
                                
                                showSuccess('تم حذف الحساب وجميع إعلانات السيارات بنجاح.');
                                setTimeout(() => { window.location.href = 'auth.html'; }, 1500);
                            } catch (authError) {
                                console.error('Error deleting auth account:', authError);
                                if (authError.code === 'auth/requires-recent-login') {
                                    showError('لأسباب أمنية، يجب تسجيل الدخول مجددًا قبل حذف الحساب. سيتم تحويلك إلى صفحة تسجيل الدخول.');
                                    setTimeout(() => { window.location.href = 'auth.html?reauth=1'; }, 2000);
                                } else {
                                    showError('حدث خطأ أثناء حذف الحساب: ' + authError.message);
                                }
                            }
                        } catch (error) {
                            console.error('Error in account deletion process:', error);
                            showError('حدث خطأ أثناء حذف الحساب: ' + error.message);
                        }
                    } else {
                        showError('تعذر العثور على المستخدم الحالي. يرجى إعادة تسجيل الدخول.');
                    }
                }
            }
        });
    }
});

// Initialize Profile Page
async function initProfilePage() {
    try {
        // Check if user is logged in
        const user = await getCurrentUser();
        
        if (!user) {
            // Redirect to login page
            window.location.href = 'auth.html?redirect=profile';
            return;
        }
        
        // Show loading state
        showLoading();
        
        // Get user data
        const userData = await getUserData(user.uid);
        
        if (!userData.success) {
            showError('حدث خطأ أثناء تحميل بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
            hideLoading();
            return;
        }
        
        // Display user profile
        displayUserProfile(userData.userData);
        
        // Initialize tabs
        initTabs();
        
        // Load user cars
        loadUserCars(user.uid);
        
        // Load user subscription
        loadUserSubscription(user.uid);
        
        // Initialize profile form
        initProfileForm(userData.userData);
        
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Display User Profile
function displayUserProfile(userData) {
    // Update user name
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = userData.name;
    }
    
    // Update user email
    const userEmail = document.getElementById('userEmail');
    if (userEmail) {
        userEmail.textContent = userData.email;
    }
    
    // Update user phone
    const userPhone = document.getElementById('userPhone');
    if (userPhone) {
        userPhone.textContent = userData.phone || 'غير متوفر';
    }
    
    // Update user location
    const userLocation = document.getElementById('userLocation');
    if (userLocation) {
        userLocation.textContent = userData.location || 'غير متوفر';
    }
    
    // Update user join date
    const userJoinDate = document.getElementById('userJoinDate');
    if (userJoinDate && userData.createdAt) {
        userJoinDate.textContent = formatDate(userData.createdAt);
    }
    
    // Update subscription status
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    if (subscriptionStatus) {
        if (userData.isSubscribed) {
            subscriptionStatus.textContent = 'مشترك';
            subscriptionStatus.className = 'status active';
        } else {
            subscriptionStatus.textContent = 'غير مشترك';
            subscriptionStatus.className = 'status inactive';
        }
    }
    
    // Update subscription end date
    const subscriptionEndDate = document.getElementById('subscriptionEndDate');
    if (subscriptionEndDate) {
        if (userData.isSubscribed && userData.subscriptionEnd) {
            subscriptionEndDate.textContent = formatDate(userData.subscriptionEnd);
        } else {
            subscriptionEndDate.textContent = 'غير متوفر';
        }
    }
    
    // Update profile avatar
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarPreview = document.getElementById('avatarPreview');
    const userAvatar = document.getElementById('userAvatar');
    const avatarUrl = userData.photoURL || 'images/user-avatar.jpg';
    if (profileAvatar) {
        profileAvatar.src = avatarUrl;
    }
    if (avatarPreview) {
        avatarPreview.src = avatarUrl;
    }
    if (userAvatar) {
        userAvatar.src = avatarUrl;
    }
    // Update all user-avatar images (header, dropdown, etc)
    document.querySelectorAll('.user-avatar, #userAvatar, #profileAvatar, #avatarPreview').forEach(img => {
        img.src = avatarUrl;
    });
}

// Initialize Tabs
function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabLinks.length || !tabContents.length) return;
    
    // Check if tab is specified in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    // Show specified tab or first tab by default
    if (tabParam) {
        showTab(tabParam);
    } else {
        tabLinks[0].classList.add('active');
        tabContents[0].classList.add('active');
    }
    
    // Add click event to tab links
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get tab ID from data attribute
            const tabId = this.getAttribute('data-tab');
            
            // Show tab
            showTab(tabId);
            
            // Update URL without reloading
            const url = new URL(window.location);
            url.searchParams.set('tab', tabId);
            window.history.pushState({}, '', url);
        });
    });
}

// Show Tab
function showTab(tabId) {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all tabs
    tabLinks.forEach(link => link.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    const selectedLink = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`${tabId}Tab`);
    
    if (selectedLink && selectedContent) {
        selectedLink.classList.add('active');
        selectedContent.classList.add('active');
    }
}

// Load User Cars
async function loadUserCars(userId) {
    try {
        // Get user cars
        const result = await getCarListings({ userId });
        console.log('loadUserCars: getCarListings result:', result); // Debug log
        
        if (result.success) {
            // Display user cars
            displayUserCars(result.cars);
        } else {
            showError(result.error || 'حدث خطأ أثناء تحميل سيارات المستخدم. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error loading user cars:', error);
        showError('حدث خطأ أثناء تحميل سيارات المستخدم. يرجى المحاولة مرة أخرى.');
    }
}

// Display User Cars
function displayUserCars(cars) {
    const carsContainer = document.getElementById('userCars');
    console.log('displayUserCars: cars:', cars); // Debug log
    
    if (!carsContainer) return;
    
    // Clear cars container
    carsContainer.innerHTML = '';
    
    // Check if no cars
    if (cars.length === 0) {
        carsContainer.innerHTML = `
            <div class="no-cars">
                <i class="fas fa-car"></i>
                <h3>لا توجد سيارات</h3>
                <p>لم تقم بإضافة أي سيارات للبيع بعد.</p>
                <a href="sell.html" class="btn btn-primary">بيع سيارتك الآن</a>
            </div>
        `;
        return;
    }
    
    // Create car cards
    cars.forEach(car => {
        console.log('displayUserCars: car:', car); // Debug log
        const carCard = createCarCard(car);
        carsContainer.appendChild(carCard);
    });
}

// Create Car Card
function createCarCard(car) {
    const carCard = document.createElement('div');
    carCard.className = 'car-card';
    
    // Get main image or placeholder
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'images/car-placeholder.jpg';
    
    // Format price
    const formattedPrice = formatCurrency(car.price);
    
    // Format date
    const formattedDate = formatDate(car.createdAt);

    // Determine status text and class
    let statusText = '';
    let statusClass = '';
    switch (car.status) {
        case 'active':
            statusText = 'نشط';
            statusClass = 'status-badge active';
            break;
        case 'waiting':
        case 'pending':
            statusText = 'قيد المراجعة';
            statusClass = 'status-badge pending';
            break;
        case 'rejected':
            statusText = 'مرفوض';
            statusClass = 'status-badge rejected';
            break;
        default:
            statusText = 'غير نشط';
            statusClass = 'status-badge inactive';
    }
    
    // Create card HTML
    carCard.innerHTML = `
        <div class="car-card-image">
            <img src="${mainImage}" alt="${car.title}">
            <span class="car-price">${formattedPrice}</span>
            <span class="${statusClass}">${statusText}</span>
        </div>
        <div class="car-card-content">
            <h3 class="car-title">
                <a href="car-detail.html?id=${car.id}">${car.title}</a>
            </h3>
            <div class="car-info">
                <span><i class="fas fa-calendar-alt"></i> ${car.year}</span>
                <span><i class="fas fa-tachometer-alt"></i> ${car.mileage} كم</span>
                <span><i class="fas fa-gas-pump"></i> ${car.fuelType}</span>
                <span><i class="fas fa-cog"></i> ${car.transmission}</span>
            </div>
            <div class="car-card-footer">
                <span class="car-date">${formattedDate}</span>
                <div class="car-actions">
                    <a href="car-detail.html?id=${car.id}" class="btn btn-sm btn-outline">
                        <i class="fas fa-eye"></i> عرض
                    </a>
                    <a href="sell.html?edit=${car.id}" class="btn btn-sm btn-outline">
                        <i class="fas fa-edit"></i> تعديل
                    </a>
                    <button class="btn btn-sm btn-danger delete-car-btn" data-id="${car.id}">
                        <i class="fas fa-trash-alt"></i> حذف
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener to delete button
    const deleteBtn = carCard.querySelector('.delete-car-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            confirmDeleteCar(carId);
        });
    }
    
    return carCard;
}

// Confirm Delete Car
function confirmDeleteCar(carId) {
    // Create confirmation modal if it doesn't exist
    let confirmModal = document.getElementById('confirmModal');
    
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'confirmModal';
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h3>تأكيد الحذف</h3>
                <p>هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</p>
                <div class="modal-buttons">
                    <button id="cancelDeleteBtn" class="btn btn-outline">إلغاء</button>
                    <button id="confirmDeleteBtn" class="btn btn-danger">حذف</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }
    
    // Get modal elements
    const modalClose = confirmModal.querySelector('.modal-close');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Add event listeners
    modalClose.addEventListener('click', closeModal);
    cancelDeleteBtn.addEventListener('click', closeModal);
    confirmDeleteBtn.addEventListener('click', function() {
        deleteCar(carId);
    });
    
    // Close modal when clicking outside
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            closeModal();
        }
    });
    
    // Store car ID in modal
    confirmModal.setAttribute('data-car-id', carId);
    
    // Show modal
    confirmModal.style.display = 'flex';
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
}

// Close Modal
function closeModal() {
    const confirmModal = document.getElementById('confirmModal');
    
    if (confirmModal) {
        confirmModal.style.display = 'none';
        
        // Enable body scroll
        document.body.style.overflow = 'auto';
    }
}

// Delete Car
async function deleteCar(carId) {
    try {
        // Show loading state
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';
        
        // Delete car
        const result = await deleteCarListing(carId);
        
        if (result.success) {
            // Show success message
            showSuccess('تم حذف الإعلان بنجاح!');
            
            // Close modal
            closeModal();
            
            // Reload user cars
            const user = await getCurrentUser();
            if (user) {
                loadUserCars(user.uid);
            }
        } else {
            showError(result.error || 'حدث خطأ أثناء حذف الإعلان. يرجى المحاولة مرة أخرى.');
            
            // Reset button
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'حذف';
        }
    } catch (error) {
        console.error('Error deleting car:', error);
        showError('حدث خطأ أثناء حذف الإعلان. يرجى المحاولة مرة أخرى.');
        
        // Reset button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'حذف';
        }
    }
}

// Load User Subscription
async function loadUserSubscription(userId) {
    try {
        // Get user subscription
        const result = await getUserSubscription(userId);
        console.log('Subscription result:', result); // Debug log
        
        if (result.success && result.subscription) {
            // Display user subscription
            displayUserSubscription(result.subscription);
        } else {
            // Display no subscription
            displayNoSubscription();
        }
    } catch (error) {
        console.error('Error loading user subscription:', error);
        // Display no subscription
        displayNoSubscription();
    }
}

// Display User Subscription
function displayUserSubscription(subscription) {
    const subscriptionContainer = document.getElementById('subscriptionDetails');
    
    if (!subscriptionContainer) {
        console.error('Subscription container not found');
        return;
    }
    
    // Format dates
    const startDate = formatDate(subscription.startDate);
    const endDate = formatDate(subscription.endDate);
    
    // Create subscription HTML
    const subscriptionHTML = `
        <div class="subscription-card">
            <div class="subscription-header">
                <h3>${subscription.planName || 'الباقة الأساسية'}</h3>
                <span class="subscription-status active">نشط</span>
            </div>
            <div class="subscription-details">
                <div class="subscription-info">
                    <span class="info-label">تاريخ البدء:</span>
                    <span class="info-value">${startDate}</span>
                </div>
                <div class="subscription-info">
                    <span class="info-label">تاريخ الانتهاء:</span>
                    <span class="info-value">${endDate}</span>
                </div>
                <div class="subscription-info">
                    <span class="info-label">المبلغ:</span>
                    <span class="info-value">${formatCurrency(subscription.amount || 0)}</span>
                </div>
                <div class="subscription-info">
                    <span class="info-label">طريقة الدفع:</span>
                    <span class="info-value">${subscription.paymentMethod || 'غير متوفر'}</span>
                </div>
                <div class="subscription-info">
                    <span class="info-label">التجديد التلقائي:</span>
                    <span class="info-value">${subscription.autoRenew ? 'مفعل' : 'غير مفعل'}</span>
                </div>
            </div>
            <div class="subscription-actions">
                <button id="cancelSubscriptionBtn" class="btn btn-danger">
                    <i class="fas fa-times"></i> إلغاء الاشتراك
                </button>
            </div>
        </div>
    `;
    
    // Update subscription container
    subscriptionContainer.innerHTML = subscriptionHTML;
    
    // Add event listener to cancel button
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    if (cancelSubscriptionBtn) {
        cancelSubscriptionBtn.addEventListener('click', function() {
            confirmCancelSubscription(subscription.id);
        });
    }
}

// Display No Subscription
function displayNoSubscription() {
    const subscriptionContainer = document.getElementById('subscriptionDetails');
    
    if (!subscriptionContainer) return;
    
    // Create no subscription HTML
    const noSubscriptionHTML = `
        <div class="no-subscription">
            <i class="fas fa-credit-card"></i>
            <h3>لا يوجد اشتراك نشط</h3>
            <p>لم تقم بالاشتراك في أي باقة بعد. اشترك الآن للتمتع بميزات بيع السيارات.</p>
            <a href="subscription.html" class="btn btn-primary">اشترك الآن</a>
        </div>
    `;
    
    // Update subscription container
    subscriptionContainer.innerHTML = noSubscriptionHTML;
}

// Confirm Cancel Subscription
function confirmCancelSubscription(subscriptionId) {
    // Create confirmation modal if it doesn't exist
    let confirmModal = document.getElementById('confirmModal');
    
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'confirmModal';
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h3>تأكيد إلغاء الاشتراك</h3>
                <p>هل أنت متأكد من إلغاء اشتراكك؟ لن تتمكن من بيع سياراتك بعد إلغاء الاشتراك.</p>
                <div class="modal-buttons">
                    <button id="cancelBtn" class="btn btn-outline">إلغاء</button>
                    <button id="confirmCancelBtn" class="btn btn-danger">تأكيد الإلغاء</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }
    
    // Get modal elements
    const modalClose = confirmModal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    
    // Add event listeners
    modalClose.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmCancelBtn.addEventListener('click', function() {
        cancelUserSubscription(subscriptionId);
    });
    
    // Close modal when clicking outside
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            closeModal();
        }
    });
    
    // Store subscription ID in modal
    confirmModal.setAttribute('data-subscription-id', subscriptionId);
    
    // Show modal
    confirmModal.style.display = 'flex';
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
}

// Cancel User Subscription
async function cancelUserSubscription(subscriptionId) {
    try {
        // Show loading state
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإلغاء...';
        
        // Cancel subscription
        const result = await cancelSubscription(subscriptionId);
        
        if (result.success) {
            // Show success message
            showSuccess('تم إلغاء الاشتراك بنجاح!');
            
            // Close modal
            closeModal();
            
            // Reload user data
            const user = await getCurrentUser();
            if (user) {
                const userData = await getUserData(user.uid);
                if (userData.success) {
                    displayUserProfile(userData.userData);
                }
                
                // Reload user subscription
                loadUserSubscription(user.uid);
            }
        } else {
            showError(result.error || 'حدث خطأ أثناء إلغاء الاشتراك. يرجى المحاولة مرة أخرى.');
            
            // Reset button
            confirmCancelBtn.disabled = false;
            confirmCancelBtn.innerHTML = 'تأكيد الإلغاء';
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);
        showError('حدث خطأ أثناء إلغاء الاشتراك. يرجى المحاولة مرة أخرى.');
        
        // Reset button
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        if (confirmCancelBtn) {
            confirmCancelBtn.disabled = false;
            confirmCancelBtn.innerHTML = 'تأكيد الإلغاء';
        }
    }
}

// Initialize Profile Form
function initProfileForm(userData) {
    const profileForm = document.getElementById('profileForm');
    
    if (!profileForm) return;
    
    // Fill form with user data
    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const locationInput = document.getElementById('location');
    
    if (nameInput) {
        nameInput.value = userData.name || '';
    }
    if (emailInput) {
        emailInput.value = userData.email || '';
    }
    if (phoneInput) {
        phoneInput.value = userData.phone || '';
    }
    if (locationInput) {
        locationInput.value = userData.location || '';
    }

    // Avatar upload logic
    const avatarUploadInput = document.getElementById('avatarUpload');
    const avatarPreview = document.getElementById('avatarPreview');
    const changeAvatarBtn = profileForm.querySelector('.file-upload button');
    const deleteAvatarBtn = profileForm.querySelector('.avatar-actions .btn-danger');

    if (changeAvatarBtn && avatarUploadInput) {
        changeAvatarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            avatarUploadInput.click();
        });
    }
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', async function(e) {
            if (avatarUploadInput.files && avatarUploadInput.files[0]) {
                const file = avatarUploadInput.files[0];
                // Show loading spinner on preview
                if (avatarPreview) {
                    avatarPreview.src = 'images/loading.gif';
                }
                const result = await window.uploadAvatar(file);
                if (result.success) {
                    showSuccess('تم تحديث الصورة بنجاح');
                } else {
                    showError('حدث خطأ أثناء رفع الصورة: ' + result.error);
                }
            }
        });
    }
    if (deleteAvatarBtn) {
        deleteAvatarBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (confirm('هل أنت متأكد أنك تريد حذف الصورة الشخصية؟')) {
                // Show loading spinner on preview
                if (avatarPreview) {
                    avatarPreview.src = 'images/loading.gif';
                }
                const result = await window.deleteAvatar();
                if (result.success) {
                    showSuccess('تم حذف الصورة بنجاح');
                } else {
                    showError('حدث خطأ أثناء حذف الصورة: ' + result.error);
                }
            }
        });
    }
    
    // Add event listener to form
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Get form data
        const fullName = nameInput ? nameInput.value : '';
        const email = emailInput ? emailInput.value : '';
        const phone = phoneInput ? phoneInput.value : '';
        const location = locationInput ? locationInput.value : '';
        // Validate form data
        if (!fullName) {
            showError('يرجى إدخال الاسم');
            return;
        }
        // Update user profile
        updateProfile({
            name: fullName,
            email: email,
            phone: phone,
            location: location
        });
    });
}

// Update Profile
async function updateProfile(profileData) {
    try {
        // Show loading state
        const submitButton = document.querySelector('#profileForm button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = 'حفظ التغييرات';
            return { success: false, error: 'حدث خطأ أثناء تحديث الملف الشخصي. يرجى تسجيل الدخول مرة أخرى.' };
        }
        // Update user profile
        const result = await updateUserProfile(user.uid, profileData);
        if (result.success) {
            // Reload user data
            const userData = await getUserData(user.uid);
            if (userData.success) {
                displayUserProfile(userData.userData);
            }
            return { success: true };
        } else {
            return { success: false, error: result.error || 'حدث خطأ أثناء تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.' };
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: 'حدث خطأ أثناء تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.' };
    } finally {
        // Reset button
        const submitButton = document.querySelector('#profileForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'حفظ التغييرات';
        }
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
                <span>جاري تحميل البيانات...</span>
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
    // Remove old error toast if exists
    let oldToast = document.getElementById('errorToast');
    if (oldToast) oldToast.remove();
    // Create error toast if it doesn't exist
    let errorToast = document.createElement('div');
    errorToast.id = 'errorToast';
    errorToast.className = 'toast error';
    errorToast.textContent = message;
    document.body.appendChild(errorToast);
    // Show error toast
    errorToast.classList.add('show');
    // Hide error toast after 5 seconds
    setTimeout(() => {
        errorToast.classList.remove('show');
        errorToast.remove();
    }, 5000);
}

// Show Success Message
function showSuccess(message) {
    // Remove old success toast if exists
    let oldToast = document.getElementById('successToast');
    if (oldToast) oldToast.remove();
    // Create success toast if it doesn't exist
    let successToast = document.createElement('div');
    successToast.id = 'successToast';
    successToast.className = 'toast success';
    successToast.textContent = message;
    document.body.appendChild(successToast);
    // Show success toast
    successToast.classList.add('show');
    // Hide success toast after 5 seconds
    setTimeout(() => {
        successToast.classList.remove('show');
        successToast.remove();
    }, 5000);
}

// Upload avatar to Cloudinary and update user profile
export async function uploadAvatar(file) {
    try {
        const url = await uploadImageToCloudinary(file);
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        await updateUserProfile(user.uid, { photoURL: url });
        // Update all user-avatar images
        document.querySelectorAll('.user-avatar, #userAvatar, #profileAvatar, #avatarPreview').forEach(img => {
            img.src = url;
        });
        return { success: true, avatarUrl: url };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete avatar (reset to default)
export async function deleteAvatar() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        const defaultAvatar = 'images/default-avatar.jpg';
        await updateUserProfile(user.uid, { photoURL: defaultAvatar });
        // Update all user-avatar images
        document.querySelectorAll('.user-avatar').forEach(img => {
            img.src = defaultAvatar;
        });
        // Update main profile avatar
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.src = defaultAvatar;
        // Update settings avatar preview
        const avatarPreviewEl = document.getElementById('avatarPreview');
        if (avatarPreviewEl) avatarPreviewEl.src = defaultAvatar;
        return { success: true, avatarUrl: defaultAvatar };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Change user password
export async function changeUserPassword(currentPassword, newPassword) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('يجب تسجيل الدخول أولاً');
        const auth = getAuth();
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        return { success: true };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/wrong-password') msg = 'كلمة المرور الحالية غير صحيحة';
        if (error.code === 'auth/weak-password') msg = 'كلمة المرور الجديدة ضعيفة جداً';
        return { success: false, error: msg };
    }
}

// Send reset password email
export async function sendResetPasswordEmail(email) {
    try {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/user-not-found') msg = 'البريد الإلكتروني غير مسجل';
        return { success: false, error: msg };
    }
}

window.uploadAvatar = uploadAvatar;
window.deleteAvatar = deleteAvatar;
window.updateProfile = updateProfile;
