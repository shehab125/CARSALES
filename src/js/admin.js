// Admin panel JavaScript file
import { getCurrentUser, getUserData, getCarListings, deleteUserCars } from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, deleteDoc, getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// Delete User Function
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

        // Delete user from Firebase Auth using Admin SDK
        console.log('Deleting user authentication account...');
        try {
            const adminAuth = getAuth();
            await adminAuth.deleteUser(userId);
            console.log('Successfully deleted user authentication account');
            
            showSuccess('تم حذف المستخدم وجميع بياناته بنجاح.');
            // Refresh the users list
            loadUsers();
        } catch (authError) {
            console.error('Error deleting auth account:', authError);
            showError('حدث خطأ أثناء حذف حساب المستخدم: ' + authError.message);
        }
    } catch (error) {
        console.error('Error in admin user deletion process:', error);
        showError('حدث خطأ أثناء حذف المستخدم: ' + error.message);
    }
}

// Load Users Function
async function loadUsers() {
    try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const usersTable = document.getElementById('usersTable');
        const tbody = usersTable.querySelector('tbody');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add new rows
        snapshot.forEach(doc => {
            const user = { uid: doc.id, ...doc.data() };
            const row = createUserRow(user);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showError('حدث خطأ أثناء تحميل قائمة المستخدمين');
    }
}

// Add delete button to user row
function createUserRow(user) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${user.name || 'بدون اسم'}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'غير متوفر'}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
            <div class="user-actions">
                <button class="btn btn-sm btn-outline" onclick="viewUserDetails('${user.uid}')">
                    <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.uid}')">
                    <i class="fas fa-trash-alt"></i> حذف
                </button>
            </div>
        </td>
    `;
    return row;
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

// Make functions available globally
window.deleteUser = deleteUser;
window.loadUsers = loadUsers;
window.viewUserDetails = viewUserDetails;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    getCurrentUser().then(user => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        getUserData(user.uid).then(userData => {
            if (!userData.success || !userData.userData.isAdmin) {
                window.location.href = 'index.html';
                return;
            }
            // Load users if on users page
            if (window.location.pathname.includes('users.html')) {
                loadUsers();
            }
        });
    });
}); 