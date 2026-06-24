// =============================================
//  JMDFARM — app.js
//  Semua data disimpan di localStorage agar
//  tidak hilang saat halaman di-refresh
// =============================================

// ---------- USERS ----------
const USERS = {
  admin:    { pass: 'admin123', name: 'Admin' },
  operator: { pass: 'op123',    name: 'Operator' }
};

// ---------- STATE ----------
let currentUser = null;
let editingId   = null;
let editingType = null;
let deleteTarget = null;
let lapYear     = 2025;

// ---------- DB (localStorage) ----------
function loadDB() {
  const def = {
    'sapi-masuk': [
      { id:1, tanggal:'2025-06-01', kode:'SM-001', nama:'Sapi Limousin A1',   jenis:'Limousin',  bobot:280, harga:18000000, pemasok:'Pak Hendra', keterangan:'Kondisi sehat' },
      { id:2, tanggal:'2025-06-03', kode:'SM-002', nama:'Sapi Simmental B2',  jenis:'Simmental', bobot:310, harga:21000000, pemasok:'Bu Sari',     keterangan:'' },
      { id:3, tanggal:'2025-06-08', kode:'SM-003', nama:'Sapi PO C3',         jenis:'PO',        bobot:250, harga:14500000, pemasok:'Pak Hendra',  keterangan:'Baru disapih' }
    ],
    'sapi-keluar': [
      { id:1, tanggal:'2025-06-10', kode:'SK-001', nama:'Sapi Limousin A1',  jenis:'Limousin',  bobot_awal:280, bobot_jual:390, harga:29000000, pembeli:'RPH Surabaya',   no_hp:'081234567890', alamat:'Jl. Raya Surabaya No.12, Surabaya', keterangan:'Laba baik' },
      { id:2, tanggal:'2025-06-15', kode:'SK-002', nama:'Sapi Simmental X1', jenis:'Simmental', bobot_awal:300, bobot_jual:420, harga:33000000, pembeli:'Pak Budi Santoso', no_hp:'085678901234', alamat:'Jl. Merdeka No.5, Malang',           keterangan:'' }
    ],
    'operasional': [
      { id:1, tanggal:'2025-06-01', kategori:'Pakan',      nama:'Rumput Gajah',       jumlah:500, satuan:'kg',    harga_satuan:1500,  total:750000,  keterangan:'' },
      { id:2, tanggal:'2025-06-02', kategori:'Kesehatan',  nama:'Vitamin B-Kompleks', jumlah:10,  satuan:'botol', harga_satuan:45000, total:450000,  keterangan:'Suplemen rutin' },
      { id:3, tanggal:'2025-06-04', kategori:'Pakan',      nama:'Konsentrat Sapi',    jumlah:200, satuan:'kg',    harga_satuan:4500,  total:900000,  keterangan:'' },
      { id:4, tanggal:'2025-06-06', kategori:'Obat',       nama:'Ivermectin',         jumlah:5,   satuan:'vial',  harga_satuan:35000, total:175000,  keterangan:'Anti parasit' },
      { id:5, tanggal:'2025-06-07', kategori:'Operasional',nama:'Solar mesin pompa',  jumlah:20,  satuan:'liter', harga_satuan:8500,  total:170000,  keterangan:'' }
    ]
  };
  const keys = ['sapi-masuk','sapi-keluar','operasional'];
  const db = {};
  keys.forEach(k => {
    const saved = localStorage.getItem('jmdfarm_'+k);
    db[k] = saved ? JSON.parse(saved) : def[k];
  });
  return db;
}

function saveDB(type) {
  localStorage.setItem('jmdfarm_'+type, JSON.stringify(DB[type]));
}

function maxId(type) {
  if (!DB[type].length) return 0;
  return Math.max(...DB[type].map(x => x.id));
}

let DB = loadDB();

// ---------- HELPERS ----------
const fmt  = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtN = n => Number(n).toLocaleString('id-ID');
const today = () => new Date().toISOString().split('T')[0];
const getYear = d => d ? d.substring(0,4) : '';
const $ = id => document.getElementById(id);

// ---------- LOGIN ----------
function doLogin() {
  const u = $('login-user').value.trim();
  const p = $('login-pass').value;
  const err = $('login-err');
  if (USERS[u] && USERS[u].pass === p) {
    currentUser = { username: u, ...USERS[u] };
    $('login-page').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('user-display').textContent = currentUser.name;
    $('user-avatar').textContent  = currentUser.name[0];
    $('today-date').textContent   = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    err.classList.add('hidden');
    showPage('dashboard');
    closeSidebar();
  } else {
    err.classList.remove('hidden');
  }
}

