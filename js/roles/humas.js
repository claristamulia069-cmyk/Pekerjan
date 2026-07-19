// ============================================================
// HUMAS.JS
// ============================================================

import { db, currentUser } from '../app.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { storage } from '../app.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
import { addPoints } from '../utils.js';

// ============================================================
// RENDER HALAMAN HUMAS
// ============================================================
export function renderHumas(container) {
    container.innerHTML = `
        <h4>📢 Dokumentasi Humas</h4>
        <div class="form-group"><label>Judul Dokumentasi</label><input id="humasTitle" placeholder="Judul" /></div>
        <div class="form-group"><label>Deskripsi</label><textarea id="humasDesc" rows="2"></textarea></div>
        <div class="form-group"><label>Foto</label><input type="file" id="humasImage" accept="image/*" /></div>
        <button class="btn-primary" onclick="window.submitHumasActivity()">📤 Upload Dokumentasi</button>
        <hr/>
        <h4>📸 Galeri Dokumentasi (Semua Kegiatan)</h4>
        <div id="humasAllActivities">Memuat semua kegiatan...</div>
    `;
    loadHumasAllActivities();
}

// ============================================================
// SUBMIT DOKUMENTASI
// ============================================================
export async function submitHumasActivity() {
    const title = document.getElementById('humasTitle').value.trim();
    const desc = document.getElementById('humasDesc').value.trim();
    const fileInput = document.getElementById('humasImage');
    if (!title) { alert('Judul wajib diisi!'); return; }
    let imageUrl = '';
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const path = `activities/humas/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
    }
    await addDoc(collection(db, 'activities'), {
        division: 'humas',
        title: title,
        desc: desc,
        imageUrl: imageUrl,
        timestamp: new Date(),
        isLate: false,
        uid: currentUser.uid
    });
    await addPoints(currentUser.uid, 1);
    alert('Dokumentasi berhasil! Poin +1');
    document.getElementById('humasTitle').value = '';
    document.getElementById('humasDesc').value = '';
    document.getElementById('humasImage').value = '';
    loadHumasAllActivities();
}

// ============================================================
// LOAD SEMUA KEGIATAN
// ============================================================
async function loadHumasAllActivities() {
    const el = document.getElementById('humasAllActivities');
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            html += `
                <div class="item-card" style="border-left-color: #f59e0b;">
                    <div><strong>[${d.division.toUpperCase()}]</strong> ${d.title}<br/>
                    ${d.desc || ''}<br/>
                    <small>🕒 ${ts.toLocaleString('id-ID')}</small>
                    ${d.imageUrl ? `<br/><a href="${d.imageUrl}" target="_blank">📷 Lihat Foto</a>` : ''}
                    </div>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = 'Gagal memuat data.'; }
}

// Ekspos fungsi ke window
window.submitHumasActivity = submitHumasActivity;
