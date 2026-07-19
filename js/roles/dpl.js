// ============================================================
// DPL.JS - Dashboard Monitoring
// ============================================================

import { db } from '../app.js';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';

// ============================================================
// RENDER HALAMAN DPL
// ============================================================
export function renderDpl(container) {
    container.innerHTML = `
        <div class="ketua-stat" id="dplStats">
            <div class="stat"><div class="number" id="dplTotalUser">0</div><div class="label">👤 Total User</div></div>
            <div class="stat"><div class="number" id="dplTotalAct">0</div><div class="label">📋 Total Kegiatan</div></div>
            <div class="stat"><div class="number" id="dplTotalFin">Rp 0</div><div class="label">💰 Total Keuangan</div></div>
            <div class="stat"><div class="number" id="dplTotalMeet">0</div><div class="label">📝 Total Rapat</div></div>
        </div>
        <div class="dpl-grid">
            <div>
                <h4>🕒 Log Login Terbaru</h4>
                <div id="dplLoginLogs">Memuat...</div>
            </div>
            <div>
                <h4>📋 Kegiatan Terbaru</h4>
                <div id="dplRecentActivities">Memuat...</div>
            </div>
            <div>
                <h4>💰 Keuangan Terbaru</h4>
                <div id="dplFinances">Memuat...</div>
            </div>
            <div>
                <h4>📝 Logbook Rapat</h4>
                <div id="dplMeetings">Memuat...</div>
            </div>
        </div>
    `;
    loadDplStats();
    loadDplLoginLogs();
    loadDplRecentActivities();
    loadDplFinances();
    loadDplMeetings();
}

// ============================================================
// FUNGSI LOAD DATA
// ============================================================
async function loadDplStats() {
    try {
        const userSnap = await getDocs(collection(db, 'users'));
        document.getElementById('dplTotalUser').innerText = userSnap.size;
        const actSnap = await getDocs(collection(db, 'activities'));
        document.getElementById('dplTotalAct').innerText = actSnap.size;
        const finSnap = await getDocs(collection(db, 'finances'));
        let total = 0;
        finSnap.forEach(doc => { total += doc.data().amount || 0; });
        document.getElementById('dplTotalFin').innerText = `Rp ${total.toLocaleString()}`;
        const meetSnap = await getDocs(collection(db, 'meetings'));
        document.getElementById('dplTotalMeet').innerText = meetSnap.size;
    } catch(e) { console.error(e); }
}

async function loadDplLoginLogs() {
    const el = document.getElementById('dplLoginLogs');
    try {
        const q = query(collection(db, 'login_logs'), orderBy('timestamp', 'desc'), limit(20));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada log login.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            html += `<div class="log-entry"><span>${d.email || 'unknown'}</span><span>${ts.toLocaleString('id-ID')}</span></div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat log.'; }
}

async function loadDplRecentActivities() {
    const el = document.getElementById('dplRecentActivities');
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(10));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            html += `<div class="item-card" style="border-left-color:#2563eb; padding:8px 12px;"><div><strong>[${d.division}]</strong> ${d.title}<br/><small>${ts.toLocaleString('id-ID')}</small></div></div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal.'; }
}

async function loadDplFinances() {
    const el = document.getElementById('dplFinances');
    try {
        const q = query(collection(db, 'finances'), orderBy('timestamp', 'desc'), limit(10));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada transaksi.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const color = d.type === 'income' ? '#22c55e' : '#ef4444';
            html += `<div class="item-card" style="border-left-color:${color}; padding:8px 12px;"><div><strong>${d.type === 'income' ? '📈' : '📉'}</strong> ${d.desc} - Rp ${d.amount.toLocaleString()}<br/><small>${ts.toLocaleString('id-ID')}</small></div></div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal.'; }
}

async function loadDplMeetings() {
    const el = document.getElementById('dplMeetings');
    try {
        const q = query(collection(db, 'meetings'), orderBy('date', 'desc'), limit(10));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada logbook.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.date?.toDate?.() || new Date();
            html += `<div class="item-card" style="border-left-color:#8b5cf6; padding:8px 12px;"><div><strong>${d.title}</strong><br/><small>${ts.toLocaleString('id-ID')}</small></div></div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal.'; }
}
