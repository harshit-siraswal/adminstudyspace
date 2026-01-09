// upload-resource.js
// Upload Resource Modal & Functionality for Admin/Teacher uploads

// ============================================
// STATE
// ============================================

let uploadState = {
    currentTab: 'notes',
    selectedFile: null
};

// ============================================
// MODAL FUNCTIONS
// ============================================

/**
 * Show the upload resource modal
 */
function showUploadResourceModal() {
    const modal = document.getElementById('uploadResourceModal');
    modal.style.display = 'flex';

    // Reset form
    document.getElementById('uploadResourceForm').reset();
    uploadState.selectedFile = null;
    uploadState.currentTab = 'notes';

    // Reset UI
    switchUploadTab('notes');
    clearSelectedFile();
    document.getElementById('upload-subject').innerHTML = '<option value="">Select subject</option>';

    // Reinitialize icons
    lucide.createIcons();
}

/**
 * Hide the upload resource modal
 */
function hideUploadResourceModal() {
    const modal = document.getElementById('uploadResourceModal');
    modal.style.display = 'none';

    // Reset state
    uploadState.selectedFile = null;
}

/**
 * Switch between Notes and Video tabs
 */
function switchUploadTab(tab) {
    uploadState.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.upload-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Show/hide sections based on tab
    const fileSection = document.getElementById('file-upload-section');
    const videoSection = document.getElementById('video-url-section');
    const resourceTypeSection = document.getElementById('resource-type-section');
    const submitText = document.getElementById('upload-submit-text');

    if (tab === 'notes') {
        fileSection.style.display = 'block';
        videoSection.style.display = 'none';
        resourceTypeSection.style.display = 'block';
        submitText.textContent = 'Upload Notes';
    } else {
        fileSection.style.display = 'none';
        videoSection.style.display = 'block';
        resourceTypeSection.style.display = 'none';
        submitText.textContent = 'Share Video';
    }

    lucide.createIcons();
}

// ============================================
// FILE HANDLING
// ============================================

/**
 * Handle file selection from input
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

/**
 * Validate and set the selected file
 */
function validateAndSetFile(file) {
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('❌ File is too large. Maximum size is 10MB.', 'error');
        return;
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
        showToast('❌ Invalid file type. Only PDF, DOC, DOCX allowed.', 'error');
        return;
    }

    uploadState.selectedFile = file;

    // Update UI
    const fileInfo = document.getElementById('selected-file-info');
    const fileName = document.getElementById('selected-file-name');
    const dropZone = document.getElementById('uploadDropZone');

    fileName.textContent = file.name;
    fileInfo.style.display = 'flex';
    dropZone.style.display = 'none';

    lucide.createIcons();
}

/**
 * Clear selected file
 */
function clearSelectedFile() {
    uploadState.selectedFile = null;
    document.getElementById('upload-file').value = '';

    const fileInfo = document.getElementById('selected-file-info');
    const dropZone = document.getElementById('uploadDropZone');

    fileInfo.style.display = 'none';
    dropZone.style.display = 'flex';
}

// ============================================
// DRAG AND DROP
// ============================================

// Set up drag and drop handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('uploadDropZone');

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                validateAndSetFile(file);
            }
        });
    }

    // Close modal when clicking overlay
    const modal = document.getElementById('uploadResourceModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideUploadResourceModal();
            }
        });
    }
});

// ============================================
// SUBJECT LOADING
// ============================================

/**
 * Load subjects based on selected branch
 */
async function loadUploadSubjects() {
    const branch = document.getElementById('upload-branch').value;
    const subjectSelect = document.getElementById('upload-subject');

    if (!branch) {
        subjectSelect.innerHTML = '<option value="">Select subject</option>';
        return;
    }

    try {
        // Fetch unique subjects for this branch from resources
        const { data, error } = await window.supabaseClient
            .from('resources')
            .select('subject')
            .eq('branch', branch);

        if (error) throw error;

        const uniqueSubjects = [...new Set(data.map(r => r.subject).filter(Boolean))];

        subjectSelect.innerHTML = '<option value="">Select subject</option>' +
            uniqueSubjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');

        // Add option to enter custom subject
        subjectSelect.innerHTML += '<option value="_custom">+ Add custom subject</option>';

    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Select subject</option>';
    }
}

