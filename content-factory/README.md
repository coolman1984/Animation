# Content Factory section / قسم مصنع المحتوى

> **Status: PLAN ONLY. No live integrations exist yet. / الحالة: خطة بس، مفيش أي توصيلة فعلية.**

## English
**What it does (planned):** takes finished outputs (videos, shorts, decks, posts) and distributes them:
1. **LinkedIn** — reels and posts.
2. **Telegram** — text or audio summaries.
3. **WhatsApp** — text or audio summaries.

**Pipeline:** generate (animation/presentations) → style (design-canva) → store/version (GitHub + Google Drive) → distribute (this section).

**Rules:**
- Nothing is published without the owner's explicit approval.
- No tokens, API keys, or passwords in this repo; credentials stay in a secrets manager.
- Each channel needs its account connected by the owner first (LinkedIn, Telegram bot, WhatsApp).

**Why it exists:** one place to publish everything consistently instead of ad-hoc posting.

**Relations:** consumes from `../animation/` and `../presentations/`, uses templates from `../design-canva/`.

## العربي
**بيعمل إيه (مخطّط):** ياخد المحتوى الجاهز (فيديوهات، شورتس، عروض، بوستات) ويوزّعه:
١. «لينكد إن» — ريلز وبوستات.
٢. «تيليجرام» — ملخّص مكتوب أو صوتي.
٣. «واتساب» — ملخّص مكتوب أو صوتي.

**الخطوات:** إنتاج (أنيميشن/عروض) ← تصميم (كانڤا) ← حفظ ونسخ (جيت هاب + درايف) ← توزيع (القسم ده).

**القواعد:**
- مفيش حاجة بتتنشر من غير موافقة المالك.
- مفيش مفاتيح ولا باسوردات في الريبو؛ الأسرار في مكان آمن بعيد.
- كل قناة لازم المالك يوصّل حسابها الأول.

**ليه موجود:** مكان واحد للنشر المنظّم بدل النشر العشوائي.

**علاقته بالباقي:** بياخد من `../animation/` و`../presentations/`، وبيستخدم قوالب `../design-canva/`.
