// ============================================================
// SEKRETARIS.JS
// ============================================================

import { db, currentUser } from '../app.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { addPoints, exportActivitiesToWord } from '../utils.js';

// ============================================================
// RENDER HALAMAN SEKRETARIS
// ============================================================
export function renderSekretaris(container) {
    container.innerHTML = `
        <h4>📝 Input Logbook / Hasil Rapat</h4>
        <div class="form-group"><label>Judul Rapat / Kegiatan</label><input id="meetingTitle" /></div>
        <div class="form-group"><label>Kesimpulan / Hasil</label><textarea id="meetingSummary" rows="3"></textarea></div>
        <button class="btn-primary" onclick="window.submitMeeting()">Simpan Logbook</button>
        <hr/>
        <h4>📖 Logbook Rapat</h4>
        <div id="meetingList">Memuat...</div>
        <hr/>
        <h4>📋 REKAP SEMUA KEGIATAN SIE</h4>
        <button class="btn-export" onclick="window.exportWord()">📄 Cetak ke Word</button>
        <div id="sekretarisAllActivities">Memuat semua kegiatan...</div>
    `;
    loadMeetings();
    loadAllActivitiesForSekretaris();
}

// ============================================================
// LOGBOOK RAPAT
// ============================================================
export async function submitMeeting() {
    const title = document.getElementById('meetingTitle').value.trim();
    const summary = document.getElementById('meetingSummary').value.trim();
    if (!title || !summary) { alert('Isi judul dan kesimpulan!'); return; }
    await addDoc(collection(db, 'meetings'), {
        title: title,
        summary: summary,
        date: new Date(),
        uid: currentUser.uid
    });
    await addPoints(currentUser.uid, 1);
    alert('Logbook tersimpan! Poin +1');
    document.getElementById('meetingTitle').value = '';
    document.getElementById('meetingSummary').value = '';
    loadMeetings();
}

async function loadMeetings() {
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    let html = '';
    snap.forEach(doc => {
        const d = doc.data();
        const ts = d.date?.toDate?.() || new Date();
        html += `<div class="item-card"><strong>${d.title}</strong><br/>${d.summary}<br/><small>${ts.toLocaleString('id-ID')}</small></div>`;
    });
    document.getElementById('meetingList').innerHTML = html || 'Belum ada logbook.';
}

// ============================================================
// REKAP KEGIATAN + EDIT
// ============================================================
async function loadAllActivitiesForSekretaris() {
    const el = document.getElementById('sekretarisAllActivities');
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan dari sie manapun.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const late = d.isLate ? '⚠️ TERLAMBAT' : '✅ Tepat';
            html += `
                <div class="item-card" style="border-left-color:#8b5cf6;">
                    <div style="flex:1;">
                        <strong>[${d.division.toUpperCase()}]</strong> ${d.title}<br/>
                        ${d.desc || ''}<br/>
                        <small>🕒 ${ts.toLocaleString('id-ID')} | ${late}</small>
                        ${d.imageUrl ? `<br/><a href="${d.imageUrl}" target="_blank">📷 Lihat Foto</a>` : ''}
                    </div>
                    <button class="edit-btn" onclick="window.editActivity('${doc.id}')">✏️ Edit</button>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat data.'; }
}

// ============================================================
// EDIT KEGIATAN
// ============================================================
export async function editActivity(docId) {
    if (currentUser.role !== 'sekretaris' && currentUser.role !== 'superadmin') {
        alert('Hanya Sekretaris yang bisa mengedit.');
        return;
    }
    try {
        const docRef = doc(db, 'activities', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) { alert('Data tidak ditemukan.'); return; }
        const data = docSnap.data();
        const newTitle = prompt('Edit Judul:', data.title);
        if (newTitle === null) return;
        const newDesc = prompt('Edit Deskripsi:', data.desc || '');
        if (newDesc === null) return;
        await updateDoc(docRef, {
            title: newTitle.trim(),
            desc: newDesc.trim()
        });
        alert('✅ Kegiatan berhasil diperbarui!');
        loadAllActivitiesForSekretaris();
    } catch (e) {
        alert('Gagal mengedit: ' + e.message);
    }
}

// ============================================================
// EXPORT KE WORD
// ============================================================
export async function exportWord() {
    await exportActivitiesToWord();
}

// Ekspos fungsi ke window
window.submitMeeting = submitMeeting;
window.editActivity = editActivity;
window.exportWord = exportWord;
