# AI Console — Provider, Model & Prompt dari Database

UI admin untuk mengatur provider AI, model AI, dan prompt **tanpa rebuild/restart**, plus dashboard monitoring pemakaian AI.

## Akses

| Service | URL |
|---|---|
| api (9587) | `http://<host>:9587/api/mosa/ai-admin/ui/` |
| ai-assistant (9588) | `http://<host>:9588/api/mosa/ai-admin/ui/` |

Login memakai `ADMIN_USERNAME` / `ADMIN_PASSWORD` dari `.env` (token JWT ditandatangani `JWT_SECRET`, berlaku 12 jam).
Percobaan login dibatasi 10 kali per 15 menit.

## Halaman

- **Dashboard** — jumlah panggilan, tingkat sukses, latency, token, urutan model aktif per kegunaan, grafik, error terbaru.
- **Provider AI** — tambah/edit/nonaktifkan provider OpenAI-compatible. API key disimpan di DB **atau** diambil dari variabel `.env` (kolom "Env API key"). Key tidak pernah dikirim utuh ke browser. Tombol **Sync model** mengambil daftar model dari `GET {base_url}/models`.
- **Model AI** — tambah model, atur kegunaan, priority, temperature, max tokens, timeout; tombol **Tes** untuk uji cepat.
- **Prompt** — edit isi prompt (tabel `ai_prompts`). Setiap perubahan menyimpan versi lama ke `ai_prompt_histories` dan menaikkan versi; bisa dikembalikan dari **Riwayat**.
- **Log** — setiap panggilan model (termasuk percobaan fallback dan tombol Tes) di tabel `ai_logs`.
- **Pengaturan** — prompt yang dipakai chat, dan fallback on/off.

## Kegunaan model (purpose)

| Purpose | Dipakai oleh |
|---|---|
| `chat` | `/chat`, `/chat/stream`, validasi customer |
| `analysis` | terjemahan, ringkasan, analisis transkrip, `/summarize`, `/summarize-all` |

Untuk tiap purpose, model aktif (provider juga aktif dan punya API key) dengan **priority terkecil** dipakai lebih dulu.
Jika gagal dan fallback aktif, sistem mencoba model berikutnya. Model yang error diistirahatkan sementara
(60 detik; 10 menit untuk HTTP 401/403/404). Pada streaming, fallback hanya terjadi sebelum teks pertama terkirim.

Jika DB tidak bisa dibaca atau tidak ada model aktif untuk suatu purpose, sistem memakai konfigurasi `.env` lama
(`AI_MODEL_PROVIDER`, `SUMOPOD_*`, `OPENAI_*`, `STT_ANALYSIS_MODEL`).

## Kapan perubahan berlaku

Konfigurasi di-cache per proses selama `AI_CONFIG_CACHE_TTL_MS` (default 15 detik). Container yang menerima
perubahan langsung memakai konfigurasi baru; container lain paling lambat 15 detik kemudian.

## Belum diatur dari UI

- Transkripsi audio (`STT_MODE`, `STT_MODEL`, `OPENAI_STT_API_KEY`, `GOOGLE_STT_API_KEY`) masih dari `.env`.
- Instruksi tugas di `voice_service.js` (terjemahan/ringkasan/analisis) dan prompt validasi customer masih di kode,
  karena memuat parameter dinamis (bahasa output, instruksi HR).
- Model Mem0 server (container `mem0`) masih dari `.env`.

## Tabel

`ai_providers`, `ai_models`, `ai_settings`, `ai_prompt_histories`, `ai_logs` — dibuat oleh migration
`20261025000001_create_ai_providers_models_logs.js`, yang juga mengisi data awal dari `.env` saat migrasi dijalankan.
