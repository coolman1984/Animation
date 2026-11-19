# Integrated Media Company / شركة الميديا المتكاملة

This repo (Animation) is growing from a single animation studio into an integrated media company with four sections.
الريبو ده بيكبر من استوديو أنيميشن لشركة ميديا متكاملة فيها أربعة أقسام.

```
                 Animation repo (company root)
 ┌──────────────┬────────────────┬───────────────┬──────────────────┐
 │ animation/   │ presentations/ │ design-canva/ │ content-factory/ │
 │ videos &     │ link to        │ brand         │ LinkedIn,        │
 │ shorts       │ presentation-  │ identity      │ Telegram,        │
 │ (code in     │ studio (10     │ (Canva)       │ WhatsApp         │
 │ studio/)     │ tools)         │               │ (plan only)      │
 └──────┬───────┴───────┬────────┴───────┬───────┴────────┬─────────┘
        └──── produce ──┴── style ───────┴─── distribute ─┘
               Hub: GitHub + Google Drive (stable shared base)
```

| Section / القسم | Folder | Purpose / الغرض | Status / الحالة |
|---|---|---|---|
| Animation / الأنيميشن | [`animation/`](animation/README.md) (code in `studio/`) | Animated videos & shorts / فيديوهات وشورتس | Active (code in place) |
| Presentations / العروض | [`presentations/`](presentations/README.md) | Link to the private `presentation-studio` repo (10 tools) / رابط لريبو العروض | Linked (pointer only) |
| Design / التصميم | [`design-canva/`](design-canva/README.md) | Brand identity in Canva / هوية البراند | Docs only |
| Content Factory / مصنع المحتوى | [`content-factory/`](content-factory/README.md) | Distribution to LinkedIn, Telegram, WhatsApp / التوزيع | Plan only, no live integrations |

## How they relate / إزاي بيشتغلوا مع بعض
Animation and Presentations **produce** content; Design gives it the **look**; the Content Factory **distributes** it. Everything is versioned in GitHub with Google Drive as the shared base.
الأنيميشن والعروض **بيطلّعوا** المحتوى، والتصميم بيدّيله **الشكل**، ومصنع المحتوى **بيوزّعه**. وكله محفوظ في جيت هاب ومعاه درايف.

## Rules / القواعد
- No secrets in the repo / مفيش أسرار في الريبو.
- Nothing is published without the owner's approval / مفيش نشر من غير موافقة المالك.
- Code from `shorts-animator` is not copied here / كود `shorts-animator` ما اتنسخش هنا.

## Package: «موقع متحرك في يوم» — an animated site in one day (2026-11-06)
For local businesses (services, cafés, clinics, courses, shops). Uses the web department (`studio/web/WEB.md`), not a new tool.
1. **Pick the look with the client:** the gallery is the portfolio — `node studio/studio.mjs gallery`, and `web/gallery/devices.html`
   shows any example on phone, tablet and desktop side by side. All examples are labelled fictional.
2. **Brief:** the matching ready prompt (`studio/web/prompts/`), filled with the client's real name, offer, prices, contacts and photos
   (`photos/` + licence rows). Nothing invented.
3. **Build + check:** one working day: stages A–D, one hero motion that means something for the business, checked at three sizes.
4. **Owner review from the phone:** the three strips + «تمام ولا تعديل؟»; follow-ups from `FOLLOW_UPS.md`, at most two rounds.
5. **Publish only on «انشر»:** `studio/web/PUBLISH.md` (preview link, or Netlify + the client's domain on the client's account).
6. **Promo short (optional):** `web reel <site>` → content-factory, posted only after approval.
Prices for the package are the owner's decision; none are written here.

باقة «موقع متحرك في يوم» للعملاء المحليين: نختار الشكل من معرض النماذج (هو البورتفوليو) ← نملا البرومبت الجاهز ببيانات العميل الحقيقية ←
نبني ونفحص على الموبايل والتابلت والكمبيوتر ← المالك يراجع من الموبايل ← النشر بكلمة «انشر» بس ← وفيديو قصير للموقع لو العميل عايز.
