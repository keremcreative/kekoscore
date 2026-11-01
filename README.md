# kekoscore

Kişisel kullanım için reklamsız, takip kodsuz canlı skor uygulaması.

- **Maçlar:** Seçili liglerin günlük maçları, canlı maçlar 30 sn'de bir kendiliğinden yenilenir, "Canlı" filtresi.
- **Maç detayı:** Skor, goller/kartlar/değişiklikler, istatistikler.
- **Ligler:** Puan durumu.
- Telefonda tarayıcıdan açıp **Ana Ekrana Ekle** dersen uygulama gibi tam ekran çalışır.

## Çalıştırma

```bash
npm install
npm run dev          # gerçek veri (ESPN) → http://localhost:3000
npm run dev:mock     # internetsiz, örnek veriyle
```

## Veri kaynağı

Varsayılan kaynak ESPN'in herkese açık, anahtarsız uç noktaları (`lib/espn.ts`). Resmi bir API değil;
bir gün şekli değişirse yalnızca bu dosya düzeltilir. Başka bir kaynağa geçmek için aynı üç fonksiyonu
(`scoreboard`, `matchDetail`, `standings`) yazan yeni bir dosya ekleyip `lib/data.ts`'de seçmek yeterli.

Gösterilen ligler `lib/leagues.ts` içinde; ekle, çıkar, sırala.

## Yayına alma ve iPhone'a kurma

1. Bu depoyu GitHub'a gönder.
2. [vercel.com/new](https://vercel.com/new) adresinde GitHub ile giriş yap, depoyu seç, **Deploy**'a bas (ayar gerekmez, ücretsiz Hobby planı yeterli).
3. Çıkan adresi (ör. `kekoscore.vercel.app`) arkadaşlarına gönder.
4. iPhone'da adresi **Safari** ile aç → Paylaş düğmesi → **Ana Ekrana Ekle**. Uygulama simgesiyle tam ekran açılır.
