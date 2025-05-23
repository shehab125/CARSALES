// Car Details JavaScript file
import { getCarDetails, getCurrentUser, getUserData } from './firebase-api.js';
import { formatCurrency, formatDate } from './main.js';

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the car detail page
    const isCarDetailPage = window.location.pathname.includes('car-detail.html');
    
    if (isCarDetailPage) {
        initCarDetailPage();
    }
});

// Initialize Car Detail Page
async function initCarDetailPage() {
    try {
        // Get car ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get('id');
        
        if (!carId) {
            showError('معرف السيارة غير موجود في الرابط');
            return;
        }
        
        // Show loading state
        showLoading();
        
        // Get car details
        const result = await getCarDetails(carId);
        
        if (result.success) {
            // Display car details
            displayCarDetails(result.car);
            
            // Initialize image gallery
            initImageGallery(result.car.images);
            
            // Initialize contact form
            initContactForm(result.car);
            
            // Check if current user is the owner
            checkCarOwnership(result.car.userId);
        } else {
            // Show not found message
            showNotFoundMessage();
        }
    } catch (error) {
        console.error('Error initializing car detail page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } finally {
        // Hide loading state
        hideLoading();
    }
}

// Display Car Details
function displayCarDetails(car) {
    // Update page title
    document.title = `${car.title} - موقع بيع وشراء السيارات`;
    
    // Update car title
    const carTitle = document.getElementById('carTitle');
    if (carTitle) {
        carTitle.textContent = car.title;
    }
    
    // Update car price
    const carPrice = document.getElementById('carPrice');
    if (carPrice) {
        carPrice.textContent = formatCurrency(car.price);
    }
    
    // Update car location
    const carLocation = document.getElementById('carLocation');
    if (carLocation) {
        carLocation.textContent = car.location;
    }
    
    // Update car date
    const carDate = document.getElementById('carDate');
    if (carDate) {
        carDate.textContent = formatDate(car.createdAt);
    }
    
    // Update car specifications
    updateCarSpecifications(car);
    
    // Update car description
    const carDescription = document.getElementById('carDescription');
    if (carDescription) {
        carDescription.textContent = car.description;
    }
    
    // Update car features
    updateCarFeatures(car.features);
    
    // Update seller information
    updateSellerInfo(car);
    // Load similar cars
    loadSimilarCars(car);
}

// Update Car Specifications
function updateCarSpecifications(car) {
    const specsList = document.getElementById('carSpecs');
    
    if (!specsList) return;
    
    // Create specifications HTML
    const specsHTML = `
        <li>
            <span class="spec-label">الشركة المصنعة:</span>
            <span class="spec-value">${car.make}</span>
        </li>
        <li>
            <span class="spec-label">الموديل:</span>
            <span class="spec-value">${car.model}</span>
        </li>
        <li>
            <span class="spec-label">سنة الصنع:</span>
            <span class="spec-value">${car.year}</span>
        </li>
        <li>
            <span class="spec-label">المسافة المقطوعة:</span>
            <span class="spec-value">${car.mileage} كم</span>
        </li>
        <li>
            <span class="spec-label">نوع الوقود:</span>
            <span class="spec-value">${car.fuelType}</span>
        </li>
        <li>
            <span class="spec-label">ناقل الحركة:</span>
            <span class="spec-value">${car.transmission}</span>
        </li>
        <li>
            <span class="spec-label">اللون:</span>
            <span class="spec-value">${car.color}</span>
        </li>
    `;
    
    // Update specifications list
    specsList.innerHTML = specsHTML;
}

// Update Car Features
function updateCarFeatures(features) {
    const featuresList = document.getElementById('carFeatures');
    
    if (!featuresList || !features || features.length === 0) {
        // Hide features section if no features
        const featuresSection = document.getElementById('featuresSection');
        if (featuresSection) {
            featuresSection.style.display = 'none';
        }
        return;
    }
    
    // Clear features list
    featuresList.innerHTML = '';
    
    // Add features to list
    features.forEach(feature => {
        const featureItem = document.createElement('li');
        featureItem.innerHTML = `<i class="fas fa-check"></i> ${feature}`;
        featuresList.appendChild(featureItem);
    });
}

// Update Seller Information
function updateSellerInfo(car) {
    const sellerName = document.getElementById('sellerName');
    const sellerPhone = document.getElementById('sellerPhone');
    const sellerEmail = document.getElementById('sellerEmail');
    const sellerWhatsapp = document.getElementById('sellerWhatsapp');
    
    if (sellerName) {
        sellerName.textContent = car.contactName;
    }
    
    // Phone button
    if (sellerPhone && car.contactPhone) {
        sellerPhone.textContent = car.contactPhone;
        sellerPhone.href = `tel:${car.contactPhone}`;
        sellerPhone.style.display = '';
    } else if (sellerPhone) {
        sellerPhone.style.display = 'none';
    }
    
    // WhatsApp button
    if (sellerWhatsapp && car.contactPhone) {
        // Remove any non-digit characters for WhatsApp
        const phoneDigits = car.contactPhone.replace(/\D/g, '');
        sellerWhatsapp.href = `https://wa.me/${phoneDigits}`;
        sellerWhatsapp.style.display = '';
    } else if (sellerWhatsapp) {
        sellerWhatsapp.style.display = 'none';
    }
    
    // Email button
    if (sellerEmail && car.contactEmail) {
        sellerEmail.textContent = car.contactEmail;
        sellerEmail.href = `mailto:${car.contactEmail}`;
        sellerEmail.style.display = '';
    } else if (sellerEmail) {
        sellerEmail.style.display = 'none';
    }
}

// Initialize Image Gallery
function initImageGallery(images) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailsContainer = document.getElementById('thumbnails');
    
    if (!mainImage || !thumbnailsContainer || !images || images.length === 0) return;
    
    // Set main image
    mainImage.src = images[0];
    mainImage.alt = 'صورة السيارة';
    
    // Clear thumbnails container
    thumbnailsContainer.innerHTML = '';
    
    // Add thumbnails
    images.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = index === 0 ? 'thumbnail active' : 'thumbnail';
        thumbnail.innerHTML = `<img src="${image}" alt="صورة السيارة ${index + 1}">`;
        
        // Add click event to thumbnail
        thumbnail.addEventListener('click', function() {
            // Update main image
            mainImage.src = image;
            
            // Update active thumbnail
            const activeThumbnail = thumbnailsContainer.querySelector('.thumbnail.active');
            if (activeThumbnail) {
                activeThumbnail.classList.remove('active');
            }
            this.classList.add('active');
        });
        
        thumbnailsContainer.appendChild(thumbnail);
    });
    
    // Initialize lightbox
    initLightbox(images);
}

