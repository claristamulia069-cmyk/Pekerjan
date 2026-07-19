// ============================================================
// APP.JS - Inisialisasi Firebase, Auth, Router, dan State
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    updatePassword 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    addDoc 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
import { encryptPassword } from './utils.js';

// ============================================================
// 1. KONFIGURASI FIREBASE (GANTI DENGAN PUNYAMU)
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDummyKey_IsikanDenganPunyaSendiri",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ============================================================
// 2. VARIABEL GLOBAL
// ============================================================
export let currentUser = null;
export let currentUserRole = null;
export let currentUserPoints = 0;

const DIVISIONS = ['acara', 'logistik', 'akademi', 'dekdok'];

export const MENU_LABEL = {
    superadmin: { label: '👑 Super Admin', desc: 'Testing - Full Akses' },
    ketua: { label: '👤 Ketua', desc: 'Set Deadline & Pantau' },
    bendahara: { label: '💰 Bendahara', desc: 'Input Keuangan' },
    sekretaris: { label: '📝 Sekretaris', desc: 'Logbook & Rekap' },
    acara: { label: '🎉 Sie Acara', desc: 'Kegiatan' },
    logistik: { label: '📦 Sie Logistik', desc: 'Kegiatan' },
    akademi: { label: '📚 Sie Akademi', desc: 'Kegiatan' },
    dekdok: { label: '📸 Sie Dekdok', desc: 'Kegiatan' },
    humas: { label: '📢 Humas', desc: 'Lihat semua & dokumentasi' },
    dpl: { label: '👀 DPL Monitoring', desc: 'Pantau semua aktivitas' }
};

// Mapping email ke role default (untuk akun bawaan)
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
    'admin@panitia.com': 'superadmin'   // 🔥 Super Admin
};

// ============================================================
// 3. FUNGSI AUTH
// ============================================================
export async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    msg.innerText = '';
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        // Jika akun bawaan belum dibuat, buat otomatis
        if (e.code === 'auth/user-not-found' && DEFAULT_ROLES[email]) {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                const role = DEFAULT_ROLES[email];
                const isFirstLogin = (role === 'superadmin') ? false : true;
                await setDoc(doc(db, 'users', cred.user.uid), {
                    email: email,
                    role: role,
                    points: 0,
                    isFirstLogin: isFirstLogin,
                    canChangePassword: (role === 'superadmin') ? false : true,
                    createdAt: new Date()
                });
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                msg.innerText = '❌ Gagal membuat akun bawaan: ' + err.message;
            }
        } else {
            msg.innerText = '❌ ' + e.message;
        }
    }
}

export async function register() {
    const email = document.getElementById('registerEmail').value.trim();
    const pass = document.getElementById('registerPassword').value;
    const msg = document.getElementById('registerMessage');
    msg.innerText = '';
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, 'users', cred.user.uid), {
            email: email,
            role: 'member',
            points: 0,
            isFirstLogin: true,
            canChangePassword: true,
            createdAt: new Date()
        });
        msg.innerText = '✅ Akun berhasil dibuat! Silakan login.';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        toggleAuth('login');
    } catch (e) {
        msg.innerText = '❌ ' + e.message;
    }
}

export function logout() {
    auth.signOut();
}

export function toggleAuth(mode) {
    if (mode === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }
}

export async function resetPassword() {
    const email = prompt('Masukkan email Anda untuk menerima link reset password:');
    if (!email) return;
    try {
        await sendPasswordResetEmail(auth, email);
        document.getElementById('resetMessage').innerHTML = '✅ Email reset telah dikirim. Cek kotak masuk/spam.';
    } catch (e) {
        alert('Gagal kirim reset: ' + e.message);
    }
}

// ============================================================
// 4. AUTH STATE OBSERVER
// ============================================================
export function initApp() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('login-page').style.display = 'none';

            // Catat log login
            try {
                await addDoc(collection(db, 'login_logs'), {
                    uid: user.uid,
                    email: user.email,
                    timestamp: new Date()
                });
            } catch (e) {}

            // Ambil data user
            try {
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

                    // Cek apakah harus ganti password pertama kali
                    if (data.isFirstLogin) {
                        showForceChangePasswordModal(user.uid);
                        return;
                    }
                } else {
                    // Jika dokumen belum ada (misal akun dibuat via console)
                    await setDoc(doc(db, 'users', user.uid), {
                        email: user.email,
                        role: 'member',
                        points: 0,
                        isFirstLogin: true,
                        canChangePassword: true,
                        createdAt: new Date()
                    });
                    currentUserRole = 'member';
                    currentUserPoints = 0;
                    showForceChangePasswordModal(user.uid);
                    return;
                }
            } catch (e) {
                console.error('Gagal ambil data user:', e);
                currentUserRole = 'member';
                currentUserPoints = 0;
            }
            showHome();
        } else {
            // User logout
            currentUser = null;
            currentUserRole = null;
            currentUserPoints = 0;
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('login-page').style.display = 'block';
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-home').classList.remove('active');
            document.getElementById('page-dynamic').classList.remove('active');
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginMessage').innerText = '';
            document.getElementById('registerMessage').innerText = '';
            document.getElementById('resetMessage').innerHTML = '';
        }
    });
}

