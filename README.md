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

## Sohbet ve üyelik (Supabase, ücretsiz)

Sohbet, kullanıcı hesapları ve maçlardaki "Kim kazanır?" anketi Supabase ile çalışır.
Ayar yapılmazsa uygulama bu özellikler olmadan çalışmaya devam eder.

1. [supabase.com](https://supabase.com) → New project (bölge: Frankfurt). Veritabanı şifresini bir yere kaydet.
2. **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştır → **Run**.
3. **Authentication → Sign In / Providers → Email**: "Confirm email" kapalı olsun → Save.
   (Kullanıcılar e-posta değil kullanıcı adıyla kaydoluyor, onay e-postası gidemez.)
4. **Project Settings → API Keys**: Project URL ve `anon` / publishable anahtarı kopyala.
5. Vercel → proje → **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/publishable anahtar
6. Vercel'de yeniden yayınla.

### İsteğe bağlı: Google ile giriş
1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).
   Authorized redirect URI: `https://<proje>.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google: Client ID ve Secret'ı gir, aç.
3. Supabase → Authentication → URL Configuration → Site URL: `https://kekoscore.vercel.app`
4. Vercel'e `NEXT_PUBLIC_GOOGLE_AUTH=1` ekle ve yeniden yayınla.

Not: iPhone'da ana ekrana eklenmiş uygulamada Google girişi Safari'ye atıp geri dönmeyebilir;
kullanıcı adı + şifre her yerde çalışır.
