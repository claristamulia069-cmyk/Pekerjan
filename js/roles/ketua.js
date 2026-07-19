// ============================================================
// KETUA.JS - Dashboard Ketua
// ============================================================

import { db, currentUser, auth } from '../app.js';
import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    setDoc, 
    updateDoc, 
    query, 
    orderBy, 
    where 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
import { decryptPassword, addPoints } from '../utils.js';

const DIVISIONS = ['acara', 'logistik', 'akademi', 'dekdok'];

// ============================================================
// RENDER HALAMAN KETUA
// ============================================================
export function renderKetua(container) {
    container.innerHTML = `
        <h4>⏰ Atur Deadline per Sie</h4>
        <div class="flex-row">
            ${DIVISIONS.map(d => `
                <div style="background:#f1f5f9; padding:15px; border-radius:12px; flex:1; min-width:150px;">
                    <strong>${d.toUpperCase()}</strong>
                    <input type="datetime-local" id="deadline_${d}" style="width:100%; margin:8px 0; padding:6px;" />
                    <button class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick="window.setDeadline('${d}')">Set</button>
                    <div id="statusDeadline_${d}" style="font-size:12px; margin-top:4px;"></div>
                </div>
            `).join('')}
        </div>
        <hr/>
        <div class="ketua-stat" id="ketuaStats">
            <div class="stat"><div class="number" id="statActivities">0</div><div class="label">📋 Total Kegiatan</div></div>
            <div class="stat"><div class="number" id="statIncome">Rp 0</div><div class="label">💰 Total Pemasukan</div></div>
            <div class="stat"><div class="number" id="statExpense">Rp 0</div><div class="label">💸 Total Pengeluaran</div></div>
            <div class="stat"><div class="number" id="statMeetings">0</div><div class="label">📝 Total Rapat</div></div>
        </div>
        <div style="background:#f1f5f9; padding:15px; border-radius:12px; margin-bottom:20px;">
            <h4>🏆 LEADERBOARD (Poin Tertinggi)</h4>
            <div id="leaderboardList">Memuat...</div>
        </div>
        <div style="background:#fef9c3; padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #facc15;">
            <h4>🔑 DAFTAR PASSWORD ANGGOTA (Hanya Bisa Dilihat Ketua)</h4>
            <div id="userPasswordList">Memuat...</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
            <span class="tab active" onclick="window.switchKetuaTab('activities', this)">📋 Kegiatan Sie</span>
            <span class="tab" onclick="window.switchKetuaTab('finances', this)">💰 Keuangan</span>
            <span class="tab" onclick="window.switchKetuaTab('meetings', this)">📝 Logbook Rapat</span>
        </div>
        <div id="ketuaTabContent">
            <div id="ketuaTabActivities" class="tab-content active">Memuat kegiatan...</div>
            <div id="ketuaTabFinances" class="tab-content">Memuat keuangan...</div>
            <div id="ketuaTabMeetings" class="tab-content">Memuat logbook...</div>
        </div>
    `;
    DIVISIONS.forEach(d => loadCurrentDeadline(d));
    loadKetuaStats();
    loadKetuaActivities();
    loadKetuaFinances();
    loadKetuaMeetings();
    loadLeaderboard();
    loadUserPasswords();
}

// ============================================================
// FUNGSI DEADLINE
// ============================================================
export async function setDeadline(division) {
    const val = document.getElementById(`deadline_${division}`).value;
    if (!val) { alert('Pilih tanggal dan jam!'); return; }
    const dateObj = new Date(val);
    await setDoc(doc(db, 'deadlines', division), { deadlineTime: dateObj });
    alert(`Deadline ${division} diset ke ${dateObj.toLocaleString('id-ID')}`);
    loadCurrentDeadline(division);
}

async function loadCurrentDeadline(division) {
    const el = document.getElementById(`statusDeadline_${division}`);
    try {
        const docSnap = await getDoc(doc(db, 'deadlines', division));
        if (docSnap.exists()) {
            const d = docSnap.data().deadlineTime.toDate ? docSnap.data().deadlineTime.toDate() : new Date(docSnap.data().deadlineTime);
            el.innerHTML = `🕒 ${d.toLocaleString('id-ID')}`;
        } else el.innerHTML = 'Belum diatur';
    } catch(e) { el.innerHTML = 'Error'; }
}

// ============================================================
// FUNGSI STATISTIK
// ============================================================
async function loadKetuaStats() {
    try {
        const actSnap = await getDocs(collection(db, 'activities'));
        document.getElementById('statActivities').innerText = actSnap.size;
        const finSnap = await getDocs(collection(db, 'finances'));
        let totalIncome = 0, totalExpense = 0;
        finSnap.forEach(doc => {
            const d = doc.data();
            if (d.type === 'income') totalIncome += d.amount;
            else totalExpense += d.amount;
        });
        document.getElementById('statIncome').innerText = `Rp ${totalIncome.toLocaleString()}`;
        document.getElementById('statExpense').innerText = `Rp ${totalExpense.toLocaleString()}`;
        const meetSnap = await getDocs(collection(db, 'meetings'));
        document.getElementById('statMeetings').innerText = meetSnap.size;
    } catch(e) { console.error('Gagal load stats:', e); }
}

