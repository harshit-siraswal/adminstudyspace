// users.js
// User Management - Ban/Unban functionality

// ============================================
// BAN USER FUNCTIONS
// ============================================

async function handleBanUser(e) {
    if (e) e.preventDefault();

    const email = document.getElementById('banEmail').value.trim().toLowerCase();
    const reason = document.getElementById('banReason').value.trim();

    if (!email) {
        showToast('Please enter an email address', 'error');
        return;
    }

    try {
        console.log('🚫 Banning user:', email);

        const session = window.authFunctions.getAdminSession();
        if (!session) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        // Check if user is already banned
        const { data: existing } = await window.supabaseClient
            .from('banned_users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            showToast('This user is already banned', 'error');
            return;
        }

        // Insert into banned_users table
        const { error } = await window.supabaseClient
            .from('banned_users')
            .insert([{
                email: email,
                reason: reason || 'No reason provided',
                banned_by: session.admin_name || 'Admin',
                banned_at: new Date().toISOString()
            }]);

        if (error) throw error;

        showToast(`✅ ${email} has been banned`, 'success');

        // Clear form
        document.getElementById('banEmail').value = '';
        document.getElementById('banReason').value = '';

        // Refresh list
        loadBannedUsers();

    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user: ' + error.message, 'error');
    }
}

async function handleUnbanUser(email) {
    if (!confirm(`Are you sure you want to unban ${email}?`)) return;

    try {
        console.log('✅ Unbanning user:', email);

        const session = window.authFunctions.getAdminSession();
        if (!session) {
            showToast('Session expired. Please login again.', 'error');
            return;
        }

        // Delete from banned_users table
        const { error } = await window.supabaseClient
            .from('banned_users')
            .delete()
            .eq('email', email);

        if (error) throw error;

        showToast(`✅ ${email} has been unbanned`, 'success');
        loadBannedUsers();

    } catch (error) {
        console.error('Error unbanning user:', error);
        showToast('Failed to unban user: ' + error.message, 'error');
    }
}

async function loadBannedUsers() {
    const container = document.getElementById('bannedUsersList');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading...</p>';

    try {
        const { data, error } = await window.supabaseClient
            .from('banned_users')
            .select('*')
            .order('banned_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i data-lucide="check-circle" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No banned users</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        container.innerHTML = data.map(user => `
            <div class="glass-card" style="padding: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: var(--text-primary);">${user.email}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                        ${user.reason || 'No reason provided'}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-disabled); margin-top: 0.25rem;">
                        Banned by ${user.banned_by} on ${new Date(user.banned_at).toLocaleDateString()}
                    </div>
                </div>
                <button class="btn btn-success btn-sm" onclick="handleUnbanUser('${user.email}')">
                    <i data-lucide="user-check" class="icon-sm"></i>
                    Unban
                </button>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('Error loading banned users:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--color-error);">
                <p>Failed to load banned users</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
    }
}

// Expose functions globally
window.handleBanUser = handleBanUser;
window.handleUnbanUser = handleUnbanUser;
window.loadBannedUsers = loadBannedUsers;

console.log('✅ users.js loaded');
