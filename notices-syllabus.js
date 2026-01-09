// notices-syllabus.js
// Notices and Syllabus Management with Role-Based Permissions

// ============================================
// TAB SWITCHING (FIXED)
// ============================================

// Tab switching logic is moved to app.js for better state management

// Tab switching logic is moved to app.js for better state management

// ============================================
// NOTICES MANAGEMENT
// ============================================

function showNoticeForm() {
    document.getElementById('notice-form').style.display = 'block';

    // Populate department dropdown based on permissions
    populateNoticeDepartments();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function hideNoticeForm() {
    document.getElementById('notice-form').style.display = 'none';
    const form = document.getElementById('notice-form').querySelector('form');
    if (form) form.reset();

    // Reset file upload
    const fileType = document.querySelector('input[name="file-type"]');
    if (fileType) fileType.checked = true;
    toggleFileUpload('none');
}

function populateNoticeDepartments() {
    const departmentSelect = document.getElementById('notice-department');
    if (!departmentSelect) return;

    const allowedDepts = window.authFunctions.getAllowedDepartments();

    const deptNames = {
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

    departmentSelect.innerHTML = allowedDepts
        .map(dept => `<option value="${dept}">${deptNames[dept]}</option>`)
        .join('');
}

function toggleFileUpload(type) {
    const pdfSection = document.getElementById('pdf-upload-section');
    const videoSection = document.getElementById('video-url-section');

    if (pdfSection) pdfSection.style.display = type === 'pdf' ? 'block' : 'none';
    if (videoSection) videoSection.style.display = type === 'video' ? 'block' : 'none';

    // Clear inputs
    if (type !== 'pdf') {
        const pdfInput = document.getElementById('notice-pdf');
        if (pdfInput) pdfInput.value = '';
    }
    if (type !== 'video') {
        const videoInput = document.getElementById('notice-video-url');
        if (videoInput) videoInput.value = '';
    }
}

async function createNotice(event) {
    event.preventDefault();

    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    const department = document.getElementById('notice-department').value;
    const priority = document.getElementById('notice-priority').value;
    const expiresAt = document.getElementById('notice-expires').value;

    // Check permissions
    if (!window.authFunctions.canPostToDepartment(department)) {
        showToast('❌ You do not have permission to post to this department', 'error');
        return;
    }

    // Get file type
    const fileTypeInput = document.querySelector('input[name="file-type"]:checked');
    const fileType = fileTypeInput ? fileTypeInput.value : 'none';
    let fileUrl = null;
    let uploadedFileType = null;

    const submitBtn = document.getElementById('notice-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" class="icon-sm animate-spin"></i> Creating...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

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

        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_notice',
                keyHash: session.key_hash,
                title,
                content,
                department,
                priority,
                fileUrl,
                fileType: uploadedFileType,
                expiresAt: expiresAt || null
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create notice');
        }

        showToast('✅ Notice created successfully!', 'success');
        hideNoticeForm();
        loadNotices();
    } catch (error) {
        console.error('Error creating notice:', error);
        showToast('❌ Failed to create notice: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="send" class="icon-sm"></i> Post Notice';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
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

        displayNotices(data || []);
    } catch (error) {
        console.error('Error loading notices:', error);
        const container = document.getElementById('notices-list');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load notices</p>';
        }
    }
}

function displayNotices(notices) {
    const container = document.getElementById('notices-list');
    if (!container) return;

    if (notices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No notices yet. Create your first one!</p>';
        return;
    }

    container.innerHTML = notices.map(notice => `
        <div class="glass-card resource-card motion-card">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${notice.title}</h3>
                    <span class="badge badge-${notice.priority}">${notice.priority.toUpperCase()}</span>
                    ${!notice.is_active ? '<span class="badge badge-secondary">Hidden</span>' : ''}
                </div>
            </div>
            <p class="card-text">${notice.content}</p>
            ${notice.file_url ? `
                <div class="card-attachment">
                    <i data-lucide="${notice.file_type === 'pdf' ? 'file-text' : 'video'}" class="icon-sm"></i>
                    <span>${notice.file_type === 'pdf' ? 'PDF Document' : 'Video Link'}</span>
                    <button class="btn-link btn-sm" onclick="window.open('${notice.file_url}', '_blank')">
                        View ${notice.file_type === 'pdf' ? 'PDF' : 'Video'}
                        <i data-lucide="external-link" class="icon-xs"></i>
                    </button>
                </div>
            ` : ''}
            <div class="card-meta">
                <span><i data-lucide="user" class="icon-xs"></i> ${notice.created_by}</span>
                <span><i data-lucide="building" class="icon-xs"></i> ${getDepartmentName(notice.department)}</span>
                <span><i data-lucide="calendar" class="icon-xs"></i> ${new Date(notice.created_at).toLocaleDateString()}</span>
                ${notice.expires_at ? `<span><i data-lucide="clock" class="icon-xs"></i> Expires: ${new Date(notice.expires_at).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="card-actions">
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
    `).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function toggleNoticeActive(id, currentStatus) {
    try {
        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'toggle_notice',
                keyHash: session.key_hash,
                noticeId: id,
                isActive: !currentStatus
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to update notice');
        }

        showToast(currentStatus ? '✅ Notice hidden from students' : '✅ Notice visible to students', 'success');
        loadNotices();
    } catch (error) {
        console.error('Error toggling notice:', error);
        showToast('❌ Failed to update notice', 'error');
    }
}

async function deleteNotice(id) {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_notice',
                keyHash: session.key_hash,
                noticeId: id
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete notice');
        }

        showToast('✅ Notice deleted', 'success');
        loadNotices();
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
// SYLLABUS MANAGEMENT
// ============================================

const SUBJECTS = {
    cse: ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Software Engineering'],
    ece: ['Digital Electronics', 'Signals & Systems', 'Communication Systems', 'VLSI', 'Microprocessors'],
    me: ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing'],
    ce: ['Structural Analysis', 'Surveying', 'Construction Management', 'Geotechnical Engineering'],
    eee: ['Power Systems', 'Control Systems', 'Electrical Machines', 'Power Electronics'],
    aiml: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Mining'],
    ds: ['Statistics', 'Data Mining', 'Big Data Analytics', 'Machine Learning', 'Data Visualization'],
    it: ['Web Development', 'Database Systems', 'Networking', 'Cloud Computing', 'Cybersecurity']
};

function showSyllabusForm() {
    document.getElementById('syllabus-form').style.display = 'block';

    // Populate department dropdown based on permissions
    populateSyllabusDepartments();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function hideSyllabusForm() {
    document.getElementById('syllabus-form').style.display = 'none';
    const form = document.getElementById('syllabus-form').querySelector('form');
    if (form) form.reset();
}

function populateSyllabusDepartments() {
    const departmentSelect = document.getElementById('syllabus-branch');
    if (!departmentSelect) return;

    const allowedDepts = window.authFunctions.getAllowedDepartments()
        .filter(dept => dept !== 'all'); // Syllabus doesn't use 'all'

    const deptNames = {
        'cse': 'Computer Science',
        'ece': 'Electronics',
        'me': 'Mechanical',
        'ce': 'Civil',
        'eee': 'Electrical',
        'aiml': 'AI & ML',
        'ds': 'Data Science',
        'it': 'Information Technology'
    };

    departmentSelect.innerHTML = '<option value="">Select Branch</option>' +
        allowedDepts.map(dept => `<option value="${dept}">${deptNames[dept]}</option>`).join('');
}

function loadSyllabusSubjects() {
    const branch = document.getElementById('syllabus-branch').value;
    const subjectSelect = document.getElementById('syllabus-subject');

    if (!branch) {
        subjectSelect.innerHTML = '<option value="">Select Branch First</option>';
        return;
    }

    // Get allowed subjects based on permissions
    const allowedSubjects = window.authFunctions.getAllowedSubjects(branch);

    subjectSelect.innerHTML = '<option value="">Select Subject</option>' +
        allowedSubjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');
}

async function uploadSyllabus(event) {
    event.preventDefault();

    const semester = document.getElementById('syllabus-semester').value;
    const branch = document.getElementById('syllabus-branch').value;
    const subject = document.getElementById('syllabus-subject').value;
    const title = document.getElementById('syllabus-title').value;
    const academicYear = document.getElementById('syllabus-year').value;
    const file = document.getElementById('syllabus-file').files[0];

    if (!file) {
        showToast('Please select a PDF file', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    // Check permissions
    if (!window.authFunctions.canUploadSyllabus(branch, subject)) {
        showToast('❌ You do not have permission to upload syllabus for this subject', 'error');
        return;
    }

    const submitBtn = document.getElementById('syllabus-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" class="icon-sm animate-spin"></i> Uploading...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    try {
        // Upload PDF to Cloudinary instead of Supabase Storage
        const publicUrl = await window.uploadToCloudinary(file, 'syllabus');

        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'upload_syllabus',
                keyHash: session.key_hash,
                semester,
                branch,
                subject,
                title,
                pdfUrl: publicUrl,
                academicYear
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to upload syllabus');
        }

        showToast('✅ Syllabus uploaded successfully!', 'success');
        hideSyllabusForm();
        loadSyllabi();
    } catch (error) {
        console.error('Error uploading syllabus:', error);
        showToast('❌ Failed to upload syllabus: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="upload" class="icon-sm"></i> Upload Syllabus';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

async function loadSyllabi() {
    try {
        const { data, error } = await window.supabaseClient
            .from('syllabus')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displaySyllabi(data || []);
    } catch (error) {
        console.error('Error loading syllabi:', error);
        const container = document.getElementById('syllabus-list');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load syllabi</p>';
        }
    }
}

function displaySyllabi(syllabi) {
    const container = document.getElementById('syllabus-list');
    if (!container) return;

    if (syllabi.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No syllabus uploaded yet. Upload your first one!</p>';
        return;
    }

    container.innerHTML = syllabi.map(syllabus => `
        <div class="glass-card resource-card motion-card">
            <h3 class="card-title">${syllabus.title}</h3>
            <div class="card-meta">
                <span><i data-lucide="hash" class="icon-xs"></i> Semester ${syllabus.semester}</span>
                <span><i data-lucide="building" class="icon-xs"></i> ${getDepartmentName(syllabus.branch)}</span>
                <span><i data-lucide="book" class="icon-xs"></i> ${syllabus.subject}</span>
                <span><i data-lucide="calendar" class="icon-xs"></i> AY: ${syllabus.academic_year}</span>
                <span><i data-lucide="user" class="icon-xs"></i> ${syllabus.uploaded_by}</span>
            </div>
            <div class="card-actions">
                <button class="btn-view-pdf" onclick="openPdfViewer('${syllabus.pdf_url}', '${syllabus.title}')">
                    <i data-lucide="eye" class="icon-xs"></i>
                    View PDF
                </button>
                <button class="btn-danger btn-sm" onclick="deleteSyllabus('${syllabus.id}')">
                    <i data-lucide="trash-2" class="icon-xs"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function deleteSyllabus(id) {
    if (!confirm('Are you sure you want to delete this syllabus?')) return;

    try {
        const session = window.authFunctions.getAdminSession();
        if (!session || !session.key_hash) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_syllabus',
                keyHash: session.key_hash,
                syllabusId: id
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete syllabus');
        }

        showToast('✅ Syllabus deleted', 'success');
        loadSyllabi();
    } catch (error) {
        console.error('Error deleting syllabus:', error);
        showToast('❌ Failed to delete syllabus', 'error');
    }
}

// ============================================
// GLOBAL EXPORTS
// ============================================
window.deleteSyllabus = deleteSyllabus;
window.loadSyllabi = loadSyllabi;
window.showSyllabusForm = showSyllabusForm;
window.hideSyllabusForm = hideSyllabusForm;
window.uploadSyllabus = uploadSyllabus;

console.log('✅ notices-syllabus.js loaded with role-based permissions');