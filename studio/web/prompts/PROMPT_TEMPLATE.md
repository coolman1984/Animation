# Prompt template — one brief, any model (2026-11-06)

Every prompt in this library is this template plus one design brief (`<group>/<id>.md`). The `{{…}}` slots have the same names as
`site.json` (`hero.title` = the first hero section's title), so `node studio/studio.mjs web prompt <id> --site=<site>` fills them from a
planned site; a slot with no real value prints as `‹…›` and `web build` refuses it later. Order, always: **business → design → photo
conditions → steps → check on three sizes.** The steps are this studio's own stages A–D (`../WEB.md` "One workflow"); they are not a copy of
any outside library's steps.

<!-- ar -->
## ١. البيزنس (من العميل فقط)
- الاسم كما يُكتب في الشعار: {{brand.name}}
- عنوان الصفحة: {{title}} — وصف قصير للبحث: {{description}}
- اللغة: {{lang}} (العربي = `dir="rtl"`)
- الوعد في أول الصفحة: {{hero.title}}
- لمن، وما الذي يتغير: {{hero.subtitle}}
- الزر الوحيد في أعلى الصفحة: {{hero.cta.label}} ← {{hero.cta.href}}
- ما يقدمه (من كلام العميل): {{features.items}}
- الخطوة الأخيرة: {{cta.title}} — {{cta.text}} ← {{cta.cta.href}}
- أصدق مادة خام عند العميل (صور، أرقام، منتج): {{ambition.rawMaterial}}

## ٢. التصميم
{{design}}

النموذج المرجعي: `{{specimen}}` (افتحه بـ `node studio/studio.mjs gallery`). خذ منه التركيب والإيقاع، لا النص ولا الاسم.
ألوان البراند: لو للعميل ألوان، ضعها في `site.json` → `theme.tokens` (bg, ink, muted, accent, accent-ink, card, card-ink, line) وسيرفض
البناء أي تباين أقل من 4.5:1. خط واحد يدعم العربية (`gallery/LESSONS.md`).

## ٣. شرط الصور
- لو فيه فولدر `web/sites/<site>/photos/`: استخدم صوره فقط، وكل صورة لها سطر في `photos/CREDITS.json` (المصدر والمؤلف والرخصة).
- لو مافيش: لا تضع صورًا. اعرض المنتج بالكود (واجهة، رسم SVG، مجسم Three.js) أو صفحة نصية هادئة. لا صور مخترعة ولا أشخاص وهميون.

## ٤. خطوات التنفيذ (مراحل الاستوديو A–D)
1. اقرأ `studio/web/WEB.md` و`studio/web/gallery/LESSONS.md` والنموذج المرجعي.
2. `node studio/studio.mjs web plan <site> --brand=… --lang=ar` ثم اكتب كل خانة بكلام العميل.
3. اكتب `DESIGN.md` §A (الاتجاه وجملة الفكرة) و§B (`web system "…" --site=<site>`).
4. ابنِ بحركة بطل واحدة لها معنى للبيزنس، واكتب سببها وحالة الحركة المخففة في §C (`WEB.md` "Hero motion").
5. أرقام أو آراء عملاء؟ لكل واحد مصدر حقيقي. رقم تليفون أو إيميل وهمي = تحذير يجب حله.

## ٥. الفحص على ٣ مقاسات
`node studio/studio.mjs web check <site>` (موبايل 390، تابلت 820، كمبيوتر 1440 + حركة مخففة). صلّح كل أحمر، وانظر للشرائط بنفسك،
وسجّل في §D. جولتا تصحيح على الأكثر. أرسل `takes/web/<site>/REVIEW.md` والشرائط للمالك: «تمام ولا تعديل؟». لا نشر إلا بكلمة «انشر» (`../PUBLISH.md`).

<!-- en -->
## 1. The business (the client's words only)
- Name as the logo writes it: {{brand.name}}
- Page title: {{title}} — search description: {{description}}
- Language: {{lang}} (Arabic = `dir="rtl"`)
- The promise at the top: {{hero.title}}
- Who it is for and what changes: {{hero.subtitle}}
- The one top action: {{hero.cta.label}} → {{hero.cta.href}}
- What they offer (client's words): {{features.items}}
- Closing step: {{cta.title}} — {{cta.text}} → {{cta.cta.href}}
- The rawest real material the client has (photos, numbers, product): {{ambition.rawMaterial}}

## 2. The design
{{design}}

Reference example: `{{specimen}}` (open it with `node studio/studio.mjs gallery`). Take its structure and rhythm, never its copy or name.
Brand colours: put the client's colours in `site.json` → `theme.tokens`; the build refuses contrast under 4.5:1. One Arabic-capable family.

## 3. Photo conditions
- If `web/sites/<site>/photos/` exists: use only those photos, each with a row in `photos/CREDITS.json` (source, author, licence).
- If not: no photos. Show the product in code (UI, SVG drawing, Three.js object) or a quiet text-led page. No invented people or photos.

## 4. Steps (studio stages A–D)
1. Read `studio/web/WEB.md`, `studio/web/gallery/LESSONS.md` and the reference example.
2. `node studio/studio.mjs web plan <site> --brand=… --lang=…`, then write every slot in the client's words.
3. Write `DESIGN.md` §A (direction, idea sentence) and §B (`web system "…" --site=<site>`).
4. Build with ONE hero motion that means something for this business; its reason and reduced-motion state go in §C (`WEB.md` "Hero motion").
5. Numbers or quotes need a real source. A placeholder phone or email is a warning to resolve.

## 5. Check at three sizes
`node studio/studio.mjs web check <site>` (phone 390, tablet 820, desktop 1440 + reduced motion). Fix every red, look at the strips yourself,
log in §D; at most two correction rounds. Send `takes/web/<site>/REVIEW.md` and the strips to the owner: "fine, or a change?".
Nothing is published until the owner says «انشر» (`../PUBLISH.md`).
