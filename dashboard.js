// dashboard.js
// Dashboard Functionality & Resource Management

// ============================================
// STATE MANAGEMENT
// ============================================

const dashboardState = {
    resources: [],
    filteredResources: [],
    filters: {
        search: '',
        semester: 'all',
        branch: 'all',
        subject: 'all',
        status: 'all',
    },
    stats: {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
    },
    loading: false,
    currentCollege: null, // Will be set based on admin key
};

// ============================================
// BRANCH & SUBJECT MAPPINGS
// ============================================

const branchLabels = {
    cse: 'Computer Science',
    ece: 'Electronics',
    me: 'Mechanical',
    ce: 'Civil',
    eee: 'Electrical',
    aiml: 'AI & ML',
    ds: 'Data Science',
    it: 'Information Technology',
};

// ============================================
// FETCH FUNCTIONS
// ============================================

/**
 * Get admin's college from their key
 */
async function getAdminCollege() {
    // Get college_id from auth session
    if (window.authFunctions && window.authFunctions.getAdminCollege) {
        return window.authFunctions.getAdminCollege();
    }
    return null;
}

/**
 * Fetch resources from database
 */
async function fetchResources() {
    dashboardState.loading = true;
    showLoading(true);

    try {
        console.log('📥 Fetching resources...');

        // Get admin's college first
        const collegeId = await getAdminCollege();

        let query = window.supabaseClient
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });

        // Filter by college if admin has a specific college
        if (collegeId && collegeId !== 'all') {
            query = query.eq('college_id', collegeId);
        }

        // Apply filters
        if (dashboardState.filters.semester !== 'all') {
            query = query.eq('semester', dashboardState.filters.semester);
        }
        if (dashboardState.filters.branch !== 'all') {
            query = query.eq('branch', dashboardState.filters.branch);
        }
        if (dashboardState.filters.subject !== 'all') {
            query = query.eq('subject', dashboardState.filters.subject);
        }
        if (dashboardState.filters.status !== 'all') {
            query = query.eq('status', dashboardState.filters.status);
        }

        const { data, error } = await query;

        if (error) throw error;

        dashboardState.resources = data || [];
        applySearchFilter();
        calculateStats();
        renderResources();

        console.log('✅ Loaded', dashboardState.resources.length, 'resources');
    } catch (error) {
        console.error('❌ Error fetching resources:', error);
        showToast('Failed to load resources', 'error');
    } finally {
        dashboardState.loading = false;
        showLoading(false);
    }
}

/**
 * Fetch available subjects for selected branch
 */
