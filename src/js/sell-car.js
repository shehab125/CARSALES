// Main JavaScript file for the car selling functionality
import { addCarListing, getCurrentUser, getUserData, getUserSubscription, getCarDetails } from './firebase-api.js';

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the sell page
    const isSellPage = window.location.pathname.includes('sell.html');
    
    if (isSellPage) {
        initSellPage();
    }
});

// Initialize Sell Page
async function initSellPage() {
    try {
        // Check if user is logged in
        const user = await getCurrentUser();
        
        if (!user) {
            // Redirect to login page
            window.location.href = 'auth.html?redirect=sell';
            return;
        }
        
        // Check if user is subscribed
        const userData = await getUserData(user.uid);
        
        if (!userData.success || !userData.userData.isSubscribed) {
            // Redirect to subscription page
            window.location.href = 'subscription.html?redirect=sell';
            return;
        }
        
        // Initialize form
        initCarForm();
        
        // Initialize Cloudinary upload widget
        initCloudinaryUpload();

        // --- EDIT MODE LOGIC ---
        const urlParams = new URLSearchParams(window.location.search);
        const editCarId = urlParams.get('edit');
        if (editCarId) {
            // Fetch car details and pre-fill form
            const result = await getCarDetails(editCarId);
            if (result.success) {
                prefillCarForm(result.car);
            } else {
                showError('تعذر جلب بيانات السيارة للتعديل');
            }
        }
        // --- END EDIT MODE ---
    } catch (error) {
        console.error('Error initializing sell page:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
}

// Initialize Car Form
function initCarForm() {
    const carForm = document.getElementById('sellCarForm');
    
    if (carForm) {
        carForm.addEventListener('submit', handleCarFormSubmit);
        
        // Initialize form fields
        initFormFields();
    }
}

// Initialize Form Fields
function initFormFields() {
    // Populate car makes dropdown
    const makeSelect = document.getElementById('carMake');
    
    if (makeSelect) {
        // Add event listener to update models when make changes
        makeSelect.addEventListener('change', updateModelOptions);
        
        // Populate makes
        populateCarMakes();
    }
    
    // Initialize year dropdown
    const yearSelect = document.getElementById('carYear');
    
    if (yearSelect) {
        populateYearOptions();
    }
}

// Car makes array in English
const carMakes = [
    'Toyota', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Suzuki',
    'Mercedes', 'BMW', 'Audi', 'Volkswagen', 'Chevrolet', 'Ford', 'Jeep',
    'Lexus', 'Infiniti', 'Land Rover', 'Porsche', 'Ferrari', 'Lamborghini', 'Bentley',
    'Rolls Royce', 'Maserati', 'Alfa Romeo', 'Fiat', 'Renault', 'Peugeot', 'Citroen',
    'Skoda', 'Seat', 'Daewoo', 'Isuzu', 'Subaru', 'Daihatsu'
];

// Car models by make in English
const carModels = {
    'Toyota': ['Camry', 'Corolla', 'Land Cruiser', 'RAV4', 'Highlander', 'Avalon', 'Yaris', 'Prado', 'Fortuner', 'Hilux'],
    'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Creta', 'Palisade', 'Azera', 'Veloster', 'Kona'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Cerato', 'Rio', 'Cadenza', 'Seltos', 'Telluride', 'Picanto', 'Stinger'],
    'Nissan': ['Altima', 'Maxima', 'Patrol', 'X-Trail', 'Qashqai', 'Sunny', 'Sentra', 'Tiida', 'Pathfinder', 'Navara'],
    'Honda': ['Accord', 'Civic', 'CR-V', 'Pilot', 'City', 'Jazz', 'HR-V', 'Odyssey'],
    'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'CX-3', 'CX-30', 'MX-5'],
    'Mitsubishi': ['Lancer', 'Pajero', 'Outlander', 'Eclipse Cross', 'L200', 'Attrage', 'Xpander'],
    'Suzuki': ['Swift', 'Vitara', 'Ciaz', 'Baleno', 'Ertiga', 'Jimny', 'Dzire'],
    'Mercedes': ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'B-Class', 'GLC', 'GLE', 'GLS', 'G-Class'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', '1 Series', '2 Series', '4 Series', '6 Series'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
    'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touareg', 'Polo', 'Jetta', 'Arteon', 'T-Roc'],
    'Chevrolet': ['Malibu', 'Impala', 'Tahoe', 'Traverse', 'Equinox', 'Camaro', 'Silverado'],
    'Ford': ['Focus', 'Fusion', 'Taurus', 'Explorer', 'Edge', 'Escape', 'Mustang', 'F-150'],
    'Jeep': ['Wrangler', 'Grand Cherokee', 'Compass', 'Renegade', 'Cherokee'],
    'Lexus': ['ES', 'GS', 'LS', 'RX', 'NX', 'GX', 'LX', 'IS'],
    'Infiniti': ['Q50', 'Q60', 'Q70', 'QX50', 'QX60', 'QX80'],
    'Land Rover': ['Range Rover', 'Discovery', 'Defender', 'Evoque', 'Velar'],
    'Porsche': ['Cayenne', 'Macan', 'Panamera', '911', 'Boxster'],
    'Ferrari': ['488', '812', 'Portofino', 'Roma', 'F8'],
    'Lamborghini': ['Aventador', 'Huracan', 'Urus'],
    'Bentley': ['Continental', 'Flying Spur', 'Bentayga'],
    'Rolls Royce': ['Phantom', 'Ghost', 'Wraith', 'Cullinan'],
    'Maserati': ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo'],
    'Alfa Romeo': ['Giulia', 'Stelvio', 'Giulietta', '4C'],
    'Fiat': ['500', 'Panda', 'Tipo', 'Punto'],
    'Renault': ['Megane', 'Clio', 'Duster', 'Koleos', 'Captur'],
    'Peugeot': ['208', '308', '3008', '5008', '2008'],
    'Citroen': ['C3', 'C4', 'C5', 'C-Elysee'],
    'Skoda': ['Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Fabia'],
    'Seat': ['Ibiza', 'Leon', 'Ateca', 'Arona'],
    'Daewoo': ['Lanos', 'Nubira', 'Espero', 'Matiz'],
    'Isuzu': ['D-Max', 'MU-X'],
    'Subaru': ['Impreza', 'Forester', 'Outback', 'XV'],
    'Daihatsu': ['Terios', 'Sirion', 'Mira', 'Charade']
};

// Populate Car Makes Dropdown
function populateCarMakes() {
    const makeSelect = document.getElementById('carMake');
    
    if (!makeSelect) return;
    
    // Clear existing options except the first one
    while (makeSelect.options.length > 1) {
        makeSelect.remove(1);
    }
    
    // Sort car makes alphabetically
    carMakes.sort();
    
    // Add options to select
    carMakes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeSelect.appendChild(option);
    });
}

