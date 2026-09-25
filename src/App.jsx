import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Phone, 
  CheckCircle, 
  Download, 
  Lock, 
  Search, 
  AlertCircle,
  Copy,
  ArrowRight,
  UserCheck,
  Plus,
  Trash2,
  CalendarCheck
} from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, writeBatch, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Gambar Logo Resmi ABE-Q
const ABEQ_LOGO = "https://lh3.googleusercontent.com/d/1_9i5-c3B5Z4G1Xp-Qk8Jm2H7K0L9MnOp=w400"; // fallback visual SVG tersemat di bawah jika link eksternal tidak aktif

const SESSIONS = [
  { id: 1, time: '08:00 - 09:00', label: 'Sesi 1' },
  { id: 2, time: '09:00 - 10:00', label: 'Sesi 2' },
  { id: 3, time: '10:00 - 11:00', label: 'Sesi 3' },
  { id: 4, time: '11:00 - 12:00', label: 'Sesi 4' },
  { id: 5, time: '13:00 - 14:00', label: 'Sesi 5' },
  { id: 6, time: '14:00 - 15:00', label: 'Sesi 6' },
  { id: 7, time: '15:00 - 16:00', label: 'Sesi 7' },
];

const MAX_CAPACITY = 10;
const ADMIN_PHONE = '6285218890126';

