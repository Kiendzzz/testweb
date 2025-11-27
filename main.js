// These are now initialized in DOMContentLoaded

// Authentication state
let isAuthenticated = false;
let classPassword = null; // populated after server-side auth

// Rate limiting for uploads
let lastUploadTime = 0;
const UPLOAD_COOLDOWN = 5000; // 5 seconds between uploads

// Pagination and filter state for memories
let currentPage = 1;
let filteredMemories = [];
let allMemoryElements = []; // Original list of DOM elements for filter/sort
const itemsPerPage = 20;

// No results div for memories
let noResultsDiv = null;

// Safe loading state toggler to avoid runtime errors
function showLoadingState(isLoading) {
    try {
        const skeleton = document.getElementById('memorySkeleton');
        const grid = document.querySelector('.memory-grid');
        if (skeleton) skeleton.classList.toggle('hidden', !isLoading);
        if (grid && isLoading) grid.style.opacity = '0.6';
        if (grid && !isLoading) grid.style.opacity = '1';
    } catch (_) {}
}

// Input sanitization function
function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

// XSS protection for user inputs
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Check if user can upload (rate limiting)
function canUpload() {
    const now = Date.now();
    if (now - lastUploadTime < UPLOAD_COOLDOWN) {
        const remainingTime = Math.ceil((UPLOAD_COOLDOWN - (now - lastUploadTime)) / 1000);
        showErrorToast(`Vui lòng đợi ${remainingTime} giây trước khi upload tiếp!`);
        return false;
    }
    return true;
}

// Image lazy loading with intersection observer
function setupLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('fade-in');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

// Create no results div
function createNoResultsDiv() {
    noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'col-span-full text-center py-12';
    noResultsDiv.innerHTML = `
        <i data-feather="image" class="w-16 h-16 mx-auto text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-600 mb-2">Không tìm thấy kết quả</h3>
        <p class="text-gray-500">Hãy thử từ khóa khác!</p>
    `;
    noResultsDiv.style.display = 'none';
    return noResultsDiv;
}

// Apply filter and sort, then paginate
function applyFilterAndSort() {
    const searchText = document.getElementById('searchMemory').value.toLowerCase();
    const sortValue = document.getElementById('sortMemory').value;

    // Filter on original allMemoryElements (DOM elements)
    let filtered = [...allMemoryElements].filter(mem => {
        const title = mem.querySelector('.memory-title').textContent.toLowerCase();
        return title.includes(searchText);
    });

    // Sort
    filtered.sort((a, b) => {
        if (sortValue === 'title') {
            return a.querySelector('.memory-title').textContent.localeCompare(
                b.querySelector('.memory-title').textContent);
        } else if (sortValue === 'newest') {
            return b.dataset.path.localeCompare(a.dataset.path);
        } else if (sortValue === 'oldest') {
            return a.dataset.path.localeCompare(b.dataset.path);
        }
        return 0;
    });

    filteredMemories = filtered;

    // Hide all elements
    allMemoryElements.forEach(el => el.style.display = 'none');

    // Handle no results
    if (filtered.length === 0) {
        if (!noResultsDiv) {
            const grid = document.querySelector('.memory-grid');
            grid.appendChild(createNoResultsDiv());
        }
        noResultsDiv.style.display = 'block';
        renderPagination(1); // Single "page" for no results
        return;
    } else {
        if (noResultsDiv) noResultsDiv.style.display = 'none';
    }

    // Show paginated
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    paginated.forEach((el, idx) => {
        el.classList.add('fade-in-up');
        el.style.animationDelay = `${idx * 0.05}s`;
        el.style.display = 'block';
    });

    renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    if (totalPages <= 1) return; // No pagination if <=1 page

    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Â«';
    prevBtn.className = `px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            applyFilterAndSort(); // Re-apply to show new page
        }
    };
    pagination.appendChild(prevBtn);

    // Numbers
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        button.onclick = () => {
            currentPage = i;
            applyFilterAndSort();
        };
        pagination.appendChild(button);
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Â»';
    nextBtn.className = `px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            applyFilterAndSort();
        }
    };
    pagination.appendChild(nextBtn);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check authentication from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    // XÓA hoặc COMMENT 2 dòng này:
    // AOS.init({
    //     duration: 800,
    //     once: true,
    //     offset: 100
    // });
    // feather.replace();

    const authStatus = localStorage.getItem('isAuthenticated');
    isAuthenticated = authStatus === 'true';
    classPassword = localStorage.getItem('classPassword') || null;
    
    if (isAuthenticated) {
        showMemoryActions();
        updateUploadButtonUI();
    }
    
    // Setup lazy loading
    setupLazyLoading();
    
    // Load memories after DOM is ready
    setTimeout(() => {
        loadMemories();
    }, 100);

    // Event listeners for search and sort
    const searchInput = document.getElementById('searchMemory');
    const sortSelect = document.getElementById('sortMemory');
    const debouncedFilter = debounce(() => { currentPage = 1; applyFilterAndSort(); }, 300);
    searchInput.addEventListener('input', debouncedFilter);
    sortSelect.addEventListener('change', () => { currentPage = 1; applyFilterAndSort(); });
});

