import { db, currentUser } from '../app.js';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc, addDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { addPoints, exportToWord } from '../utils.js';

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
        <button class="btn-export" onclick="window.exportWordToDoc()">📄 Cetak ke Word</button>
        <div id="sekretarisAllActivities">Memuat semua kegiatan...</div>
    `;
    loadMeetings();
    loadAllActivitiesForSekretaris();
}

// Fungsi load semua kegiatan dengan tombol edit
async function loadAllActivitiesForSekretaris() {
    const el = document.getElementById('sekretarisAllActivities');
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan.'; return; }
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

// Edit kegiatan
export async function editActivity(docId) {
    if (!currentUser || currentUser.role !== 'sekretaris') {
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

// Export ke Word (panggil dari utils.js)
export async function exportWordToDoc() {
    const { exportActivitiesToWord } = await import('../utils.js');
    exportActivitiesToWord();
}

// ... fungsi lain (loadMeetings, submitMeeting) sama seperti sebelumnya