export default function App() {
  const [activeTab, setActiveTab] = useState('booking');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Booking & Keranjang Pilihan Sesi
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState([]);
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('SD123');
  const [parentPhone, setParentPhone] = useState('');
  const [confirmedBatch, setConfirmedBatch] = useState(null);
  const [copiedRek, setCopiedRek] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Portal Ortu
  const [searchParentPhone, setSearchParentPhone] = useState('');
  const [parentResults, setParentResults] = useState(null);

  // Admin
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminFilterDate, setAdminFilterDate] = useState('');
  const [adminFilterSession, setAdminFilterSession] = useState('ALL'); // Filter Sesi Admin
  const [adminSearch, setAdminSearch] = useState('');
  const [adminGradeFilter, setAdminGradeFilter] = useState('ALL');

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setBookings(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getSessionCount = (date, sessionId) => {
    return bookings.filter(b => b.date === date && Number(b.sessionId) === Number(sessionId)).length;
  };

  const toggleSessionSelection = (sess) => {
    const alreadySelected = cart.some(item => item.date === selectedDate && item.sessionId === sess.id);
    if (alreadySelected) {
      setCart(cart.filter(item => !(item.date === selectedDate && item.sessionId === sess.id)));
    } else {
      const count = getSessionCount(selectedDate, sess.id);
      if (count >= MAX_CAPACITY) {
        alert('Maaf, kuota untuk sesi ini sudah penuh!');
        return;
      }
      setCart([...cart, {
        date: selectedDate,
        sessionId: sess.id,
        sessionTime: sess.time,
        label: sess.label
      }]);
    }
  };

  const removeCartItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Pilih minimal satu sesi terlebih dahulu!');
      return;
    }
    if (!childName.trim() || !parentPhone.trim()) {
      alert('Mohon isi nama anak dan nomor WhatsApp!');
      return;
    }

    for (const item of cart) {
      const currentCount = getSessionCount(item.date, item.sessionId);
      if (currentCount >= MAX_CAPACITY) {
        alert(`Maaf, kuota pada ${item.date} (${item.sessionTime}) baru saja penuh oleh pendaftar lain!`);
        return;
      }
    }

    let cleanPhone = parentPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const batchRegCode = 'REG-' + Date.now().toString().slice(-6);
      const savedItems = [];

      cart.forEach((item, idx) => {
        const itemRegId = `${batchRegCode}-${idx + 1}`;
        const newDocRef = doc(collection(db, 'bookings'));
        const bookingData = {
          batchRegCode,
          regCode: itemRegId,
          date: item.date,
          sessionId: item.sessionId,
          sessionTime: item.sessionTime,
          childName: childName.trim(),
          grade,
          parentPhone: cleanPhone,
          createdAt: new Date().toISOString(),
          serverTimestamp: serverTimestamp()
        };
        batch.set(newDocRef, bookingData);
        savedItems.push({ ...bookingData, id: newDocRef.id });
      });

      await batch.commit();

      setConfirmedBatch({
        batchCode: batchRegCode,
        childName: childName.trim(),
        grade,
        parentPhone: cleanPhone,
        items: savedItems
      });

      setCart([]);
      setChildName('');
    } catch (err) {
      console.error(err);
      alert('Terjadi kendala saat menyimpan. Pastikan internet aktif.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedRek(true);
    setTimeout(() => setCopiedRek(false), 2000);
  };

  const handleParentSearch = (e) => {
    e.preventDefault();
    let query = searchParentPhone.replace(/\D/g, '');
    if (query.startsWith('0')) query = '62' + query.slice(1);
    const results = bookings.filter(b => b.parentPhone && b.parentPhone.includes(query));
    setParentResults(results);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser === 'abeq2026' && adminPass === 'abeq123') {
      setIsAdminLoggedIn(true);
    } else {
      alert('Username atau Password Admin salah!');
    }
  };

  // Group by Siswa di Admin Dashboard
  const groupedAdminBookings = useMemo(() => {
    const groups = {};

    bookings.forEach((b) => {
      const key = b.batchRegCode || `${b.childName.trim().toLowerCase()}_${b.parentPhone}`;

      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          batchCode: b.batchRegCode || b.regCode || b.id,
          childName: b.childName,
          grade: b.grade,
          parentPhone: b.parentPhone,
          sessions: []
        };
      }

      groups[key].sessions.push({
        docId: b.id,
        regCode: b.regCode || b.id,
        date: b.date,
        sessionId: Number(b.sessionId),
        sessionTime: b.sessionTime,
        createdAt: b.createdAt
      });
    });

    Object.values(groups).forEach(g => {
      g.sessions.sort((a, b) => {
        if (a.date === b.date) return a.sessionId - b.sessionId;
        return a.date.localeCompare(b.date);
      });
    });

    return Object.values(groups);
  }, [bookings]);

  // Filter Data (Termasuk Tanggal & Sesi Spesifik)
  const filteredGroupedBookings = useMemo(() => {
    return groupedAdminBookings.filter(g => {
      const nameMatch = g.childName.toLowerCase().includes(adminSearch.toLowerCase());
      const phoneMatch = g.parentPhone.includes(adminSearch);
      const regMatch = g.batchCode.toLowerCase().includes(adminSearch.toLowerCase());
      const matchSearch = nameMatch || phoneMatch || regMatch;

      const matchGrade = adminGradeFilter !== 'ALL' ? g.grade === adminGradeFilter : true;
      
      const matchDate = adminFilterDate 
        ? g.sessions.some(s => s.date === adminFilterDate) 
        : true;

      const matchSession = adminFilterSession !== 'ALL'
        ? g.sessions.some(s => {
            const dateCheck = adminFilterDate ? s.date === adminFilterDate : true;
            return dateCheck && s.sessionId === Number(adminFilterSession);
          })
        : true;

      return matchSearch && matchGrade && matchDate && matchSession;
    });
  }, [groupedAdminBookings, adminSearch, adminFilterDate, adminFilterSession, adminGradeFilter]);

  // Hitung jumlah anak pada tanggal & sesi yang dipilih di filter
  const activeFilterCount = useMemo(() => {
    if (!adminFilterDate && adminFilterSession === 'ALL') return null;
    return bookings.filter(b => {
      const matchDate = adminFilterDate ? b.date === adminFilterDate : true;
      const matchSess = adminFilterSession !== 'ALL' ? Number(b.sessionId) === Number(adminFilterSession) : true;
      return matchDate && matchSess;
    }).length;
  }, [bookings, adminFilterDate, adminFilterSession]);

  const exportToCSV = () => {
    if (groupedAdminBookings.length === 0) {
      alert('Belum ada data untuk diekspor!');
      return;
    }

    const headers = ['ID Pendaftaran/Batch,Nama Siswa,Jenjang,No WA Ortu,Total Sesi,Daftar Tanggal & Sesi Jam'];
    const rows = groupedAdminBookings.map(g => {
      const sessionListStr = g.sessions.map(s => `${s.date} [${s.sessionTime}]`).join('; ');
      return `"${g.batchCode}","${g.childName}","${g.grade}","${g.parentPhone}","${g.sessions.length}","${sessionListStr}"`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_bimbel_abeq_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteEntireStudentGroup = async (group) => {
    if (confirm(`Hapus seluruh (${group.sessions.length}) pendaftaran sesi untuk siswa "${group.childName}"? Sisa kuota akan langsung dikembalikan.`)) {
      try {
        const batch = writeBatch(db);
        group.sessions.forEach(s => {
          batch.delete(doc(db, 'bookings', s.docId));
        });
        await batch.commit();
      } catch (err) {
        alert('Gagal menghapus data.');
      }
    }
  };

  const deleteSingleSession = async (docId, info) => {
    if (confirm(`Batalkan sesi ${info}? Kuota akan otomatis bertambah kembali.`)) {
      try {
        await deleteDoc(doc(db, 'bookings', docId));
      } catch (err) {
        alert('Gagal membatalkan sesi.');
      }
    }
  };

  const currentYear = new Date().getFullYear();
  const maxDate = `${currentYear}-12-31`;
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Header dengan Logo ABE-Q Resmi */}
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Logo ABE-Q dengan Wadah Background Putih Bulat Rapi */}
            <div className="w-11 h-11 bg-white rounded-xl shadow-md p-1 flex items-center justify-center overflow-hidden border border-indigo-200 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 50 10 C 65 25 75 35 75 50 C 75 75 25 75 25 50 C 25 35 35 25 50 10 Z" fill="#0d9488" opacity="0.15" />
                <path d="M 50 15 Q 70 35 70 52 Q 50 48 50 68 Q 50 48 30 52 Q 30 35 50 15 Z" fill="none" stroke="#0d9488" strokeWidth="4" />
                <circle cx="38" cy="40" r="7" fill="#0284c7" />
                <circle cx="62" cy="40" r="7" fill="#f43f5e" />
                <path d="M 30 65 Q 50 58 70 65" stroke="#0d9488" strokeWidth="4" fill="none" />
                <text x="50" y="86" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#0d9488">ABE-Q</text>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight">BIMBEL ABE-Q</h1>
              <p className="text-[11px] text-indigo-100 font-medium tracking-wide">
                Applied Behavior &amp; Educational - Qurani
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveTab('booking'); setConfirmedBatch(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'booking' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-indigo-500 text-white'
              }`}
            >
              Daftar Sesi {cart.length > 0 && <span className="ml-1 bg-amber-400 text-indigo-950 px-1.5 py-0.2 rounded-full text-xs font-bold">{cart.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('parent')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'parent' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-indigo-500 text-white'
              }`}
            >
              Cek Jadwal Anak
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'admin' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-indigo-500 text-white'
              }`}
            >
              Admin Portal
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {loading && (
          <div className="p-3 mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-xl text-center">
            Menghubungkan ke database cloud real-time...
          </div>
        )}

        {/* TAB 1: FORM MULTI-BOOKING */}
        {activeTab === 'booking' && (
          <div>
            {confirmedBatch ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-500 text-white p-6 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-2 text-white animate-bounce" />
                  <h2 className="text-2xl font-bold">Semua Jadwal Terkonfirmasi!</h2>
                  <p className="text-sm opacity-90">Total {confirmedBatch.items.length} sesi belajar telah terkunci di sistem.</p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2 border-b pb-2">Rincian Siswa:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-slate-500 block">Kode Booking:</span><strong>{confirmedBatch.batchCode}</strong></div>
                      <div><span className="text-slate-500 block">Nama Anak:</span><strong>{confirmedBatch.childName} ({confirmedBatch.grade})</strong></div>
                    </div>

                    <h4 className="font-bold text-xs text-slate-600 mb-2 uppercase tracking-wide">Daftar Jadwal yang Berhasil Diambil:</h4>
                    <div className="space-y-2">
                      {confirmedBatch.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800">📅 {item.date}</span>
                            <span className="text-emerald-700 font-semibold ml-2">⏰ {item.sessionTime}</span>
                          </div>
                          <span className="text-indigo-600 font-mono text-[11px]">{item.regCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <a
                      href={`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(
                        `Halo Admin Bimbel ABE-Q, saya mengonfirmasi pendaftaran ${confirmedBatch.items.length} sesi belajar.\n\n` +
                        `*Kode Registrasi:* ${confirmedBatch.batchCode}\n` +
                        `*Nama Anak:* ${confirmedBatch.childName}\n` +
                        `*Jenjang:* ${confirmedBatch.grade}\n` +
                        `*No WA Ortu:* ${confirmedBatch.parentPhone}\n\n` +
                        `*Daftar Sesi:*\n` +
                        confirmedBatch.items.map((it, i) => `${i + 1}. Tanggal: ${it.date} (${it.sessionTime})`).join('\n') +
                        `\n\nTerima kasih.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-200 transition"
                    >
                      <Phone className="w-5 h-5" />
                      Kirim Konfirmasi Semua Jadwal via WA Admin
                    </a>
                  </div>

                  <div className="border-t pt-5">
                    <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg mb-4">
                      *Seluruh {confirmedBatch.items.length} sesi Anda sudah terkunci di jadwal. Pembayaran dapat diselesaikan sebelum waktu belajar dimulai.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="border rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
                        <div>
                          <span className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">BANK BCA</span>
                          <p className="text-sm font-semibold mt-2">Reyvaldin Julian Fairulhaq</p>
                          <p className="text-lg font-mono font-bold text-indigo-900 tracking-wider">7380927301</p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard('7380927301')}
                          className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedRek ? 'Tersalin!' : 'Salin No. Rekening'}
                        </button>
                      </div>

                      <div className="border rounded-xl p-4 bg-slate-50 text-center flex flex-col items-center">
                        <span className="inline-block bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded mb-2">QRIS RESMI</span>
                        <p className="text-xs font-bold text-slate-700">BIMBEL ABE-Q</p>
                        <p className="text-[10px] text-slate-500 font-mono">NMID: ID1026593432549</p>
                        <div className="bg-white p-2 border rounded-lg mt-2 shadow-sm">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021226590014ID.LINKAJA.WWW011893600914102659343254902150000000000000005204581253033605802ID5919BIMBEL%20ABE-Q%20BGR%20UTR6005BOGOR61051611062070703A016304" 
                            alt="QRIS BIMBEL ABE-Q" 
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmedBatch(null)}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-sm font-semibold text-slate-600 transition"
                  >
                    Tambah Pendaftaran Baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-600" />
                      1. Pilih Tanggal:
                    </label>
                    <input 
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      💡 Anda bisa memilih beberapa sesi di tanggal ini, lalu ganti tanggal lain untuk memilih lagi!
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <CalendarCheck className="w-4 h-4 text-indigo-600" />
                        Sesi Terpilih ({cart.length})
                      </h4>
                      {cart.length > 0 && (
                        <button 
                          onClick={() => setCart([])}
                          className="text-xs text-rose-500 hover:underline"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed">
                        Belum ada sesi yang dipilih.<br />Pilih sesi di sebelah kanan.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {cart.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-indigo-950">{item.date}</div>
                              <div className="text-slate-600">{item.label} ({item.sessionTime})</div>
                            </div>
                            <button 
                              onClick={() => removeCartItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Hapus pilihan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        2. Pilih Sesi Jam (Tanggal: {selectedDate})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Klik sesi yang diinginkan untuk menambah/membatalkan. Bisa memilih lebih dari 1 sesi:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SESSIONS.map((sess) => {
                        const filled = getSessionCount(selectedDate, sess.id);
                        const isFull = filled >= MAX_CAPACITY;
                        const isSelected = cart.some(item => item.date === selectedDate && item.sessionId === sess.id);

                        return (
                          <button
                            key={sess.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => toggleSessionSelection(sess)}
                            className={`p-3.5 rounded-xl border text-left transition flex justify-between items-center relative ${
                              isFull 
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                  : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                  isFull ? 'bg-slate-200 text-slate-500' : isSelected ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {sess.label}
                                </span>
                                <span className="font-semibold text-sm">{sess.time}</span>
                              </div>
                              <div className="text-xs mt-1">
                                {isFull ? (
                                  <span className="text-rose-500 font-bold">PENUH (10/10)</span>
                                ) : (
                                  <span className={isSelected ? 'text-indigo-100' : 'text-slate-500'}>
                                    Sisa Kursi: <strong className={isSelected ? 'text-white' : 'text-indigo-600'}>{MAX_CAPACITY - filled} anak</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {isFull ? (
                                <Lock className="w-5 h-5 text-slate-400" />
                              ) : isSelected ? (
                                <CheckCircle className="w-6 h-6 text-white" />
                              ) : (
                                <Plus className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleBookingSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      3. Lengkapi Data Siswa
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Anak *</label>
                        <input 
                          type="text"
                          required
                          placeholder="Contoh: Muhammad Farhan"
                          value={childName}
                          onChange={(e) => setChildName(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Jenjang Pendidikan *</label>
                        <select 
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="TK">TK (Taman Kanak-kanak)</option>
                          <option value="SD123">SD Kelas 1, 2, 3</option>
                          <option value="SD456">SD Kelas 4, 5, 6</option>
                          <option value="SMP">SMP</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor WhatsApp Orang Tua *</label>
                      <input 
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={cart.length === 0 || submitting}
                      className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                        cart.length > 0 && !submitting
                          ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 cursor-pointer' 
                          : 'bg-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {submitting ? 'Menyimpan Semua Jadwal...' : cart.length > 0 ? (
                        <>Kunci {cart.length} Sesi Terpilih Sekarang <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        'Pilih Minimal 1 Sesi Terlebih Dahulu'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PORTAL CEK JADWAL ORTU */}
        {activeTab === 'parent' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-indigo-600 mb-2" />
              <h2 className="text-xl font-bold text-slate-800">Cek Jadwal Belajar Anak</h2>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Masukkan nomor WhatsApp untuk melihat semua jadwal yang telah didaftarkan.
              </p>

              <form onSubmit={handleParentSearch} className="flex gap-2 max-w-md mx-auto">
                <input 
                  type="text"
                  required
                  placeholder="Masukkan Nomor WhatsApp..."
                  value={searchParentPhone}
                  onChange={(e) => setSearchParentPhone(e.target.value)}
                  className="flex-1 p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  type="submit"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow transition flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" /> Cari
                </button>
              </form>
            </div>

            {parentResults !== null && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700">Hasil Pencarian ({parentResults.length} Sesi Terdaftar):</h3>
                {parentResults.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
                    Tidak ditemukan pendaftaran dengan nomor tersebut.
                  </div>
                ) : (
                  parentResults.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                            {item.grade}
                          </span>
                          <span className="font-bold text-slate-800 text-base">{item.childName}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>📅 Tanggal: <strong className="text-slate-700">{item.date}</strong></span>
                          <span>⏰ Jam: <strong className="text-emerald-600">{item.sessionTime}</strong></span>
                          <span>🔖 Reg: {item.regCode || item.id}</span>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(
                          `Halo Admin Bimbel ABE-Q, saya ingin menanyakan jadwal untuk ${item.childName} pada tanggal ${item.date} sesi${item.sessionTime}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-lg font-medium transition flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> Hubungi Admin
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD (DENGAN FILTER SESI & TANGGAL) */}
        {activeTab === 'admin' && (
          <div>
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center mb-6">
                  <Lock className="w-10 h-10 mx-auto text-indigo-600 mb-2" />
                  <h2 className="text-xl font-bold text-slate-800">Login Admin Bimbel ABE-Q</h2>
                  <p className="text-xs text-slate-500">Masukkan kredensial admin untuk mengakses data.</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                    <input 
                      type="text"
                      required
                      placeholder="Username admin"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="Password admin"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition"
                  >
                    Masuk ke Dashboard
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Dashboard Manajemen Siswa Bimbel ABE-Q</h2>
                    <p className="text-xs text-slate-500">
                      Total <strong>{groupedAdminBookings.length} Siswa Terdaftar</strong> ({bookings.length} Total Sesi Belajar)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={exportToCSV}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <Download className="w-4 h-4" /> Ekspor ke Spreadsheet (CSV)
                    </button>
                    <button 
                      onClick={() => setIsAdminLoggedIn(false)}
                      className="px-3 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Keluar
                    </button>
                  </div>
                </div>

                {/* Filter Lengkap: Cari, Tanggal, SESI JAM, dan Jenjang */}
                <div className="bg-white p-4 rounded-xl border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Nama / No WA / Kode</label>
                      <input 
                        type="text"
                        placeholder="Ketik pencarian..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full p-2 rounded-lg border text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Tanggal Belajar</label>
                      <input 
                        type="date"
                        value={adminFilterDate}
                        onChange={(e) => setAdminFilterDate(e.target.value)}
                        className="w-full p-2 rounded-lg border text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Sesi Jam</label>
                      <select
                        value={adminFilterSession}
                        onChange={(e) => setAdminFilterSession(e.target.value)}
                        className="w-full p-2 rounded-lg border text-xs outline-none bg-white font-semibold text-indigo-900"
                      >
                        <option value="ALL">Semua Sesi Jam</option>
                        {SESSIONS.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.label} ({s.time})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Jenjang</label>
                      <select
                        value={adminGradeFilter}
                        onChange={(e) => setAdminGradeFilter(e.target.value)}
                        className="w-full p-2 rounded-lg border text-xs outline-none bg-white"
                      >
                        <option value="ALL">Semua Jenjang</option>
                        <option value="TK">TK</option>
                        <option value="SD123">SD 1-3</option>
                        <option value="SD456">SD 4-6</option>
                        <option value="SMP">SMP</option>
                      </select>
                    </div>
                  </div>

                  {/* Banner Ringkasan jika sedang memfilter Tanggal / Sesi */}
                  {(adminFilterDate || adminFilterSession !== 'ALL') && (
                    <div className="flex flex-wrap justify-between items-center bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-950">
                      <div>
                        Menampilkan siswa pada: 
                        {adminFilterDate && <span className="font-bold ml-1">Tanggal {adminFilterDate}</span>}
                        {adminFilterSession !== 'ALL' && (
                          <span className="font-bold ml-1">
                            • {SESSIONS.find(s => s.id === Number(adminFilterSession))?.label} ({SESSIONS.find(s => s.id === Number(adminFilterSession))?.time})
                          </span>
                        )}
                        {activeFilterCount !== null && (
                          <span className="ml-2 bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Terisi: {activeFilterCount} / {MAX_CAPACITY} Kursi
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => { setAdminFilterDate(''); setAdminFilterSession('ALL'); }}
                        className="text-xs text-indigo-700 underline font-semibold hover:text-indigo-900"
                      >
                        Reset Filter Tanggal & Sesi
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabel Siswa Grouped */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Kode Reg</th>
                          <th className="p-3">Nama Siswa</th>
                          <th className="p-3">Jenjang</th>
                          <th className="p-3">Daftar Sesi Terpilih</th>
                          <th className="p-3">No WA Ortu</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredGroupedBookings.map((group) => (
                          <tr key={group.groupKey} className="hover:bg-slate-50 transition align-top">
                            <td className="p-3 font-mono font-medium text-indigo-600">
                              {group.batchCode}
                              <div className="text-[10px] text-slate-400 mt-0.5">{group.sessions.length} sesi</div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 text-sm block">{group.childName}</span>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                                {group.grade}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1.5 max-w-lg">
                                {group.sessions.map((sess) => {
                                  const isHighlighted = 
                                    (adminFilterDate ? sess.date === adminFilterDate : true) &&
                                    (adminFilterSession !== 'ALL' ? sess.sessionId === Number(adminFilterSession) : false);

                                  return (
                                    <div 
                                      key={sess.docId}
                                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border transition ${
                                        isHighlighted 
                                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold ring-1 ring-amber-400' 
                                          : 'bg-indigo-50 border-indigo-200 text-slate-800'
                                      }`}
                                    >
                                      <span>📅 {sess.date}</span>
                                      <span className="font-mono text-emerald-700 font-semibold">⏰ {sess.sessionTime}</span>
                                      <button 
                                        onClick={() => deleteSingleSession(sess.docId, `${sess.date} (${sess.sessionTime})`)}
                                        className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
                                        title="Batalkan hanya sesi ini"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <a 
                                href={`https://wa.me/${group.parentPhone}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {group.parentPhone}
                              </a>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => deleteEntireStudentGroup(group)}
                                className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition"
                              >
                                Hapus Semua
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredGroupedBookings.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center p-8 text-slate-400">
                              Tidak ada siswa yang terdaftar pada kriteria filter tanggal/sesi ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-4 text-center text-xs text-slate-400 mt-6">
        © {new Date().getFullYear()} Bimbel ABE-Q. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
