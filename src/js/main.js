// Main JavaScript file for the website
import { getCurrentUser, getUserData, getCarListings } from './firebase-api.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize scroll to top button
    initScrollToTop();
    
    // Initialize sliders if they exist
    initSliders();
    
    // Initialize search filters toggle
    initSearchFilters();

    // Subscription/Sell Car UI logic
    const subscriptionBox = document.getElementById('subscriptionBox');
    const sellCarNavBtn = document.getElementById('sellCarNavBtn');
    const sellCarCtaBtn = document.getElementById('sellCarCtaBtn');
    const subscribeBtn = document.getElementById('subscribeBtn');

    let user = null;
    let userData = null;

    if (typeof getCurrentUser === 'function' && typeof getUserData === 'function') {
        user = await getCurrentUser();
        if (user) {
            userData = await getUserData(user.uid);
        }
    }

    // Helper: show/hide elements
    function show(el) { if (el) el.style.display = 'inline-block'; }
    function hide(el) { if (el) el.style.display = 'none'; }
    function showBlock(el) { if (el) el.style.display = 'block'; }

    // Logic
    if (user && userData && userData.success && userData.userData.isSubscribed) {
        // Subscribed: hide subscription box, show Sell Car buttons
        hide(subscriptionBox);
        show(sellCarNavBtn);
        show(sellCarCtaBtn);
    } else {
        // Not subscribed or not logged in: show subscription box, hide Sell Car buttons
        showBlock(subscriptionBox);
        hide(sellCarNavBtn);
        hide(sellCarCtaBtn);
    }

    // Subscribe button click
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', function() {
            if (!user) {
                window.location.href = 'auth.html';
            } else if (userData && userData.success && !userData.userData.isSubscribed) {
                window.location.href = 'subscription.html';
            }
        });
    }

    // Dynamic Cars Rendering
    await renderHomepageCars();
});

// Initialize Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    const authButtons = document.getElementById('authButtons');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    
    function closeMenu() {
        navLinks.classList.remove('active');
        if (authButtons) authButtons.classList.remove('active');
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    }

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            if (authButtons) {
                authButtons.classList.toggle('active');
            }
            this.classList.toggle('active');
            if (mobileMenuOverlay) {
                if (navLinks.classList.contains('active')) {
                    mobileMenuOverlay.classList.add('active');
                } else {
                    mobileMenuOverlay.classList.remove('active');
                }
            }
        });
        
        // Close menu when clicking outside or on overlay
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.navbar') && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', closeMenu);
        }
    }
}

// Initialize Scroll to Top Button
function initScrollToTop() {
    // Create scroll to top button if it doesn't exist
    let scrollTopBtn = document.getElementById('scrollTopBtn');
    
    if (!scrollTopBtn) {
        scrollTopBtn = document.createElement('button');
        scrollTopBtn.id = 'scrollTopBtn';
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        document.body.appendChild(scrollTopBtn);
    }
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });
    
    // Scroll to top when button is clicked
    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize Sliders
