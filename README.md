# Neo Jakarta War Bot 2050
### Apa ini?
Tahun 2050, pemerintah pusat telah jatuh dan jatuh pula pemerintah kota Jakarta. Jakarta sekarang disebut sebagai **Neo Jakarta** dengan nama dan pembagian daerah baru yang masing-masing dipimpin dengan kelompok mafia yang berbeda. Tapi Neo Jakarta tidaklah damai. Para kelompok mafia tersebut berusaha keras untuk merebut daerah satu sama lain demi menguasai seluruh Neo Jakarta.

Proyek ini adalah program yang menjalankan bot **Neo Jakarta War Bot 2050** di https://www.facebook.com/jakarta2050. 

### Wait, gimana?
Neo Jakarta War Bot 2050 adalah sebuah halaman Facebook yang menampilkan daerah fiktif bernama Neo Jakarta di mana setiap daerah saling jajah-menjajah daerah lainnya. Pengambilan daerah dilakukan 100% secara acak oleh bot dengan algoritma sebagai berikut:
1. Bot akan secara acak memilih satu daerah yang ada. Kita sebut daerah terpilih sebagai **daerah penyerang**.
2. Bot akan melihat tetangganya, apakah ada tetangganya yang merupakan musuhnya (pemilik daerah tersebut berbeda dengan pemilik daerah penyerang).
3. Jika tidak ada, kembali ke poin 1.
4. Bot akan secara acak memilih satu tetangga yang merupakan musuhnya. Kita sebut daerah terpilih sebagai **daerah terserang**.
5. Kesimpulan: "Pemilik dari **daerah penyerang** mengambil alih/menjajah **daerah terserang**".

### Apakah ini toolkit/framework untuk bikin warbot sendiri?
Sayangnya tidak. Kode program ini masih cukup berantakan, semua action berada di satu file, dan tiap fungsi sangat dependen satu sama lain. Namun, kode program ini bisa sekadar untuk melihat bagaimana berinteraksi dengan API Facebook dalam membuat page bot.

# Setup
Instruksi di bawah ini adalah instruksi untuk menginstal dan menjalankan **Neo Jakarta War Bot 2050**.
## Kebutuhan
Untuk menjalankan Neo Jakarta War Bot 2050, anda perlu menginstal program ini terlebih dahulu:
1. Node.js
2. Node Package Manager (npm)

## Instalasi
### Mengunduh dependensi dari program
Silakan clone branch `master` dari repositori ini ke perangkat lokal anda buka Terminal anda dan jalankan perintah berikut pada root folder dari proyek ini:

```
npm install
```
Biarkan npm mengunduh semua dependensi yang tercatat di `package.json`.

### Mempersiapkan _environment variable_
Sebelum menjalankan program ini, anda perlu mempersiapkan file `.env` pada root folder dari proyek ini yang berisi Access Token Facebook halaman anda, `Page ID` dari halaman anda, serta `clientId` Imgur untuk mengunggah peta yang digambar.

Silakan buat file dengan nama `.env` pada root folder proyek yang berisi:
```
FB_ACCESS_TOKEN={ACCESS_TOKEN_HALAMAN_ANDA}
FB_PAGE_ID={PAGE_ID_HALAMAN_ANDA}
IMGUR_CLIENT_ID={CLIENT_ID_IMGUR}
``` 
Simpan file tersebut.

### Persiapan tambahan
Untuk sekarang, skrip bot tidak dapat berjalan jika tidak ada folder `outputs`. Silakan buat folder kosong bernama `outputs` di root proyek ini. Ke depannya, skrip akan mengecek terlebih dahulu apakah folder tersebut ada atau tidak.

### Menjalankan 
Jalankan bot dengan menjalankan perintah berikut:
```
node index.js
```
# Kontribusi
Silakan tuliskan masalah atau saran melalui fitur _Issues_ GitHub.

### Lisensi
**Neo Jakarta War Bot 2050** dilisensikan dengan [GNU General Public License v3](LICENSE.md). 