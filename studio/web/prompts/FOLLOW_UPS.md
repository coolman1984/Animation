# Follow-up prompts — ready to paste after the first build (2026-11-06)

The first build is rarely exactly what the client wants, especially after customising. Each follow-up below changes ONE thing, keeps
everything else, and ends with the same check. Run them with any model; `<site>` is the folder in `web/sites/`, `<id>` a section id.
Edit one section at a time with `node studio/studio.mjs web edit <site> --section=<id>` (prints it; `--file=` saves, rebuilds and re-checks
only that section). Every follow-up ends: **"then run `web check <site>` (or `web edit … --file=`), fix any red, and send me the strips."**

| # | When | Paste (العربي) | Paste (English) |
|---|---|---|---|
| 1 | Brand colours | «غيّر ألوان الموقع لألوان البراند دي: ‹hex…›. حطها في `theme.tokens` بس، وخلي التباين ٤٫٥:١ على الأقل، وما تغيرش أي نص.» | "Switch the site to these brand colours: ‹hex…›. Only `theme.tokens`; keep contrast ≥ 4.5:1; change no copy." |
| 2 | Brand font | «استخدم خط ‹اسم› لو هو في `web/styles/index.json` ويدعم العربي؛ لو مش موجود قول لي ومتغيرش.» | "Use ‹family› if it is registered in `web/styles/index.json` with an Arabic face; if not, tell me and change nothing." |
| 3 | Fix the phone | «افتح شريط الموبايل ٣٩٠. صلّح أكبر ٣ مشاكل بس (عرض زيادة، خط صغير، زرار أقل من ٤٤ بكسل)، من غير ما تغير الكمبيوتر.» | "Open the 390 px strip. Fix only the top three problems (overflow, text < 14 px, taps < 44 px) without changing desktop." |
| 4 | Calm the motion | «خفف الحركة: سيب حركة البطل بس، شيل أي ظهور مع السكرول على باقي الأقسام، وتأكد إن الحركة المخففة صفحة كاملة ثابتة.» | "Calm the motion: keep only the hero motion, remove scroll reveals elsewhere, and confirm reduced motion is a still, complete page." |
| 5 | Stronger hero motion | «حركة البطل مش واضحة. خليها تشرح ‹الفكرة› أكتر، واكتب السبب الجديد في DESIGN.md §C.» | "The hero motion is unclear. Make it explain ‹idea› better; write the new reason in DESIGN.md §C." |
| 6 | Swap photos | «بدّل الصور بالصور اللي في `photos/`، وسجّل لكل صورة مصدرها ورخصتها في `photos/CREDITS.json`، واكتب نص بديل لكل صورة.» | "Swap the images for the ones in `photos/`; record each one's source and licence in `photos/CREDITS.json`; write alt text for each." |
| 7 | No photos yet | «مافيش صور حقيقية. شيل كل صورة واعرض المنتج بالكود أو خلي الصفحة نصية هادئة.» | "No real photos. Remove every image; show the product in code or make the page quietly text-led." |
| 8 | Real contacts | «فيه تليفون أو إيميل وهمي في التحذيرات. حط بيانات العميل الحقيقية دي: ‹…› أو شيل السطر.» | "The build warns of a placeholder phone/email. Use the client's real ones: ‹…›, or remove the line." |
| 9 | Copy | «اكتب العناوين بعربي فصيح بسيط وواضح: الوعد، جملة شرح، زرار واحد. بدون عامية ولا تلاعب لفظي.» | "Rewrite headlines in clear Modern Standard Arabic: promise, one explaining line, one button. No slang, no puns." |
| 10 | One section | «عدّل قسم ‹id› بس: ‹التعديل›. باقي الموقع زي ما هو.» | "Change only section ‹id›: ‹change›. Leave the rest of the site as it is." |
| 11 | English version | «اعمل نسخة إنجليزي في فولدر جديد بنفس التصميم. الاتجاه بيتقلب لوحده (`dir`)؛ اتأكد إن مفيش left/right مكتوبة في الكود.» | "Make an English version in a new folder with the same design. Direction flips by `dir`; check no left/right is hard-coded." |
| 12 | Before publishing | «جهّز الموقع للنشر: اتأكد إن `dist/` فولدر واحد بمسارات نسبية، ومفيش تحذير «not portable»، وما تنشرش لحد ما أقول «انشر».» | "Prepare for publishing: `dist/` is one folder with relative paths and no "not portable" warning. Do not publish until I say «انشر»." |