function doLogout() {
  currentUser = null;
  $('app').classList.add('hidden');
  $('login-page').classList.remove('hidden');
  $('login-user').value = '';
  $('login-pass').value = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && $('login-page') && !$('login-page').classList.contains('hidden')) doLogin();
});

// ---------- SIDEBAR MOBILE ----------
function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('sidebar-overlay').classList.toggle('hidden');
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebar-overlay').classList.add('hidden');
}

// ---------- PAGE NAV ----------
const PAGES = ['dashboard','sapi-masuk','sapi-keluar','operasional','laporan'];

function showPage(p) {
  PAGES.forEach(pg => {
    $('page-'+pg).classList.add('hidden');
    const nav = $('nav-'+pg);
    if (nav) nav.classList.remove('active');
  });
  $('page-'+p).classList.remove('hidden');
  const nav = $('nav-'+p);
  if (nav) nav.classList.add('active');

  // update mobile bottom nav
  document.querySelectorAll('.bnav-item').forEach(el => el.classList.remove('active'));
  const bNav = $('bnav-'+p);
  if (bNav) bNav.classList.add('active');

  if (p === 'dashboard') renderDashboard();
  else if (p === 'laporan') renderLaporan();
  else renderTable(p, '');

  closeSidebar();
  window.scrollTo(0,0);
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const sm = DB['sapi-masuk'], sk = DB['sapi-keluar'], op = DB['operasional'];
  const totalBeli = sm.reduce((a,x) => a + Number(x.harga), 0);
  const totalJual = sk.reduce((a,x) => a + Number(x.harga), 0);
  const totalOp   = op.reduce((a,x) => a + Number(x.total), 0);
  const profit    = totalJual - totalBeli - totalOp;

  $('dash-summary').innerHTML = `
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-trending-up"></i> Estimasi Laba/Rugi</div>
      <div class="summary-value ${profit >= 0 ? 'income' : 'expense'}">${fmt(profit)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-circle-arrow-up-right"></i> Total Penjualan</div>
      <div class="summary-value income">${fmt(totalJual)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-circle-arrow-down-right"></i> Total Pembelian</div>
      <div class="summary-value expense">${fmt(totalBeli)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-shopping-cart"></i> Total Operasional</div>
      <div class="summary-value expense">${fmt(totalOp)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-cow"></i> Sapi Masuk</div>
      <div class="summary-value cows">${sm.length} ekor</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-users"></i> Database Pembeli</div>
      <div class="summary-value neutral">${sk.length} kontak</div>
    </div>
  `;

  const rSM = sm.slice(-4).reverse().map(x => `
    <div class="recent-item">
      <div><div class="recent-item-name">${x.nama}</div><div class="recent-item-sub">${x.tanggal} · ${x.pemasok}</div></div>
      <div class="amount-neg">-${fmt(x.harga)}</div>
    </div>`).join('');

  const rSK = sk.slice(-4).reverse().map(x => `
    <div class="recent-item">
      <div><div class="recent-item-name">${x.nama}</div><div class="recent-item-sub">${x.tanggal} · ${x.pembeli}</div></div>
      <div class="amount-pos">+${fmt(x.harga)}</div>
    </div>`).join('');

  const rOP = op.slice(-4).reverse().map(x => `
    <div class="recent-item">
      <div><div class="recent-item-name">${x.nama}</div><div class="recent-item-sub">${x.tanggal} · ${x.kategori}</div></div>
      <div class="amount-neg">-${fmt(x.total)}</div>
    </div>`).join('');

  $('dash-recent').innerHTML = `
    <div class="recent-card">
      <div class="recent-card-header"><i class="ti ti-circle-arrow-down-right" style="color:#A32D2D"></i> Pembelian Terbaru</div>
      ${rSM || '<div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div>'}
    </div>
    <div class="recent-card">
      <div class="recent-card-header"><i class="ti ti-circle-arrow-up-right" style="color:#27500A"></i> Penjualan Terbaru</div>
      ${rSK || '<div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div>'}
    </div>
    <div class="recent-card span-2">
      <div class="recent-card-header"><i class="ti ti-shopping-cart" style="color:#854F0B"></i> Operasional Terbaru</div>
      ${rOP || '<div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div>'}
    </div>
  `;
}

