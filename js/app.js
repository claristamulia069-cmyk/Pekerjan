// ============================================================
// DEFAULT ROLES (tambahkan superadmin)
// ============================================================
const DEFAULT_ROLES = {
    'ketua@panitia.com': 'ketua',
    'bendahara@panitia.com': 'bendahara',
    'sekretaris@panitia.com': 'sekretaris',
    'sie_acara@panitia.com': 'sie_acara',
    'sie_logistik@panitia.com': 'sie_logistik',
    'sie_akademi@panitia.com': 'sie_akademi',
    'sie_dekdok@panitia.com': 'sie_dekdok',
    'humas@panitia.com': 'humas',
    'dpl@panitia.com': 'dpl',
    'admin@panitia.com': 'superadmin'  // 🔥 TAMBAHKAN
};

// ============================================================
// MENU LABEL (tambahkan untuk superadmin)
// ============================================================
const MENU_LABEL = {
    superadmin: { label: '👑 Super Admin', desc: 'Testing - Full Akses' }, // 🔥
    ketua: { label: '👤 Ketua', desc: 'Set Deadline & Pantau' },
    // ... sisanya sama
};

// ============================================================
// FUNGSI getCurrentAllowedRoles (tambahkan superadmin)
// ============================================================
function getCurrentAllowedRoles() {
    // 🔥 Superadmin dapat akses semua menu
    if (currentUserRole === 'superadmin' || currentUserRole === 'ketua') {
        return ['ketua', 'bendahara', 'sekretaris', 'acara', 'logistik', 'akademi', 'dekdok', 'humas', 'dpl'];
    }
    // ... sisanya sama
    if (currentUserRole === 'bendahara') return ['bendahara'];
    if (currentUserRole === 'sekretaris') return ['sekretaris'];
    // ... dst
}

// ============================================================
// FUNGSI login (buat akun superadmin tanpa isFirstLogin)
// ============================================================
// Di dalam try-catch setelah createUserWithEmailAndPassword:
const cred = await createUserWithEmailAndPassword(auth, email, pass);
const role = DEFAULT_ROLES[email];
// 🔥 Superadmin langsung bisa login, tidak perlu ganti password
const isFirstLogin = (role === 'superadmin') ? false : true;
await setDoc(doc(db, 'users', cred.user.uid), {
    email: email,
    role: role,
    points: 0,
    isFirstLogin: isFirstLogin,
    canChangePassword: (role === 'superadmin') ? false : true,
    createdAt: new Date()
});

// ============================================================
// AUTH STATE OBSERVER (initApp) - lewati cek isFirstLogin untuk superadmin
// ============================================================
// Di dalam onAuthStateChanged, setelah ambil data user:
const docSnap = await getDoc(doc(db, 'users', user.uid));
if (docSnap.exists()) {
    const data = docSnap.data();
    currentUserRole = data.role || 'member';
    currentUserPoints = data.points || 0;
    
    // 🔥 Jika superadmin, langsung masuk tanpa force change password
    if (currentUserRole === 'superadmin') {
        showHome();
        return;
    }
    
    // Cek isFirstLogin untuk role lain
    if (data.isFirstLogin) {
        showForceChangePasswordModal(user.uid);
        return;
    }
}