// ============================================
// FORM SUBMISSION
// ============================================

/**
 * Upload teacher resource
 */
async function uploadTeacherResource(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('upload-submit-btn');
    const submitText = document.getElementById('upload-submit-text');
    const originalText = submitText.textContent;

    try {
        // Get form values
        const title = document.getElementById('upload-title').value.trim();
        const semester = document.getElementById('upload-semester').value;
        const branch = document.getElementById('upload-branch').value;
        const subject = document.getElementById('upload-subject').value;
        const chapter = document.getElementById('upload-chapter').value.trim();
        const topic = document.getElementById('upload-topic').value.trim();
        const description = document.getElementById('upload-description').value.trim();

        // Validate required fields
        if (!title || !semester || !branch || !subject) {
            showToast('❌ Please fill in all required fields', 'error');
            return;
        }

        // Validate based on tab
        if (uploadState.currentTab === 'notes') {
            if (!uploadState.selectedFile) {
                showToast('❌ Please select a file to upload', 'error');
                return;
            }
        } else {
            const videoUrl = document.getElementById('upload-video-url').value.trim();
            if (!videoUrl) {
                showToast('❌ Please enter a video URL', 'error');
                return;
            }
        }

        // Show loading state
        submitBtn.disabled = true;
        submitText.innerHTML = '<div class="spinner"></div> Uploading...';

        let fileUrl = null;
        let videoUrl = null;
        let resourceType = 'video';

        if (uploadState.currentTab === 'notes') {
            // Upload file to Cloudinary
            console.log('📤 Uploading file to Cloudinary...');
            fileUrl = await window.uploadToCloudinary(uploadState.selectedFile, 'teacher-resources');
            resourceType = document.getElementById('upload-resource-type').value;
        } else {
            videoUrl = document.getElementById('upload-video-url').value.trim();
            resourceType = 'video';
        }

        // Get admin session for author info
        const session = window.authFunctions?.getAdminSession?.() || {};

        // Create resource in database via RPC (bypasses RLS)
        console.log('📝 Creating resource in database...');
        const { data, error } = await window.supabaseClient
            .rpc('insert_resource', {
                p_title: title,
                p_semester: semester,
                p_branch: branch,
                p_subject: subject,
                p_type: resourceType,
                p_status: 'approved',
                p_source: 'teacher',
                p_file_url: fileUrl,
                p_video_url: videoUrl,
                p_description: description || null,
                p_chapter: chapter || null,
                p_topic: topic || null,
                p_college_id: session.college_id || null,
                p_uploaded_by_name: 'Teacher/Admin',
                p_uploaded_by_email: session.email || null
            });

        if (error) throw error;

        console.log('✅ Resource created successfully:', data);
        showToast('✅ Resource uploaded successfully!', 'success');

        // Close modal and refresh
        hideUploadResourceModal();

        // Clear filters to ensure the new resource is visible
        if (window.dashboardFunctions?.clearFilters) {
            window.dashboardFunctions.clearFilters();
        } else if (window.dashboardFunctions?.fetchResources) {
            await window.dashboardFunctions.fetchResources();
        }

    } catch (error) {
        console.error('❌ Error uploading resource:', error);
        showToast('❌ Failed to upload resource: ' + error.message, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        lucide.createIcons();
    }
}

// ============================================
// EXPORTS
// ============================================

window.showUploadResourceModal = showUploadResourceModal;
window.hideUploadResourceModal = hideUploadResourceModal;
window.switchUploadTab = switchUploadTab;
window.handleFileSelect = handleFileSelect;
window.clearSelectedFile = clearSelectedFile;
window.loadUploadSubjects = loadUploadSubjects;
window.uploadTeacherResource = uploadTeacherResource;

console.log('✅ Upload Resource module loaded');
