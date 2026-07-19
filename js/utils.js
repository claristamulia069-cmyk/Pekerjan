import { db } from './app.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';

const SALT = 'rahasiaPanitia2024';

// Enkripsi password
export function encryptPassword(password) {
    return btoa(password + SALT);
}

// Dekripsi password
export function decryptPassword(encrypted) {
    return atob(encrypted).replace(SALT, '');
}

// Tambah poin
export async function addPoints(uid, increment) {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            points: firebase.firestore.FieldValue.increment(increment)
        });
    } catch (e) {
        console.error('Gagal tambah poin:', e);
    }
}

// Export ke Word
export async function exportActivitiesToWord() {
    try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) {
            alert('Belum ada data untuk dicetak.');
            return;
        }
        let rows = '';
        let no = 1;
        snap.forEach(doc => {
            const d = doc.data();
            const ts = d.timestamp?.toDate?.() || new Date();
            const status = d.isLate ? 'TERLAMBAT' : 'TEPAT';
            rows += `
                <tr>
                    <td>${no}</td>
                    <td>${d.division.toUpperCase()}</td>
                    <td>${d.title}</td>
                    <td>${d.desc || ''}</td>
                    <td>${ts.toLocaleString('id-ID')}</td>
                    <td>${status}</td>
                </tr>
            `;
            no++;
        });

        const style = `
            <style>
                table { border-collapse: collapse; width: 100%; font-family: Arial; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background: #2563eb; color: white; }
            </style>
        `;
        const htmlContent = `
            <html>
                <head><meta charset="UTF-8">${style}</head>
                <body>
                    <h2>📋 Laporan Kegiatan Panitia</h2>
                    <p>Dicetak pada ${new Date().toLocaleString('id-ID')}</p>
                    <table>
                        <thead>
                            <tr><th>No</th><th>Divisi</th><th>Judul</th><th>Deskripsi</th><th>Tanggal</th><th>Status</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Laporan_Kegiatan_${new Date().toISOString().slice(0,10)}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (e) {
        alert('Gagal mencetak: ' + e.message);
    }
}
