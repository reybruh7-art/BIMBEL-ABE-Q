import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Filter,
  UserCheck
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('booking'); // booking, parent, admin
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('abeq_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  // Form Booking
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('SD123');
  const [parentPhone, setParentPhone] = useState('');
  const [lastBooking, setLastBooking] = useState(null);
  const [copiedRek, setCopiedRek] = useState(false);

  // Portal Ortu
  const [searchParentPhone, setSearchParentPhone] = useState('');
  const [parentResults, setParentResults] = useState(null);

  // Admin
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminFilterDate, setAdminFilterDate] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminGradeFilter, setAdminGradeFilter] = useState('ALL');

  useEffect(() => {
    localStorage.setItem('abeq_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Hitung Kuota per Sesi
  const getSessionCount = (date, sessionId) => {
    return bookings.filter(b => b.date === date && b.sessionId === sessionId).length;
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedSession || !childName.trim() || !parentPhone.trim()) {
      alert('Mohon lengkapi semua kolom formulir!');
      return;
    }

    const currentCount = getSessionCount(selectedDate, selectedSession.id);
    if (currentCount >= MAX_CAPACITY) {
      alert('Maaf, kuota untuk sesi ini baru saja penuh!');
      return;
    }

    // Standardisasi No WA
    let cleanPhone = parentPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

    const newBooking = {
      id: 'REG-' + Date.now().toString().slice(-6),
      date: selectedDate,
      sessionId: selectedSession.id,
      sessionTime: selectedSession.time,
      childName: childName.trim(),
      grade,
      parentPhone: cleanPhone,
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [...prev, newBooking]);
    setLastBooking(newBooking);
    
    // Reset Form Input
    setChildName('');
    setSelectedSession(null);
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
    
    const results = bookings.filter(b => b.parentPhone.includes(query));
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

  const exportToCSV = () => {
    if (bookings.length === 0) {
      alert('Belum ada data untuk diekspor!');
      return;
    }

    const headers = ['ID Pendaftaran,Tanggal,Sesi (Jam),Nama Anak,Jenjang,No WA Ortu,Waktu Daftar'];
    const rows = bookings.map(b => 
      `"${b.id}","${b.date}","${b.sessionTime}","${b.childName}","${b.grade}","${b.parentPhone}","${new Date(b.createdAt).toLocaleString('id-ID')}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_bimbel_abeq_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteBooking = (id) => {
    if (confirm('Yakin ingin membatalkan/menghapus pendaftaran ini?')) {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  // Batas Maksimal Tanggal Akhir Tahun
  const currentYear = new Date().getFullYear();
  const maxDate = `${currentYear}-12-31`;
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header & Navigasi */}
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-amber-300" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">BIMBEL ABE-Q</h1>
              <p className="text-xs text-indigo-100">BGR UTR - Sistem Pendaftaran Jadwal Belajar</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveTab('booking'); setLastBooking(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'booking' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-indigo-500 text-white'
              }`}
            >
              Daftar Sesi
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

      {/* Konten Utama */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        
        {/* TAB 1: FORM PENDAFTARAN JADWAL */}
        {activeTab === 'booking' && (
          <div>
            {lastBooking ? (
              /* Laman Konfirmasi & Pembayaran */
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-500 text-white p-6 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-2 text-white animate-bounce" />
                  <h2 className="text-2xl font-bold">Jadwal Otomatis Terkonfirmasi!</h2>
                  <p className="text-sm opacity-90">Slot sesi untuk anak Anda sudah resmi tersimpan di sistem.</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Detail Sesi */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-3 border-b pb-2">Rincian Pendaftaran:</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 block">ID Registrasi</span>
                        <span className="font-bold text-indigo-600">{lastBooking.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Nama Anak</span>
                        <span className="font-bold">{lastBooking.childName} ({lastBooking.grade})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tanggal Sesi</span>
                        <span className="font-bold">{lastBooking.date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Waktu Sesi</span>
                        <span className="font-bold text-emerald-600">{lastBooking.sessionTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Konfirmasi WA Langsung */}
                  <div className="text-center">
                    <a
                      href={`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(
                        `Halo Admin Bimbel ABE-Q, saya ingin konfirmasi pendaftaran sesi belajar.\n\n` +
                        `*No Registrasi:* ${lastBooking.id}\n` +
                        `*Nama Anak:* ${lastBooking.childName}\n` +
                        `*Jenjang:* ${lastBooking.grade}\n` +
                        `*Tanggal:* ${lastBooking.date}\n` +
                        `*Sesi:* ${lastBooking.sessionTime}\n` +
                        `*No WA Ortu:* ${lastBooking.parentPhone}\n\n` +
                        `Terima kasih.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-200 transition"
                    >
                      <Phone className="w-5 h-5" />
                      Konfirmasi Jadwal via WhatsApp Admin
                    </a>
                    <p className="text-xs text-slate-500 mt-2">Kirim bukti atau sapa admin secara langsung via chat WhatsApp.</p>
                  </div>

                  {/* Opsi Pembayaran (Opsional, Jadwal Sudah Terkunci) */}
                  <div className="border-t pt-5">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4 rounded-r">
                      <p className="text-xs text-amber-800 font-medium">
                        *Catatan: Jadwal Anda sudah terkunci. Opsi pembayaran di bawah dapat diselesaikan sebelum sesi dimulai.
                      </p>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-3">Pilihan Rekening & QRIS Pembayaran:</h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* BCA */}
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

                      {/* QRIS */}
                      <div className="border rounded-xl p-4 bg-slate-50 text-center flex flex-col items-center">
                        <span className="inline-block bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded mb-2">QRIS RESMI</span>
                        <p className="text-xs font-bold text-slate-700">BIMBEL ABE-Q, BGR UTR</p>
                        <p className="text-[10px] text-slate-500 font-mono">NMID: ID1026593432549</p>
                        <div className="bg-white p-2 border rounded-lg mt-2 shadow-sm">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021226590014ID.LINKAJA.WWW011893600914102659343254902150000000000000005204581253033605802ID5919BIMBEL%20ABE-Q%20BGR%20UTR6005BOGOR61051611062070703A016304" 
                            alt="QRIS BIMBEL ABE-Q" 
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">Dapat di-scan via GoPay, OVO, Dana, BCA, Livin, dll.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setLastBooking(null)}
                      className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-sm font-semibold text-slate-600 transition"
                    >
                      Daftarkan Sesi Lain / Anak Lain
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Formulir Pemilihan Sesi */
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Kolom Kiri: Kalender Tanggal & Info */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-600" />
                      Pilih Tanggal Belajar:
                    </label>
                    <input 
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSession(null);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Jadwal dapat dipilih hingga akhir tahun (31 Desember {currentYear}).
                    </p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-xs text-indigo-900 space-y-2">
                    <h4 className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-indigo-600" /> Aturan Kuota Sesi:
                    </h4>
                    <p>• Maksimal <strong>10 anak per sesi</strong> demi efektivitas belajar.</p>
                    <p>• Tombol sesi otomatis berwarna abu-abu & terkunci jika kuota telah mencapai 10 anak.</p>
                    <p>• Selesai mengisi, jadwal anak langsung resmi terkunci di sistem.</p>
                  </div>
                </div>

                {/* Kolom Kanan: Pilihan 7 Sesi & Form Identitas */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Pilihan 7 Sesi */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Pilih Sesi Jam (Tanggal: {selectedDate})
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Tersedia 7 sesi per hari (1 jam per sesi):</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SESSIONS.map((sess) => {
                        const filled = getSessionCount(selectedDate, sess.id);
                        const isFull = filled >= MAX_CAPACITY;
                        const isSelected = selectedSession?.id === sess.id;

                        return (
                          <button
                            key={sess.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => setSelectedSession(sess)}
                            className={`p-3.5 rounded-xl border text-left transition flex justify-between items-center relative overflow-hidden ${
                              isFull 
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : isSelected 
                                  ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500 text-indigo-950 font-medium'
                                  : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                  isFull ? 'bg-slate-200 text-slate-500' : isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {sess.label}
                                </span>
                                <span className="font-semibold text-sm">{sess.time}</span>
                              </div>
                              <div className="text-xs mt-1">
                                {isFull ? (
                                  <span className="text-rose-500 font-bold">PENUH (10/10)</span>
                                ) : (
                                  <span className="text-slate-500">Sisa Kuota: <strong className="text-indigo-600">{MAX_CAPACITY - filled} anak</strong></span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {isFull ? (
                                <Lock className="w-5 h-5 text-slate-400" />
                              ) : isSelected ? (
                                <CheckCircle className="w-6 h-6 text-indigo-600" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Identitas */}
                  <form onSubmit={handleBookingSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Lengkapi Data Anak & Orang Tua
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
                      <span className="text-[11px] text-slate-400">Nomor ini berguna untuk pengecekan jadwal di kemudian hari.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedSession}
                      className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                        selectedSession 
                          ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 cursor-pointer' 
                          : 'bg-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {selectedSession ? (
                        <>Konfirmasi & Kunci Jadwal Sekarang <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        'Silakan Pilih Sesi Jam Terlebih Dahulu'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PORTAL CEK JADWAL ORANG TUA */}
        {activeTab === 'parent' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-indigo-600 mb-2" />
              <h2 className="text-xl font-bold text-slate-800">Cek Jadwal Belajar Anak</h2>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Masukkan nomor WhatsApp yang Anda gunakan saat mendaftar untuk melihat semua jadwal aktif.
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
                <h3 className="font-bold text-slate-700">Hasil Pencarian ({parentResults.length} Jadwal Ditemukan):</h3>
                {parentResults.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
                    Tidak ditemukan riwayat pendaftaran dengan nomor tersebut. Pastikan nomor sesuai saat pendaftaran.
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
                          <span>🔖 No Reg: {item.id}</span>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(
                          `Halo Admin Bimbel ABE-Q, saya ingin menanyakan jadwal untuk ${item.childName} (No Reg:${item.id}) pada tanggal ${item.date} sesi${item.sessionTime}.`
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

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <div>
            {!isAdminLoggedIn ? (
              /* Halaman Login Admin */
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
              /* Tampilan Dashboard Admin */
              <div className="space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Dashboard Manajemen Bimbel ABE-Q</h2>
                    <p className="text-xs text-slate-500">Total {bookings.length} Peserta Terdaftar di Sistem</p>
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

                {/* Filter & Pencarian */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Nama / No WA</label>
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

                {/* Tabel Data */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">No. Reg</th>
                          <th className="p-3">Nama Anak</th>
                          <th className="p-3">Jenjang</th>
                          <th className="p-3">Tanggal & Sesi</th>
                          <th className="p-3">No WA Ortu</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings
                          .filter(b => {
                            const matchSearch = b.childName.toLowerCase().includes(adminSearch.toLowerCase()) || b.parentPhone.includes(adminSearch);
                            const matchDate = adminFilterDate ? b.date === adminFilterDate : true;
                            const matchGrade = adminGradeFilter !== 'ALL' ? b.grade === adminGradeFilter : true;
                            return matchSearch && matchDate && matchGrade;
                          })
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-mono font-medium text-indigo-600">{b.id}</td>
                              <td className="p-3 font-semibold text-slate-800">{b.childName}</td>
                              <td className="p-3">
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{b.grade}</span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-700">{b.date}</div>
                                <div className="text-[11px] text-emerald-600">{b.sessionTime}</div>
                              </td>
                              <td className="p-3 font-mono">
                                <a 
                                  href={`https://wa.me/${b.parentPhone}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:underline flex items-center gap-1"
                                >
                                  {b.parentPhone}
                                </a>
                              </td>
                              <td className="p-3 text-center">
                                <button 
                                  onClick={() => deleteBooking(b.id)}
                                  className="text-rose-500 hover:text-rose-700 hover:underline font-semibold"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        {bookings.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center p-6 text-slate-400">Belum ada pendaftaran yang masuk.</td>
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

      {/* Footer */}
      <footer className="bg-white border-t py-4 text-center text-xs text-slate-400 mt-6">
        © {new Date().getFullYear()} Bimbel ABE-Q BGR UTR. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
