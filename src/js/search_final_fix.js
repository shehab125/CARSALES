// ملف إصلاح البحث والفلترة
import { getCarListings } from './firebase-api.js';
import { formatCurrency, formatDate, truncateText } from './main.js';

// تنفيذ الكود عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل صفحة البحث');
    
    // التحقق من أننا في صفحة البحث
    const isSearchPage = window.location.pathname.includes('search');
    
    if (isSearchPage) {
        console.log('بدء تهيئة صفحة البحث');
        initSearchPage();
    }
});

// تهيئة صفحة البحث
async function initSearchPage() {
    try {
        console.log('تهيئة نموذج البحث');
        
        // تهيئة نموذج البحث
        initSearchForm();
        
        // الحصول على معلمات البحث من الرابط
        const searchParams = getSearchParamsFromUrl();
        console.log('معلمات البحث من الرابط:', searchParams);
        
        // ملء النموذج بمعلمات البحث
        fillSearchForm(searchParams);
        
        // تحديث خيارات الطراز بناءً على الشركة المصنعة المحددة
        const makeSelect = document.getElementById('make');
        if (makeSelect && searchParams.make) {
            console.log('تحديث خيارات الطراز للشركة:', searchParams.make);
            updateModelOptions();
        }
        
        // إجراء البحث بالمعلمات
        await performSearch(searchParams);
        
    } catch (error) {
        console.error('خطأ في تهيئة صفحة البحث:', error);
        showError('حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
}

// تهيئة نموذج البحث
function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    const filtersToggle = document.getElementById('filtersToggle');
    const filtersContainer = document.getElementById('filtersContainer');
    const sortSelect = document.getElementById('sortOrder');
    
    if (searchForm) {
        console.log('إضافة مستمع حدث لنموذج البحث');
        
        // إزالة أي مستمعي أحداث سابقة
        searchForm.removeEventListener('submit', handleSearchFormSubmit);
        
        // إضافة مستمع حدث لنموذج البحث
        searchForm.addEventListener('submit', handleSearchFormSubmit);
        
        // تهيئة حقول النموذج
        initFormFields();
    } else {
        console.error('لم يتم العثور على نموذج البحث!');
    }
    
    if (filtersToggle && filtersContainer) {
        console.log('إضافة مستمع حدث لزر الفلاتر');
        
        // إزالة أي مستمعي أحداث سابقة
        filtersToggle.removeEventListener('click', toggleFilters);
        
        // إضافة مستمع حدث لزر الفلاتر
        filtersToggle.addEventListener('click', toggleFilters);
        
        function toggleFilters() {
            filtersContainer.classList.toggle('show');
            this.classList.toggle('active');
            
            // تحديث نص الزر
            if (this.classList.contains('active')) {
                this.innerHTML = '<i class="fas fa-times"></i> إخفاء الفلاتر';
            } else {
                this.innerHTML = '<i class="fas fa-filter"></i> عرض الفلاتر';
            }
        }
    }
    
    if (sortSelect) {
        console.log('إضافة مستمع حدث لقائمة الترتيب');
        
        // إزالة أي مستمعي أحداث سابقة
        sortSelect.removeEventListener('change', handleSortChange);
        
        // إضافة مستمع حدث لقائمة الترتيب
        sortSelect.addEventListener('change', handleSortChange);
        
        function handleSortChange() {
            // الحصول على معلمات البحث الحالية
            const searchParams = getSearchParamsFromUrl();
            
            // تحديث معلمة الترتيب
            searchParams.sort = this.value;
            
            // تحديث الرابط بمعلمات البحث
            updateUrlWithSearchParams(searchParams);
            
            // إجراء البحث بالمعلمات المحدثة
            performSearch(searchParams);
        }
    }
}

// تهيئة حقول النموذج
function initFormFields() {
    // تعبئة قائمة الشركات المصنعة
    const makeSelect = document.getElementById('make');
    
    if (makeSelect) {
        console.log('إضافة مستمع حدث لتحديث الطرازات عند تغيير الشركة');
        
        // إزالة أي مستمعي أحداث سابقة
        makeSelect.removeEventListener('change', updateModelOptions);
        
        // إضافة مستمع حدث لتحديث الطرازات عند تغيير الشركة
        makeSelect.addEventListener('change', updateModelOptions);
        
        // تعبئة الشركات المصنعة
        populateCarMakes();
    }
    
    // تهيئة قوائم السنوات
    const yearSelect = document.getElementById('year');
    
    if (yearSelect) {
        populateYearOptions(yearSelect);
    }
}

// تعبئة قائمة الشركات المصنعة
function populateCarMakes() {
    const makeSelect = document.getElementById('make');
    
    if (!makeSelect) {
        console.error('لم يتم العثور على قائمة الشركات المصنعة!');
        return;
    }
    
    console.log('تعبئة قائمة الشركات المصنعة');
    
    // مسح الخيارات الموجودة باستثناء الخيار الأول
    while (makeSelect.options.length > 1) {
        makeSelect.remove(1);
    }
    
    // مصفوفة الشركات المصنعة
    const carMakes = [
        'Toyota', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Suzuki',
        'Mercedes', 'BMW', 'Audi', 'Volkswagen', 'Chevrolet', 'Ford', 'Jeep',
        'Lexus', 'Infiniti', 'Land Rover', 'Porsche', 'Ferrari', 'Lamborghini', 'Bentley',
        'Rolls Royce', 'Maserati', 'Alfa Romeo', 'Fiat', 'Renault', 'Peugeot', 'Citroen',
        'Skoda', 'Seat', 'Daewoo', 'Isuzu', 'Subaru', 'Daihatsu'
    ];
    
    // ترتيب الشركات المصنعة أبجدياً
    carMakes.sort();
    
    // إضافة خيارات إلى القائمة
    carMakes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeSelect.appendChild(option);
    });
}

