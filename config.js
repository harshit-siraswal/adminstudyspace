
// config.js
// Supabase & Cloudinary Configuration

// ⚠️ IMPORTANT: Replace these with your actual credentials

const SUPABASE_CONFIG = {
    url: 'https://iayuwsvguwfqjgjsvjiy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlheXV3c3ZndXdmcWpnanN2aml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTE5MTEsImV4cCI6MjA4MTYyNzkxMX0.EQhiq-yv9QLBNL_kmT5P59AZPykQkEZwbNbilxquYOA',
};

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dvttcyf7u',
    uploadPreset: 'studyspace_uploads',
    folder: 'admin-studyspace', // Folder for admin uploads
};

// Backend API Configuration
const BACKEND_CONFIG = {
    baseUrl: 'https://api.mystudyspace.me', // Replace with your actual backend URL
};

// Export config for use in other files
window.BACKEND_CONFIG = BACKEND_CONFIG;

// Initialize Supabase Client
(function () {
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase library not loaded. Check your internet connection.');
            alert('Failed to load Supabase library. Please check your internet connection and refresh the page.');
            return;
        }

        const { createClient } = window.supabase;

        // Validate config
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('❌ Supabase credentials not configured!');
            console.error('Please update config.js with your actual Supabase URL and anon key');
            alert('⚠️ Supabase not configured!\n\nPlease edit config.js and add your:\n1. Supabase URL\n2. Anon Key\n\nGet them from: Supabase Dashboard → Settings → API');
            return;
        }

        // Create and export clients
        // Regular client (anon key) - for read operations
        window.supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

        console.log('✅ Supabase client initialized (public only)');

    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        alert('Failed to initialize Supabase. Please check the browser console for errors.');
    }
})();

// ============================================
// CLOUDINARY UPLOAD HELPER
// ============================================

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} subfolder - Optional subfolder within admin-studyspace (e.g., 'notices', 'syllabus')
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
async function uploadToCloudinary(file, subfolder = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    // Set folder path
    const folder = subfolder
        ? `${CLOUDINARY_CONFIG.folder}/${subfolder}`
        : CLOUDINARY_CONFIG.folder;
    formData.append('folder', folder);

    // Generate a unique public_id
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const fileName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    formData.append('public_id', `${fileName}_${timestamp}_${randomStr}`);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        console.log('✅ Cloudinary upload successful:', data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

// Export Cloudinary upload function globally
window.uploadToCloudinary = uploadToCloudinary;
console.log('✅ Cloudinary configured for uploads');