// Load memories from server
async function loadMemories() {
    try {
        showLoadingState(true);
        const resp = await fetch('/.netlify/functions/get-memories');
        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${resp.status}: Failed to load memories`);
        }

        const responseData = await resp.json();
        const { data: memories, total } = responseData || {};
        
        // Validate response data
        if (!Array.isArray(memories)) {
            throw new Error('Invalid response format from server');
        }

        const grid = document.querySelector('.memory-grid');
        grid.innerHTML = '';

        if (memories.length === 0) {
            grid.appendChild(createNoResultsDiv());
            noResultsDiv.innerHTML = `
                <i data-feather="image" class="w-16 h-16 mx-auto text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Chưa có ảnh kỷ niệm</h3>
                <p class="text-gray-500">Hãy upload ảnh đầu tiên để bắt đầu!</p>
            `;
            noResultsDiv.style.display = 'block';
            feather.replace();
            return;
        }

        // Create all DOM elements
        allMemoryElements = [];
        memories.forEach(mem => {
            const memoryCard = document.createElement('div');
            memoryCard.className = 'memory-card';
            memoryCard.dataset.path = mem.path;
            memoryCard.dataset.title = mem.title;
            memoryCard.dataset.date = mem.date;
            memoryCard.style.display = 'none'; // Initially hidden
            // Keep original behavior; no extra AOS attributes added here
            memoryCard.innerHTML = `
                <img src="${mem.url}" alt="${mem.title}" class="memory-img" loading="lazy">
                <div class="memory-overlay">
                    <h3 class="memory-title">${escapeHtml(mem.title)}</h3>
                    <p class="memory-date">${new Date(mem.date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="memory-actions" style="display: ${isAuthenticated ? 'flex' : 'none'};">
                    <div class="memory-action-btn edit-btn"><i data-feather="edit"></i></div>
                    <div class="memory-action-btn delete-btn"><i data-feather="trash-2"></i></div>
                </div>
            `;
            const imgEl = memoryCard.querySelector('.memory-img');
            if (imgEl) imgEl.onclick = () => openImageModal(mem.url);
            // fallback: open when clicking anywhere on card except actions
            memoryCard.addEventListener('click', (evt) => {
                if (evt.target.closest('.memory-action-btn')) return;
                if (evt.target.closest('.memory-actions')) return;
                openImageModal(mem.url);
            });
            grid.appendChild(memoryCard);
            allMemoryElements.push(memoryCard);
        });

        feather.replace();

        // Initial filter/sort/paginate
        currentPage = 1;
        applyFilterAndSort();

        // Keep original AOS init/behavior managed in index.html script

    } catch (err) {
        console.error('Load memories error:', err);
        
        // Show fallback content for network errors
        const grid = document.querySelector('.memory-grid');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-feather="alert-triangle" class="w-16 h-16 mx-auto text-red-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-red-600 mb-2">Lỗi tải dữ liệu</h3>
                <p class="text-gray-500">Kiểm tra kết nối và thử lại!</p>
            </div>
        `;
        feather.replace();
    } finally {
        showLoadingState(false);
        // Hiện nội dung web khi dữ liệu đã render xong
        window.showMainContent && window.showMainContent();
    }
}

function updateUploadButtonUI() {
    const uploadBtn = document.getElementById('uploadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileUploadBtn = document.getElementById('mobileUploadBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (isAuthenticated) {
        // Desktop
        uploadBtn.onclick = openUploadModal;
        uploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        logoutBtn.classList.remove('hidden');

        // Mobile
        mobileUploadBtn.onclick = openUploadModal;
        mobileUploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        mobileLogoutBtn.classList.remove('hidden');
    } else {
        // Desktop
        uploadBtn.onclick = openPasswordModal;
        uploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Nhập mật khẩu';
        logoutBtn.classList.add('hidden');

        // Mobile
        mobileUploadBtn.onclick = openPasswordModal;
        mobileUploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Nhập mật khẩu';
        mobileLogoutBtn.classList.add('hidden');
    }
    feather.replace();
}

function openPasswordModal() {
    if (isAuthenticated) {
        openUploadModal();
    } else {
        document.getElementById('passwordModal').classList.remove('hidden');
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('passwordError').classList.add('hidden');
    document.getElementById('passwordInput').value = '';
}

async function checkPassword() {
    const enteredPassword = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('passwordError');
    try {
        const resp = await fetch('/.netlify/functions/auth-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: enteredPassword })
        });
        if (!resp.ok) {
            let msg = 'Xác thực thất bại.';
            try { const data = await resp.json(); if (data?.error) msg = data.error; } catch(_) {}
            if (resp.status === 404) msg = 'Không tìm thấy function auth-check. Hãy deploy lên Netlify.';
            if (resp.status === 500) msg = 'Máy chủ chưa cấu hình CLASS_PASSWORD.';
            throw new Error(msg);
        }
        isAuthenticated = true;
        classPassword = enteredPassword;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('classPassword', classPassword);
        closePasswordModal();
        openUploadModal();
        showMemoryActions();
        updateUploadButtonUI();
        loadMemories();
        showSuccessToast('Đăng nhập thành công!');
    } catch (e) {
        errorElement.textContent = e.message || 'Mật khẩu không đúng. Vui lòng thử lại.';
        errorElement.classList.remove('hidden');
        const input = document.getElementById('passwordInput');
        input.value = '';
        input.focus();
    }
}

// Upload modal functions
function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileName').classList.add('hidden');
}

// Save edit metadata
async function saveEdit() {
    const path = document.getElementById('editPath').value;
    const title = sanitizeInput(document.getElementById('editTitle').value);
    const date = document.getElementById('editDate').value;
    if (!title || title.length < 3) { showErrorToast('Tiêu đề phải có ít nhất 3 ký tự!'); return; }
    if (!date) { showErrorToast('Vui lòng chọn ngày chụp!'); return; }
    try {
        const resp = await fetch('/.netlify/functions/update-image-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, title, date, password: classPassword })
        });
        if (!resp.ok) throw new Error('Cập nhật thất bại');
        showSuccessToast('Đã cập nhật thông tin ảnh!');
        document.getElementById('editModal').classList.add('hidden');
        loadMemories();
    } catch (e) {
        showErrorToast('Lỗi khi cập nhật!');
    }
}

// File input display + validate size
document.getElementById('imageFile').addEventListener('change', function(e) {
    const fileNameElement = document.getElementById('fileName');
    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("⚠️ Ảnh vượt quá 5MB. Vui lòng chọn file nhỏ hơn.");
            this.value = ""; // reset input
            fileNameElement.classList.add('hidden');
            return;
        }
        fileNameElement.textContent = file.name + ` (${(file.size/1024/1024).toFixed(2)} MB)`;
        fileNameElement.classList.remove('hidden');
    } else {
        fileNameElement.classList.add('hidden');
    }
});

