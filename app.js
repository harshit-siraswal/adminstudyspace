// app.js - UPDATED VERSION
// Main Application Logic with Tab Switching Fix

// ============================================
// GLOBAL STATE
// ============================================

let currentAdmin = null;

// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`).classList.add('active');
    console.log(`📄 Showing ${pageName} page`);
}

// ============================================
// TAB SWITCHING (FIX)
// ============================================

function switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Remove active class from all tab/sidebar/bottom-nav buttons
    document.querySelectorAll('.tab-btn, .sidebar-nav-item, .mobile-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const section = document.getElementById(`${tabName}-section`);
    if (section) {
        section.classList.add('active');
        section.style.display = 'block';
    } else {
        console.error('❌ Section not found:', `${tabName}-section`);
    }

    // Add active class to ALL buttons with matching data-tab (sidebar + bottom nav)
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
        btn.classList.add('active');
    });

    // Reinitialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Close mobile menu when switching tabs
    if (typeof closeMobileMenu === 'function') {
        closeMobileMenu();
    }

    // Load data for the tab
    if (tabName === 'notices') {
        if (typeof loadNotices === 'function') {
            loadNotices();
        }
    } else if (tabName === 'syllabus') {
        if (typeof loadSyllabi === 'function') {
            loadSyllabi();
        }
    } else if (tabName === 'resources') {
        if (window.dashboardFunctions && typeof window.dashboardFunctions.fetchResources === 'function') {
            window.dashboardFunctions.fetchResources();
        }
    } else if (tabName === 'users') {
        if (typeof loadBannedUsers === 'function') {
            loadBannedUsers();
        }
    }
}

// Make switchTab globally available
window.switchTab = switchTab;

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const body = document.body;

    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
    if (hamburger) {
        hamburger.classList.toggle('active');
    }
    body.classList.toggle('menu-open');
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const body = document.body;

    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    body.classList.remove('menu-open');
}

function openMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const body = document.body;

    if (sidebar) {
        sidebar.classList.add('open');
    }
    if (overlay) {
        overlay.classList.add('active');
    }
    if (hamburger) {
        hamburger.classList.add('active');
    }
    body.classList.add('menu-open');
}

// Expose mobile menu functions globally
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openMobileMenu = openMobileMenu;

// ============================================
// INITIALIZATION
// ============================================

function initializeApp() {
    console.log('🚀 Initializing Admin Dashboard...');

    // Note: Theme is initialized by motion.js

    // Check if already logged in
    if (window.authFunctions && window.authFunctions.isAdmin()) {
        console.log('✅ User already logged in');
        currentAdmin = window.authFunctions.getAdminData();
        initializeDashboard();
        showPage('dashboard');
    } else {
        console.log('🔒 No active session');
        showPage('login');
    }

    // Setup event listeners
    setupEventListeners();
}

// ============================================
// THEME & MOTION EFFECTS
// Note: Theme toggle and 3D card motion effects are now
// handled by motion.js for cleaner separation of concerns
// ============================================

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Login Form - attach to both form submit AND button click
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Login form submit listener attached');
    }

    // Also attach click handler to button as fallback
    if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handleLogin(e);
        });
        console.log('✅ Login button click listener attached');
    }

    // Toggle Password Visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', handleTogglePassword);
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.updateFilter('search', e.target.value);
            }
        });
    }

    // Filter Selects
    const filterSemester = document.getElementById('filterSemester');
    if (filterSemester) {
        filterSemester.addEventListener('change', (e) => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.updateFilter('semester', e.target.value);
            }
        });
    }

    const filterBranch = document.getElementById('filterBranch');
    if (filterBranch) {
        filterBranch.addEventListener('change', (e) => {
            const branch = e.target.value;
            if (window.dashboardFunctions) {
                window.dashboardFunctions.updateFilter('branch', branch);
                window.dashboardFunctions.loadSubjects(branch);
            }
        });
    }

    const filterSubject = document.getElementById('filterSubject');
    if (filterSubject) {
        filterSubject.addEventListener('change', (e) => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.updateFilter('subject', e.target.value);
            }
        });
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.updateFilter('status', e.target.value);
            }
        });
    }

    // Filter Action Buttons
    const saveFiltersBtn = document.getElementById('saveFiltersBtn');
    if (saveFiltersBtn) {
        saveFiltersBtn.addEventListener('click', () => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.saveFilters();
            }
        });
    }

    const loadFiltersBtn = document.getElementById('loadFiltersBtn');
    if (loadFiltersBtn) {
        loadFiltersBtn.addEventListener('click', () => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.loadSavedFilters();
            }
        });
    }

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.clearFilters();
            }
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.dashboardFunctions) {
                window.dashboardFunctions.fetchResources();
            }
        });
    }

    console.log('✅ Event listeners setup complete');
}

// ============================================
// LOGIN HANDLERS
// ============================================