// Update Model Options based on selected Make
function updateModelOptions() {
    const makeSelect = document.getElementById('carMake');
    const modelSelect = document.getElementById('carModel');
    
    if (!makeSelect || !modelSelect) return;
    
    const selectedMake = makeSelect.value;
    
    // Clear existing options except the first one
    while (modelSelect.options.length > 1) {
        modelSelect.remove(1);
    }
    
    // If no make is selected, return
    if (!selectedMake || selectedMake === '') return;
    
    // Get models for selected make
    const models = carModels[selectedMake] || [];
    
    // Sort models alphabetically
    models.sort();
    
    // Add options to select
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
}

// Populate Year Options
function populateYearOptions() {
    const yearSelect = document.getElementById('carYear');
    
    if (!yearSelect) return;
    
    // Clear existing options except the first one
    while (yearSelect.options.length > 1) {
        yearSelect.remove(1);
    }
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Add options from current year to 1970
    for (let year = currentYear; year >= 1970; year--) {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        yearSelect.appendChild(option);
    }
}

// Initialize Cloudinary Upload Widget
function initCloudinaryUpload() {
    const uploadButton = document.getElementById('uploadImagesBtn');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageCountElement = document.getElementById('imageCount');
    
    if (!uploadButton || !imagePreviewContainer || !imageCountElement) return;
    
    // Create a hidden input to store image URLs
    let hiddenInput = document.getElementById('carImagesInput');
    
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'carImagesInput';
        hiddenInput.name = 'carImages';
        document.getElementById('sellCarForm').appendChild(hiddenInput);
    }
    
    // Initialize Cloudinary widget
    const myWidget = cloudinary.createUploadWidget(
        {
            cloudName: 'dxtzc2keb',
            uploadPreset: 'CarSells',
            maxFiles: 10,
            maxFileSize: 5000000, // 5MB
            sources: ['local', 'camera'],
            resourceType: 'image',
            multiple: true,
            folder: 'car_images',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            language: 'ar',
            text: {
                'ar': {
                    'upload': 'رفع الصور',
                    'local': 'من الجهاز',
                    'camera': 'الكاميرا',
                    'drop_file': 'اسحب الصور هنا',
                    'select_file': 'اختر الصور',
                    'max_file_size': 'الحد الأقصى لحجم الملف: 5 ميجابايت',
                    'max_files': 'الحد الأقصى لعدد الصور: 10'
                }
            }
        },
        (error, result) => {
            if (!error && result && result.event === "success") {
                // Add image to preview
                addImageToPreview(result.info.secure_url);
                
                // Update hidden input with image URLs
                updateHiddenInput();
                
                // Update image count
                updateImageCount();
            }
        }
    );
    
    // Add click event to upload button
    uploadButton.addEventListener('click', () => {
        myWidget.open();
    });
    
    // Function to add image to preview
    function addImageToPreview(imageUrl) {
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-preview-item';
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'صورة السيارة';
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            imageContainer.remove();
            updateHiddenInput();
            updateImageCount();
        });
        
        // Append elements to container
        imageContainer.appendChild(img);
        imageContainer.appendChild(removeBtn);
        
        // Append container to preview
        imagePreviewContainer.appendChild(imageContainer);
    }
    
    // Function to update hidden input with image URLs
    function updateHiddenInput() {
        const images = imagePreviewContainer.querySelectorAll('img');
        const imageUrls = Array.from(images).map(img => img.src);
        hiddenInput.value = JSON.stringify(imageUrls);
    }
    
    // Function to update image count
    function updateImageCount() {
        const images = imagePreviewContainer.querySelectorAll('img');
        imageCountElement.textContent = `${images.length}/10`;
        
        // Disable upload button if max images reached
        if (images.length >= 10) {
            uploadButton.disabled = true;
            uploadButton.classList.add('disabled');
        } else {
            uploadButton.disabled = false;
            uploadButton.classList.remove('disabled');
        }
    }
}

