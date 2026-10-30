# Kartu Duel

Game kartu poker PvP. Tiap pemain punya 100 HP, adu kombinasi poker, selisih skor jadi damage ke yang kalah. Main online sama teman (beda device) atau lawan bot. Tampilan web pakai bahasa Inggris, ada mode terang/gelap (ikut setelan sistem, bisa diganti pakai tombol).

```bash
npm install
npm run dev     # buka http://localhost:3000
npm test        # unit test logika game
```

## Skor

Skor = nilai kombinasi + nilai semua kartu yang dimainkan (kartu tambahan di luar kombinasi ikut dihitung).
Kartu 2–9 sesuai angkanya, 10/J/Q/K = 10, As = 11. Contoh: 8 8 J J = 36 + Two Pair 30 = 66; tambah K jadi 76.

## Match effect

Tiap match diundi satu effect (`lib/effects.ts`) dari seed game, berlaku buat kedua pemain dari ronde 1 sampai selesai. Contoh: House Tax (Full House −30), Even Steven (+5 per kartu genap), Lone Wolf (High Card +25). Beda sama Joker yang dipilih sendiri tiap 3 ronde. Bot ikut ngitung effect pas milih kartu.

## Callout

- **Shutdown**: streak 3 serangan berturut-turut dipatahin lawan.
- **Legendary**: menang tanpa kena serangan sama sekali.
- **Epic comeback**: menang setelah lawan sempat streak 3 serangan.

Masing-masing punya suara sendiri. Logikanya di `lib/callouts.ts`, pakai `log` di state game (siapa yang ngasih damage tiap ronde).

## Main online

Room online pakai [Supabase Realtime](https://supabase.com/docs/guides/realtime) (broadcast + presence): satu orang bikin room dan dapat kode 5 huruf, yang lain gabung pakai kode itu.
Semua pesan lewat server Supabase pakai websocket, jadi tetap jalan di data seluler atau Wi-Fi yang ketat.
Host yang menjalankan game; device tamu cuma dikirimi kartunya sendiri, jadi kartu lawan ga bisa diintip sebelum dibuka.
Main online butuh env Supabase di bawah.

## Cari lawan (ranked)

Pemain yang lagi nyari masuk antrian Supabase Realtime. Yang paling lama nunggu jadi host dan dipasangin sama pemain berikutnya.
Kalau dalam 8–12 detik ga ada orang, lawannya bot dengan nama acak, levelnya ngikutin rank pemain (Rookie sampai Diamond).
Bot Gold dan Diamond milih buangan kartu dengan simulasi kemungkinan kartu yang bakal ditarik (ga ngintip deck).
Tiap ronde ada waktu 20 detik; kalau habis, kartu yang dipilih otomatis dimainin (atau 1 kartu acak). Latihan lawan bot ga pakai timer.

## Akun, rank, dan skin

Akun pakai Supabase Auth (username + password). Cari lawan dan Main sama teman butuh login; Latihan dan Tutorial bisa tanpa akun.

- Menang lawan pemain yang login: +1 bintang, +30 poin. Kalah: −1 bintang (minimal 0), +10 poin. Dicatat lewat `report_loss` dari device yang kalah, maksimal 10 kemenangan per pasangan per hari.
- Menang lawan bot di Cari lawan: +1 bintang, +30 poin. Kalah: −1 bintang (minimal 0), +10 poin. Match harus didaftarin dulu (`start_bot_match`), minimal 20 detik, sekali lapor, maksimal 100 per hari. Hasilnya dikirim dari device pemain, jadi ini cuma memperlambat kecurangan, bukan mencegah.
- Poin buat beli skin kartu (`buy_skin`, harga ada di tabel `skin_prices`). Lawan lihat skin kartumu selama main.
- Title achievement (`lib/titles.ts`): TOP N LEADERBOARD (ngikutin posisi top 3 sekarang, otomatis tampil), THE KING OF FULL HOUSE (25 Full House), UNTOUCHABLE (menang tanpa kena hit). Statistik dilapor sekali per match lewat `record_match_stats`, title dikasih `claim_titles`, dipasang lewat `equip_title`. Title yang dipakai kelihatan di bawah nama selama main.

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
- `lib/effects.ts`: match effect
- `lib/callouts.ts`: Shutdown, Legendary, Epic comeback
- `lib/titles.ts`: title achievement
- `lib/theme.ts`: mode terang/gelap
- `lib/scoring.ts`: skor akhir dan hitungan damage
- `lib/game.ts`: reducer (giliran barengan, discard, reveal, Joker, game over) dan `viewFor` yang nyembunyiin kartu lawan
- `lib/bot.ts`: AI bot
- `lib/net.ts`: room online (Supabase Realtime)
- `lib/sound.ts`: efek suara, disintesis pakai Web Audio (tanpa file audio)
- `lib/account.ts`: akun, profil, papan peringkat, rank, poin, skin (Supabase)
- `lib/matchmaking.ts`: antrian Cari lawan dan bot pengganti
- `lib/skins.ts`: daftar skin kartu
- `components/`: tampilan; `CardArt.tsx` gambar kartu (SVG), `Arena.tsx` animasi reveal, `Tutorial.tsx`, `ComboGuide.tsx`
