// improved-notices.js
// Enhanced Notices Management with Search, Filter, Sort, and File Upload

// ============================================
// STATE MANAGEMENT
// ============================================

let allNotices = [];
let filteredNotices = [];
let currentDepartment = 'all';
let currentSearchTerm = '';
let currentSort = 'newest';

// ============================================
// NOTICES MANAGEMENT
// ============================================

function showNoticeForm() {
    document.getElementById('notice-form').style.display = 'block';
    // Set min date to today
    document.getElementById('notice-expires').min = new Date().toISOString().split('T')[0];
    // Pre-select current department filter
    document.getElementById('notice-department').value = currentDepartment === 'all' ? 'all' : currentDepartment;
    lucide.createIcons();
}

function hideNoticeForm() {
    document.getElementById('notice-form').style.display = 'none';
    document.getElementById('notice-form-element').reset();
    toggleFileUpload('none');
}

function toggleFileUpload(type) {
    document.getElementById('pdf-upload-section').style.display = type === 'pdf' ? 'block' : 'none';
    document.getElementById('video-url-section').style.display = type === 'video' ? 'block' : 'none';

    // Clear inputs
    if (type !== 'pdf') document.getElementById('notice-pdf').value = '';
    if (type !== 'video') document.getElementById('notice-video-url').value = '';
}