// Initialize Lightbox
function initLightbox(images) {
    const mainImage = document.getElementById('mainImage');
    
    if (!mainImage || !images || images.length === 0) return;
    
    // Create lightbox elements if they don't exist
    let lightbox = document.getElementById('lightbox');
    
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <span class="lightbox-close">&times;</span>
                <img class="lightbox-image" id="lightboxImage">
                <div class="lightbox-controls">
                    <button class="lightbox-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="lightbox-next"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="lightbox-counter">
                    <span id="lightboxCurrent">1</span> / <span id="lightboxTotal">${images.length}</span>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);
    }
    
    // Get lightbox elements
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const lightboxPrev = lightbox.querySelector('.lightbox-prev');
    const lightboxNext = lightbox.querySelector('.lightbox-next');
    const lightboxCurrent = document.getElementById('lightboxCurrent');
    const lightboxTotal = document.getElementById('lightboxTotal');
    
    // Set total images count
    lightboxTotal.textContent = images.length;
    
    // Current image index
    let currentIndex = 0;
    
    // Open lightbox when clicking on main image
    mainImage.addEventListener('click', function() {
        // Get current image index
        currentIndex = images.indexOf(mainImage.src);
        if (currentIndex === -1) currentIndex = 0;
        
        // Update lightbox image
        lightboxImage.src = images[currentIndex];
        
        // Update current image counter
        lightboxCurrent.textContent = currentIndex + 1;
        
        // Show lightbox
        lightbox.style.display = 'flex';
        
        // Disable body scroll
        document.body.style.overflow = 'hidden';
    });
    
    // Close lightbox
    lightboxClose.addEventListener('click', function() {
        lightbox.style.display = 'none';
        
        // Enable body scroll
        document.body.style.overflow = 'auto';
    });
    
    // Previous image
    lightboxPrev.addEventListener('click', function() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImage.src = images[currentIndex];
        lightboxCurrent.textContent = currentIndex + 1;
    });
    
    // Next image
    lightboxNext.addEventListener('click', function() {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImage.src = images[currentIndex];
        lightboxCurrent.textContent = currentIndex + 1;
    });
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
            
            // Enable body scroll
            document.body.style.overflow = 'auto';
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (lightbox.style.display === 'flex') {
            if (e.key === 'Escape') {
                lightbox.style.display = 'none';
                
                // Enable body scroll
                document.body.style.overflow = 'auto';
            } else if (e.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                lightboxImage.src = images[currentIndex];
                lightboxCurrent.textContent = currentIndex + 1;
            } else if (e.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % images.length;
                lightboxImage.src = images[currentIndex];
                lightboxCurrent.textContent = currentIndex + 1;
            }
        }
    });
}