async function handleLogin(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const secretKey = document.getElementById('secretKey').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');

    if (!secretKey) {
        showToastOnLogin('Please enter your secret key', 'error');
        return false;
    }

    // Show loading state
    if (loginBtn) loginBtn.disabled = true;
    if (loginBtnText) loginBtnText.classList.add('hidden');
    if (loginSpinner) loginSpinner.classList.remove('hidden');

    try {
        console.log('🔐 Attempting login...');

        if (!window.authFunctions || !window.authFunctions.loginAdmin) {
            throw new Error('Auth system not loaded');
        }

        const result = await window.authFunctions.loginAdmin(secretKey);

        if (result.success) {
            console.log('✅ Login successful');
            currentAdmin = result.adminData;

            // Initialize dashboard and switch page
            initializeDashboard();
            showPage('dashboard');

            // Reset login form for next time
            if (loginBtn) loginBtn.disabled = false;
            if (loginBtnText) loginBtnText.classList.remove('hidden');
            if (loginSpinner) loginSpinner.classList.add('hidden');

        } else {
            console.error('❌ Login failed:', result.error);
            showToastOnLogin(result.error || 'Invalid admin key', 'error');
            resetLoginButton();
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showToastOnLogin('Login failed. Please try again.', 'error');
        resetLoginButton();
    }

    return false;
}

function resetLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');

    if (loginBtn) loginBtn.disabled = false;
    if (loginBtnText) loginBtnText.classList.remove('hidden');
    if (loginSpinner) loginSpinner.classList.add('hidden');
}

// Expose login handler globally
window.handleLogin = handleLogin;

function handleTogglePassword() {
    const secretKeyInput = document.getElementById('secretKey');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');

    if (secretKeyInput.type === 'password') {
        secretKeyInput.type = 'text';
        if (eyeIcon) eyeIcon.classList.add('hidden');
        if (eyeOffIcon) eyeOffIcon.classList.remove('hidden');
    } else {
        secretKeyInput.type = 'password';
        if (eyeIcon) eyeIcon.classList.remove('hidden');
        if (eyeOffIcon) eyeOffIcon.classList.add('hidden');
    }
}

// Expose for HTML onclick
window.togglePasswordVisibility = handleTogglePassword;

function showToastOnLogin(message, type) {
    // Simple alert for login page (before dashboard loads)
    if (type === 'error') {
        alert(message);
    }
}

// ============================================
// DASHBOARD HANDLERS
// ============================================

function initializeDashboard() {
    console.log('📊 Initializing dashboard...');

    // Set admin name in header
    const adminName = window.authFunctions.getAdminName();
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = adminName;
    }

    // Store admin data globally
    currentAdmin = window.authFunctions.getAdminData();

    // Show admin role info
    if (currentAdmin) {
        console.log('👤 Admin Role:', currentAdmin.role);
        console.log('🏢 Department:', currentAdmin.department || 'ALL');
        console.log('📚 Subject:', currentAdmin.subject || 'ALL');
    }

    // Initialize the resources tab by default
    switchTab('resources');

    // Fetch resources
    if (window.dashboardFunctions && typeof window.dashboardFunctions.fetchResources === 'function') {
        window.dashboardFunctions.fetchResources();
    }

    // Initialize 3D motion effects for cards (now handled by motion.js automatically)
    if (window.StudySpaceMotion && typeof window.StudySpaceMotion.refreshCards === 'function') {
        setTimeout(() => window.StudySpaceMotion.refreshCards(), 500);
    }

    console.log('✅ Dashboard initialized');
}

function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    console.log('👋 Logging out...');

    // Clear all session data directly
    localStorage.removeItem('admin_session');
    localStorage.removeItem('isAdminLoggedIn');

    // Also call auth function if available
    if (window.authFunctions && typeof window.authFunctions.logoutAdmin === 'function') {
        window.authFunctions.logoutAdmin();
    }

    currentAdmin = null;

    // Clear form
    const secretKeyInput = document.getElementById('secretKey');
    if (secretKeyInput) {
        secretKeyInput.value = '';
    }

    // Show login page
    showPage('login');

    console.log('✅ Logged out successfully');
}

// Expose logout handler globally
window.handleLogout = handleLogout;

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'check-circle-2',
        error: 'x-circle',
        info: 'info',
    };

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i data-lucide="${icons[type] || 'info'}" class="icon-sm"></i>
            </div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Make showToast globally available
window.showToast = showToast;

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAdminData() {
    return currentAdmin;
}

function canPostToAllDepartments() {
    return currentAdmin && currentAdmin.role === 'super_admin';
}

function canPostToDepartment(department) {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'super_admin') return true;
    return currentAdmin.department === department;
}

function canUploadForSubject(department, subject) {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'super_admin') return true;
    if (currentAdmin.department !== department) return false;
    if (!currentAdmin.subject) return true; // No subject restriction
    return currentAdmin.subject === subject;
}

// Make helper functions globally available
window.getAdminData = getAdminData;
window.canPostToAllDepartments = canPostToAllDepartments;
window.canPostToDepartment = canPostToDepartment;
window.canUploadForSubject = canUploadForSubject;

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled rejection:', e.reason);
});

// ============================================
// START APPLICATION
// ============================================

// Wait for DOM to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('✅ App.js loaded');