// طرازات السيارات حسب الشركة المصنعة مع الترجمة الإنجليزية
const carModels = {
    'Toyota': ['Camry', 'Corolla', 'Land Cruiser', 'RAV4', 'Highlander', 'Avalon', 'Yaris', 'Prado', 'Fortuner', 'Hilux'],
    'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Creta', 'Palisade', 'Azera', 'Veloster', 'Kona'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Cerato', 'Rio', 'Cadenza', 'Seltos', 'Telluride', 'Picanto', 'Stinger'],
    'Nissan': ['Altima', 'Maxima', 'Patrol', 'X-Trail', 'Qashqai', 'Sunny', 'Sentra', 'Tiida', 'Pathfinder', 'Navara'],
    'Honda': ['Accord', 'Civic', 'CR-V', 'Pilot', 'City', 'Jazz', 'HR-V', 'Odyssey'],
    'Mazda': ['Mazda 3', 'Mazda 6', 'CX-5', 'CX-9', 'CX-3', 'CX-30', 'MX-5'],
    'Mitsubishi': ['Lancer', 'Pajero', 'Outlander', 'Eclipse Cross', 'L200', 'Attrage', 'Expander'],
    'Mercedes': ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'B-Class', 'GLC', 'GLE', 'GLS', 'G-Class'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', '1 Series', '2 Series', '4 Series', '6 Series'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
    'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touareg', 'Polo', 'Jetta', 'Arteon', 'T-Roc']
};