// ---------- TABLES ----------
function renderTable(type, search='') {
  const q = (search||'').toLowerCase();
  const data = DB[type].filter(x => Object.values(x).some(v => String(v).toLowerCase().includes(q)));
  const countEl = $('count-'+type);
  if (countEl) countEl.textContent = data.length + ' data';

  let html = '';

  if (type === 'sapi-masuk') {
    html = `<div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Kode</th><th>Nama Sapi</th><th>Jenis</th><th>Bobot</th><th>Harga Beli</th><th>Pemasok</th><th>Aksi</th></tr></thead>
      <tbody>`;
    if (!data.length) html += `<tr><td colspan="8"><div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>`;
    else data.forEach(x => { html += `<tr>
      <td>${x.tanggal}</td>
      <td><span class="badge badge-blue">${x.kode}</span></td>
      <td>${x.nama}</td>
      <td>${x.jenis}</td>
      <td>${fmtN(x.bobot)} kg</td>
      <td class="money-neg">${fmt(x.harga)}</td>
      <td>${x.pemasok}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="openEdit('sapi-masuk',${x.id})" title="Edit"><i class="ti ti-edit"></i></button>
        <button class="btn-del"  onclick="openDelete('sapi-masuk',${x.id})" title="Hapus"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`; });
    html += `</tbody></table></div>`;

  } else if (type === 'sapi-keluar') {
    html = `<div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Kode</th><th>Nama Sapi</th><th>Bobot Jual</th><th>Harga Jual</th><th>Pembeli</th><th>No. HP</th><th>Alamat</th><th>Aksi</th></tr></thead>
      <tbody>`;
    if (!data.length) html += `<tr><td colspan="9"><div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>`;
    else data.forEach(x => { html += `<tr>
      <td>${x.tanggal}</td>
      <td><span class="badge badge-green">${x.kode}</span></td>
      <td>${x.nama}</td>
      <td>${fmtN(x.bobot_jual)} kg</td>
      <td class="money-pos">${fmt(x.harga)}</td>
      <td><strong>${x.pembeli}</strong></td>
      <td><a href="tel:${x.no_hp}" class="hp-link"><i class="ti ti-phone"></i>${x.no_hp}</a></td>
      <td class="text-muted">${x.alamat}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="openEdit('sapi-keluar',${x.id})" title="Edit"><i class="ti ti-edit"></i></button>
        <button class="btn-del"  onclick="openDelete('sapi-keluar',${x.id})" title="Hapus"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`; });
    html += `</tbody></table></div>`;

  } else if (type === 'operasional') {
    const catColor = { Pakan:'badge-green', Kesehatan:'badge-blue', Obat:'badge-red', Operasional:'badge-amber' };
    html = `<div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Kategori</th><th>Nama Barang</th><th>Jumlah</th><th>Harga Satuan</th><th>Total</th><th>Keterangan</th><th>Aksi</th></tr></thead>
      <tbody>`;
    if (!data.length) html += `<tr><td colspan="8"><div class="empty-state"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>`;
    else data.forEach(x => { html += `<tr>
      <td>${x.tanggal}</td>
      <td><span class="badge ${catColor[x.kategori]||'badge-amber'}">${x.kategori}</span></td>
      <td>${x.nama}</td>
      <td>${fmtN(x.jumlah)} ${x.satuan}</td>
      <td>${fmt(x.harga_satuan)}</td>
      <td class="money-neg">${fmt(x.total)}</td>
      <td class="text-muted">${x.keterangan||'-'}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="openEdit('operasional',${x.id})" title="Edit"><i class="ti ti-edit"></i></button>
        <button class="btn-del"  onclick="openDelete('operasional',${x.id})" title="Hapus"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`; });
    html += `</tbody></table></div>`;
  }

  $('table-'+type).innerHTML = html;
}

// ---------- LAPORAN ----------
function setYear(y) {
  lapYear = y;
  ['2024','2025','2026','2027','semua'].forEach(yr => {
    const el = $('yr-'+yr);
    if (el) el.classList.toggle('active', String(yr) === String(y));
  });
  renderLaporan();
}

function filterByYear(arr) {
  if (lapYear === 'semua') return arr;
  return arr.filter(x => getYear(x.tanggal) === String(lapYear));
}