// ============================================================
// TAB KEGIATAN
// ============================================================
export function switchKetuaTab(tab, el) {
    document.querySelectorAll('#ketuaTabContent .tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#ketuaTabContent .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(`ketuaTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

async function loadKetuaActivities() {
    const el = document.getElementById('ketuaTabActivities');
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan dari sie mana pun.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const late = d.isLate ? '🔴 TERLAMBAT (Evaluasi)' : '🟢 Tepat Waktu';
            html += `
                <div class="item-card" style="border-left-color: ${d.isLate ? '#ef4444' : '#22c55e'};">
                    <div><strong>[${d.division.toUpperCase()}]</strong> ${d.title}<br/>
                    ${d.desc || ''}<br/>
                    <small>🕒 ${ts.toLocaleString('id-ID')} | ${late}</small>
                    ${d.imageUrl ? `<br/><a href="${d.imageUrl}" target="_blank">📷 Lihat Foto</a>` : ''}
                    </div>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat kegiatan.'; }
}

// ============================================================
// TAB KEUANGAN
// ============================================================
async function loadKetuaFinances() {
    const el = document.getElementById('ketuaTabFinances');
    try {
        const q = query(collection(db, 'finances'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada transaksi keuangan.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const typeLabel = d.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran';
            const color = d.type === 'income' ? '#22c55e' : '#ef4444';
            html += `
                <div class="item-card" style="border-left-color: ${color};">
                    <div><strong>${typeLabel}</strong> ${d.desc}<br/>
                    Rp ${d.amount.toLocaleString()}<br/>
                    <small>${ts.toLocaleString('id-ID')}</small>
                    ${d.receiptUrl ? `<br/><a href="${d.receiptUrl}" target="_blank">📎 Lihat Nota</a>` : ''}
                    </div>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat keuangan.'; }
}

// ============================================================
// TAB LOGBOOK RAPAT
// ============================================================
async function loadKetuaMeetings() {
    const el = document.getElementById('ketuaTabMeetings');
    try {
        const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada logbook rapat.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.date?.toDate?.() || new Date();
            html += `
                <div class="item-card" style="border-left-color: #8b5cf6;">
                    <div><strong>${d.title}</strong><br/>
                    ${d.summary}<br/>
                    <small>🕒 ${ts.toLocaleString('id-ID')}</small>
                    </div>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat logbook.'; }
}

// ============================================================
// LEADERBOARD
// ============================================================
async function loadLeaderboard() {
    const el = document.getElementById('leaderboardList');
    try {
        const q = query(collection(db, 'users'), orderBy('points', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada user terdaftar.'; return; }
        let rank = 1;
        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            const email = data.email || 'unknown';
            const role = data.role || 'member';
            const points = data.points || 0;
            if (role !== 'member' && role !== 'superadmin') {
                html += `
                    <div class="leaderboard-item">
                        <span class="rank">#${rank}</span>
                        <span class="name">${email} <small>(${role})</small></span>
                        <span class="pts">⭐ ${points} poin</span>
                    </div>
                `;
                rank++;
            }
        });
        if (!html) html = 'Belum ada user dengan peran aktif.';
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat leaderboard.'; }
}

// ============================================================
// LIHAT PASSWORD ANGGOTA (Khusus Ketua / Super Admin)
// ============================================================
async function loadUserPasswords() {
    const el = document.getElementById('userPasswordList');
    try {
        const snap = await getDocs(collection(db, 'users'));
        if (snap.empty) { el.innerHTML = 'Belum ada user terdaftar.'; return; }
        let html = `
            <table class="user-password-table">
                <thead>
                    <tr><th>Email</th><th>Role</th><th>Password</th><th>Aksi</th></tr>
                </thead>
                <tbody>
        `;
        snap.forEach(doc => {
            const data = doc.data();
            const email = data.email || 'unknown';
            const role = data.role || 'member';
            let decrypted = 'Tidak tersimpan';
            if (data.passwordEncrypted) {
                try {
                    decrypted = decryptPassword(data.passwordEncrypted);
                } catch(e) { decrypted = '❌ Error'; }
            }
            html += `
                <tr>
                    <td>${email}</td>
                    <td>${role}</td>
                    <td><strong>${decrypted}</strong></td>
                    <td><button class="btn-reset" onclick="window.resetUserPassword('${doc.id}')">🔄 Reset</button></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat daftar password.'; }
}

// ============================================================
// RESET PASSWORD USER (oleh Ketua)
// ============================================================
export async function resetUserPassword(uid) {
    if (!confirm('Yakin akan mereset password user ini?')) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const email = userDoc.data().email;
        await sendPasswordResetEmail(auth, email);
        alert(`✅ Email reset telah dikirim ke ${email}`);
    } catch (e) {
        alert('Gagal reset password: ' + e.message);
    }
}

// Ekspos fungsi ke window
window.setDeadline = setDeadline;
window.switchKetuaTab = switchKetuaTab;
window.resetUserPassword = resetUserPassword;