// Initialize Contact Form
function initContactForm(car) {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) return;
    
    // Add event listener to contact form
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const message = formData.get('message');
        
        // Validate form data
        if (!name || !phone || !message) {
            showError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        // Show success message
        showSuccess('تم إرسال رسالتك بنجاح! سيتم التواصل معك قريباً.');
        
        // Reset form
        e.target.reset();
    });
}

// Check Car Ownership
async function checkCarOwnership(carUserId) {
    try {
        // Get current user
        const user = await getCurrentUser();
        
        if (!user) return;
        
        // Check if user is the owner
        if (user.uid === carUserId) {
            // Show edit and delete buttons
            const actionButtons = document.createElement('div');
            actionButtons.className = 'car-action-buttons';
            actionButtons.innerHTML = `
                <a href="sell.html?edit=${carId}" class="btn btn-outline">
                    <i class="fas fa-edit"></i> تعديل الإعلان
                </a>
                <button id="deleteCarBtn" class="btn btn-danger">
                    <i class="fas fa-trash-alt"></i> حذف الإعلان
                </button>
            `;
            
            // Add action buttons to page
            const carDetailHeader = document.querySelector('.car-detail-header');
            if (carDetailHeader) {
                carDetailHeader.appendChild(actionButtons);
            }
            
            // Add event listener to delete button
            const deleteCarBtn = document.getElementById('deleteCarBtn');
            if (deleteCarBtn) {
                deleteCarBtn.addEventListener('click', confirmDeleteCar);
            }
        }
    } catch (error) {
        console.error('Error checking car ownership:', error);
    }
}

