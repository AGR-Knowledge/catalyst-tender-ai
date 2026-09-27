import type { ExtractField } from '../types';
import type { ExtractedTenderGccAr } from './types-ar';
import { T042_CONFLICTS, T042_DOC_KEY, T042_REF, T042_REQUIREMENTS, T042_TITLE_EN } from '../../gcc/tenants/batinah-042';

// The synthetic Arabic tender document of T-2026-042 (plan 023): public/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf,
// built by scripts/demo-itt/ilra-042. Every item carries the Arabic it was read from (`source`) and its page.
// Pages 15–17 are scanned images read by OCR: their items are low confidence, with the reason in `note`, and their
// sources keep the Eastern Arabic digits as printed. `npm --prefix app run demo-itt:ilra` checks every source
// against its page, so keep each entry on one line, with `page:` before `source:`.

type F = ExtractField & { source: string };

const OCR = 'Scanned page read by OCR (Eastern Arabic digits).';
const STAMPED = 'Scanned table read by OCR; a stamp covers the figures. Check against the electronic BOQ.';

const IDENTITY: F[] = [
  { label: 'Reference', value: T042_REF, page: 1, confidence: 'high', source: 'رقم المناقصة ILRA/RD/2026/042' },
  { label: 'Title', value: T042_TITLE_EN, page: 1, confidence: 'high', source: 'ازدواجية طريق صحار – البريمي، القطاع الثاني (38 كم)، مع جسرين وأعمال تصريف مياه الأمطار والإنارة' },
  { label: 'Issuer', value: 'Interior Links Roads Authority, Directorate General of Projects', page: 2, confidence: 'high', source: 'هيئة طرق الربط الداخلي، المديرية العامة للمشاريع' },
  { label: 'Parent entity', value: 'Not stated in this document', page: 2, confidence: 'low', note: 'The owner line (الجهة المالكة) names only the Authority and its Directorate General of Projects; no ministry or parent body is named anywhere in the document.', source: 'الجهة المالكة' },
  { label: 'Country and region', value: 'Sultanate of Oman: Wilayat of Sohar, North Al Batinah Governorate', page: 1, confidence: 'high', source: 'ولاية صحار، محافظة شمال الباطنة' },
  { label: 'Procurement type', value: 'Open public tender, two envelopes (technical and financial), through the e-tendering system', page: 1, confidence: 'high', source: 'مناقصة عامة بمظروفين (فني ومالي) عبر نظام المناقصات الإلكتروني' },
  { label: 'Portal', value: 'The Tender Board e-tendering system', page: 2, confidence: 'medium', note: 'The document says "the e-tendering system". The listing was captured from the Tender Board portal.', source: 'تقدم العطاءات إلكترونياً عبر نظام المناقصات الإلكتروني' },
  { label: 'Document language', value: 'Arabic only: a bid written in another language is not accepted; the Arabic text prevails (§7)', page: 5, confidence: 'high', note: 'The English values here are a reading aid.', source: 'ولا يقبل أي عطاء محرر بغير اللغة العربية' },
];

