// Main JavaScript file for authentication functionality
import { getAuth, getRedirectResult } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { registerUser, loginUser, logoutUser, getCurrentUser, getUserData, resetPassword, signInWithGoogle } from './firebase-api.js';

const auth = getAuth();

const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/dxtzc2keb/image/upload/v1748099922/hs3bv2taadgs2nbj36iz.avif';

// Comment out or remove the call to createAdminUserIfNotExists in DOMContentLoaded
// document.addEventListener('DOMContentLoaded', async function() {
//     await createAdminUserIfNotExists();
// ... existing code ...

document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on the auth page
    const isAuthPage = window.location.pathname.includes('auth.html');
    
    if (isAuthPage) {
        initAuthPage();
    }
    
    // Check authentication state for all pages
    checkAuthState();
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Initialize Auth Page
function initAuthPage() {
    const authTabs = document.getElementById('authTabs');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    // Add Google sign-in buttons
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    // Check if we should show register tab based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'register') {
        showRegisterTab();
    } else {
        showLoginTab();
    }
    
    // Tab switching
    if (authTabs) {
        const tabs = authTabs.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.tab === 'login') {
                    showLoginTab();
                } else if (tab.dataset.tab === 'register') {
                    showRegisterTab();
                }
            });
        });
    }
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('forgotPasswordForm').style.display = 'block';
        });
    }
    
    // Back to login link
    const backToLoginLink = document.getElementById('backToLogin');
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginTab();
        });
    }
}

// Show Login Tab
function showLoginTab() {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === 'login') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.delete('tab');
    window.history.pushState({}, '', url);
}

// Show Register Tab
function showRegisterTab() {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === 'register') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('tab', 'register');
    window.history.pushState({}, '', url);
}

// Handle Login Form Submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    const submitButton = document.querySelector('#loginForm button[type="submit"]');
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    
    // Clear previous errors
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    
    try {
        const result = await loginUser(email, password);
        
        if (result.success) {
            // Check if user is admin
            const user = result.user;
            const userDataResult = await getUserData(user.uid);
            
            if (userDataResult.success && userDataResult.userData.isAdmin) {
                // Redirect to admin dashboard
                window.location.href = 'admin_enhanced.html';
                return;
            }
            // Redirect to home page or dashboard
            window.location.href = 'index.html';
        } else {
            // Show error message
            errorElement.textContent = translateFirebaseError(result.error);
            errorElement.style.display = 'block';
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = 'تسجيل الدخول';
        }
    } catch (error) {
        // Show error message
        errorElement.textContent = translateFirebaseError(error.message);
        errorElement.style.display = 'block';
        
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = 'تسجيل الدخول';
    }
}

// Handle Register Form Submission
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorElement = document.getElementById('registerError');
    const submitButton = document.querySelector('#registerForm button[type="submit"]');
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
    
    // Clear previous errors
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorElement.textContent = 'كلمات المرور غير متطابقة';
        errorElement.style.display = 'block';
        submitButton.disabled = false;
        submitButton.innerHTML = 'إنشاء حساب';
        return;
    }
    
    try {
        const userData = {
            name,
            phone,
            location: '',
            createdAt: new Date(),
            isAdmin: false,
            photoURL: DEFAULT_PROFILE_IMAGE
        };
        
        const result = await registerUser(email, password, userData);
        
        if (result.success) {
            // Show success message
            const successElement = document.getElementById('registerSuccess');
            successElement.textContent = 'تم إنشاء الحساب بنجاح! جاري تحويلك...';
            successElement.style.display = 'block';
            
            // Redirect to home page after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Show error message
            errorElement.textContent = translateFirebaseError(result.error);
            errorElement.style.display = 'block';
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = 'إنشاء حساب';
        }
    } catch (error) {
        // Show error message
        errorElement.textContent = translateFirebaseError(error.message);
        errorElement.style.display = 'block';
        
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = 'إنشاء حساب';
    }
}

// Handle Logout
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        await logoutUser();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('حدث خطأ أثناء تسجيل الخروج');
    }
}

// Check Authentication State
async function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDataResult = await getUserData(user.uid);
                if (userDataResult.success) {
                    updateUIForLoggedInUser(userDataResult.userData);
                } else {
                    console.error('Error getting user data:', userDataResult.error);
                    updateUIForLoggedOutUser();
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                updateUIForLoggedOutUser();
            }
        } else {
            updateUIForLoggedOutUser();
        }
    });
}