function initSliders() {
    // Hero Slider
    const heroSlider = document.querySelector('.hero-slider');
    
    if (heroSlider) {
        let currentSlide = 0;
        const slides = heroSlider.querySelectorAll('.hero-slide');
        const totalSlides = slides.length;
        
        // Create navigation dots
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'slider-dots';
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('span');
            dot.className = i === 0 ? 'dot active' : 'dot';
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
        
        heroSlider.appendChild(dotsContainer);
        
        // Auto slide every 5 seconds
        let slideInterval = setInterval(nextSlide, 5000);
        
        // Pause auto slide on hover
        heroSlider.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        heroSlider.addEventListener('mouseleave', () => {
            slideInterval = setInterval(nextSlide, 5000);
        });
        
        // Next slide function
        function nextSlide() {
            goToSlide((currentSlide + 1) % totalSlides);
        }
        
        // Go to specific slide
        function goToSlide(slideIndex) {
            slides[currentSlide].classList.remove('active');
            const dots = dotsContainer.querySelectorAll('.dot');
            dots[currentSlide].classList.remove('active');
            
            currentSlide = slideIndex;
            
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }
    }
    
    // Featured Cars Slider
    const featuredSlider = document.querySelector('.featured-cars');
    
    if (featuredSlider) {
        const sliderContainer = featuredSlider.querySelector('.car-cards');
        const prevBtn = featuredSlider.querySelector('.slider-prev');
        const nextBtn = featuredSlider.querySelector('.slider-next');
        
        if (sliderContainer && prevBtn && nextBtn) {
            let scrollAmount = 0;
            const cardWidth = 300; // Width of each card + margin
            
            // Scroll right
            nextBtn.addEventListener('click', function() {
                scrollAmount += cardWidth;
                if (scrollAmount > sliderContainer.scrollWidth - sliderContainer.clientWidth) {
                    scrollAmount = sliderContainer.scrollWidth - sliderContainer.clientWidth;
                }
                sliderContainer.scrollTo({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            });
            
            // Scroll left
            prevBtn.addEventListener('click', function() {
                scrollAmount -= cardWidth;
                if (scrollAmount < 0) {
                    scrollAmount = 0;
                }
                sliderContainer.scrollTo({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            });
        }
    }
}

// Initialize Search Filters Toggle
function initSearchFilters() {
    const filtersToggle = document.getElementById('filtersToggle');
    const filtersContainer = document.getElementById('filtersContainer');
    
    if (filtersToggle && filtersContainer) {
        filtersToggle.addEventListener('click', function() {
            filtersContainer.classList.toggle('show');
            this.classList.toggle('active');
            
            // Update button text
            if (this.classList.contains('active')) {
                this.innerHTML = '<i class="fas fa-times"></i> إخفاء الفلاتر';
            } else {
                this.innerHTML = '<i class="fas fa-filter"></i> عرض الفلاتر';
            }
        });
    }
}

// Format Currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('ar-SY', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format Date
function formatDate(date) {
    if (!date) return "غير متوفر";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "غير متوفر";
    return new Intl.DateTimeFormat('ar-SY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(d);
}

// Truncate Text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Show Toast Message
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 5000);
}

// Export functions
export { formatCurrency, formatDate, truncateText, showToast };

async function renderHomepageCars() {
    // Featured Cars Section
    const featuredSection = document.querySelector('.featured-section .car-grid');
    // Latest Cars Section
    const latestSection = document.querySelector('.latest-cars .cars-grid');
    // Featured Cars (bottom)
    const featuredBottomSection = document.querySelector('.featured-cars .cars-grid');

    if (featuredSection) featuredSection.innerHTML = '';
    if (latestSection) latestSection.innerHTML = '';
    if (featuredBottomSection) featuredBottomSection.innerHTML = '';

    // Fetch active cars
    const result = await getCarListings({ status: 'active' }, 'createdAt', 'desc', 20);
    if (!result.success) {
        if (featuredSection) featuredSection.innerHTML = '<div>تعذر تحميل السيارات المميزة.</div>';
        if (latestSection) latestSection.innerHTML = '<div>تعذر تحميل أحدث السيارات.</div>';
        if (featuredBottomSection) featuredBottomSection.innerHTML = '<div>تعذر تحميل السيارات المميزة.</div>';
        return;
    }
    const cars = result.cars || [];
    // Featured: first 4 cars
    const featuredCars = cars.slice(0, 4);
    // Latest: latest 8 cars
    const latestCars = cars.slice(0, 8);
    // Featured bottom: next 4 cars (or repeat featured)
    const featuredBottomCars = cars.slice(4, 8).length ? cars.slice(4, 8) : featuredCars;

    // Helper to render a car card
    function renderCarCard(car) {
        const mainImage = (car.images && car.images.length > 0) ? car.images[0] : 'images/car-placeholder.jpg';
        return `
        <div class="car-card">
            <div class="car-image">
                <img src="${mainImage}" alt="${car.title || ''}">
            </div>
            <div class="car-content">
                <h3 class="car-title">${car.title || ''}</h3>
                <div class="car-price">${formatCurrency(car.price || 0, 'SAR')}</div>
                <div class="car-details">
                    <div class="car-detail"><i class="fas fa-calendar-alt"></i><span>${car.year || ''}</span></div>
                    <div class="car-detail"><i class="fas fa-tachometer-alt"></i><span>${car.kilometers || 'غير محدد'} كم</span></div>
                    <div class="car-detail"><i class="fas fa-gas-pump"></i><span>${car.fuelType || 'غير محدد'}</span></div>
                    <div class="car-detail"><i class="fas fa-cog"></i><span>${car.transmission || 'غير محدد'}</span></div>
                </div>
                <div class="car-location"><i class="fas fa-map-marker-alt"></i><span>${car.location || 'غير محدد'}</span></div>
                <div class="car-actions">
                    <a href="car-detail.html?id=${car.id}" class="btn btn-primary btn-block">عرض التفاصيل</a>
                </div>
            </div>
        </div>`;
    }

    // Render featured cars
    if (featuredSection) {
        if (featuredCars.length === 0) {
            featuredSection.innerHTML = '<div>لا توجد سيارات مميزة متاحة حالياً.</div>';
        } else {
            featuredSection.innerHTML = featuredCars.map(renderCarCard).join('');
        }
    }
    // Render latest cars
    if (latestSection) {
        if (latestCars.length === 0) {
            latestSection.innerHTML = '<div>لا توجد سيارات متاحة حالياً.</div>';
        } else {
            latestSection.innerHTML = latestCars.map(renderCarCard).join('');
        }
    }
    // Render featured bottom cars
    if (featuredBottomSection) {
        if (featuredBottomCars.length === 0) {
            featuredBottomSection.innerHTML = '<div>لا توجد سيارات مميزة متاحة حالياً.</div>';
        } else {
            featuredBottomSection.innerHTML = featuredBottomCars.map(renderCarCard).join('');
        }
    }
}