const COMMERCIAL: F[] = [
  { label: 'Estimated value', value: 'Not published', page: 15, confidence: 'low', note: `${OCR} The BOQ summary gives quantities only; the platform estimate is shown separately and labelled as an estimate.`, source: 'لا تتضمن هذه الصفحة أي أسعار' },
  { label: 'Currency', value: 'Omani rials; payment in the same currency (§8)', page: 5, confidence: 'high', source: 'تسعر العطاءات بالريال العماني' },
  { label: 'Contract basis', value: 'Re-measured contract at the BOQ unit rates (§2)', page: 4, confidence: 'high', source: 'على أساس عقد إعادة قياس بأسعار الوحدات الواردة في جدول الكميات' },
  { label: 'Taxes', value: 'Unit rates exclude VAT, which is added at 5% and shown separately in the BOQ and the Form of Bid (§9)', page: 5, confidence: 'high', source: 'ولا تشمل ضريبة القيمة المضافة، التي تضاف بنسبة (5%) وتبين مستقلة' },
  { label: 'Advance payment', value: 'Up to 10% of the contract value against an equal bank guarantee, recovered in equal instalments (§20)', page: 7, confidence: 'high', source: 'يجوز للمقاول أن يطلب دفعة مقدمة لا تزيد على (10%) من قيمة العقد، مقابل ضمان بنكي مساو لها' },
  { label: 'Payment terms', value: 'Monthly interim payments, paid within 56 days of the consultant approving each certificate (§21)', page: 7, confidence: 'high', source: 'ويصرف المستحق خلال (56) يوماً من تاريخ اعتماد المستخلص من الاستشاري' },
  { label: 'Retention', value: '5% of each interim payment: half released at provisional acceptance, half at the end of maintenance (§22)', page: 7, confidence: 'high', source: 'تحتجز نسبة (5%) من قيمة كل مستخلص' },
  { label: 'Price adjustment', value: 'None: unit rates fixed for the whole contract (§29)', page: 8, confidence: 'high', source: 'أسعار الوحدات ثابتة طوال مدة العقد' },
  { label: 'BOQ', value: 'Summary of 20 main items in 7 bills (Annex 2); the detailed BOQ has 214 lines, priced in the electronic file', page: 15, confidence: 'low', note: OCR, source: 'ويسعر المناقص جدول الكميات المفصل (٢١٤ بنداً)' },
  { label: 'BOQ 4.02 box culverts', value: '1,860 m of precast box culverts, various sizes', page: 15, confidence: 'low', note: STAMPED, source: 'عبارات صندوقية مسبقة الصب بمقاسات مختلفة م.ط ١٬٨٦٠' },
  { label: 'BOQ 4.05 stormwater pipes', value: '4,200 m of concrete stormwater pipes, 600–1,200 mm', page: 15, confidence: 'low', note: STAMPED, source: 'أنابيب خرسانية لتصريف مياه الأمطار، قطر ٦٠٠–١٢٠٠ مم م.ط ٤٬٢٠٠' },
];

const GUARANTEES: F[] = [
  { label: 'Bid bond', value: 'Two amounts: 1% of the bid value (§12, p. 5) and a fixed OMR 300,000 on the bond form (Annex 4, p. 17)', page: 5, confidence: 'low', note: 'Conflict. The agent shows both and does not choose. At the platform estimate, 1% is about OMR 320,000. Query drafted.', source: 'يجب أن يرفق بالعطاء ضمان عطاء بنسبة (1%) من قيمة العطاء' },
  { label: 'Bid bond on the form', value: 'OMR 300,000, fixed: "an amount not exceeding three hundred thousand Omani rials"', page: 17, confidence: 'low', note: `${OCR} A blank form (the bank's name, signature and seal to be completed), with the tender committee's approval stamp.`, source: 'مبلغاً لا يتجاوز (٣٠٠٬٠٠٠) ثلاثمائة ألف ريال عماني' },
  { label: 'Bid bond form', value: 'Unconditional and irrevocable, payable on first written demand, from a bank licensed in Oman; no cheques or cash (§12)', page: 5, confidence: 'high', source: 'ويجب أن يكون الضمان غير مشروط وغير قابل للإلغاء' },
  { label: 'Bid bond validity', value: 'The bid validity plus 28 days, to Sat 22 Aug 2026 (Annex 4)', page: 17, confidence: 'low', note: OCR, source: 'ويظل هذا الضمان سارياً طوال مدة سريان العطاء وحتى (٢٨) يوماً بعد انتهائها' },
  { label: 'Original bid bond', value: 'Original delivered to the tender committee secretariat at the Authority in Sohar before the deadline (§14)', page: 6, confidence: 'high', source: 'ويسلم أصل ضمان العطاء إلى أمانة لجنة المناقصات بمبنى الهيئة في صحار' },
  { label: 'Performance bond', value: '5% of the contract value, valid until final acceptance after maintenance (§19)', page: 7, confidence: 'high', source: 'يقدم المقاول ضمان حسن تنفيذ بنسبة (5%) من قيمة العقد' },
  { label: 'Advance payment guarantee', value: 'Equal to the advance, reducing as it is recovered (§20)', page: 7, confidence: 'high', source: 'ويخفض الضمان بقدر ما يسترد منها' },
];