// تحديث خيارات الطراز بناءً على الشركة المصنعة المحددة
function updateModelOptions() {
    const makeSelect = document.getElementById('make');
    const modelSelect = document.getElementById('model');
    
    if (!makeSelect || !modelSelect) {
        console.error('لم يتم العثور على قائمة الشركات أو الطرازات!');
        return;
    }
    
    const selectedMake = makeSelect.value;
    console.log('تحديث خيارات الطراز للشركة:', selectedMake);
    
    // مسح الخيارات الموجودة باستثناء الخيار الأول
    while (modelSelect.options.length > 1) {
        modelSelect.remove(1);
    }
    
    // إذا لم يتم تحديد شركة، فارجع
    if (!selectedMake || selectedMake === '') return;
    
    // الحصول على الطرازات للشركة المحددة
    const models = carModels[selectedMake];
    
    if (!models) return;
    
    // إضافة خيارات إلى القائمة مع عرض النص العربي والقيمة الإنجليزية
    models.forEach((model, index) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
}

// تعبئة خيارات السنة
function populateYearOptions(selectElement) {
    if (!selectElement) {
        console.error('لم يتم العثور على قائمة السنوات!');
        return;
    }
    
    console.log('تعبئة خيارات السنة');
    
    // مسح الخيارات الموجودة باستثناء الخيار الأول
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // الحصول على السنة الحالية
    const currentYear = new Date().getFullYear();
    
    // إضافة خيارات من السنة الحالية إلى 1970
    for (let year = currentYear; year >= 1970; year--) {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        selectElement.appendChild(option);
    }
}

// معالجة تقديم نموذج البحث
function handleSearchFormSubmit(e) {
    e.preventDefault();
    console.log('تم تقديم نموذج البحث');
    
    const formData = new FormData(e.target);
    
    // تحليل المسافة المقطوعة
    let mileageMin = '', mileageMax = '';
    const mileageVal = formData.get('mileage');
    
    if (mileageVal) {
        console.log('قيمة المسافة المقطوعة:', mileageVal);
        
        if (mileageVal === '0-5000') { mileageMin = 0; mileageMax = 5000; }
        else if (mileageVal === '5000-10000') { mileageMin = 5000; mileageMax = 10000; }
        else if (mileageVal === '10000-50000') { mileageMin = 10000; mileageMax = 50000; }
        else if (mileageVal === '50000-100000') { mileageMin = 50000; mileageMax = 100000; }
        else if (mileageVal === '100000+') { mileageMin = 100000; }
    }
    
    // إنشاء كائن معلمات البحث
    const searchParams = {
        make: formData.get('make') || '',
        model: formData.get('model') || '',
        year: formData.get('year') || '',
        minPrice: formData.get('minPrice') || '',
        maxPrice: formData.get('maxPrice') || '',
        location: formData.get('location') || '',
        transmission: formData.get('transmission') || '',
        fuelType: formData.get('fuelType') || '',
        condition: formData.get('condition') || '',
        mileageMin: mileageMin,
        mileageMax: mileageMax,
        sort: document.getElementById('sortOrder')?.value || 'newest'
    };
    
    console.log('معلمات البحث:', searchParams);
    
    // تحديث الرابط بمعلمات البحث
    updateUrlWithSearchParams(searchParams);
    
    // إجراء البحث بالمعلمات
    performSearch(searchParams);
}

// الحصول على معلمات البحث من الرابط
function getSearchParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
        make: urlParams.get('make') || '',
        model: urlParams.get('model') || '',
        year: urlParams.get('year') || '',
        minPrice: urlParams.get('minPrice') || '',
        maxPrice: urlParams.get('maxPrice') || '',
        location: urlParams.get('location') || '',
        transmission: urlParams.get('transmission') || '',
        fuelType: urlParams.get('fuelType') || '',
        condition: urlParams.get('condition') || '',
        mileageMin: urlParams.get('mileageMin') || '',
        mileageMax: urlParams.get('mileageMax') || '',
        sort: urlParams.get('sort') || 'newest'
    };
}

// تحديث الرابط بمعلمات البحث
function updateUrlWithSearchParams(searchParams) {
    const urlParams = new URLSearchParams();
    
    // إضافة المعلمات إلى الرابط إذا كانت لها قيم
    for (const [key, value] of Object.entries(searchParams)) {
        if (value) {
            urlParams.set(key, value);
        }
    }
    
    // تحديث الرابط بدون إعادة تحميل
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    
    console.log('تم تحديث الرابط:', newUrl);
}

// ملء نموذج البحث بالمعلمات
function fillSearchForm(searchParams) {
    console.log('ملء نموذج البحث بالمعلمات:', searchParams);
    
    // تعيين الشركة المصنعة
    const makeSelect = document.getElementById('make');
    if (makeSelect && searchParams.make) {
        makeSelect.value = searchParams.make;
        console.log('تم تعيين الشركة المصنعة:', searchParams.make);
    }
    
    // تعيين الطراز
    const modelSelect = document.getElementById('model');
    if (modelSelect && searchParams.model) {
        // تأكد من تحديث خيارات الطراز أولاً
        updateModelOptions();
        
        // ثم قم بتعيين القيمة
        setTimeout(() => {
            modelSelect.value = searchParams.model;
            console.log('تم تعيين الطراز:', searchParams.model);
        }, 100);
    }
    
    // تعيين السنة
    const yearSelect = document.getElementById('year');
    if (yearSelect && searchParams.year) {
        yearSelect.value = searchParams.year;
        console.log('تم تعيين السنة:', searchParams.year);
    }
    
    // تعيين الحد الأدنى للسعر
    const minPriceInput = document.getElementById('minPrice');
    if (minPriceInput && searchParams.minPrice) {
        minPriceInput.value = searchParams.minPrice;
        console.log('تم تعيين الحد الأدنى للسعر:', searchParams.minPrice);
    }
    
    // تعيين الحد الأقصى للسعر
    const maxPriceInput = document.getElementById('maxPrice');
    if (maxPriceInput && searchParams.maxPrice) {
        maxPriceInput.value = searchParams.maxPrice;
        console.log('تم تعيين الحد الأقصى للسعر:', searchParams.maxPrice);
    }
    
    // تعيين الموقع
    const locationSelect = document.getElementById('location');
    if (locationSelect && searchParams.location) {
        locationSelect.value = searchParams.location;
        console.log('تم تعيين الموقع:', searchParams.location);
    }
    
    // تعيين الحالة
    const conditionSelect = document.getElementById('condition');
    if (conditionSelect && searchParams.condition) {
        conditionSelect.value = searchParams.condition;
        console.log('تم تعيين الحالة:', searchParams.condition);
    }
    
    // تعيين المسافة المقطوعة
    const mileageSelect = document.getElementById('mileage');
    if (mileageSelect && (searchParams.mileageMin || searchParams.mileageMax)) {
        if (searchParams.mileageMin == 0 && searchParams.mileageMax == 5000) mileageSelect.value = '0-5000';
        else if (searchParams.mileageMin == 5000 && searchParams.mileageMax == 10000) mileageSelect.value = '5000-10000';
        else if (searchParams.mileageMin == 10000 && searchParams.mileageMax == 50000) mileageSelect.value = '10000-50000';
        else if (searchParams.mileageMin == 50000 && searchParams.mileageMax == 100000) mileageSelect.value = '50000-100000';
        else if (searchParams.mileageMin == 100000) mileageSelect.value = '100000+';
        
        console.log('تم تعيين المسافة المقطوعة:', mileageSelect.value);
    }
    
    // تعيين ناقل الحركة
    const transmissionSelect = document.getElementById('transmission');
    if (transmissionSelect && searchParams.transmission) {
        transmissionSelect.value = searchParams.transmission;
        console.log('تم تعيين ناقل الحركة:', searchParams.transmission);
    }
    
    // تعيين نوع الوقود
    const fuelTypeSelect = document.getElementById('fuelType');
    if (fuelTypeSelect && searchParams.fuelType) {
        fuelTypeSelect.value = searchParams.fuelType;
        console.log('تم تعيين نوع الوقود:', searchParams.fuelType);
    }
    
    // تعيين الترتيب
    const sortSelect = document.getElementById('sortOrder');
    if (sortSelect && searchParams.sort) {
        sortSelect.value = searchParams.sort;
        console.log('تم تعيين الترتيب:', searchParams.sort);
    }
}