// Confirm Delete Car
function confirmDeleteCar() {
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
        
        // Add event listeners to modal buttons
        const modalClose = confirmModal.querySelector('.modal-close');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        modalClose.addEventListener('click', closeModal);
        cancelDeleteBtn.addEventListener('click', closeModal);
        confirmDeleteBtn.addEventListener('click', deleteCar);
        
        // Close modal when clicking outside
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                closeModal();
            }
        });
    }
    
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
async function deleteCar() {
    try {
        // Get car ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get('id');
        
        if (!carId) {
            showError('معرف السيارة غير موجود في الرابط');
            closeModal();
            return;
        }
        
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
            
            // Redirect to profile page after 2 seconds
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2000);
        } else {
            showError(result.error || 'حدث خطأ أثناء حذف الإعلان. يرجى المحاولة مرة أخرى.');
            
            // Reset button
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'حذف';
            
            // Close modal
            closeModal();
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
        
        // Close modal
        closeModal();
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
                <span>جاري تحميل تفاصيل السيارة...</span>
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
    // Create error toast if it doesn't exist
    let errorToast = document.getElementById('errorToast');
    
    if (!errorToast) {
        errorToast = document.createElement('div');
        errorToast.id = 'errorToast';
        errorToast.className = 'toast error';
        document.body.appendChild(errorToast);
    }
    
    // Set error message
    errorToast.textContent = message;
    
    // Show error toast
    errorToast.classList.add('show');
    
    // Hide error toast after 5 seconds
    setTimeout(() => {
        errorToast.classList.remove('show');
    }, 5000);
}

// Show Success Message
function showSuccess(message) {
    // Create success toast if it doesn't exist
    let successToast = document.getElementById('successToast');
    
    if (!successToast) {
        successToast = document.createElement('div');
        successToast.id = 'successToast';
        successToast.className = 'toast success';
        document.body.appendChild(successToast);
    }
    
    // Set success message
    successToast.textContent = message;
    
    // Show success toast
    successToast.classList.add('show');
    
    // Hide success toast after 5 seconds
    setTimeout(() => {
        successToast.classList.remove('show');
    }, 5000);
}

// Show not found message
function showNotFoundMessage() {
    const container = document.querySelector('.car-detail-container');
    if (container) {
        container.innerHTML = `
            <div class="not-found-message" style="text-align:center; padding:60px 0;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#e74c3c;"></i>
                <h2 style="margin:20px 0 10px;">هذا الإعلان غير موجود أو تم حذفه</h2>
                <p>ربما تم حذف السيارة أو الرابط غير صحيح.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top:20px;">العودة للرئيسية</a>
            </div>
        `;
    }
}

// Load Similar Cars
async function loadSimilarCars(currentCar) {
    // Fetch cars with the same make and active status, excluding the current car
    const result = await getCarListings({ make: currentCar.make, status: 'active' }, 'createdAt', 'desc', 6);
    if (!result.success) return;

    const similarCars = result.cars.filter(car => car.id !== currentCar.id);
    const similarCarsContainer = document.getElementById('similarCars');
    similarCarsContainer.innerHTML = '';

    if (similarCars.length === 0) {
        similarCarsContainer.innerHTML = '<p>لا توجد سيارات مشابهة حالياً.</p>';
        return;
    }

    similarCars.forEach(car => {
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        carCard.innerHTML = `
            <div class="car-image">
                <img src="${car.images && car.images[0] ? car.images[0] : 'images/car-placeholder.jpg'}" alt="${car.title}">
            </div>
            <div class="car-content">
                <h3 class="car-title">${car.title}</h3>
                <div class="car-price">${car.price ? car.price.toLocaleString() + ' ر.س' : ''}</div>
                <div class="car-details">
                    <div class="car-detail"><i class="fas fa-calendar-alt"></i><span>${car.year || ''}</span></div>
                    <div class="car-detail"><i class="fas fa-tachometer-alt"></i><span>${car.mileage ? car.mileage + ' كم' : ''}</span></div>
                    <div class="car-detail"><i class="fas fa-gas-pump"></i><span>${car.fuelType || ''}</span></div>
                    <div class="car-detail"><i class="fas fa-cog"></i><span>${car.transmission || ''}</span></div>
                </div>
                <div class="car-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${car.location || ''}</span>
                </div>
                <div class="car-actions">
                    <a href="car-detail.html?id=${car.id}" class="btn btn-primary btn-block">عرض التفاصيل</a>
                </div>
            </div>
        `;
        similarCarsContainer.appendChild(carCard);
    });
}