// ============================================================
// 5. FORCE CHANGE PASSWORD MODAL
// ============================================================
async function showForceChangePasswordModal(uid) {
    const newPass = prompt('⚠️ Anda harus mengganti password sebelum masuk. Masukkan password baru (min 6 karakter):');
    if (!newPass || newPass.length < 6) {
        alert('Password minimal 6 karakter. Silakan logout dan login kembali.');
        auth.signOut();
        return;
    }
    try {
        await updatePassword(currentUser, newPass);
        await updateDoc(doc(db, 'users', uid), {
            passwordEncrypted: encryptPassword(newPass),
            isFirstLogin: false,
            canChangePassword: false
        });
        alert('✅ Password berhasil diubah! Silakan login kembali.');
        auth.signOut();
    } catch (e) {
        alert('Gagal mengganti password: ' + e.message);
        auth.signOut();
    }
}

// ============================================================
// 6. HOME & NAVIGASI
// ============================================================
export function showHome() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.add('active');
    document.getElementById('page-dynamic').classList.remove('active');

    // Update profile
    const profile = document.getElementById('profileCard');
    if (currentUser) {
        profile.innerHTML = `
            <div class="info">
                <span>📧 ${currentUser.email}</span>
                <span>🎯 Role: <strong>${currentUserRole}</strong></span>
            </div>
            <div class="points">⭐ Poin: ${currentUserPoints}</div>
        `;
    } else {
        profile.innerHTML = '';
    }

    // Render menu berdasarkan role
    const container = document.getElementById('menuCards');
    let allowed = getCurrentAllowedRoles();
    if (allowed.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#b91c1c;">❌ Role Anda (${currentUserRole}) tidak memiliki akses. Hubungi admin.</p>`;
        return;
    }
    let html = '';
    allowed.forEach(key => {
        const info = MENU_LABEL[key];
        if (info) html += `<div class="card" onclick="window.navigateTo('${key}')"><h3>${info.label}</h3><span class="badge">${info.desc}</span></div>`;
    });
    container.innerHTML = html;
}

function getCurrentAllowedRoles() {
    if (currentUserRole === 'superadmin' || currentUserRole === 'ketua') {
        return ['ketua', 'bendahara', 'sekretaris', 'acara', 'logistik', 'akademi', 'dekdok', 'humas', 'dpl'];
    }
    if (currentUserRole === 'bendahara') return ['bendahara'];
    if (currentUserRole === 'sekretaris') return ['sekretaris'];
    if (currentUserRole === 'sie_acara') return ['acara'];
    if (currentUserRole === 'sie_logistik') return ['logistik'];
    if (currentUserRole === 'sie_akademi') return ['akademi'];
    if (currentUserRole === 'sie_dekdok') return ['dekdok'];
    if (currentUserRole === 'humas') return ['humas'];
    if (currentUserRole === 'dpl') return ['dpl'];
    return [];
}

// ============================================================
// 7. NAVIGASI KE HALAMAN ROLE
// ============================================================
export function navigateTo(role) {
    const allowed = getCurrentAllowedRoles();
    if (!allowed.includes(role)) {
        alert('Anda tidak memiliki akses ke halaman ini.');
        return;
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.remove('active');
    document.getElementById('page-dynamic').classList.add('active');

    const titleMap = {
        'ketua': '👤 Panel Ketua',
        'bendahara': '💰 Panel Bendahara',
        'sekretaris': '📝 Panel Sekretaris',
        'acara': '🎉 Sie Acara',
        'logistik': '📦 Sie Logistik',
        'akademi': '📚 Sie Akademi',
        'dekdok': '📸 Sie Dekdok',
        'humas': '📢 Panel Humas',
        'dpl': '👀 Dashboard DPL'
    };
    document.getElementById('dynamic-title').innerText = titleMap[role] || role;
    renderPage(role);
}

// ============================================================
// 8. RENDER PAGE (LAZY LOAD MODUL)
// ============================================================
async function renderPage(role) {
    const container = document.getElementById('dynamic-content');
    if (role === 'ketua') {
        const { renderKetua } = await import('./roles/ketua.js');
        renderKetua(container);
    } else if (role === 'bendahara') {
        const { renderBendahara } = await import('./roles/bendahara.js');
        renderBendahara(container);
    } else if (role === 'sekretaris') {
        const { renderSekretaris } = await import('./roles/sekretaris.js');
        renderSekretaris(container);
    } else if (DIVISIONS.includes(role)) {
        const { renderSie } = await import('./roles/sie.js');
        renderSie(container, role);
    } else if (role === 'humas') {
        const { renderHumas } = await import('./roles/humas.js');
        renderHumas(container);
    } else if (role === 'dpl') {
        const { renderDpl } = await import('./roles/dpl.js');
        renderDpl(container);
    } else {
        container.innerHTML = '<p>Role tidak dikenal.</p>';
    }
}

export function goHome() {
    showHome();
}
