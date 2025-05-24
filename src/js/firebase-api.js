// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Cloudinary Configuration
const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY
};

// PayPal Configuration
const paypalConfig = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: import.meta.env.VITE_PAYPAL_CURRENCY,
  subscriptionPlanId: import.meta.env.VITE_PAYPAL_SUBSCRIPTION_PLAN_ID,
  subscriptionAmount: import.meta.env.VITE_PAYPAL_SUBSCRIPTION_AMOUNT,
  subscriptionPeriod: import.meta.env.VITE_PAYPAL_SUBSCRIPTION_PERIOD
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy, limit as limitFn, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Authentication Functions
export async function registerUser(email, password, userData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Add user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      name: userData.name,
      phone: userData.phone,
      location: userData.location,
      createdAt: new Date(),
      isAdmin: false,
      isSubscribed: false,
      subscriptionEnd: null,
      photoURL: userData.photoURL
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, password) {
  try {
    console.log('Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Login successful for user:', user.uid);
    
    // Check if this is the admin user
    if (email === "admin@carsales.com") {
      console.log('Admin email detected, updating admin status...');
      
      // First check current user data
      const userData = await getUserData(user.uid);
      console.log('Current user data:', userData);
      
      if (userData.success) {
        // Update admin status directly in users collection
        const userRef = doc(db, "users", userData.docId);
        await updateDoc(userRef, {
          isAdmin: true,
          email: "admin@carsales.com",
          name: "Admin"
        });
        console.log('Admin status updated successfully');
      } else {
        // If user document doesn't exist, create it
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: "admin@carsales.com",
          name: "Admin",
          phone: "",
          location: "",
          createdAt: new Date(),
          isAdmin: true,
          isSubscribed: true,
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        console.log('New admin user document created');
      }
    }
    
    // Get updated user data to verify
    const updatedUserData = await getUserData(user.uid);
    console.log('Updated user data after login:', updatedUserData);
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getUserData(userId) {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, userData: docSnap.data(), docId: docSnap.id };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId, userData) {
  try {
    const userResult = await getUserData(userId);
    
    if (userResult.success) {
      await updateDoc(doc(db, "users", userResult.docId), userData);
      return { success: true };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Car Listing Functions
export async function addCarListing(carData) {
    try {
        const user = await getCurrentUser();
        
        if (!user) {
            return { success: false, error: "User not authenticated" };
        }
        
        // Check if user is subscribed
        const userData = await getUserData(user.uid);
        
        if (!userData.success || !userData.userData.isSubscribed) {
            return { success: false, error: "User not subscribed" };
        }

        // Ensure images are stored as full URLs
        if (carData.images && Array.isArray(carData.images)) {
            carData.images = carData.images.map(img => {
                if (img.startsWith('data:') || img.startsWith('http')) {
                    return img;
                }
                // For local images, ensure they start with /assets/
                return img.startsWith('/') ? img : `/assets/${img}`;
            });
        }

        const docRef = await addDoc(collection(db, 'cars'), {
            ...carData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            status: 'waiting'
        });

        return {
            success: true,
            carId: docRef.id
        };
    } catch (error) {
        console.error('Error adding car listing:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function getCarListings(filters = {}, sortBy = "createdAt", sortOrder = "desc", limit = 20) {
  try {
    let q = collection(db, "cars");
    
    // Apply filters
    if (filters.make) {
      q = query(q, where("make", "==", filters.make));
    }
    
    if (filters.model) {
      q = query(q, where("model", "==", filters.model));
    }
    
    if (filters.year) {
      q = query(q, where("year", "==", filters.year));
    }
    
    if (filters.priceMin && filters.priceMax) {
      q = query(q, where("price", ">=", filters.priceMin), where("price", "<=", filters.priceMax));
    } else if (filters.priceMin) {
      q = query(q, where("price", ">=", filters.priceMin));
    } else if (filters.priceMax) {
      q = query(q, where("price", "<=", filters.priceMax));
    }
    
    if (filters.userId) {
      q = query(q, where("userId", "==", filters.userId));
    }
    
    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }
    
    // Apply sorting
    q = query(q, orderBy(sortBy, sortOrder));
    
    // Apply limit
    q = query(q, limitFn(limit));
    
    const querySnapshot = await getDocs(q);
    const cars = [];
    
    querySnapshot.forEach((doc) => {
      cars.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, cars };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCarDetails(carId) {
  try {
    const docRef = doc(db, "cars", carId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, car: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Car not found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateCarListing(carId, carData, newImages = []) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get car details to check ownership
    const carResult = await getCarDetails(carId);
    
    if (!carResult.success) {
      return { success: false, error: "Car not found" };
    }
    
    if (carResult.car.userId !== user.uid) {
      // Check if user is admin
      const userData = await getUserData(user.uid);
      
      if (!userData.success || !userData.userData.isAdmin) {
        return { success: false, error: "Not authorized to update this listing" };
      }
    }
    
    let updatedData = { ...carData };
    
    // Upload new images if provided
    if (newImages.length > 0) {
      const newImageUrls = await Promise.all(
        newImages.map(async (image) => {
          const imageUrl = await uploadImageToCloudinary(image);
          return imageUrl;
        })
      );
      
      // Combine with existing images if needed
      if (carData.keepExistingImages && carResult.car.images) {
        updatedData.images = [...carResult.car.images, ...newImageUrls];
      } else {
        updatedData.images = newImageUrls;
      }
    }
    
    // Update car listing in Firestore
    await updateDoc(doc(db, "cars", carId), updatedData);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteCarListing(carId) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get car details to check ownership
    const carResult = await getCarDetails(carId);
    
    if (!carResult.success) {
      return { success: false, error: "Car not found" };
    }
    
    if (carResult.car.userId !== user.uid) {
      // Check if user is admin
      const userData = await getUserData(user.uid);
      
      if (!userData.success || !userData.userData.isAdmin) {
        return { success: false, error: "Not authorized to delete this listing" };
      }
    }
    
    // Delete car listing from Firestore
    await deleteDoc(doc(db, "cars", carId));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Subscription Functions
export async function createSubscription(userId, subscriptionData) {
  try {
    // Add subscription to Firestore
    await addDoc(collection(db, "subscriptions"), {
      userId,
      ...subscriptionData,
      createdAt: new Date(),
      status: "active"
    });
    
    // Update user's subscription status
    const userData = await getUserData(userId);
    
    if (userData.success) {
      await updateDoc(doc(db, "users", userData.docId), {
        isSubscribed: true,
        subscriptionEnd: subscriptionData.endDate
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUserSubscription(userId) {
  try {
    const q = query(
      collection(db, "subscriptions"),
      where("userId", "==", userId),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limitFn(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: true, subscription: { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } };
    } else {
      return { success: false, error: "No active subscription found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function cancelSubscription(subscriptionId) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get subscription details
    const docRef = doc(db, "subscriptions", subscriptionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: "Subscription not found" };
    }
    
    const subscription = docSnap.data();
    
    if (subscription.userId !== user.uid) {
      // Check if user is admin
      const userData = await getUserData(user.uid);
      
      if (!userData.success || !userData.userData.isAdmin) {
        return { success: false, error: "Not authorized to cancel this subscription" };
      }
    }
    
    // Update subscription status
    await updateDoc(docRef, {
      status: "cancelled",
      cancelledAt: new Date()
    });
    
    // Update user's subscription status
    const userData = await getUserData(subscription.userId);
    
    if (userData.success) {
      await updateDoc(doc(db, "users", userData.docId), {
        isSubscribed: false,
        subscriptionEnd: null
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Admin Functions
export async function getAllUsers(limit = 100) {
  try {
    const user = await getCurrentUser();
    console.log('[getAllUsers] Current user:', user);
    if (!user) {
      console.error('[getAllUsers] Not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    // Check if user is admin
    const userData = await getUserData(user.uid);
    console.log('[getAllUsers] User data:', userData);
    if (!userData.success || !userData.userData.isAdmin) {
      console.error('[getAllUsers] Not authorized');
      return { success: false, error: 'Not authorized' };
    }
    const q = query(collection(db, "users"), limitFn(limit));
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (err) {
      console.error('[getAllUsers] Firestore error:', err);
      return { success: false, error: err.message };
    }
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log('[getAllUsers] Users fetched:', users);
    return { success: true, users };
  } catch (error) {
    console.error('[getAllUsers] General error:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllSubscriptions(limit = 100) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Check if user is admin
    const userData = await getUserData(user.uid);
    
    if (!userData.success || !userData.userData.isAdmin) {
      return { success: false, error: "Not authorized" };
    }
    
    const q = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"), limitFn(limit));
    const querySnapshot = await getDocs(q);
    const subscriptions = [];
    
    querySnapshot.forEach((doc) => {
      subscriptions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, subscriptions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Cloudinary Functions
export { uploadImageToCloudinary };

async function uploadImageToCloudinary(file) {
  return new Promise((resolve, reject) => {
    // Debug logs
    console.log('Uploading to Cloudinary...');
    console.log('File:', file);
    console.log('Upload Preset:', cloudinaryConfig.uploadPreset);
    console.log('Cloud Name:', cloudinaryConfig.cloudName);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.secure_url) {
        resolve(data.secure_url);
      } else {
        // Debug log for error
        console.error('Cloudinary upload error response:', data);
        reject(new Error(data.error && data.error.message ? data.error.message : 'Failed to upload image'));
      }
    })
    .catch(error => {
      console.error('Cloudinary upload fetch error:', error);
      reject(error);
    });
  });
}

// Add password reset function
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Google Authentication
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        // Add scopes
        provider.addScope('profile');
        provider.addScope('email');
        
        // Set custom parameters
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userData = await getUserData(user.uid);
        
        if (!userData.success) {
            try {
                // Create new user document if doesn't exist
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL,
                    createdAt: new Date(),
                    isAdmin: false,
                    isSubscribed: false,
                    hasActiveSubscription: false,
                    subscriptionEnd: null
                });
            } catch (dbError) {
                console.error('Error creating user document:', dbError);
                return { 
                    success: false, 
                    error: 'حدث خطأ أثناء إنشاء حساب المستخدم. يرجى المحاولة مرة أخرى.' 
                };
            }
        }
        
        return { success: true, user };
    } catch (error) {
        console.error('Google Sign In Error:', error);
        
        // Handle specific error cases
        if (error.code === 'auth/popup-closed-by-user') {
            return { success: false, error: 'تم إغلاق نافذة تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
        } else if (error.code === 'auth/popup-blocked') {
            return { success: false, error: 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.' };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { success: false, error: 'تم إلغاء طلب تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
        } else if (error.code === 'auth/network-request-failed') {
            return { success: false, error: 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.' };
        } else if (error.code === 'permission-denied') {
            return { success: false, error: 'ليس لديك الصلاحيات الكافية. يرجى التحقق من إعدادات حسابك.' };
        }
        
        return { success: false, error: error.message };
    }
}

// Update user admin status
export async function updateUserAdminStatus(userId, isAdmin) {
  try {
    const userResult = await getUserData(userId);
    if (userResult.success) {
      await updateDoc(doc(db, "users", userResult.docId), {
        isAdmin: isAdmin
      });
      return { success: true };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete all cars for a user
export async function deleteUserCars(userId) {
  try {
    console.log('Starting car deletion process for user:', userId);
    
    // Get all cars for the user
    const carsResult = await getCarListings({ userId });
    
    if (!carsResult.success) {
      console.error('Failed to get user cars:', carsResult.error);
      return { success: false, error: "Failed to get user cars" };
    }
    
    console.log(`Found ${carsResult.cars.length} cars to delete`);
    
    // Delete each car
    const deletePromises = carsResult.cars.map(async (car) => {
      try {
        console.log(`Deleting car ${car.id}...`);
        
        // Delete car document
        const carRef = doc(db, "cars", car.id);
        await deleteDoc(carRef);
        console.log(`Successfully deleted car document ${car.id}`);
        
        // If car has images in storage, delete them too
        if (car.images && Array.isArray(car.images)) {
          console.log(`Deleting ${car.images.length} images for car ${car.id}`);
          const storageRef = getStorage();
          const deleteImagePromises = car.images.map(async (imageUrl) => {
            try {
              if (imageUrl.startsWith('http')) {
                const imageRef = ref(storageRef, imageUrl);
                await deleteObject(imageRef);
                console.log(`Successfully deleted image: ${imageUrl}`);
              }
            } catch (error) {
              console.error(`Error deleting image ${imageUrl}:`, error);
              // Continue with other deletions even if one fails
            }
          });
          await Promise.all(deleteImagePromises);
        }
        
        return true;
      } catch (error) {
        console.error(`Error deleting car ${car.id}:`, error);
        throw error;
      }
    });
    
    await Promise.all(deletePromises);
    console.log('Successfully completed car deletion process');
    
    // Verify deletion
    const verifyResult = await getCarListings({ userId });
    if (verifyResult.success && verifyResult.cars.length > 0) {
      console.error('Verification failed: Some cars still exist');
      return { success: false, error: "Some cars could not be deleted" };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[deleteUserCars] Error:', error);
    return { success: false, error: error.message };
  }
}

// Export configurations
export { firebaseConfig, cloudinaryConfig, paypalConfig };
