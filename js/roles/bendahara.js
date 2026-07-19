// ============================================================
// BENDAHARA.JS
// ============================================================

import { db, currentUser } from '../app.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    doc, 
    updateDoc 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
import { storage } from '../app.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
import { addPoints } from '../utils.js';

// ============================================================
// RENDER HALAMAN BENDAHARA
// ============================================================
export function renderBendahara(container) {
    container.innerHTML = `
        <div class="flex-row">
            <div class="stat-box"><h4>💵 Total Pemasukan</h4><p id="totalIncome">Rp 0</p></div>
            <div class="stat-box"><h4>💸 Total Pengeluaran</h4><p id="totalExpense">Rp 0</p></div>
            <div class="stat-box"><h4>💰 Saldo</h4><p id="totalBalance">Rp 0</p></div>
        </div>
        <hr/>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
            <span class="tab active" onclick="window.switchFinanceTab('income', this)">➕ Pemasukan</span>
            <span class="tab" onclick="window.switchFinanceTab('expense', this)">➖ Pengeluaran + Nota</span>
        </div>
        <div id="financeForm">
            <div class="form-group"><label>Deskripsi</label><input id="finDesc" placeholder="Keterangan" /></div>
            <div class="form-group"><label>Jumlah (Rp)</label><input id="finAmount" type="number" placeholder="0" /></div>
            <div id="receiptField" style="display:none;"><div class="form-group"><label>Foto Nota</label><input type="file" id="finReceipt" accept="image/*" /></div></div>
            <button class="btn-primary" onclick="window.submitFinance('income')">Tambah Pemasukan</button>
            <button class="btn-primary" onclick="window.submitFinance('expense')" style="background:#dc2626;">Tambah Pengeluaran</button>
        </div>
        <hr/>
        <h4>📜 Riwayat Keuangan</h4>
        <div id="financeList">Memuat...</div>
    `;
    loadFinances();
}

// ============================================================
// FUNGSI TAB
// ============================================================
export function switchFinanceTab(type, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('receiptField').style.display = (type === 'expense') ? 'block' : 'none';
    const btns = document.querySelectorAll('#financeForm .btn-primary');
    btns.forEach(b => b.style.display = 'none');
    if (type === 'income') document.querySelector('#financeForm .btn-primary:first-of-type').style.display = 'inline-block';
    else document.querySelector('#financeForm .btn-primary:last-of-type').style.display = 'inline-block';
}

// ============================================================
// SUBMIT KEUANGAN
// ============================================================
export async function submitFinance(type) {
    const desc = document.getElementById('finDesc').value.trim();
    const amount = parseInt(document.getElementById('finAmount').value);
    if (!desc || isNaN(amount) || amount <= 0) { alert('Isi deskripsi dan jumlah dengan benar!'); return; }

    let receiptUrl = '';
    if (type === 'expense') {
        const file = document.getElementById('finReceipt').files[0];
        if (!file) { alert('Upload foto nota untuk pengeluaran!'); return; }
        const path = `receipts/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        receiptUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'finances'), {
        type: type,
        desc: desc,
        amount: amount,
        receiptUrl: receiptUrl,
        timestamp: new Date(),
        uid: currentUser.uid
    });

    await addPoints(currentUser.uid, 1);

    alert('Data keuangan berhasil! Poin +1');
    document.getElementById('finDesc').value = '';
    document.getElementById('finAmount').value = '';
    document.getElementById('finReceipt').value = '';
    loadFinances();
}

// ============================================================
// LOAD FINANCES
// ============================================================
async function loadFinances() {
    const q = query(collection(db, 'finances'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    let totalIncome = 0, totalExpense = 0;
    let html = '';
    snap.forEach(doc => {
        const d = doc.data();
        const ts = d.timestamp?.toDate?.() || new Date();
        if (d.type === 'income') totalIncome += d.amount;
        else totalExpense += d.amount;

        html += `
            <div class="item-card" style="border-left-color: ${d.type==='income'?'#22c55e':'#ef4444'};">
                <div><strong>${d.type === 'income' ? '📈' : '📉'} ${d.desc}</strong><br/>
                Rp ${d.amount.toLocaleString()} - ${d.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}<br/>
                <small>${ts.toLocaleString('id-ID')}</small>
                ${d.receiptUrl ? `<br/><a href="${d.receiptUrl}" target="_blank">📎 Lihat Nota</a>` : ''}
                </div>
            </div>
        `;
    });
    document.getElementById('totalIncome').innerText = `Rp ${totalIncome.toLocaleString()}`;
    document.getElementById('totalExpense').innerText = `Rp ${totalExpense.toLocaleString()}`;
    document.getElementById('totalBalance').innerText = `Rp ${(totalIncome - totalExpense).toLocaleString()}`;
    document.getElementById('financeList').innerHTML = html || 'Belum ada transaksi.';
}

// Ekspos fungsi ke window
window.switchFinanceTab = switchFinanceTab;
window.submitFinance = submitFinance;