const TIME: F[] = [
  { label: 'Issue date', value: 'Sun 8 Mar 2026, corresponding to 19 Ramadan 1447 H (approx.)', page: 1, confidence: 'high', source: 'الأحد 8 مارس 2026م، الموافق 19 رمضان 1447هـ (تقريبي)' },
  { label: 'Site visit', value: 'Sun 15 Mar 2026, 09:00, meeting at the Sohar interchange; the certificate goes in the technical envelope (§6)', page: 4, confidence: 'high', source: 'تنظم الهيئة زيارة لموقع المشروع يوم الأحد 15 مارس 2026م في تمام الساعة 09:00 صباحاً' },
  { label: 'Questions deadline', value: 'Tue 24 Mar 2026, in writing through the e-tendering system (§5)', page: 4, confidence: 'high', source: 'في موعد أقصاه يوم الثلاثاء 24 مارس 2026م' },
  { label: 'Answers to questions', value: 'Addenda within 7 days of the questions deadline: by Tue 31 Mar 2026 (§5)', page: 4, confidence: 'high', source: 'خلال (7) سبعة أيام من آخر موعد لتلقي الاستفسارات' },
  { label: 'Submission deadline', value: 'Sun 26 Apr 2026, 12:00 (§14)', page: 6, confidence: 'high', source: 'في موعد أقصاه الساعة 12:00 ظهراً من يوم الأحد 26 أبريل 2026م' },
  { label: 'Bid opening', value: 'Sun 26 Apr 2026, 12:30: technical envelopes only (§16)', page: 6, confidence: 'high', source: 'تفتح المظاريف الفنية في الساعة 12:30 ظهراً من يوم الأحد 26 أبريل 2026م' },
  { label: 'Bid validity', value: '90 days from the opening of the technical envelopes, to Sat 25 Jul 2026 (§10)', page: 5, confidence: 'high', source: 'يظل العطاء سارياً لمدة (90) تسعين يوماً من تاريخ فتح المظاريف الفنية' },
  { label: 'Performance bond due', value: 'Within 15 days of the award notice (§18)', page: 6, confidence: 'high', source: 'خلال (15) خمسة عشر يوماً من تاريخ الإخطار' },
  { label: 'Contract duration', value: '30 months from site handover, then a 12-month maintenance period (§23)', page: 7, confidence: 'high', source: 'مدة تنفيذ الأعمال (30) ثلاثون شهراً من تاريخ تسليم الموقع' },
];

const EVALUATION: F[] = [
  { label: 'Method', value: 'Technical evaluation out of 100, pass mark 70; then the lowest technically qualified price after arithmetic correction (§17)', page: 6, confidence: 'high', source: 'ويشترط للتأهل الفني الحصول على (70) درجة على الأقل' },
  { label: 'Technical criteria', value: 'Similar experience 30; method statement and programme 30; team and equipment 20; Omanisation plan and SME subcontracting 20', page: 6, confidence: 'high', source: 'خطة التعمين وإسناد الأعمال إلى المؤسسات الصغيرة والمتوسطة' },
  { label: 'Award', value: 'Lowest technically qualified price after arithmetic correction (§17)', page: 6, confidence: 'high', source: 'ثم ترسى المناقصة على أقل العطاءات المؤهلة فنياً سعراً بعد التصحيح الحسابي' },
];

const SUBMISSION: F[] = [
  { label: 'Envelopes', value: 'Technical: qualification documents, site-visit certificate, Omanisation plan, SME undertaking, programme, method statement, team. Financial: Form of Bid, priced BOQ, copy of the bid bond (§13)', page: 6, confidence: 'high', source: 'يقدم العطاء في مظروفين منفصلين' },
  { label: 'Prices', value: 'No reference to prices in the technical envelope (§13)', page: 6, confidence: 'high', source: 'ولا يجوز أن يتضمن المظروف الفني أي إشارة إلى الأسعار' },
  { label: 'Language', value: 'The bid and every document in Arabic; catalogues in another language need a certified Arabic translation; the Arabic text prevails (§7)', page: 5, confidence: 'high', note: 'Arabic-only document: the English values are a reading aid; the bid must be submitted in Arabic.', source: 'يحرر العطاء وجميع المستندات والمراسلات المتعلقة به باللغة العربية' },
  { label: 'Site-visit certificate', value: 'Issued at the visit and filed in the technical envelope; a bid without it is not accepted (Annex 3)', page: 16, confidence: 'low', note: OCR, source: 'ولا يقبل العطاء غير المصحوب بها' },
  { label: 'Omanisation plan', value: 'Plan of Omani staff by trade and share through the works, at least the Ministry of Labour ratios for construction (§11)', page: 5, confidence: 'high', source: 'يرفق المناقص بالمظروف الفني خطة للتعمين' },
  { label: 'Omanisation certificate', value: 'Ministry of Labour compliance certificate, valid on the submission date', page: 12, confidence: 'high', source: 'شهادة الالتزام بنسب التعمين صادرة من وزارة العمل' },
  { label: 'Joint ventures', value: 'Notarised JV agreement naming the lead; joint and several liability; every member meets rows 1–5; the lead meets 60% of the turnover row; experience combined', page: 13, confidence: 'high', source: 'يرفق اتفاق الائتلاف موثقاً' },
  { label: 'Late bids', value: 'Not accepted; no change or withdrawal after the deadline (§15)', page: 6, confidence: 'high', source: 'لا يقبل أي عطاء يرد بعد الموعد المحدد لتقديم العطاءات' },
  { label: 'Form of Bid', value: 'Annex 5, signed and stamped; the bidder confirms that the Arabic text is authoritative', page: 18, confidence: 'high', source: 'نقر بأن النص العربي لوثائق المناقصة هو النص المعتمد' },
];

