// auth.js
// Admin Authentication System with Role-Based Permissions

const AUTH_CONFIG = {
    SESSION_KEY: 'admin_session',
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate SHA-256 hash of admin key
 */
async function hashAdminKey(key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Save admin session to localStorage
 */
function saveAdminSession(sessionData) {
    const now = Date.now();
    const session = {
        ...sessionData,
        expires_at: now + AUTH_CONFIG.SESSION_DURATION,
        logged_in_at: now,
    };
    localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    console.log('✅ Session saved:', sessionData.admin_name);
}

/**
 * Get current admin session
 */
function getAdminSession() {
    const sessionStr = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!sessionStr) return null;

    try {
        const session = JSON.parse(sessionStr);

        // Check if session expired
        if (Date.now() > session.expires_at) {
            console.log('⚠️ Session expired');
            clearAdminSession();
            return null;
        }

        return session;
    } catch (error) {
        console.error('Error parsing session:', error);
        clearAdminSession();
        return null;
    }
}

/**
 * Clear admin session
 */
function clearAdminSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    console.log('🔓 Session cleared');
}

/**
 * Check if user is admin
 */
function isAdmin() {
    return getAdminSession() !== null;
}

/**
 * Get admin name
 */
function getAdminName() {
    const session = getAdminSession();
    return session?.admin_name || 'Admin';
}

/**
 * Get full admin data
 */
function getAdminData() {
    return getAdminSession();
}

/**
 * Get admin role
 */
function getAdminRole() {
    const session = getAdminSession();
    return session?.role || null;
}

/**
 * Check if super admin
 */
function isSuperAdmin() {
    const session = getAdminSession();
    return session && session.role === 'super_admin';
}

/**
 * Get admin college ID
 */
function getAdminCollege() {
    const session = getAdminSession();
    return session?.college_id || null;
}

/**
 * Check if can post to department
 */
function canPostToDepartment(department) {
    const session = getAdminSession();
    if (!session) return false;

    // Super admin can post to any department
    if (session.role === 'super_admin') return true;

    // Department admin can only post to their department
    return session.department === department;
}

/**
 * Check if can upload syllabus for subject
 */
function canUploadSyllabus(department, subject) {
    const session = getAdminSession();
    if (!session) return false;

    // Super admin can upload anything
    if (session.role === 'super_admin') return true;

    // Must match department
    if (session.department !== department) return false;

    // If no subject restriction, can upload for any subject in their department
    if (!session.subject) return true;

    // Must match subject
    return session.subject === subject;
}

/**
 * Get allowed departments
 */
function getAllowedDepartments() {
    const session = getAdminSession();
    if (!session) return [];

    if (session.role === 'super_admin') {
        return ['all', 'cse', 'ece', 'me', 'ce', 'eee', 'aiml', 'ds', 'it'];
    }

    return [session.department];
}

/**
 * Get allowed subjects for a department
 */
function getAllowedSubjects(department) {
    const session = getAdminSession();
    if (!session) return [];

    // Super admin can access all subjects
    if (session.role === 'super_admin') {
        return getAllSubjectsForDepartment(department);
    }

    // Must be same department
    if (session.department !== department) return [];

    // If no subject restriction, return all subjects for department
    if (!session.subject) {
        return getAllSubjectsForDepartment(department);
    }

    // Only their subject
    return [session.subject];
}

/**
 * Get all subjects for a department
 */
function getAllSubjectsForDepartment(department) {
    const subjects = {
        cse: ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Software Engineering'],
        ece: ['Digital Electronics', 'Signals & Systems', 'Communication Systems', 'VLSI', 'Microprocessors'],
        me: ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing'],
        ce: ['Structural Analysis', 'Surveying', 'Construction Management', 'Geotechnical Engineering'],
        eee: ['Power Systems', 'Control Systems', 'Electrical Machines', 'Power Electronics'],
        aiml: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Mining'],
        ds: ['Statistics', 'Data Mining', 'Big Data Analytics', 'Machine Learning', 'Data Visualization'],
        it: ['Web Development', 'Database Systems', 'Networking', 'Cloud Computing', 'Cybersecurity'],
    };
    return subjects[department] || [];
}

// ============================================
// LOGIN FUNCTION
// ============================================

/**
 * Login admin with secret key
 */
/**
 * Login admin with secret key
 */
async function loginAdmin(secretKey) {
    try {
        console.log('🔐 Attempting login...');

        let sessionData = null;

        // 1. Try Supabase Login
        try {
            const keyHash = await hashAdminKey(secretKey);
            const { data, error } = await window.supabaseClient
                .from('admin_keys')
                .select('*')
                .eq('key_hash', keyHash)
                .eq('is_active', true)
                .single();

            if (!error && data) {
                // Update last_used timestamp
                window.supabaseClient
                    .from('admin_keys')
                    .update({ last_used: new Date().toISOString() })
                    .eq('key_hash', keyHash)
                    .then(() => console.log('timestamp updated'));

                sessionData = {
                    id: data.id,
                    key_hash: keyHash,
                    admin_name: data.admin_name,
                    role: data.role,
                    department: data.department,
                    subject: data.subject,
                    college_id: data.college_id,
                };
            }
        } catch (dbError) {
            console.warn('⚠️ Supabase login failed, checking fallback:', dbError);
        }

        if (!sessionData) {
            console.warn('⚠️ Login failed: No matching active key found.');
        }

        if (!sessionData) {
            console.error('❌ Invalid admin key');
            return { success: false, error: 'Invalid admin key' };
        }

        // Save session
        saveAdminSession(sessionData);

        console.log('✅ Login successful:', sessionData.admin_name);
        return {
            success: true,
            adminName: sessionData.admin_name,
            adminData: sessionData
        };

    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout admin
 */
function logoutAdmin() {
    clearAdminSession();
    console.log('👋 Logged out');
}

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

window.authFunctions = {
    loginAdmin,
    logoutAdmin,
    isAdmin,
    getAdminName,
    getAdminSession,
    getAdminData,
    getAdminRole,
    getAdminCollege,
    isSuperAdmin,
    canPostToDepartment,
    canUploadSyllabus,
    getAllowedDepartments,
    getAllowedSubjects,
    getAllSubjectsForDepartment,
};

console.log('✅ Auth.js loaded with role-based permissions');