async function createNotice(event) {
    event.preventDefault();

    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    const department = document.getElementById('notice-department').value;
    const priority = document.getElementById('notice-priority').value;
    const expiresAt = document.getElementById('notice-expires').value;

    // Get file type
    const fileType = document.querySelector('input[name="file-type"]:checked').value;
    let fileUrl = null;
    let uploadedFileType = null;

    const submitBtn = document.getElementById('notice-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader" class="icon-sm animate-spin"></i> Creating...';
    lucide.createIcons();

    try {
        // Handle file upload
        if (fileType === 'pdf') {
            const pdfFile = document.getElementById('notice-pdf').files[0];
            if (pdfFile) {
                if (pdfFile.size > 10 * 1024 * 1024) {
                    throw new Error('PDF file must be less than 10MB');
                }
                fileUrl = await uploadNoticeFile(pdfFile, 'pdf');
                uploadedFileType = 'pdf';
            }
        } else if (fileType === 'video') {
            const videoUrl = document.getElementById('notice-video-url').value.trim();
            if (videoUrl) {
                fileUrl = videoUrl;
                uploadedFileType = 'video';
            }
        }

        // Insert notice via RPC (bypasses RLS)
        const { data, error } = await window.supabaseClient
            .rpc('insert_notice', {
                p_title: title,
                p_content: content,
                p_department: department,
                p_priority: priority,
                p_file_url: fileUrl,
                p_file_type: uploadedFileType,
                p_expires_at: expiresAt || null,
                p_created_by: window.authFunctions.getAdminName()
            });

        if (error) throw error;

        showToast('✅ Notice posted successfully!', 'success');
        hideNoticeForm();
        await loadNotices();

        // Switch to the department we just posted to
        if (department !== 'all') {
            document.getElementById('notices-dept-filter').value = department;
            currentDepartment = department;
            filterAndDisplayNotices();
        }

    } catch (error) {
        console.error('Error creating notice:', error);
        showToast('❌ Failed to create notice: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="send" class="icon-sm"></i> Post Notice';
        lucide.createIcons();
    }
}

async function uploadNoticeFile(file, type) {
    // Upload to Cloudinary instead of Supabase storage
    const url = await window.uploadToCloudinary(file, 'notices');
    return url;
}

async function loadNotices() {
    try {
        const { data, error } = await window.supabaseClient
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allNotices = data || [];
        filterAndDisplayNotices();
        updateNoticesStats();

    } catch (error) {
        console.error('Error loading notices:', error);
        document.getElementById('notices-list').innerHTML =
            '<p class="error-message">Failed to load notices. Please refresh.</p>';
    }
}

function filterNoticesByDept() {
    currentDepartment = document.getElementById('notices-dept-filter').value;
    filterAndDisplayNotices();
}

function searchNotices() {
    currentSearchTerm = document.getElementById('notices-search').value.toLowerCase();
    filterAndDisplayNotices();
}

function sortNotices() {
    currentSort = document.getElementById('notices-sort').value;
    filterAndDisplayNotices();
}

function filterAndDisplayNotices() {
    // Filter by department
    let filtered = allNotices.filter(notice => {
        if (currentDepartment === 'all') return true;
        return notice.department === currentDepartment || notice.department === 'all';
    });

    // Filter by search term
    if (currentSearchTerm) {
        filtered = filtered.filter(notice =>
            notice.title.toLowerCase().includes(currentSearchTerm) ||
            notice.content.toLowerCase().includes(currentSearchTerm)
        );
    }

    // Sort
    filtered.sort((a, b) => {
        if (currentSort === 'newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (currentSort === 'oldest') {
            return new Date(a.created_at) - new Date(b.created_at);
        } else if (currentSort === 'priority') {
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
    });

    filteredNotices = filtered;
    displayNotices(filtered);
}

function displayNotices(notices) {
    const container = document.getElementById('notices-list');
    const emptyState = document.getElementById('notices-empty');

    if (notices.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        lucide.createIcons();
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = notices.map(notice => {
        const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date();

        return `
        <div class="glass-card notice-card ${!notice.is_active ? 'notice-hidden' : ''} ${isExpired ? 'notice-expired' : ''}">
            <div class="notice-header">
                <div class="notice-title-row">
                    <h3 class="notice-title">${notice.title}</h3>
                    <div class="notice-badges">
                        <span class="badge badge-${notice.priority}">
                            ${getPriorityIcon(notice.priority)}
                            ${notice.priority.toUpperCase()}
                        </span>
                        ${!notice.is_active ? '<span class="badge badge-secondary"><i data-lucide="eye-off" class="icon-xs"></i> Hidden</span>' : ''}
                        ${isExpired ? '<span class="badge badge-danger"><i data-lucide="clock" class="icon-xs"></i> Expired</span>' : ''}
                    </div>
                </div>
            </div>
            
            <p class="notice-content">${notice.content}</p>
            
            ${notice.file_url ? `
                <div class="notice-attachment">
                    <i data-lucide="${notice.file_type === 'pdf' ? 'file-text' : 'video'}" class="icon-sm"></i>
                    <span>${notice.file_type === 'pdf' ? 'PDF Document' : 'Video Link'}</span>
                    ${notice.file_type === 'pdf'
                    ? `<button class="btn-view-pdf" onclick="openPdfViewer('${notice.file_url}', '${notice.title}')">
                            <i data-lucide="eye" class="icon-xs"></i>
                            View PDF
                           </button>`
                    : `<button class="btn-view-pdf" onclick="window.open('${notice.file_url}', '_blank')">
                            <i data-lucide="play" class="icon-xs"></i>
                            Watch Video
                           </button>`
                }
                </div>
            ` : ''}
            
            <div class="notice-meta">
                <span>
                    <i data-lucide="building" class="icon-xs"></i>
                    ${getDepartmentName(notice.department)}
                </span>
                <span>
                    <i data-lucide="user" class="icon-xs"></i>
                    ${notice.created_by}
                </span>
                <span>
                    <i data-lucide="calendar" class="icon-xs"></i>
                    ${formatDate(notice.created_at)}
                </span>
                ${notice.expires_at ? `
                    <span>
                        <i data-lucide="clock" class="icon-xs"></i>
                        Expires: ${formatDate(notice.expires_at)}
                    </span>
                ` : ''}
            </div>
            
            <div class="notice-actions">
                <button class="btn-outline btn-sm" onclick="toggleNoticeActive('${notice.id}', ${notice.is_active})">
                    <i data-lucide="${notice.is_active ? 'eye-off' : 'eye'}" class="icon-xs"></i>
                    ${notice.is_active ? 'Hide' : 'Show'}
                </button>
                <button class="btn-danger btn-sm" onclick="deleteNotice('${notice.id}')">
                    <i data-lucide="trash-2" class="icon-xs"></i>
                    Delete
                </button>
            </div>
        </div>
        `;
    }).join('');

    lucide.createIcons();
}

function getPriorityIcon(priority) {
    const icons = {
        low: '<i data-lucide="minus" class="icon-xs"></i>',
        normal: '<i data-lucide="info" class="icon-xs"></i>',
        high: '<i data-lucide="alert-circle" class="icon-xs"></i>',
        urgent: '<i data-lucide="alert-triangle" class="icon-xs"></i>'
    };
    return icons[priority] || '';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateNoticesStats() {
    const total = allNotices.length;
    const active = allNotices.filter(n => n.is_active).length;
    const hidden = allNotices.filter(n => !n.is_active).length;

    document.getElementById('notices-total-count').textContent = total;
    document.getElementById('notices-active-count').textContent = active;
    document.getElementById('notices-hidden-count').textContent = hidden;
}

async function toggleNoticeActive(id, currentStatus) {
    try {
        const { error } = await window.supabaseClient
            .from('notices')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) throw error;

        showToast(currentStatus ? '👁️ Notice hidden from students' : '👁️ Notice visible to students', 'success');
        await loadNotices();
    } catch (error) {
        console.error('Error toggling notice:', error);
        showToast('❌ Failed to update notice', 'error');
    }
}

async function deleteNotice(id) {
    if (!confirm('Are you sure you want to delete this notice? This action cannot be undone.')) return;

    try {
        // Get notice to delete file if exists
        const { data: notice } = await window.supabaseClient
            .from('notices')
            .select('file_url, file_type')
            .eq('id', id)
            .single();

        // Delete from database
        const { error } = await window.supabaseClient
            .from('notices')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Try to delete file from storage (optional, won't fail if file doesn't exist)
        if (notice?.file_url && notice?.file_type === 'pdf') {
            try {
                const filePath = notice.file_url.split('/').slice(-2).join('/');
                await window.supabaseClient.storage
                    .from('resources')
                    .remove([filePath]);
            } catch (e) {
                console.log('File deletion skipped:', e);
            }
        }

        showToast('✅ Notice deleted', 'success');
        await loadNotices();
    } catch (error) {
        console.error('Error deleting notice:', error);
        showToast('❌ Failed to delete notice', 'error');
    }
}

function getDepartmentName(value) {
    const departments = {
        'all': 'All Departments',
        'cse': 'Computer Science',
        'ece': 'Electronics',
        'me': 'Mechanical',
        'ce': 'Civil',
        'eee': 'Electrical',
        'aiml': 'AI & ML',
        'ds': 'Data Science',
        'it': 'Information Technology'
    };
    return departments[value] || value;
}

// ============================================
// PDF VIEWER FUNCTIONS
// ============================================
let currentPdfUrl = '';
let pdfZoomLevel = 100;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 25;

function openPdfViewer(url, title) {
    currentPdfUrl = url;
    pdfZoomLevel = 100;

    const overlay = document.getElementById('pdfViewerOverlay');
    const titleEl = document.getElementById('pdfViewerTitle');
    const iframe = document.getElementById('pdfViewerFrame');

    if (!overlay || !iframe) return;

    if (titleEl) titleEl.textContent = title || 'Document';
    iframe.src = url;
    iframe.style.width = '90vw';
    iframe.style.height = '85vh';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize icons
    lucide.createIcons();
}

function closePdfViewer() {
    const overlay = document.getElementById('pdfViewerOverlay');
    const iframe = document.getElementById('pdfViewerFrame');

    if (overlay) {
        overlay.classList.remove('active');
        iframe.src = '';
        document.body.style.overflow = '';
    }
}

function zoomPdf(direction) {
    const iframe = document.getElementById('pdfViewerFrame');
    const zoomLevelEl = document.getElementById('pdfZoomLevel');

    if (direction === 'in' && pdfZoomLevel < MAX_ZOOM) {
        pdfZoomLevel += ZOOM_STEP;
    } else if (direction === 'out' && pdfZoomLevel > MIN_ZOOM) {
        pdfZoomLevel -= ZOOM_STEP;
    }

    const scale = pdfZoomLevel / 100;
    iframe.style.width = `${90 * scale}vw`;
    iframe.style.height = `${85 * scale}vh`;
    zoomLevelEl.textContent = `${pdfZoomLevel}%`;
}

// Initialize PDF viewer controls
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('pdfClose');
    const zoomInBtn = document.getElementById('pdfZoomIn');
    const zoomOutBtn = document.getElementById('pdfZoomOut');
    const openExternalBtn = document.getElementById('pdfOpenExternal');
    const overlay = document.getElementById('pdfViewerOverlay');

    if (closeBtn) closeBtn.addEventListener('click', closePdfViewer);
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomPdf('in'));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomPdf('out'));
    if (openExternalBtn) openExternalBtn.addEventListener('click', () => window.open(currentPdfUrl, '_blank'));

    // Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePdfViewer();
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePdfViewer();
    });
});

// ============================================
// GLOBAL EXPORTS
// ============================================
window.deleteNotice = deleteNotice;
window.toggleNoticeActive = toggleNoticeActive;
window.loadNotices = loadNotices;
window.showNoticeForm = showNoticeForm;
window.hideNoticeForm = hideNoticeForm;
window.createNotice = createNotice;
window.filterNoticesByDept = filterNoticesByDept;
window.searchNotices = searchNotices;
window.sortNotices = sortNotices;
window.toggleFileUpload = toggleFileUpload;
window.openPdfViewer = openPdfViewer;
window.closePdfViewer = closePdfViewer;

console.log('✅ improved-notices.js loaded');