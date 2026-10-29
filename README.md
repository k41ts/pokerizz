# Kartu Duel

Game kartu poker PvP. Tiap pemain punya 100 HP, adu kombinasi poker, selisih skor jadi damage ke yang kalah. Main online sama teman (beda device) atau lawan bot.

```bash
npm install
npm run dev     # buka http://localhost:3000
npm test        # unit test logika game
```

## Skor

Skor = nilai kombinasi + nilai semua kartu yang dimainkan (kartu tambahan di luar kombinasi ikut dihitung).
Kartu 2–9 sesuai angkanya, 10/J/Q/K = 10, As = 11. Contoh: 8 8 J J = 36 + Two Pair 30 = 66; tambah K jadi 76.

## Main online

Room online pakai [Supabase Realtime](https://supabase.com/docs/guides/realtime) (broadcast + presence): satu orang bikin room dan dapat kode 5 huruf, yang lain gabung pakai kode itu.
Semua pesan lewat server Supabase pakai websocket, jadi tetap jalan di data seluler atau Wi-Fi yang ketat.
Host yang menjalankan game; device tamu cuma dikirimi kartunya sendiri, jadi kartu lawan ga bisa diintip sebelum dibuka.
Main online butuh env Supabase di bawah.

## Akun dan rank

Akun pakai Supabase Auth (username + password). Tiap menang online lawan pemain yang juga login: +1 bintang.
Hasil dicatat lewat fungsi `report_loss` yang dipanggil device pihak yang kalah, jadi pemain ga bisa nambah bintang sendiri. Pasangan yang sama maksimal 10 kemenangan tercatat per hari.

Setup:

1. Jalankan `supabase/migrations/*.sql` di project Supabase.
2. Di dashboard Supabase: Authentication → Sign In / Providers → Email, matikan **Confirm email** (username diubah jadi email palsu yang ga bisa nerima surat).
3. Isi `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Tanpa env ini, game tetap jalan, cuma tanpa akun dan rank.

## Struktur

- `lib/cards.ts`: kartu, deck, RNG ber-seed, shuffle
- `lib/hands.ts`: deteksi kombinasi poker, kartu yang ngitung, nilai kartu
- `lib/jokers.ts`: daftar Joker dan efeknya
- `lib/scoring.ts`: skor akhir dan hitungan damage
- `lib/game.ts`: reducer (giliran barengan, discard, reveal, Joker, game over) dan `viewFor` yang nyembunyiin kartu lawan
- `lib/bot.ts`: AI bot
- `lib/net.ts`: room online (Supabase Realtime)
- `lib/sound.ts`: efek suara, disintesis pakai Web Audio (tanpa file audio)
- `lib/account.ts`: akun, profil, papan peringkat, rank (Supabase)
- `components/`: tampilan; `CardArt.tsx` gambar kartu (SVG), `Arena.tsx` animasi reveal, `Tutorial.tsx`, `ComboGuide.tsx`