async function fetchSubjects(branch) {
    try {
        const collegeId = dashboardState.currentCollege;

        let query = window.supabaseClient
            .from('resources')
            .select('subject')
            .eq('branch', branch);

        // Filter by college if applicable
        if (collegeId && collegeId !== 'all') {
            query = query.eq('college_id', collegeId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const uniqueSubjects = [...new Set(data.map(r => r.subject).filter(Boolean))];
        return uniqueSubjects;
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Apply search filter to resources
 */
function applySearchFilter() {
    const search = dashboardState.filters.search.toLowerCase();

    if (!search) {
        dashboardState.filteredResources = dashboardState.resources;
        return;
    }

    dashboardState.filteredResources = dashboardState.resources.filter(resource => {
        return (
            resource.title.toLowerCase().includes(search) ||
            resource.subject.toLowerCase().includes(search) ||
            (resource.uploaded_by_name && resource.uploaded_by_name.toLowerCase().includes(search)) ||
            (resource.uploaded_by_email && resource.uploaded_by_email.toLowerCase().includes(search))
        );
    });
}

/**
 * Update filter
 */
function updateFilter(filterName, value) {
    dashboardState.filters[filterName] = value;

    if (filterName === 'search') {
        applySearchFilter();
        renderResources();
        updateResourcesCount();
    } else {
        fetchResources();
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    dashboardState.filters = {
        search: '',
        semester: 'all',
        branch: 'all',
        subject: 'all',
        status: 'all',
    };

    // Update UI
    document.getElementById('searchInput').value = '';
    document.getElementById('filterSemester').value = 'all';
    document.getElementById('filterBranch').value = 'all';
    document.getElementById('filterSubject').value = 'all';
    document.getElementById('filterStatus').value = 'all';

    // Disable subject filter
    document.getElementById('filterSubject').disabled = true;

    fetchResources();
    showToast('Filters cleared', 'info');
}

/**
 * Save filters to localStorage
 */
function saveFilters() {
    localStorage.setItem('admin_saved_filters', JSON.stringify(dashboardState.filters));
    showToast('Filters saved!', 'success');
}

/**
 * Load saved filters
 */
function loadSavedFilters() {
    const saved = localStorage.getItem('admin_saved_filters');

    if (!saved) {
        showToast('No saved filters found', 'info');
        return;
    }

    try {
        const filters = JSON.parse(saved);
        dashboardState.filters = filters;

        // Update UI
        document.getElementById('searchInput').value = filters.search || '';
        document.getElementById('filterSemester').value = filters.semester || 'all';
        document.getElementById('filterBranch').value = filters.branch || 'all';
        document.getElementById('filterSubject').value = filters.subject || 'all';
        document.getElementById('filterStatus').value = filters.status || 'all';

        // Load subjects if branch is selected
        if (filters.branch !== 'all') {
            loadSubjects(filters.branch);
        }

        fetchResources();
        showToast('Filters loaded!', 'success');
    } catch (error) {
        console.error('Error loading filters:', error);
        showToast('Failed to load filters', 'error');
    }
}

/**
 * Load subjects for branch
 */
async function loadSubjects(branch) {
    const subjectSelect = document.getElementById('filterSubject');

    if (branch === 'all') {
        subjectSelect.disabled = true;
        subjectSelect.innerHTML = '<option value="all">All Subjects</option>';
        return;
    }

    const subjects = await fetchSubjects(branch);

    subjectSelect.disabled = false;
    subjectSelect.innerHTML = '<option value="all">All Subjects</option>' +
        subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');
}

// ============================================
// RESOURCE ACTIONS
// ============================================

/**
 * Update resource status (approve/reject)
 */
async function updateResourceStatus(resourceId, newStatus) {
    try {
        console.log(`📝 Updating resource ${resourceId} to ${newStatus}...`);

        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_resource_status',
                keyHash: session.key_hash,
                resourceId: resourceId,
                newStatus: newStatus
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Update failed');
        }

        console.log('✅ Update successful:', result.data);
        const statusText = newStatus === 'approved' ? 'approved' : 'rejected';
        const icon = newStatus === 'approved' ? '✅' : '❌';

        showToast(`${icon} Resource ${statusText} successfully!`, 'success');

        // Refresh resources
        await fetchResources();
    } catch (error) {
        console.error('Error updating status:', error);
        showToast(`Failed to update status: ${error.message || 'Unknown error'}`, 'error');
    }
}

/**
 * Delete resource permanently
 */
async function deleteResource(resourceId, resourceTitle) {
    if (!confirm(`Are you sure you want to permanently delete "${resourceTitle}"?`)) {
        return;
    }

    try {
        console.log(`🗑️ Deleting resource ${resourceId}...`);

        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_resource',
                keyHash: session.key_hash,
                resourceId: resourceId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Delete failed');
        }

        showToast('🗑️ Resource deleted successfully', 'success');

        // Refresh resources
        await fetchResources();
    } catch (error) {
        console.error('Error deleting resource:', error);
        showToast('Failed to delete resource', 'error');
    }
}

// ============================================
// STATS CALCULATION
// ============================================

/**
 * Calculate statistics
 */
function calculateStats() {
    const resources = dashboardState.resources;

    dashboardState.stats = {
        pending: resources.filter(r => r.status === 'pending').length,
        approved: resources.filter(r => r.status === 'approved').length,
        rejected: resources.filter(r => r.status === 'rejected').length,
        total: resources.length,
    };

    updateStatsUI();
}

/**
 * Update stats in UI
 */
function updateStatsUI() {
    const stats = dashboardState.stats;

    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statApproved').textContent = stats.approved;
    document.getElementById('statRejected').textContent = stats.rejected;
    document.getElementById('statTotal').textContent = stats.total;

    // Update pending badge
    const pendingBadge = document.getElementById('pendingBadge');
    const pendingCount = document.getElementById('pendingCount');

    if (dashboardState.filters.status === 'pending' && stats.pending > 0) {
        pendingBadge.classList.remove('hidden');
        pendingCount.textContent = stats.pending;
    } else {
        pendingBadge.classList.add('hidden');
    }
}

/**
 * Update resources count
 */
function updateResourcesCount() {
    const count = dashboardState.filteredResources.length;
    const text = `${count} Resource${count !== 1 ? 's' : ''} Found`;
    document.getElementById('resourcesCount').textContent = text;
}

// ============================================
// UI FUNCTIONS
// ============================================

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const resourcesList = document.getElementById('resourcesList');
    const emptyState = document.getElementById('emptyState');

    if (show) {
        loadingState.classList.remove('hidden');
        resourcesList.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

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
    lucide.createIcons();

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Render resources list
 */
function renderResources() {
    const resourcesList = document.getElementById('resourcesList');
    const emptyState = document.getElementById('emptyState');
    const resources = dashboardState.filteredResources;

    updateResourcesCount();

    if (resources.length === 0) {
        resourcesList.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    resourcesList.classList.remove('hidden');
    resourcesList.innerHTML = resources.map(resource => createResourceCard(resource)).join('');

    // Reinitialize icons
    lucide.createIcons();
}

/**
 * Create resource card HTML
 */
function createResourceCard(resource) {
    const typeIcons = {
        video: 'video',
        notes: 'file-text',
        pyq: 'help-circle',
    };

    const typeColors = {
        video: 'red',
        notes: 'blue',
        pyq: 'amber',
    };

    const statusColors = {
        pending: 'yellow',
        approved: 'green',
        rejected: 'red',
    };

    const icon = typeIcons[resource.type] || 'file-text';
    const color = typeColors[resource.type] || 'blue';
    const statusColor = statusColors[resource.status] || 'gray';

    const date = new Date(resource.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
        <div class="glass-card motion-card resource-card" data-id="${resource.id}">
            <div class="resource-content">
                <div class="resource-icon resource-icon-${color}">
                    <i data-lucide="${icon}" class="icon-large"></i>
                </div>
                
                <div class="resource-details">
                    <div class="resource-header">
                        <h3 class="resource-title">${resource.title}</h3>
                        <span class="status-badge status-${statusColor}">
                            ${resource.status.toUpperCase()}
                        </span>
                    </div>
                    
                    <div class="resource-meta">
                        <span class="meta-badge">Sem ${resource.semester}</span>
                        <span class="meta-badge">${resource.branch.toUpperCase()}</span>
                        <span class="meta-badge">${resource.subject}</span>
                        ${resource.chapter ? `<span class="meta-badge">${resource.chapter}</span>` : ''}
                        <span class="meta-badge meta-type">${resource.type === 'notes' ? '📄 Notes' : resource.type === 'video' ? '🎥 Video' : '📝 PYQ'}</span>
                    </div>
                    
                    <div class="resource-info">
                        <div class="info-item">
                            <i data-lucide="user" class="icon-xs"></i>
                            <span>${resource.uploaded_by_name || 'Anonymous'}</span>
                            ${resource.uploaded_by_email ? `<span class="info-email">(${resource.uploaded_by_email})</span>` : ''}
                        </div>
                        <div class="info-item">
                            <i data-lucide="calendar" class="icon-xs"></i>
                            <span>${date}</span>
                        </div>
                    </div>
                    
                    <div class="resource-actions">
                        ${resource.status !== 'approved' ? `
                            <button class="btn-action btn-approve" onclick="updateResourceStatus('${resource.id}', 'approved')">
                                <i data-lucide="check-circle-2" class="icon-sm"></i>
                                Approve
                            </button>
                        ` : ''}
                        
                        ${resource.status === 'approved' ? `
                            <button class="btn-action btn-retract" onclick="updateResourceStatus('${resource.id}', 'rejected')">
                                <i data-lucide="arrow-up-down" class="icon-sm"></i>
                                Retract
                            </button>
                        ` : resource.status !== 'rejected' ? `
                            <button class="btn-action btn-reject" onclick="updateResourceStatus('${resource.id}', 'rejected')">
                                <i data-lucide="x-circle" class="icon-sm"></i>
                                Reject
                            </button>
                        ` : ''}
                        
                        ${resource.file_url || resource.video_url ? `
                            <button class="btn-action btn-preview" onclick="previewResource('${resource.id}')">
                                <i data-lucide="eye" class="icon-sm"></i>
                                Preview
                            </button>
                        ` : ''}
                        
                        <button class="btn-action btn-delete" onclick="deleteResource('${resource.id}', '${resource.title.replace(/'/g, "\\'")}')">
                            <i data-lucide="trash-2" class="icon-sm"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Preview resource (open in new tab)
 */
function previewResource(resourceId) {
    const resource = dashboardState.resources.find(r => r.id === resourceId);
    if (!resource) return;

    const url = resource.type === 'video' ? resource.video_url : resource.file_url;
    if (url) {
        window.open(url, '_blank');
    }
}

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

window.dashboardFunctions = {
    fetchResources,
    updateFilter,
    clearFilters,
    saveFilters,
    loadSavedFilters,
    loadSubjects,
    updateResourceStatus,
    deleteResource,
    previewResource,
};