const RISK: F[] = [
  { label: 'Delay damages', value: '0.05% of the contract value per day, capped at 10% (§24)', page: 8, confidence: 'high', source: 'توقع عليه غرامة تأخير بنسبة (0.05%) من قيمة العقد عن كل يوم تأخير، بحد أقصى (10%) من قيمة العقد' },
  { label: 'SME subcontracting', value: 'At least 10% of the contract to registered SMEs, with an undertaking in the bid; whether 10% counts value or the number of subcontracts is not stated (§26)', page: 8, confidence: 'medium', note: 'Interpretation line; query drafted.', source: 'يلتزم المقاول بإسناد ما لا يقل عن (10%) من العقد إلى مؤسسات صغيرة ومتوسطة مسجلة' },
  { label: 'Subcontracting', value: 'Only with the Authority prior written approval; the contractor stays fully liable (§25)', page: 8, confidence: 'high', source: 'لا يجوز للمقاول التعاقد من الباطن على أي جزء من الأعمال إلا بعد الحصول على موافقة كتابية مسبقة من الهيئة' },
  { label: 'Omanisation', value: 'The construction ratios for the whole contract, reported quarterly (§27)', page: 8, confidence: 'high', source: 'يلتزم المقاول بتحقيق نسب التعمين المقررة لقطاع الإنشاءات طوال مدة العقد' },
  { label: 'Section length', value: '38 km in the scope (§31, p. 9); 36.5 km on drawing G-001 (p. 14)', page: 9, confidence: 'medium', note: 'Conflict, not blocking: it moves the paving, lighting and markings quantities. Query drafted.', source: 'ويبلغ طوله الإجمالي (38) كم' },
  { label: 'Live traffic', value: 'Traffic kept moving on the existing road throughout; each section needs an approved diversion plan first (§31, §40)', page: 9, confidence: 'high', source: 'على أن يحافظ المقاول على حركة المرور في الطريق القائم طوال مدة التنفيذ' },
  { label: 'Insurance', value: 'Contractor all risks, third-party liability and employees, through construction and maintenance (§28)', page: 8, confidence: 'high', source: 'يؤمن المقاول على الأعمال ضد جميع أخطار المقاولين' },
];

/** Where each qualification row is printed (Section 5), for the eligibility items. */
const PQ_SOURCE: Record<string, { page: number; source: string }> = {
  'PQ-01': { page: 12, source: 'سجل تجاري ساري المفعول في سلطنة عمان يشمل نشاط إنشاء الطرق والجسور' },
  'PQ-02': { page: 12, source: 'التسجيل لدى مجلس المناقصات في مجال إنشاء الطرق والجسور بالدرجة الممتازة' },
  'PQ-03': { page: 12, source: 'عضوية سارية في غرفة تجارة وصناعة عمان' },
  'PQ-04': { page: 12, source: 'شهادات أنظمة إدارة الجودة والبيئة والصحة والسلامة المهنية' },
  'PQ-05': { page: 12, source: 'اعتماد المناقص مقاولاً معتمداً في برنامج الطرق الوطني' },
  'PQ-06': { page: 13, source: 'لا تقل قيمة كل منهما عن (10,000,000) ريال عماني' },
  'PQ-07': { page: 13, source: 'أن يكون المناقص قد نفذ جسراً واحداً على الأقل ببحر لا يقل عن (60) م' },
  'PQ-08': { page: 13, source: 'الالتزام بإسناد ما لا يقل عن (10%) من العقد إلى مؤسسات صغيرة ومتوسطة مسجلة' },
  'PQ-09': { page: 13, source: 'ألا يقل متوسط حجم الأعمال السنوي للمناقص خلال السنوات المالية الثلاث (3) الأخيرة عن (20,000,000) ريال عماني' },
};