// Handle Car Form Submit
async function handleCarFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إضافة السيارة...';
    
    try {
        // Validate form data
        const validationResult = validateCarForm(formData);
        console.log('Validation result:', validationResult);
        
        if (!validationResult.valid) {
            showError(validationResult.error);
            console.log('Error shown:', validationResult.error);
            submitButton.disabled = false;
            submitButton.innerHTML = 'إضافة السيارة';
            return;
        }
        
        // Get images from hidden input
        const imagesInput = document.getElementById('carImagesInput');
        let images = [];
        
        if (imagesInput && imagesInput.value) {
            try {
                images = JSON.parse(imagesInput.value);
            } catch (error) {
                console.error('Error parsing images:', error);
            }
        }
        
        // Prepare car data
        const carData = {
            title: formData.get('carTitle'),
            make: formData.get('carMake'),
            model: formData.get('carModel'),
            year: parseInt(formData.get('carYear')),
            price: parseInt(formData.get('carPrice')),
            mileage: parseInt(formData.get('carMileage')),
            fuelType: formData.get('carFuel'),
            transmission: formData.get('carTransmission'),
            color: formData.get('carColor'),
            location: formData.get('carLocation'),
            description: formData.get('carDescription'),
            features: formData.getAll('carFeatures'),
            contactName: formData.get('contactName'),
            contactPhone: formData.get('contactPhone'),
            contactEmail: formData.get('contactEmail'),
            images: images,
            status: 'waiting' // Set status to waiting for admin approval
        };
        console.log('Prepared carData:', carData);
        
        // Add car listing
        const result = await addCarListing(carData, images);
        console.log('addCarListing result:', result);
        
        if (result.success) {
            // Show success message
            showSuccess('تم إرسال السيارة بنجاح! سيتم مراجعتها والموافقة عليها من قبل الإدارة قريبًا.');
            console.log('Success shown:', 'تم إرسال السيارة بنجاح! سيتم مراجعتها والموافقة عليها من قبل الإدارة قريبًا.');
            
            // Reset form
            e.target.reset();
            
            // Clear image preview
            document.getElementById('imagePreviewContainer').innerHTML = '';
            document.getElementById('imageCount').textContent = '0/10';
            document.getElementById('carImagesInput').value = '';
            
            // Enable upload button
            const uploadButton = document.getElementById('uploadImagesBtn');
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.classList.remove('disabled');
            }
            
            // Redirect to car details page after 2 seconds
            setTimeout(() => {
                window.location.href = `car-detail.html?id=${result.carId}`;
            }, 2000);
        } else {
            showError(result.error || 'حدث خطأ أثناء إضافة السيارة. يرجى المحاولة مرة أخرى.');
            console.log('Error shown:', result.error || 'حدث خطأ أثناء إضافة السيارة. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error adding car:', error);
        showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
        console.log('Error shown:', 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    }
    
    // Reset button
    submitButton.disabled = false;
    submitButton.innerHTML = 'إضافة السيارة';
}