function renderLaporan() {
  const sm = filterByYear(DB['sapi-masuk']);
  const sk = filterByYear(DB['sapi-keluar']);
  const op = filterByYear(DB['operasional']);
  const totalBeli = sm.reduce((a,x) => a+Number(x.harga), 0);
  const totalJual = sk.reduce((a,x) => a+Number(x.harga), 0);
  const totalOp   = op.reduce((a,x) => a+Number(x.total), 0);
  const profit    = totalJual - totalBeli - totalOp;
  const label     = lapYear === 'semua' ? 'Semua Tahun' : 'Tahun ' + lapYear;

  $('lap-summary').innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Periode</div>
      <div class="summary-value cows" style="font-size:15px">${label}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-circle-arrow-up-right"></i> Total Pemasukan</div>
      <div class="summary-value income">${fmt(totalJual)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-circle-arrow-down-right"></i> Pengeluaran Sapi</div>
      <div class="summary-value expense">${fmt(totalBeli)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-shopping-cart"></i> Pengeluaran Operasional</div>
      <div class="summary-value expense">${fmt(totalOp)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label"><i class="ti ti-trending-up"></i> Laba / Rugi Bersih</div>
      <div class="summary-value ${profit >= 0 ? 'income' : 'expense'}">${fmt(profit)}</div>
    </div>
  `;

  // Tabel Pembelian
  let smH = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama Sapi</th><th>Jenis</th><th>Harga Beli</th></tr></thead><tbody>`;
  if (!sm.length) smH += `<tr><td colspan="4"><div class="empty-state">Tidak ada data</div></td></tr>`;
  else {
    sm.forEach(x => { smH += `<tr><td>${x.tanggal}</td><td>${x.nama}</td><td>${x.jenis}</td><td class="money-neg">${fmt(x.harga)}</td></tr>`; });
    smH += `<tr class="total-row"><td colspan="3">Total (${sm.length} ekor)</td><td class="money-neg">${fmt(totalBeli)}</td></tr>`;
  }
  smH += `</tbody></table></div>`;
  $('lap-table-sm').innerHTML = smH;

  // Tabel Penjualan
  let skH = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama Sapi</th><th>Pembeli</th><th>No. HP</th><th>Harga Jual</th></tr></thead><tbody>`;
  if (!sk.length) skH += `<tr><td colspan="5"><div class="empty-state">Tidak ada data</div></td></tr>`;
  else {
    sk.forEach(x => { skH += `<tr><td>${x.tanggal}</td><td>${x.nama}</td><td>${x.pembeli}</td><td>${x.no_hp}</td><td class="money-pos">${fmt(x.harga)}</td></tr>`; });
    skH += `<tr class="total-row"><td colspan="4">Total (${sk.length} ekor)</td><td class="money-pos">${fmt(totalJual)}</td></tr>`;
  }
  skH += `</tbody></table></div>`;
  $('lap-table-sk').innerHTML = skH;

  // Tabel Operasional
  let opH = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Nama Barang</th><th>Jumlah</th><th>Total</th></tr></thead><tbody>`;
  if (!op.length) opH += `<tr><td colspan="5"><div class="empty-state">Tidak ada data</div></td></tr>`;
  else {
    op.forEach(x => { opH += `<tr><td>${x.tanggal}</td><td>${x.kategori}</td><td>${x.nama}</td><td>${fmtN(x.jumlah)} ${x.satuan}</td><td class="money-neg">${fmt(x.total)}</td></tr>`; });
    opH += `<tr class="total-row"><td colspan="4">Total (${op.length} item)</td><td class="money-neg">${fmt(totalOp)}</td></tr>`;
  }
  opH += `</tbody></table></div>`;
  $('lap-table-op').innerHTML = opH;
}

function doPrint() {
  const label = lapYear === 'semua' ? 'Semua Tahun' : lapYear;
  $('print-year-label').textContent = label;
  $('print-date-label').textContent = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  window.print();
}

// ---------- MODAL FORMS ----------
const JENIS_OPTS = ['Limousin','Simmental','PO','Brahman','Angus','Sapi Lokal'];
const KAT_OPTS   = ['Pakan','Kesehatan','Obat','Operasional'];
const SAT_OPTS   = ['kg','liter','botol','vial','sak','pcs','unit'];

function selOpts(opts, val) {
  return opts.map(o => `<option ${val===o?'selected':''}>${o}</option>`).join('');
}

function getFormFields(type, data) {
  if (type === 'sapi-masuk') return `
    <div class="modal-grid">
      <div class="form-group"><label>Tanggal</label><input type="date" id="f-tanggal" value="${data?.tanggal||today()}" /></div>
      <div class="form-group"><label>Kode Sapi</label><input type="text" id="f-kode" value="${data?.kode||''}" placeholder="SM-001" /></div>
      <div class="form-group full"><label>Nama Sapi</label><input type="text" id="f-nama" value="${data?.nama||''}" placeholder="Nama / ID Sapi" /></div>
      <div class="form-group"><label>Jenis / Ras</label><select id="f-jenis">${selOpts(JENIS_OPTS, data?.jenis)}</select></div>
      <div class="form-group"><label>Bobot Awal (kg)</label><input type="number" id="f-bobot" value="${data?.bobot||''}" placeholder="0" /></div>
      <div class="form-group"><label>Harga Beli (Rp)</label><input type="number" id="f-harga" value="${data?.harga||''}" placeholder="0" /></div>
      <div class="form-group"><label>Pemasok</label><input type="text" id="f-pemasok" value="${data?.pemasok||''}" placeholder="Nama pemasok" /></div>
      <div class="form-group full"><label>Keterangan</label><textarea id="f-keterangan">${data?.keterangan||''}</textarea></div>
    </div>`;

  if (type === 'sapi-keluar') return `
    <div class="modal-grid">
      <div class="modal-section-label">Data Sapi</div>
      <div class="form-group"><label>Tanggal</label><input type="date" id="f-tanggal" value="${data?.tanggal||today()}" /></div>
      <div class="form-group"><label>Kode Sapi</label><input type="text" id="f-kode" value="${data?.kode||''}" placeholder="SK-001" /></div>
      <div class="form-group full"><label>Nama Sapi</label><input type="text" id="f-nama" value="${data?.nama||''}" placeholder="Nama / ID Sapi" /></div>
      <div class="form-group"><label>Jenis / Ras</label><select id="f-jenis">${selOpts(JENIS_OPTS, data?.jenis)}</select></div>
      <div class="form-group"><label>Bobot Awal (kg)</label><input type="number" id="f-bobot_awal" value="${data?.bobot_awal||''}" placeholder="0" /></div>
      <div class="form-group"><label>Bobot Jual (kg)</label><input type="number" id="f-bobot_jual" value="${data?.bobot_jual||''}" placeholder="0" /></div>
      <div class="form-group full"><label>Harga Jual (Rp)</label><input type="number" id="f-harga" value="${data?.harga||''}" placeholder="0" /></div>
      <div class="modal-section-label">Data Pembeli</div>
      <div class="form-group full"><label>Nama Pembeli / Instansi</label><input type="text" id="f-pembeli" value="${data?.pembeli||''}" placeholder="Nama lengkap atau nama perusahaan" /></div>
      <div class="form-group"><label>No. Handphone</label><input type="tel" id="f-no_hp" value="${data?.no_hp||''}" placeholder="08xxxxxxxxxx" /></div>
      <div class="form-group"><label>Keterangan</label><input type="text" id="f-keterangan" value="${data?.keterangan||''}" placeholder="Opsional" /></div>
      <div class="form-group full"><label>Alamat Lengkap</label><textarea id="f-alamat">${data?.alamat||''}</textarea></div>
    </div>`;

  if (type === 'operasional') return `
    <div class="modal-grid">
      <div class="form-group"><label>Tanggal</label><input type="date" id="f-tanggal" value="${data?.tanggal||today()}" /></div>
      <div class="form-group"><label>Kategori</label><select id="f-kategori">${selOpts(KAT_OPTS, data?.kategori)}</select></div>
      <div class="form-group full"><label>Nama Barang</label><input type="text" id="f-nama" value="${data?.nama||''}" placeholder="Nama barang / item" /></div>
      <div class="form-group"><label>Jumlah</label><input type="number" id="f-jumlah" value="${data?.jumlah||''}" placeholder="0" oninput="calcTotal()" /></div>
      <div class="form-group"><label>Satuan</label><select id="f-satuan">${selOpts(SAT_OPTS, data?.satuan)}</select></div>
      <div class="form-group"><label>Harga Satuan (Rp)</label><input type="number" id="f-harga_satuan" value="${data?.harga_satuan||''}" placeholder="0" oninput="calcTotal()" /></div>
      <div class="form-group"><label>Total (Rp)</label><input type="number" id="f-total" value="${data?.total||''}" placeholder="otomatis" /></div>
      <div class="form-group full"><label>Keterangan</label><textarea id="f-keterangan">${data?.keterangan||''}</textarea></div>
    </div>`;
}

function calcTotal() {
  const j = parseFloat($('f-jumlah')?.value) || 0;
  const h = parseFloat($('f-harga_satuan')?.value) || 0;
  const t = $('f-total');
  if (t) t.value = j * h;
}

const MODAL_TITLES = {
  'sapi-masuk':  ['Tambah Pembelian Sapi',    'Edit Pembelian Sapi'],
  'sapi-keluar': ['Tambah Penjualan Sapi',     'Edit Penjualan Sapi'],
  'operasional': ['Tambah Belanja Operasional','Edit Belanja Operasional']
};

function modalFooter() {
  return `<div class="modal-footer">
    <button class="btn-cancel" onclick="closeModal()">Batal</button>
    <button class="btn-save" onclick="saveData()"><i class="ti ti-check"></i> Simpan</button>
  </div>`;
}

function openModal(type) {
  editingType = type; editingId = null;
  $('modal-title').textContent = MODAL_TITLES[type][0];
  $('modal-body').innerHTML = getFormFields(type, null) + modalFooter();
  $('modal-overlay').classList.remove('hidden');
}

function openEdit(type, id) {
  const data = DB[type].find(x => x.id === id);
  if (!data) return;
  editingId = id; editingType = type;
  $('modal-title').textContent = MODAL_TITLES[type][1];
  $('modal-body').innerHTML = getFormFields(type, data) + modalFooter();
  $('modal-overlay').classList.remove('hidden');
}

function openDelete(type, id) {
  const data = DB[type].find(x => x.id === id);
  if (!data) return;
  deleteTarget = { type, id }; editingType = null; editingId = null;
  $('modal-title').textContent = 'Hapus Data';
  $('modal-body').innerHTML = `
    <div class="delete-confirm">
      <i class="ti ti-alert-triangle del-icon"></i>
      <p>Yakin ingin menghapus data<br><strong>${data.nama}</strong>?<br><span style="font-size:12px;color:#999">Tindakan ini tidak dapat dibatalkan.</span></p>
      <div class="modal-footer" style="justify-content:center;margin-top:1rem">
        <button class="btn-cancel" onclick="closeModal()">Batal</button>
        <button class="btn-del-confirm" onclick="confirmDelete()"><i class="ti ti-trash"></i> Hapus</button>
      </div>
    </div>`;
  $('modal-overlay').classList.remove('hidden');
}

function confirmDelete() {
  if (!deleteTarget) return;
  DB[deleteTarget.type] = DB[deleteTarget.type].filter(x => x.id !== deleteTarget.id);
  saveDB(deleteTarget.type);
  closeModal();
  renderTable(deleteTarget.type, '');
  deleteTarget = null;
}

function saveData() {
  const type = editingType;
  const g = id => $('f-'+id)?.value || '';
  let obj = {};

  if (type === 'sapi-masuk') {
    obj = { tanggal:g('tanggal'), kode:g('kode'), nama:g('nama'), jenis:g('jenis'),
            bobot:Number(g('bobot')), harga:Number(g('harga')), pemasok:g('pemasok'), keterangan:g('keterangan') };
  } else if (type === 'sapi-keluar') {
    obj = { tanggal:g('tanggal'), kode:g('kode'), nama:g('nama'), jenis:g('jenis'),
            bobot_awal:Number(g('bobot_awal')), bobot_jual:Number(g('bobot_jual')),
            harga:Number(g('harga')), pembeli:g('pembeli'), no_hp:g('no_hp'),
            alamat:g('alamat'), keterangan:g('keterangan') };
  } else if (type === 'operasional') {
    obj = { tanggal:g('tanggal'), kategori:g('kategori'), nama:g('nama'),
            jumlah:Number(g('jumlah')), satuan:g('satuan'),
            harga_satuan:Number(g('harga_satuan')), total:Number(g('total')), keterangan:g('keterangan') };
  }

  if (editingId) {
    const idx = DB[type].findIndex(x => x.id === editingId);
    if (idx >= 0) { obj.id = editingId; DB[type][idx] = obj; }
  } else {
    obj.id = maxId(type) + 1;
    DB[type].push(obj);
  }
  saveDB(type);
  closeModal();
  renderTable(type, '');
  editingId = null;
}

function closeModal() {
  $('modal-overlay').classList.add('hidden');
  $('modal-body').innerHTML = '';
  editingId = null; deleteTarget = null;
}

function handleOverlayClick(e) {
  if (e.target === $('modal-overlay')) closeModal();
}
