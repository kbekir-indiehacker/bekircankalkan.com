# bekircankalkan.com

Yeni yazı: `src/content/yazilar/ornek-yazi.md` dosyasını kopyala, başlığı, özeti, tarihi ve metni değiştir, `draft: true` satırını sil.
Dosya adı adresi belirler (`benim-yazim.md` → `/yazilar/benim-yazim/`).

- `npm run dev`: yerelde yazarken önizleme
- `npm run build`: `dist/` klasörüne site çıktısı

Site adı ve açıklaması `src/site.ts` dosyasında.

Yayın: Cloudflare Pages (`bekircankalkan` projesi, Direct Upload). `git push` siteyi güncellemez; `npm run build` sonrası `dist/` Cloudflare'e yüklenir.