// Validate Car Form
function validateCarForm(formData) {
    // Required fields
    const requiredFields = [
        { name: 'carTitle', label: 'عنوان الإعلان' },
        { name: 'carMake', label: 'الشركة المصنعة' },
        { name: 'carModel', label: 'الموديل' },
        { name: 'carYear', label: 'سنة الصنع' },
        { name: 'carPrice', label: 'السعر' },
        { name: 'carMileage', label: 'المسافة المقطوعة' },
        { name: 'carFuel', label: 'نوع الوقود' },
        { name: 'carTransmission', label: 'ناقل الحركة' },
        { name: 'carColor', label: 'اللون' },
        { name: 'carLocation', label: 'الموقع' },
        { name: 'carDescription', label: 'وصف السيارة' },
        { name: 'contactName', label: 'اسم المعلن' },
        { name: 'contactPhone', label: 'رقم الهاتف' }
    ];
    
    // Check required fields
    for (const field of requiredFields) {
        if (!formData.get(field.name) || formData.get(field.name).trim() === '') {
            return { valid: false, error: `يرجى إدخال ${field.label}` };
        }
    }
    
    // Check if at least one image is uploaded
    const imagesInput = document.getElementById('carImagesInput');
    let images = [];
    
    if (imagesInput && imagesInput.value) {
        try {
            images = JSON.parse(imagesInput.value);
        } catch (error) {
            console.error('Error parsing images:', error);
        }
    }
    
    if (!images.length) {
        return { valid: false, error: 'يرجى رفع صورة واحدة على الأقل للسيارة' };
    }
    
    // Validate price
    const price = parseInt(formData.get('carPrice'));
    if (isNaN(price) || price <= 0) {
        return { valid: false, error: 'يرجى إدخال سعر صحيح' };
    }
    
    // Validate mileage
    const mileage = parseInt(formData.get('carMileage'));
    if (isNaN(mileage) || mileage < 0) {
        return { valid: false, error: 'يرجى إدخال مسافة صحيحة' };
    }
    
    // Validate phone number
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    const phone = formData.get('contactPhone');
    if (!phoneRegex.test(phone)) {
        return { valid: false, error: 'يرجى إدخال رقم هاتف صحيح' };
    }
    
    // Validate email if provided
    const email = formData.get('contactEmail');
    if (email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, error: 'يرجى إدخال بريد إلكتروني صحيح' };
        }
    }
    
    return { valid: true };
}

// Show Error Message
function showError(message) {
    const errorElement = document.getElementById('formError');
    const successElement = document.getElementById('formSuccess');
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide success message if visible
        if (successElement) {
            successElement.style.display = 'none';
        }
        
        // Scroll to error message
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Show Success Message
function showSuccess(message) {
    const successElement = document.getElementById('formSuccess');
    const errorElement = document.getElementById('formError');
    
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Hide error message if visible
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // Scroll to success message
        successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

// Prefill car form for editing
function prefillCarForm(car) {
    const form = document.getElementById('sellCarForm');
    if (!form) return;
    form.elements['carTitle'].value = car.title || '';
    form.elements['carMake'].value = car.make || '';
    // Trigger model population
    updateModelOptions();
    setTimeout(() => {
        form.elements['carModel'].value = car.model || '';
    }, 100); // Wait for models to populate
    form.elements['carYear'].value = car.year || '';
    form.elements['carPrice'].value = car.price || '';
    form.elements['carMileage'].value = car.mileage || '';
    form.elements['carFuel'].value = car.fuelType || '';
    form.elements['carTransmission'].value = car.transmission || '';
    form.elements['carColor'].value = car.color || '';
    form.elements['carLocation'].value = car.location || '';
    form.elements['carDescription'].value = car.description || '';
    form.elements['contactName'].value = car.contactName || '';
    form.elements['contactPhone'].value = car.contactPhone || '';
    form.elements['contactEmail'].value = car.contactEmail || '';
    // Features (checkboxes)
    if (car.features && Array.isArray(car.features)) {
        car.features.forEach(f => {
            const checkbox = form.querySelector(`input[name='carFeatures'][value='${f}']`);
            if (checkbox) checkbox.checked = true;
        });
    }
    // Images
    if (car.images && Array.isArray(car.images)) {
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        if (imagePreviewContainer) {
            imagePreviewContainer.innerHTML = '';
            car.images.forEach(url => {
                // Reuse addImageToPreview from Cloudinary logic
                if (typeof window.addImageToPreview === 'function') {
                    window.addImageToPreview(url);
                } else {
                    // fallback: add image manually
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'image-preview-item';
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = 'صورة السيارة';
                    imageContainer.appendChild(img);
                    imagePreviewContainer.appendChild(imageContainer);
                }
            });
        }
        // Update hidden input and count
        const hiddenInput = document.getElementById('carImagesInput');
        if (hiddenInput) hiddenInput.value = JSON.stringify(car.images);
        const imageCountElement = document.getElementById('imageCount');
        if (imageCountElement) imageCountElement.textContent = `${car.images.length}/10`;
    }
}