export const ILRA_042: ExtractedTenderGccAr = {
  key: T042_DOC_KEY,
  fileNames: ['ILRA-RD-2026-042-booklet-ar.pdf', 'وثائق المناقصة ILRA-RD-2026-042.pdf'],
  // Printed: 'وثائق المناقصة العامة' (cover).
  docType: 'General tender documents',
  pages: 18,
  language: 'Arabic',
  // Pages 15–17 (BOQ summary, site-visit certificate, Form of Bid Bond) are scanned images.
  scanned: true,
  ocrPages: [15, 16, 17],

  title: T042_TITLE_EN,
  shortName: 'Sohar–Buraimi road dualling',
  refNo: T042_REF,
  issued: '2026-03-08',
  authority: 'Interior Links Roads Authority, Directorate General of Projects',
  parent: null,
  country: 'Oman',
  location: 'Section 2 of the Sohar–Buraimi road, km 24+000 to km 62+000, beside Wadi Al Jizzi; Wilayat of Sohar, North Al Batinah',
  sector: 'Transport',
  mode: 'Construction; re-measured unit rates; 30 months plus 12 months of maintenance',
  currency: 'OMR',
  valueDisplay: null,
  valueCr: null,

  // Headline facts, in English: what plan 012's "Read in English" shows first.
  summary: [
    { label: 'What', value: 'Dualling 38 km of the Sohar–Buraimi road (section 2), with two bridges, stormwater drainage and street lighting', page: 9, confidence: 'high', source: 'تحويل الطريق القائم ذي الحارة الواحدة في كل اتجاه إلى طريق مزدوج بحارتين في كل اتجاه' },
    IDENTITY[5],
    TIME[8],
    GUARANTEES[0],
    TIME[6],
    RISK[1],
    IDENTITY[7],
  ],
  dates: [
    { label: 'Published', date: '2026-03-08', page: 1, confidence: 'high', source: 'الأحد 8 مارس 2026م، الموافق 19 رمضان 1447هـ (تقريبي)' },
    { label: 'Site visit', date: '2026-03-15', time: '09:00', page: 4, confidence: 'high', source: 'ويكون التجمع عند تقاطع صحار في بداية القطاع الثاني' },
    { label: 'Questions deadline', date: '2026-03-24', page: 4, confidence: 'high', source: 'في موعد أقصاه يوم الثلاثاء 24 مارس 2026م' },
    { label: 'Answers to questions', date: '2026-03-31', page: 4, confidence: 'high', source: 'وتصدر الهيئة ردودها في صورة ملاحق خلال (7) سبعة أيام' },
    { label: 'Submission deadline', date: '2026-04-26', time: '12:00', page: 6, confidence: 'high', source: 'في موعد أقصاه الساعة 12:00 ظهراً من يوم الأحد 26 أبريل 2026م' },
    { label: 'Bid opening', date: '2026-04-26', time: '12:30', page: 6, confidence: 'high', source: 'تفتح المظاريف الفنية في الساعة 12:30 ظهراً' },
    { label: 'Bid validity ends', date: '2026-07-25', page: 5, confidence: 'high', source: 'يظل العطاء سارياً لمدة (90) تسعين يوماً من تاريخ فتح المظاريف الفنية' },
    { label: 'Bid bond valid to (at least)', date: '2026-08-22', page: 17, confidence: 'low', source: 'وحتى (٢٨) يوماً بعد انتهائها' },
  ],
  eligibility: T042_REQUIREMENTS.map((r) => ({
    label: r.id, value: r.text, page: PQ_SOURCE[r.id].page, confidence: r.reading ? 'medium' : 'high', source: PQ_SOURCE[r.id].source,
    ...(r.reading ? { note: r.reading } : r.note ? { note: r.note } : {}),
  })),
  scope: [
    { text: 'Dualise section 2 of the Sohar–Buraimi road, 38 km, beside Wadi Al Jizzi', page: 9, source: 'ويبلغ طوله الإجمالي (38) كم، ويمر بمحاذاة وادي الجزي' },
    { text: 'Turn the single carriageway (one lane each way) into a dual carriageway with two lanes each way, a central median and paved shoulders', page: 9, source: 'تحويل الطريق القائم ذي الحارة الواحدة في كل اتجاه إلى طريق مزدوج بحارتين في كل اتجاه' },
    { text: 'Two bridges: the Wadi Al Jizzi bridge, 192 m long, with a 64 m main span and four 32 m approach spans, and an overpass at the km 41 interchange with two 34 m spans', page: 9, source: 'جسر وادي الجزي بطول (192) م ببحر رئيسي قدره (64) م' },
    { text: 'Bridge decks: an in-situ post-tensioned concrete box girder for the 64 m main span; precast prestressed beams for the approach spans and the overpass', page: 11, source: 'من كمرة صندوقية خرسانية ذات شد لاحق تصب في الموقع' },
    { text: 'Stormwater drainage: precast box culverts and pipes in the wadi channels, with rock protection', page: 9, source: 'عبارات صندوقية مسبقة الصب وأنابيب في مجاري الأودية' },
    { text: 'Pavement: 200 mm granular subbase, 150 mm road base, 120 mm asphalt base in two layers and a 50 mm polymer-modified wearing course', page: 10, source: 'يتكون قطاع الرصف للطريق المزدوج من الطبقات التالية' },
    { text: 'Bridge bearings and expansion joints from approved makers with at least ten years of experience; the maker supervises installation', page: 11, source: 'من مصنعين معتمدين ذوي خبرة لا تقل عن عشر سنوات' },
    { text: 'Street lighting: LED luminaires on 12 m galvanised double-arm columns in the median', page: 11, source: 'تكون أعمدة الإنارة مجلفنة بارتفاع (12) م ومزدوجة الذراع على الجزيرة الوسطية' },
    { text: 'Road markings, signs and W-beam safety barriers with crash cushions', page: 11, source: 'وتكون حواجز الأمان معدنية مجلفنة من النوع W مع وسائد امتصاص الصدمات عند نهاياتها' },
    { text: 'Traffic diversions during construction, and coordination of utility relocations', page: 9, source: 'تحويل حركة المرور أثناء التنفيذ، والتنسيق مع الجهات المختصة لنقل الخدمات القائمة' },
    { text: 'As-built drawings, lighting O&M manuals and training for the Authority staff', page: 9, source: 'ويدرب موظفي الهيئة على تشغيلها' },
  ],
  evaluation: EVALUATION,
  submission: SUBMISSION,
  contacts: [
    { name: 'Chair of the Tender Committee', role: 'Signs the invitation; questions only through the e-tendering system (§5)', org: 'Interior Links Roads Authority', address: 'Authority building, Sohar (§14)', page: 2 },
  ],
  clauses: [
    { ref: '§5', title: 'Questions', summary: 'In writing by Tue 24 Mar 2026; addenda within 7 days of that deadline', page: 4, source: 'تقدم الاستفسارات كتابة عبر النظام الإلكتروني' },
    { ref: '§6', title: 'Site visit', summary: 'Sun 15 Mar 2026, 09:00, from the Sohar interchange; certificate in the technical envelope', page: 4, source: 'وترفق الشهادة بالمظروف الفني' },
    { ref: '§7', title: 'Language', summary: 'Arabic only; the Arabic text prevails', page: 5, source: 'ويعتد بالنص العربي عند الاختلاف' },
    { ref: '§9', title: 'Prices and tax', summary: 'Rates exclude VAT, added at 5% and shown separately', page: 5, source: 'التي تضاف بنسبة (5%) وتبين مستقلة في جدول الكميات' },
    { ref: '§10', title: 'Bid validity', summary: '90 days from the opening of the technical envelopes', page: 5, source: 'يظل العطاء سارياً لمدة (90) تسعين يوماً' },
    { ref: '§12', title: 'Bid bond', summary: '1% of the bid value, from a bank licensed in Oman, on the Annex 4 form', page: 5, source: 'ضمان عطاء بنسبة (1%) من قيمة العطاء' },
    { ref: '§13', title: 'Two envelopes', summary: 'Technical and financial; no prices in the technical envelope', page: 6, source: 'يقدم العطاء في مظروفين منفصلين' },
    { ref: '§17', title: 'Evaluation', summary: 'Technical out of 100, pass mark 70; then the lowest qualified price', page: 6, source: 'تقيم العطاءات فنياً من (100) درجة' },
    { ref: '§19', title: 'Performance bond', summary: '5% of the contract value until final acceptance', page: 7, source: 'ضمان حسن تنفيذ بنسبة (5%) من قيمة العقد' },
    { ref: '§20', title: 'Advance payment', summary: 'Up to 10% against an equal bank guarantee', page: 7, source: 'دفعة مقدمة لا تزيد على (10%) من قيمة العقد' },
    { ref: '§22', title: 'Retention', summary: '5% of each interim payment', page: 7, source: 'تحتجز نسبة (5%) من قيمة كل مستخلص' },
    { ref: '§24', title: 'Delay damages', summary: '0.05% a day, capped at 10% of the contract value', page: 8, source: 'بحد أقصى (10%) من قيمة العقد' },
    { ref: '§26', title: 'SMEs', summary: 'At least 10% of the contract to registered SMEs; the basis is not stated', page: 8, source: 'بإسناد ما لا يقل عن (10%) من العقد إلى مؤسسات صغيرة ومتوسطة مسجلة' },
    { ref: '§31', title: 'Scope', summary: 'Section 2, km 24+000 to 62+000, 38 km; two bridges', page: 9, source: 'ويبلغ طوله الإجمالي (38) كم' },
    { ref: 'Annex 4', title: 'Form of Bid Bond', summary: 'States a fixed OMR 300,000 (scanned)', page: 17, source: 'نموذج ضمان العطاء' },
  ],
  flags: [
    { title: 'Arabic-only document', detail: 'The English values are a reading aid; the bid must be submitted in Arabic (§7). The Arabic text prevails.', page: 5, severity: 'medium', source: 'ولا يقبل أي عطاء محرر بغير اللغة العربية' },
    { title: 'Bid bond: 1% or OMR 300,000', detail: '§12 (p. 5) says 1% of the bid value; the scanned Form of Bid Bond (Annex 4, p. 17) states a fixed OMR 300,000. At the platform estimate 1% is about OMR 320,000. Blocks DG1 until the Coordinator resolves it; a query is drafted.', page: 5, severity: 'high', source: 'يجب أن يرفق بالعطاء ضمان عطاء بنسبة (1%) من قيمة العطاء' },
    { title: 'Section length: 38 km or 36.5 km', detail: 'The scope (§31, p. 9) says 38 km; drawing G-001 in the drawings list (p. 14) says 36.5 km. It moves the paving, lighting and markings quantities; a query is drafted.', page: 9, severity: 'medium', source: 'ويبلغ طوله الإجمالي (38) كم' },
    { title: 'SME share: value or number?', detail: '§26 and qualification row 8 ask for at least 10% of the contract to registered SMEs, without saying whether that is 10% of the value or of the subcontracts. Interpretation line; a query is drafted.', page: 8, severity: 'medium', source: 'يلتزم المقاول بإسناد ما لا يقل عن (10%) من العقد' },
    { title: 'Bridge of 60 m span', detail: 'Qualification row 7 asks for a bridge with a span of 60 m or more in the last 10 years, or a named specialist subcontractor who has built one.', page: 13, severity: 'medium', source: 'ويجوز استيفاء هذا المتطلب من خلال مقاول باطن متخصص يسمى في العطاء' },
    { title: 'Scanned pages read by OCR', detail: 'Pages 15–17 (BOQ summary, site-visit certificate, bond form) are scanned images with Eastern Arabic digits. On p. 15 a stamp covers the quantities of items 4.02 and 4.05: low confidence; check them against the electronic BOQ.', page: 15, severity: 'medium', source: 'ملخص جدول الكميات' },
  ],

  groups: {
    identity: IDENTITY,
    commercial: COMMERCIAL,
    guarantees: GUARANTEES,
    time: TIME,
    evaluation: EVALUATION,
    submission: SUBMISSION,
    risk: RISK,
  },
  conflicts: T042_CONFLICTS,
};