// إجراء البحث بالمعلمات
async function performSearch(searchParams) {
    try {
        console.log('جاري البحث بالمعلمات:', searchParams);
        showLoading();
        
        // إنشاء كائن الفلاتر
        const filters = {
            make: searchParams.make || undefined,
            model: searchParams.model || undefined,
            year: searchParams.year ? parseInt(searchParams.year) : undefined,
            priceMin: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
            priceMax: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
            location: searchParams.location || undefined,
            transmission: searchParams.transmission || undefined,
            fuelType: searchParams.fuelType || undefined,
            condition: searchParams.condition || undefined,
            mileageMin: searchParams.mileageMin ? parseInt(searchParams.mileageMin) : undefined,
            mileageMax: searchParams.mileageMax ? parseInt(searchParams.mileageMax) : undefined,
            status: 'active'
        };
        
        console.log('فلاتر البحث:', filters);
        
        // تحديد معلمات الترتيب
        let sortBy = 'createdAt';
        let sortOrder = 'desc';
        
        switch (searchParams.sort) {
            case 'newest': sortBy = 'createdAt'; sortOrder = 'desc'; break;
            case 'oldest': sortBy = 'createdAt'; sortOrder = 'asc'; break;
            case 'price_low': sortBy = 'price'; sortOrder = 'asc'; break;
            case 'price_high': sortBy = 'price'; sortOrder = 'desc'; break;
            case 'mileage_low': sortBy = 'mileage'; sortOrder = 'asc'; break;
            case 'mileage_high': sortBy = 'mileage'; sortOrder = 'desc'; break;
            case 'yearAsc': sortBy = 'year'; sortOrder = 'asc'; break;
            case 'yearDesc': sortBy = 'year'; sortOrder = 'desc'; break;
        }
        
        console.log('ترتيب البحث:', { sortBy, sortOrder });
        
        // استدعاء دالة الحصول على قائمة السيارات
        const result = await getCarListings(filters, sortBy, sortOrder, 20);
        
        if (result.success) {
            console.log('تم العثور على', result.cars.length, 'سيارة');
            displaySearchResults(result.cars, searchParams);
        } else {
            console.error('خطأ في البحث:', result.error);
            showError(result.error || 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('خطأ في إجراء البحث:', error);
        showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    } finally {
        hideLoading();
    }
}

// عرض نتائج البحث
function displaySearchResults(cars, searchParams) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!resultsContainer) {
        console.error('لم يتم العثور على حاوية نتائج البحث!');
        return;
    }
    
    // مسح حاوية النتائج
    resultsContainer.innerHTML = '';
    
    // تحديث عدد النتائج
    if (resultsCount) {
        resultsCount.textContent = cars.length;
        console.log('تم تحديث عدد النتائج:', cars.length);
    }
    
    // التحقق من عدم وجود نتائج
    if (cars.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No Results</h3>
                <p>No cars found matching your search criteria. Please try different search parameters.</p>
            </div>
        `;
        console.log('No search results found');
        return;
    }
    
    // إنشاء بطاقات السيارات
    cars.forEach(car => {
        const carCard = createCarCard(car);
        resultsContainer.appendChild(carCard);
    });
    
    console.log('تم عرض', cars.length, 'سيارة في النتائج');
}

// إنشاء بطاقة سيارة
function createCarCard(car) {
    const carCard = document.createElement('div');
    carCard.className = 'car-card';
    
    // الحصول على الصورة الرئيسية أو صورة بديلة
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'images/car-placeholder.jpg';
    
    // تنسيق السعر
    const formattedPrice = formatCurrency(car.price);
    
    // تنسيق التاريخ
    const formattedDate = formatDate(car.createdAt);
    
    // اختصار الوصف
    const shortDescription = truncateText(car.description || '', 100);
    
    // الحصول على اسم الشركة المصنعة باللغة الإنجليزية
    const englishMake = car.make;
    
    // الحصول على اسم الطراز باللغة الإنجليزية
    const englishModel = car.model;
    
    // Translate condition to English
    const condition = car.condition === 'جديدة' ? 'New' : 'Used';
    
    carCard.innerHTML = `
        <div class="car-image">
            <img src="${mainImage}" alt="${englishMake} ${englishModel}">
            <div class="car-badges">
                ${car.featured ? '<span class="badge featured">Featured</span>' : ''}
                ${car.condition === 'جديدة' ? '<span class="badge new">New</span>' : ''}
                ${car.condition === 'مستعملة' ? '<span class="badge used">Used</span>' : ''}
            </div>
        </div>
        <div class="car-content">
            <div class="car-title">${englishMake} ${englishModel} ${car.year}</div>
            <div class="car-price">${formattedPrice}</div>
            <div class="car-details">
                <div class="car-detail"><i class="fas fa-calendar-alt"></i> ${car.year}</div>
                <div class="car-detail"><i class="fas fa-tachometer-alt"></i> ${car.mileage} km</div>
                <div class="car-detail"><i class="fas fa-gas-pump"></i> ${car.fuelType}</div>
                <div class="car-detail"><i class="fas fa-cog"></i> ${car.transmission}</div>
            </div>
            <div class="car-location"><i class="fas fa-map-marker-alt"></i> ${car.location}</div>
            <div class="car-description">${shortDescription}</div>
            <div class="car-footer">
                <div class="car-date">
                    <i class="fas fa-clock"></i> ${formattedDate}
                </div>
                <a href="car-detail.html?id=${car.id}" class="btn btn-primary">View Details</a>
            </div>
        </div>
    `;
    
    return carCard;
}

// إظهار مؤشر التحميل
function showLoading() {
    // التحقق من وجود مؤشر التحميل
    let loader = document.getElementById('searchLoader');
    
    // إنشاء مؤشر التحميل إذا لم يكن موجوداً
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'searchLoader';
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div><p>جاري البحث...</p>';
        document.body.appendChild(loader);
    }
    
    // إظهار مؤشر التحميل
    loader.style.display = 'flex';
    console.log('تم إظهار مؤشر التحميل');
}

// إخفاء مؤشر التحميل
function hideLoading() {
    const loader = document.getElementById('searchLoader');
    
    if (loader) {
        loader.style.display = 'none';
        console.log('تم إخفاء مؤشر التحميل');
    }
}

// إظهار رسالة خطأ
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'toast error';
    errorToast.textContent = message;
    document.body.appendChild(errorToast);
    errorToast.classList.add('show');
    
    console.error('رسالة خطأ:', message);
    
    setTimeout(() => {
        errorToast.classList.remove('show');
        setTimeout(() => {
            errorToast.remove();
        }, 300);
    }, 5000);
}

// إظهار رسالة نجاح
function showSuccess(message) {
    const successToast = document.createElement('div');
    successToast.className = 'toast success';
    successToast.textContent = message;
    document.body.appendChild(successToast);
    successToast.classList.add('show');
    
    console.log('رسالة نجاح:', message);
    
    setTimeout(() => {
        successToast.classList.remove('show');
        setTimeout(() => {
            successToast.remove();
        }, 300);
    }, 5000);
}

// تصدير الدوال للاستخدام في ملفات أخرى
export {
    initSearchPage,
    performSearch,
    getSearchParamsFromUrl,
    updateUrlWithSearchParams
};
