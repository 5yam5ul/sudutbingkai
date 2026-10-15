export interface MicroFaq {
  question: string;
  answer: string;
}

export interface GuideArticle {
  slug: string;
  title: string;
  excerpt: string;
  tldr: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  coverImage: string;
  coverAlt: string;
  author: {
    name: string;
    role: string;
  };
  keywords: string[];
  content: {
    intro: string;
    sections: {
      heading: string;
      paragraphs: string[];
      keyTakeaways?: string[];
    }[];
    conclusion: string;
  };
  faqMicro: MicroFaq[];
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: 'souvenir-pernikahan-unik-kamera-tamu',
    title: 'Ide Souvenir Pernikahan Unik & Bermanfaat 2026: Kamera Tamu Sekali Pakai Digital',
    excerpt: 'Bosan dengan souvenir pernikahan yang berakhir di laci? Temukan bagaimana kamera sekali pakai digital (digital disposable camera) menjadi souvenir interaktif yang mengajak tamu ikut andil mengabadikan momen terindah.',
    tldr: 'Kamera sekali pakai digital adalah alternatif souvenir pernikahan interaktif modern tanpa instal aplikasi. Tamu memotret momen candid langsung lewat scan QR di meja, menghemat anggaran photobooth hingga 85%, dan menghasilkan arsip foto asli siap cetak tanpa kompresi.',
    category: 'Inspirasi Pernikahan',
    readingTime: '4 menit baca',
    publishedAt: '2026-10-10',
    updatedAt: '2026-10-15',
    coverImage: '/images/guides/souvenir-pernikahan-unik.jpg',
    coverAlt: 'Meja resepsi pernikahan elegan dengan standee barcode QR kamera tamu sekali pakai SudutBingkai',
    author: {
      name: 'Tim Redaksi SudutBingkai',
      role: 'Wedding Tech Specialist',
    },
    keywords: [
      'ide souvenir pernikahan unik',
      'souvenir pernikahan bermanfaat 2026',
      'souvenir pernikahan anti mainstream',
      'kamera sekali pakai digital',
      'kamera tamu pernikahan',
      'alternatif photobooth pernikahan',
    ],
    content: {
      intro: 'Dalam mempersiapkan pernikahan, memilih souvenir sering kali menjadi tantangan tersendiri bagi calon pengantin. Banyak pasangan menghabiskan jutaan rupiah untuk cinderamata fisik yang pada akhirnya hanya disimpan di laci atau bahkan terbuang. Di tahun 2026, tren souvenir pernikahan mulai bergeser ke arah pengalaman interaktif (experiential wedding souvenir), salah satunya lewat kehadiran kamera sekali pakai digital untuk para tamu.',
      sections: [
        {
          heading: 'Mengapa Souvenir Berbasis Pengalaman Lebih Berkesan?',
          paragraphs: [
            'Souvenir konvensional umumnya bersifat pasif: tamu menerima pouch, gantungan kunci, atau kipas saat memasuki gedung, lalu menyimpannya di tas. Sebaliknya, kamera sekali pakai digital mengubah tamu dari sekadar penonton menjadi kontributor cerita pernikahan.',
            'Dengan meletakkan kartu standee barcode QR estetik di setiap meja undangan, tamu diajak untuk memotret sudut-sudut resepsi dari perspektif mereka sendiri. Momen tawa saat reuni kawan lama, ekspresi haru orang tua di sudut ruangan, hingga kehebohan di meja prasmanan kini bisa terdokumentasikan secara utuh.',
          ],
          keyTakeaways: [
            'Biaya jauh lebih efisien dibanding mencetak ratusan souvenir fisik.',
            'Tamu merasa dilibatkan dan dihargai dalam perayaan sakral pengantin.',
            'Pengantin mendapatkan ratusan foto candid alami yang tidak mungkin terjangkau oleh tim fotografer utama.',
          ],
        },
        {
          heading: 'Sensasi Nostalgia Analog Tanpa Kerumitan Cuci Cetak',
          paragraphs: [
            'Kamera sekali pakai fisik (disposable camera analog) memang memiliki daya tarik retro yang luar biasa. Namun, biayanya sangat mahal (berkisar Rp 200.000 – Rp 300.000 per roll isi 27/36 jepretan), belum termasuk ongkos cuci scan lab film yang memakan waktu berhari-hari.',
            'SudutBingkai mengadopsi pesona visual analog tersebut—seperti warna hangat Portra 400, grain lembut film retro, dan stempel tanggal nostalgia—ke dalam format digital berbasis web browser. Tamu tidak perlu mengunduh aplikasi apa pun dari App Store maupun Play Store.',
          ],
        },
        {
          heading: 'Fitur Pesan Suara & Video Ucapan: Kado Kejutan Emosional',
          paragraphs: [
            'Selain foto candid, platform kamera digital modern menyediakan fitur pesan suara dan reels ucapan 15 detik. Tamu dapat merekam doa restu yang tulus langsung dari meja resepsi.',
            'Mendengarkan rekaman suara sahabat atau kakek-nenek bertahun-tahun setelah hari pernikahan adalah harta emosional yang nilainya tidak tergantikan oleh souvenir benda mati apa pun.',
          ],
        },
      ],
      conclusion: 'Memilih kamera sekali pakai digital sebagai souvenir interaktif bukan hanya menghemat anggaran pernikahan, melainkan juga memberikan pengalaman tak terlupakan bagi tamu dan mengumpulkan arsip kenangan terindah untuk kedua mempelai.',
    },
    faqMicro: [
      {
        question: 'Berapa biaya kamera sekali pakai digital dibanding souvenir fisik?',
        answer: 'Souvenir fisik 300 tamu menghabiskan Rp 6–9 juta, sedangkan paket Wedding SudutBingkai untuk 300 tamu hanya Rp 499.000 (hemat hingga 85%).',
      },
      {
        question: 'Apakah tamu usia tua bisa menggunakan kamera tamu ini?',
        answer: 'Sangat mudah. Tamu cukup membuka kamera bawaan ponsel lalu mengarahkan ke barcode QR di meja tanpa perlu mendaftar atau mengunduh aplikasi tambahan.',
      },
    ],
  },
  {
    slug: 'perbedaan-photobooth-vs-disposable-camera',
    title: 'Photobooth vs Kamera Sekali Pakai Digital: Mana yang Lebih Hemat & Seru?',
    excerpt: 'Bingung memilih antara sewa photobooth konvensional atau kamera tamu digital SudutBingkai? Simak perbandingan biaya, kepraktisan, antrean tamu, hingga kualitas kenangan yang didapat.',
    tldr: 'Photobooth konvensional membutuhkan biaya Rp 3–8 juta untuk durasi 2–3 jam dengan antrean fisik panjang, sedangkan kamera tamu digital SudutBingkai (mulai Rp 0 – Rp 499rb) dapat dinikmati seluruh tamu dari meja masing-masing tanpa batasan jam sewa dan dilengkapi live slideshow panggung.',
    category: 'Perbandingan Vendor',
    readingTime: '5 menit baca',
    publishedAt: '2026-10-12',
    updatedAt: '2026-10-15',
    coverImage: '/images/guides/photobooth-vs-disposable-camera.jpg',
    coverAlt: 'Tamu pernikahan ceria berswafoto candid di meja resepsi membandingkan photobooth dengan kamera digital SudutBingkai',
    author: {
      name: 'Tim Redaksi SudutBingkai',
      role: 'Wedding Tech Specialist',
    },
    keywords: [
      'perbedaan photobooth dan disposable camera',
      'sewa photobooth pernikahan murah',
      'biaya photobooth pernikahan',
      'alternatif photobooth resepsi',
      'kamera tamu digital pernikahan',
    ],
    content: {
      intro: 'Photobooth telah menjadi salah satu elemen populer dalam resepsi pernikahan di Indonesia selama satu dekade terakhir. Namun seiring berkembangnya teknologi dan kesadaran anggaran pernikahan (wedding budget efficiency), banyak pasangan modern mulai melirik kamera tamu digital sekali pakai sebagai alternatif cerdas. Bagaimana perbandingan langsung keduanya?',
      sections: [
        {
          heading: '1. Perbandingan Anggaran & Biaya Vendor',
          paragraphs: [
            'Sewa photobooth fisik dengan cetak strip instan biasanya dibanderol mulai dari Rp 3.000.000 hingga Rp 8.000.000 untuk durasi terbatas 2 hingga 3 jam saja.',
            'Sementara itu, platform kamera sekali pakai digital seperti SudutBingkai dibanderol mulai dari Rp 0 (Paket Starter) hingga Rp 499.000 (Paket Wedding untuk 300 tamu) tanpa batasan jam sewa. Pengantin dapat menghemat anggaran hingga 85% yang bisa dialokasikan untuk kebutuhan penting lainnya seperti katering atau honeymoon.',
          ],
        },
        {
          heading: '2. Antrean Tamu vs Fleksibilitas Meja',
          paragraphs: [
            'Salah satu kelemahan terbesar photobooth konvensional adalah penumpukan antrean tamu di dekat pintu masuk atau sudut ruangan. Tamu lansia atau mereka yang enggan mengantre sering kali melewatkan photobooth sama sekali.',
            'Dengan kamera digital sekali pakai via QR code, setiap meja makan berubah menjadi studio foto pribadi. Tamu cukup memindai kartu barcode di meja mereka saat menunggu giliran bersalaman atau saat menikmati hidangan prasmanan.',
          ],
        },
        {
          heading: '3. Variasi Foto: Pose Kaku vs Candid Alami',
          paragraphs: [
            'Foto di photobooth cenderung berulang: tamu berdiri tegak dengan properti kacamata plastik atau papan tulisan lucu. Walaupun menyenangkan, pose tersebut jarang menangkap interaksi tulus antar kawan lama.',
            'Kamera tamu digital menangkap percakapan intim, ekspresi haru saat pengantin memotong kue, canda tawa di meja keluarga, hingga momen spontan anak-anak bermain yang tidak pernah tertangkap oleh fotografer pelaminan.',
          ],
        },
        {
          heading: '4. Fitur Live Slideshow TV Panggung',
          paragraphs: [
            'Bagi pasangan yang tetap ingin menghadirkan hiburan visual di panggung utama, SudutBingkai menyediakan fitur Live Slideshow. Foto-foto yang baru saja dipotret tamu dari meja dapat disiarkan langsung ke layar LED atau proyektor panggung, menciptakan interaksi panggung yang sangat meriah.',
          ],
        },
      ],
      conclusion: 'Jika Anda mencari solusi dokumentasi yang hemat anggaran, bebas antrean, dan menghasilkan kenangan candid yang berlimpah ruah dari sudut pandang para tamu, kamera sekali pakai digital SudutBingkai adalah pilihan yang paling tepat.',
    },
    faqMicro: [
      {
        question: 'Apakah hasil foto kamera tamu bisa ditampilkan di proyektor panggung?',
        answer: 'Ya, SudutBingkai memiliki fitur Live Slideshow TV yang dapat dihubungkan ke laptop operator panggung untuk menayangkan foto candid tamu secara langsung.',
      },
      {
        question: 'Berapa durasi aktif galeri setelah acara usai?',
        answer: 'Seluruh foto, video, dan pesan suara aktif selama 30 hingga 60 hari setelah hari-H acara dan dapat diunduh gratis tanpa batas dalam format file ZIP resolusi asli.',
      },
    ],
  },
  {
    slug: 'cara-membuat-qr-code-foto-tamu',
    title: 'Panduan Lengkap Membuat Barcode QR Foto Tamu di Meja Resepsi Tanpa Aplikasi',
    excerpt: 'Langkah demi langkah membuat kartu barcode QR kamera sekali pakai untuk ditaruh di meja tamu resepsi pernikahan. Mudah, cepat 2 menit, dan langsung bisa dipakai tanpa download aplikasi.',
    tldr: 'Membuat barcode QR foto tamu di meja resepsi cukup memakan waktu 2 menit di SudutBingkai: buat nama acara, tentukan paket & filter analog favorit, lalu unduh dan cetak kartu standee meja otomatis siap pakai dengan petunjuk scan yang mudah dipahami semua usia.',
    category: 'Tutorial & Tips',
    readingTime: '3 menit baca',
    publishedAt: '2026-10-14',
    updatedAt: '2026-10-15',
    coverImage: '/images/guides/cara-membuat-qr-code-tamu.jpg',
    coverAlt: 'Tutorial flat lay cetak kartu barcode QR standee meja foto tamu pernikahan SudutBingkai',
    author: {
      name: 'Tim Redaksi SudutBingkai',
      role: 'Wedding Tech Specialist',
    },
    keywords: [
      'cara membuat barcode foto pernikahan',
      'qr code foto tamu resepsi',
      'tutorial kamera tamu nikahan',
      'cetak kartu meja qr code foto',
      'scan qr foto pernikahan tanpa aplikasi',
    ],
    content: {
      intro: 'Menyediakan barcode QR foto tamu di meja resepsi pernikahan adalah salah satu cara terbaik untuk mengajak para undangan ikut aktif mengabadikan hari bahagia Anda. Namun, bagaimana langkah praktis menyiapkannya dari awal hingga siap cetak?',
      sections: [
        {
          heading: 'Langkah 1: Buat Wadah Acara di SudutBingkai (2 Menit)',
          paragraphs: [
            'Masuk ke halaman Buat Acara (sudutbingkai.vercel.app/create), masukkan nama kedua mempelai (misal: Sarah & Budi), tanggal resepsi pernikahan, dan lokasi acara.',
            'Pilih paket yang sesuai dengan jumlah tamu Anda. Anda bisa memulai secara gratis dengan Paket Starter untuk mencoba alurnya, atau langsung memilih Paket Wedding untuk kapasitas hingga 300 tamu.',
          ],
        },
        {
          heading: 'Langkah 2: Tentukan Filter Analog & Pengaturan Reveal',
          paragraphs: [
            'Pilih filter emulasi film favorit yang selaras dengan tema dekorasi pernikahan Anda—seperti warna hangat Kodak Portra atau nuansa hitam putih klasik Ilford B&W.',
            'Tentukan waktu pembukaan album (reveal mode): Anda bisa mengaktifkan mode Instan (foto langsung muncul di galeri bersama) atau mode Delayed (foto baru terbuka serentak pukul 21.00 malam saat acara berakhir untuk kejutan bersama).',
          ],
        },
        {
          heading: 'Langkah 3: Unduh & Cetak Kartu Meja (Table Standee)',
          paragraphs: [
            'Setelah acara dibuat, Anda akan mendapatkan QR code unik acara beserta generator PDF Kartu Meja otomatis. Kartu ini sudah dilengkapi petunjuk singkat yang ramah untuk semua usia: "1. Scan Barcode", "2. Jepret Momen Terbaik", "3. Kirim Pesan Doa".',
            'Cetak kartu meja tersebut menggunakan kertas tebal seperti Art Carton 260gsm atau Linen, lalu letakkan di dalam akrilik standee di setiap meja makan tamu.',
          ],
        },
        {
          heading: 'Langkah 4: Unduh Seluruh Hasil Foto dalam Resolusi Asli',
          paragraphs: [
            'Setelah pesta usai, Anda dan pasangan dapat bersantai di rumah sambil membuka Dashboard Host. Seluruh foto candid, video reels, dan pesan suara dari para tamu dapat diunduh dalam 1 klik format file ZIP dengan resolusi tinggi siap cetak.',
          ],
        },
      ],
      conclusion: 'Hanya dalam hitungan menit, Anda telah menciptakan pengalaman interaktif berkesan bagi para tamu tanpa perlu repot mencetak souvenir mahal atau meminta tamu mengirimkan foto lewat WhatsApp satu per satu.',
    },
    faqMicro: [
      {
        question: 'Kertas apa yang paling bagus untuk mencetak kartu meja QR?',
        answer: 'Kami menyarankan menggunakan kertas Art Carton 260gsm, Ivory, atau kertas bertekstur Linen dengan finishing doff agar tidak memantulkan cahaya saat difoto.',
      },
      {
        question: 'Berapa banyak kartu barcode QR yang sebaiknya dicetak?',
        answer: 'Idealnya sediakan 1 kartu standee akrilik di setiap meja makan (round table) atau setiap jarak 1,5 meter pada long table prasmanan.',
      },
    ],
  },
];

export function getGuideBySlug(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((g) => g.slug === slug);
}

export function getAllGuides(): GuideArticle[] {
  return GUIDE_ARTICLES;
}
