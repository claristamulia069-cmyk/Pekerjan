// ============================================================
// SIE.JS - Untuk Acara, Logistik, Akademi, Dekdok
// ============================================================

import { db, currentUser } from '../app.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    doc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { storage } from '../app.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
import { addPoints } from '../utils.js';

// ============================================================
// RENDER HALAMAN SIE
// ============================================================
export function renderSie(container, division) {
    container.innerHTML = `
        <div class="deadline-set" id="deadlineInfo-${division}">⏳ Memuat deadline...</div>
        <h4>➕ Tambah Kegiatan</h4>
        <div class="form-group"><label>Judul</label><input id="actTitle" placeholder="Nama kegiatan" /></div>
        <div class="form-group"><label>Deskripsi</label><textarea id="actDesc" rows="2"></textarea></div>
        <div class="form-group"><label>Foto Kegiatan</label><input type="file" id="actImage" accept="image/*" /></div>
        <button class="btn-primary" onclick="window.submitActivity('${division}')">📤 Kirim Kegiatan</button>
        <hr style="margin:30px 0;" />
        <h4>📋 Daftar Kegiatan</h4>
        <div id="activityList-${division}">Memuat...</div>
    `;
    loadDeadlineInfo(division);
    loadActivities(division);
}

// ============================================================
// LOAD DEADLINE
// ============================================================
async function loadDeadlineInfo(division) {
    const el = document.getElementById(`deadlineInfo-${division}`);
    try {
        const docSnap = await getDoc(doc(db, 'deadlines', division));
        if (docSnap.exists()) {
            const d = docSnap.data().deadlineTime.toDate ? docSnap.data().deadlineTime.toDate() : new Date(docSnap.data().deadlineTime);
            el.innerHTML = `⏰ Deadline: <strong>${d.toLocaleString('id-ID')}</strong>. Upload lewat waktu akan <span style="color:#b91c1c;">TERLAMBAT</span>.`;
        } else {
            el.innerHTML = '⚠️ Deadline belum diatur oleh Ketua.';
        }
    } catch (e) { el.innerHTML = 'Gagal load deadline.'; }
}

// ============================================================
// LOAD KEGIATAN
// ============================================================
async function loadActivities(division) {
    const el = document.getElementById(`activityList-${division}`);
    try {
        const q = query(
            collection(db, 'activities'),
            where('division', '==', division),
            orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        if (snap.empty) { el.innerHTML = 'Belum ada kegiatan.'; return; }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const isLate = d.isLate || false;
            const statusHtml = isLate ? '<span class="late">⛔ TERLAMBAT (evaluasi)</span>' : '<span class="ontime">✅ Tepat Waktu</span>';
            html += `
                <div class="item-card">
                    ${d.imageUrl ? `<img src="${d.imageUrl}" />` : '<div style="width:80px; background:#e2e8f0; border-radius:8px; text-align:center; padding:30px 0;">📷</div>'}
                    <div style="flex:1;">
                        <strong>${d.title}</strong><br/>
                        <small>${d.desc || ''}</small><br/>
                        <small>🕒 ${ts.toLocaleString('id-ID')}</small> ${statusHtml}
                    </div>
                </div>
            `;
        });
        el.innerHTML = html;
    } catch (e) { el.innerHTML = 'Error loading data.'; }
}

// ============================================================
// SUBMIT KEGIATAN
// ============================================================
export async function submitActivity(division) {
    const title = document.getElementById('actTitle').value.trim();
    const desc = document.getElementById('actDesc').value.trim();
    const fileInput = document.getElementById('actImage');
    if (!title) { alert('Judul wajib diisi!'); return; }

    // Cek deadline
    let isLate = false;
    try {
        const docSnap = await getDoc(doc(db, 'deadlines', division));
        if (docSnap.exists()) {
            const deadline = docSnap.data().deadlineTime.toDate ? docSnap.data().deadlineTime.toDate() : new Date(docSnap.data().deadlineTime);
            if (new Date() > deadline) isLate = true;
        }
    } catch (e) {}

    let imageUrl = '';
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const path = `activities/${division}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'activities'), {
        division: division,
        title: title,
        desc: desc,
        imageUrl: imageUrl,
        timestamp: new Date(),
        isLate: isLate,
        uid: currentUser.uid
    });

    await addPoints(currentUser.uid, 1);

    alert('Kegiatan berhasil! ' + (isLate ? '⚠️ TERLAMBAT! Dievaluasi.' : '✅ Tepat waktu.') + ' Poin +1');
    document.getElementById('actTitle').value = '';
    document.getElementById('actDesc').value = '';
    document.getElementById('actImage').value = '';
    loadActivities(division);
}

// Ekspos fungsi ke window
window.submitActivity = submitActivity;