// ================== UPLOAD IMAGE ==================
function uploadImage() {
    // Rate limiting check
    if (!canUpload()) {
        return;
    }

    const title = sanitizeInput(document.getElementById('imageTitle').value);
    const date = document.getElementById('imageDate').value;
    const file = document.getElementById('imageFile').files[0];

    // Enhanced validation
    if (!title || title.length < 3) {
        showErrorToast('Tiêu đề phải có ít nhất 3 ký tự!');
        return;
    }

    if (!date) {
        showErrorToast('Vui lòng chọn ngày chụp!');
        return;
    }

    if (!file) {
        showErrorToast('Vui lòng chọn ảnh!');
        return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showErrorToast('Chỉ chấp nhận file JPG, PNG, WebP!');
        return;
    }

    // File size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorToast('Kích thước file không được vượt quá 5MB!');
        return;
    }

    // Show loading state with progress bar
    const uploadBtn = document.querySelector('#uploadForm button[type="button"]');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Đang upload...';
    uploadBtn.disabled = true;
    uploadProgress.classList.remove('hidden');
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
        progressText.textContent = `Đang upload... ${Math.round(progress)}%`;
    }, 200);

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];

        try {
            const resp = await fetch('/.netlify/functions/upload-image', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    date,
                    filename: file.name,
                    contentBase64: base64,
                    password: classPassword,
                }),
            });
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Hoàn tất...';

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${resp.status}: Upload failed`);
            }

            const data = await resp.json();
            showSuccessToast(`Upload thành công: ${data.path}`);
            closeUploadModal();
            loadMemories(); // Reload memories
            lastUploadTime = Date.now();

        } catch (err) {
            console.error('Upload error:', err);
            showErrorToast(`Lỗi upload: ${err.message}`);
            progressText.textContent = 'Lỗi...';
            progressBar.style.backgroundColor = '#ef4444';
        } finally {
            setTimeout(() => {
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;
                uploadProgress.classList.add('hidden');
                progressBar.style.width = '0%';
                progressBar.style.backgroundColor = '#7b2ff7';
            }, 1500);
        }
    };
    reader.readAsDataURL(file);
}

// ================== TOAST NOTIFICATIONS ==================
function showSuccessToast(message) {
    const toast = document.getElementById('successToast');
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showErrorToast(message) {
    const toast = document.getElementById('successToast');
    toast.classList.add('bg-red-500'); // Override to red
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('bg-red-500'); // Reset to green
    }, 3000);
}

// ================== MEMORY ACTIONS (Authenticated) ==================
document.addEventListener('click', async (e) => {
    if (e.target.closest('.delete-btn')) {
        const card = e.target.closest('.memory-card');
        const path = card.dataset.path;
        if (confirm('Bạn có chắc muốn xóa ảnh này?')) {
            try {
                const resp = await fetch('/.netlify/functions/delete-image', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, password: classPassword })
                });
                if (resp.ok) {
                    showSuccessToast('Xóa ảnh thành công!');
                    loadMemories(); // Reload
                } else {
                    throw new Error('Delete failed');
                }
            } catch (err) {
                showErrorToast('Lỗi xóa ảnh!');
            }
        }
    }

    if (e.target.closest('.edit-btn')) {
        const card = e.target.closest('.memory-card');
        const path = card.dataset.path;
        const title = card.dataset.title || card.querySelector('.memory-title')?.textContent || '';
        const date = card.dataset.date || '';
        const modal = document.getElementById('editModal');
        document.getElementById('editPath').value = path;
        document.getElementById('editTitle').value = title;
        document.getElementById('editDate').value = date ? new Date(date).toISOString().slice(0,10) : '';
        modal.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
});

function showMemoryActions() {
    // Show delete/edit buttons if authenticated
    document.querySelectorAll('.memory-actions').forEach(actions => {
        actions.style.display = 'flex';
    });
}

// ================== MODALS ==================
document.addEventListener('click', (event) => {
    if (event.target.id === 'imageModal') {
        closeImageModal();
    }
    if (event.target.id === 'studentModal') {
        closeStudentModal();
    }
});

// Mobile menu toggle with improved UX
const mobileMenuBtn = document.querySelector('.mobile-menu-button');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
            // Show menu
            mobileMenu.classList.remove('hidden');
            setTimeout(() => {
                mobileMenu.classList.remove('-translate-y-5', 'opacity-0');
            }, 10);
        } else {
            // Hide menu
            mobileMenu.classList.add('-translate-y-5', 'opacity-0');
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
            }, 300);
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('-translate-y-5', 'opacity-0');
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                }, 300);
            }
        }
    });
}

// Scroll to Top/Bottom button
const scrollTopBtn = document.getElementById('scrollTopBtn');
const scrollProgressBar = document.getElementById('scrollProgressBar');

function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (scrollProgressBar) scrollProgressBar.style.width = progress + '%';
}

window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
        scrollTopBtn.classList.add('show');
        // Show up arrow for scroll to top
        scrollTopBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        scrollTopBtn.classList.remove('show');
        // Show down arrow for scroll to bottom
        scrollTopBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        scrollTopBtn.onclick = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    updateScrollProgress();
});

window.addEventListener('load', updateScrollProgress);

// Subtle parallax on hero image for better scroll feeling
const heroParallax = document.getElementById('heroParallax');
let lastKnownScrollY = 0;
let ticking = false;

function applyParallax() {
    const offset = lastKnownScrollY * 0.2; // slower than scroll
    if (heroParallax) heroParallax.style.transform = 'translateY(' + (-offset) + 'px)';
    ticking = false;
}

window.addEventListener('scroll', function() {
    lastKnownScrollY = window.scrollY || document.documentElement.scrollTop;
    if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
    }
});

// Counter animation when in viewport
function animateCounter(counter) {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const startTime = performance.now();
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        counter.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
// Optimize counters with IntersectionObserver
function initCountersObserver() {
    const counters = document.querySelectorAll('.counter');
    if (!('IntersectionObserver' in window) || counters.length === 0) {
        // Fallback
        counters.forEach(c => animateCounter(c));
        return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                if (el.textContent === '0') animateCounter(el);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.4 });
    counters.forEach(c => observer.observe(c));
}
window.addEventListener('load', initCountersObserver);

// Student list generator
const studentContainer = document.getElementById('student-container');

// Danh sách học sinh (role là mảng) - Data thực tế, thêm trường order để giữ thứ tự
const students = [
    { name: 'Nguyễn Thị Thân Thương', role: ['monitor'], img: 'img/thuong.jpg', order: 0 },
    { name: 'Nguyễn Thu Hà', role: ['secretary'], img: 'img/hoangquocvuong.jpg', order: 1 },
    { name: 'Nguyễn Xuân Hưng', role: ['studying'], img: 'img/hoangquocvuong.jpg', order: 2 },
    { name: 'Nguyễn Đức Lĩnh', role: ['studying'], img: 'img/lĩnh.jpg', order: 3 },
    { name: 'Phạm Hà Vy', role: ['deputy-labor'], img: 'img/hoangquocvuong.jpg', order: 4 },
    { name: 'Nguyễn Duy Anh', role: ['group-leader-1'], img: 'img/hoangquocvuong.jpg', order: 5 },
    { name: 'Nguyễn Khánh Hưng', role: ['group-leader-2'], img: 'img/hoangquocvuong.jpg', order: 6 },
    { name: 'Hoàng Quốc Vương', role: ['group-leader-3'], img: 'img/vuong.jpg', order: 7 },
    { name: 'Nguyễn Thanh Chúc', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 8 },
    { name: 'Nguyễn Mạnh Cường', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 9 },
    { name: 'Nguyễn Thanh Thùy Dung', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 10 },
    { name: 'Trần Đăng Dũng', role: ['member'], img: 'img/dung.jpg', order: 11 },
    { name: 'Trần Quang Định', role: ['member'], img: 'img/quangdinh.jpg', order: 12 },
    { name: 'Phạm Minh Đức', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 13 },
    { name: 'Đỗ Trường Giang', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 14 },
    { name: 'Nguyễn Trường Giang', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 15 },
    { name: 'Nguyễn Khắc Hiếu', role: ['member'], img: 'img/hieu.jpg', order: 16 },
    { name: 'Vi Sỹ Hoan', role: ['member'], img: 'img/vihoan.jpg', order: 17 },
    { name: 'Nguyễn Văn Huy', role: ['member'], img: 'img/huy.jpg', order: 18 },
    { name: 'Nguyễn Phú Hưng', role: ['member'], img: 'img/phuhung.jpg', order: 19 },
    { name: 'Trần Vân Khánh', role: ['member'], img: 'img/vankhanh.jpg', order: 20 },
    { name: 'Lê Trung Kiên', role: ['member'], img: 'img/ADMIN.jpg', order: 21 },
    { name: 'Nguyễn Trung Kiên', role: ['member'], img: 'img/nguyenkien.jpg', order: 22 },
    { name: 'Nguyễn Bảo Lâm', role: ['member'], img: 'img/lam.jpg', order: 23 },
    { name: 'Nguyễn Thu Lê', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 24 },
    { name: 'Lê Thị Ngọc Linh', role: ['member'], img: 'img/ngoclinh.jpg', order: 25 },
    { name: 'Nguyễn Hà Nhật Linh', role: ['member'], img: 'img/nhatlinh.jpg', order: 26 },
    { name: 'Nguyễn Hoàng Linh', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 27 },
    { name: 'Phạm Bảo Nhật Linh', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 28 },
    { name: 'Bùi Khánh Ly', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 29 },
    { name: 'Kiều Ngọc Mai', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 30 },
    { name: 'Nguyễn Xuân Mai', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 31 },
    { name: 'Nguyễn Hoàng Minh', role: ['member'], img: 'img/minh.jpg', order: 32 },
    { name: 'Ngô Nguyên Hải Nam', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 33 },
    { name: 'Nguyễn Thành Nam', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 34 },
    { name: 'Nguyễn Hoàng Bích Ngọc', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 35 },
    { name: 'Vũ Bảo Ngọc', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 36 },
    { name: 'Phạm Công Sơn', role: ['member'], img: 'img/hoangquocvuong.jpg', order: 37 },
    { name: 'Nguyễn Thanh Thảo', role: ['member'], img: 'img/thanhthao.jpg', order: 38 },
    { name: 'Vũ Kim Huệ', role: ['member'], img: 'img/hue.jpg', order: 39 },
    { name: 'Hoàng Mạnh Tiến', role: ['member'], img: 'img/tien.jpg', order: 40 },
    { name: 'Nguyễn Thu Trang', role: ['member'], img: 'img/trang.jpg', order: 41 },
    { name: 'Nguyễn Thanh Tuyền', role: ['member'], img: 'img/tuyen.jpg', order: 42 },
    { name: 'Đỗ Thy', role: ['member'], img: 'img/thy.jpg', order: 43 },
    { name: 'Lưu Phương Vy', role: ['member'], img: 'img/phuongvy.jpg', order: 44 }
];

// Students state
let sortedStudents = [];
let currentFilter = 'all';

// Helper: Lấy text role cho badge (thay 'monitor' thành 'Lớp trưởng')
function getRoleText(role) {
    const texts = {
        'monitor': 'Lớp trưởng',
        'secretary': 'Thư ký lớp',
        'studying': 'Phó học tập',
        'deputy-labor': 'Phó lao động',
        'group-leader-1': 'Tổ trưởng 1',
        'group-leader-2': 'Tổ trưởng 2',
        'group-leader-3': 'Tổ trưởng 3',
        'member': 'Thành viên'
    };
    return texts[role] || 'Thành viên';
}

// Function để render students theo thứ tự order (từ nhỏ đến lớn)
function renderStudents(studentsToRender = students) {
    // Sắp xếp theo order để đảm bảo thứ tự cố định
    const sorted = [...studentsToRender].sort((a, b) => a.order - b.order);
    sortedStudents = sorted;

    const container = document.getElementById('student-container');
    if (!container) {
        console.error('Không tìm thấy #student-container!');
        return;
    }
    container.innerHTML = '';

    // Force flex layout để order hoạt động đúng
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '1.5rem';
    container.style.justifyContent = 'center';

    const countEl = document.getElementById('studentCount');
    if (countEl) countEl.textContent = sortedStudents.length;

    const batchSize = 8;
    let currentIndex = 0;

    function renderBatch() {
        const batch = sortedStudents.slice(currentIndex, currentIndex + batchSize);
        batch.forEach((student, index) => {
            setTimeout(() => {
                renderStudentCard(student, container, currentIndex + index);
            }, index * 50);
        });
        currentIndex += batchSize;
        if (currentIndex < sortedStudents.length) {
            requestAnimationFrame(renderBatch);
        } else {
            // Force sort DOM elements by order sau khi render
            setTimeout(() => {
                const cards = Array.from(container.children);
                cards.sort((a, b) => {
                    const orderA = parseInt(a.dataset.order) || 999;
                    const orderB = parseInt(b.dataset.order) || 999;
                    return orderA - orderB;
                });
                cards.forEach(card => {
                    container.appendChild(card);
                });
            }, 100); // Đợi animation xong

            // Replace icons sau khi render xong
            if (typeof feather !== 'undefined') feather.replace();
        }
    }
    renderBatch();
}

function renderStudentCard(student, container, index = 0) {
    const defaultImg = 'img/default.jpg';

    // Badge (loop mảng)
    let roleBadges = '';
    student.role.forEach(role => {
        let badgeClass = '';
        let badgeText = getRoleText(role);
        if (role === 'monitor') {
            badgeClass = 'monitor-badge'; 
        } else if (role === 'secretary') {
            badgeClass = 'secretary-badge'; 
        } else if (role === 'group-leader-1' || role === 'group-leader-2' || role === 'group-leader-3') {
            badgeClass = 'group-leader-badge'; 
        } else if (role === 'deputy-labor' || role === 'studying') {
            badgeClass = 'assistant-badge'; 
        } else {
            badgeClass = 'member-badge'; 
        }
        roleBadges += `<span class="role-badge ${badgeClass}">${badgeText}</span>`;
    });

    // Card HTML (tất cả đều dùng student-card)
    const card = document.createElement('div');
    card.className = `student-card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 hover:shadow-lg fade-in-up flex flex-col`;
    card.setAttribute('data-role', student.role.join(' '));
    card.dataset.order = student.order;
    card.style.animationDelay = `${index * 0.07}s`;
    card.style.cursor = 'pointer';
    card.style.order = student.order; // Set CSS order
    card.style.flex = '1 1 250px'; // Flex basis cho grid-like
    card.style.maxWidth = '300px';
    // Keep original behavior without extra AOS attributes here
    card.onclick = (e) => {
        if (e.target.classList.contains('role-badge')) return;
        openStudentModal(student.name, student.img, roleBadges);
    };
    card.innerHTML = `
        <div class="h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <img src="${student.img}" alt="${escapeHtml(student.name)}" 
                class="h-full w-full object-cover"
                onerror="this.src='${defaultImg}';"
                loading="lazy">
        </div>
        <div class="p-5 flex-grow">
            <h3 class="font-bold text-lg">${escapeHtml(student.name)}</h3>
            <div class="mt-3 flex flex-wrap">
                ${roleBadges}
            </div>
        </div>
    `;
    container.appendChild(card);
}

// Function mở modal (nếu chưa có, thêm vào)
function openStudentModal(name, img, badgesHtml) {
    const modalImg = document.getElementById('studentModalImg');
    const modalName = document.getElementById('studentModalName');
    const modalRole = document.getElementById('studentModalRole');
    const modal = document.getElementById('studentModal');
    if (modalImg) modalImg.src = img;
    if (modalName) modalName.textContent = name;
    if (modalRole) modalRole.innerHTML = badgesHtml; // Hiển thị multiple badges
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
    if (typeof feather !== 'undefined') feather.replace();
}

// Open image modal
window.openImageModal = function(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (modal && modalImage) {
        modalImage.src = src;
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
};

// Close image modal
window.closeImageModal = function() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.classList.add('hidden');
};

// Close student modal
window.closeStudentModal = function() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.add('hidden');
};

// Thêm vào DOMContentLoaded để init students với thứ tự order
document.addEventListener('DOMContentLoaded', function() {
    // Render theo thứ tự order
    renderStudents(students);

    // Filter students
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b =>
                b.classList.remove('active', 'bg-white', 'text-purple-600')
            );
            btn.classList.add('active', 'bg-white', 'text-purple-600');

            const filter = btn.dataset.filter;
            const filterRoles = filter.split(' ');

            if (filter === 'all') {
                // Render theo thứ tự order
                renderStudents(students);
            } else {
                // Filter theo role, rồi sort theo order để giữ thứ tự gốc
                const filteredStudents = students.filter(student =>
                    student.role.some(role => filterRoles.includes(role))
                );
                // Render với thứ tự order
                renderStudents(filteredStudents);
            }
        });
    });

    // Dark mode toggle
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            
            // Lưu trạng thái dark mode
            if (document.body.classList.contains('dark')) {
                localStorage.setItem('darkMode', 'true');
                darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
            } else {
                localStorage.setItem('darkMode', 'false');
                darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
            }

            // Hiệu ứng nút
            darkModeBtn.classList.add('animate-pulse');
            setTimeout(() => {
                darkModeBtn.classList.remove('animate-pulse');
            }, 300);

            if (typeof feather !== 'undefined') feather.replace();
        });

        // Khi load lại trang, áp dụng dark mode nếu có
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark');
            darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
        } else {
            darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    // Smooth scroll with offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                e.preventDefault();
                const yOffset = -80; // cao khoảng navbar
                const y = targetEl.getBoundingClientRect().top + window.scrollY + yOffset;

                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    });

    // Placeholder for other functions
    function showMemoryActions() {
        // Show delete/edit buttons if authenticated
        document.querySelectorAll('.memory-actions').forEach(actions => {
            actions.style.display = 'flex';
        });
    }

    function updateUploadButtonUI() {
        // Update upload button if authenticated
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) uploadBtn.classList.remove('hidden');
    }

    // Open image modal
    window.openImageModal = function(src) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        if (modal && modalImage) {
            modalImage.src = src;
            modal.classList.remove('hidden');
        }
    };

    // Close image modal
    window.closeImageModal = function() {
        const modal = document.getElementById('imageModal');
        if (modal) modal.classList.add('hidden');
    };

    // Close student modal
    window.closeStudentModal = function() {
        const modal = document.getElementById('studentModal');
        if (modal) modal.classList.add('hidden');
    };
});