function updateUIForLoggedInUser(userData) {
    const authButtons = document.getElementById('authButtons');
    
    if (authButtons) {
        // Create user dropdown HTML
        const userDropdownHTML = `
            <div class="user-dropdown">
                <button class="user-dropdown-btn">
                    <img src="${userData.photoURL || DEFAULT_PROFILE_IMAGE}" alt="${userData.name}" class="user-avatar">
                    <span>${userData.name}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown-content">
                    <a href="profile.html">
                        <i class="fas fa-user"></i>
                        <span>الملف الشخصي</span>
                    </a>
                    ${userData.isSubscribed ? `
                        <a href="#" id="changePasswordLink">
                            <i class="fas fa-key"></i>
                            <span>تغيير كلمة المرور</span>
                        </a>
                    ` : `
                        <a href="subscription.html">
                            <i class="fas fa-credit-card"></i>
                            <span>اشترك الآن</span>
                        </a>
                    `}
                    ${userData.isAdmin ? `
                        <a href="admin_enhanced_updated.html">
                            <i class="fas fa-cog"></i>
                            <span>لوحة التحكم</span>
                        </a>
                    ` : ''}
                    <a href="#" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>تسجيل الخروج</span>
                    </a>
                </div>
            </div>
        `;
        
        // Replace auth buttons with user dropdown
        authButtons.innerHTML = userDropdownHTML;
        
        // Add event listener to logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Add event listener to toggle dropdown
        const userDropdownBtn = document.querySelector('.user-dropdown-btn');
        if (userDropdownBtn) {
            userDropdownBtn.addEventListener('click', function() {
                const dropdownContent = this.nextElementSibling;
                dropdownContent.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {
                if (!event.target.matches('.user-dropdown-btn') && !event.target.closest('.user-dropdown-btn')) {
                    const dropdowns = document.querySelectorAll('.user-dropdown-content');
                    dropdowns.forEach(dropdown => {
                        if (dropdown.classList.contains('show')) {
                            dropdown.classList.remove('show');
                        }
                    });
                }
            });
        }
    }
    
    // Update sell button in navbar if exists
    const sellButton = document.querySelector('.nav-links a[href="sell.html"]');
    if (sellButton && !userData.isSubscribed) {
        sellButton.href = 'subscription.html?redirect=sell';
    }
}


// Update UI for Logged Out User
function updateUIForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    const userDropdown = document.getElementById('userDropdown');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userDropdown) userDropdown.style.display = 'none';
}

// Translate Firebase Error Messages
function translateFirebaseError(errorMessage) {
    const errorTranslations = {
        'auth/user-not-found': 'البريد الإلكتروني غير مسجل',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/operation-not-allowed': 'العملية غير مسموح بها',
        'auth/account-exists-with-different-credential': 'يوجد حساب آخر بنفس البريد الإلكتروني',
        'auth/credential-already-in-use': 'هذه البيانات مستخدمة بالفعل',
        'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول',
        'auth/cancelled-popup-request': 'تم إلغاء طلب تسجيل الدخول',
        'auth/popup-blocked': 'تم منع نافذة تسجيل الدخول',
        'auth/network-request-failed': 'فشل الاتصال بالشبكة'
    };
    
    return errorTranslations[errorMessage] || errorMessage;
}

// Handle Forgot Password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const errorElement = document.getElementById('resetError');
    const successElement = document.getElementById('resetSuccess');
    const submitButton = document.querySelector('#forgotPasswordForm button[type="submit"]');
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    
    // Clear previous messages
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    successElement.textContent = '';
    successElement.style.display = 'none';
    
    try {
        const result = await resetPassword(email);
        
        if (result.success) {
            successElement.textContent = 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني';
            successElement.style.display = 'block';
            
            // Reset form
            document.getElementById('forgotPasswordForm').reset();
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                showLoginTab();
            }, 3000);
        } else {
            errorElement.textContent = translateFirebaseError(result.error);
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = translateFirebaseError(error.message);
        errorElement.style.display = 'block';
    } finally {
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = 'إرسال رابط إعادة التعيين';
    }
}

// Handle Google Sign In
async function handleGoogleSignIn(e) {
    e.preventDefault();
    
    const errorElement = document.getElementById('loginError') || document.getElementById('registerError');
    const submitButton = e.target;
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    
    // Clear previous errors
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    try {
        const result = await signInWithGoogle();
        
        if (result.success) {
            // Check if user is admin
            const userDataResult = await getUserData(result.user.uid);
            
            if (userDataResult.success && userDataResult.userData.isAdmin) {
                window.location.href = 'admin_enhanced.html';
                return;
            }
            
            window.location.href = 'index.html';
        } else {
            if (errorElement) {
                errorElement.textContent = translateFirebaseError(result.error);
                errorElement.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = translateFirebaseError(error.message);
            errorElement.style.display = 'block';
        }
    } finally {
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fab fa-google"></i> تسجيل الدخول باستخدام Google';
    }
}

// Check for redirect result on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            // User just signed in with redirect
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Redirect result error:', error);
    }
});

// Export functions for use in other modules
export { checkAuthState, getCurrentUser, getUserData };
