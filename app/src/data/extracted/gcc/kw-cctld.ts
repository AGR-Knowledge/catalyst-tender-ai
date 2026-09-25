import type { ExtractedTenderAr } from './types-ar';

// Source snippets: Arabic is given in standard Unicode (justification kashida and presentation-form ligatures
// from the text layer normalised). Items read from the English technical specification (pp. 38-61) quote the
// English original, because that part of the booklet has no Arabic text.
export const KW_CCTLD: ExtractedTenderAr = {
  key: 'kw-cctld',
  fileNames: ['كراسة المناقصة العامة رقم 06-2024-2025 نسخة الاطلاع v1.0.pdf', 'kw-citra-cctld-6-2024-2025.pdf'],
  // Printed: 'كراسة الشروط والمواصفات الفنية' (cover). Every page carries the watermark 'نسخة الاطلاع' (viewing copy).
  docType: 'Terms and Technical Specifications Booklet (viewing copy)',
  pages: 61,
  // Conditions, draft contract and compliance form are in Arabic. The technical specification (pp. 38-61) is in English.
  language: 'Arabic',
  scanned: false,

  // Printed (p. 1): 'كراسة الشروط والمواصفات الفنية بشأن مشروع أسماء نطاقات المستوى الأعلى لرمز دولة الكويت ccTLD'
  title:
    'Terms and Technical Specifications Booklet for the Kuwait Country Code Top-Level Domain Names (ccTLD) Project, Public Tender No. 6-2024/2025',
  shortName: 'Kuwait .kw ccTLD registry SaaS (CITRA)',
  // Printed 'المناقصة العامة رقم (6 - 2025/2024)'. The file name gives '06-2024-2025'.
  refNo: 'Public Tender No. 6-2024/2025',
  // No issue date is printed. PDF metadata gives a creation date of 2024-08-11 09:14 +03:00 (Kuwait time).
  issued: null,
  // Arabic name 'الهيئة العامة للاتصالات وتقنية المعلومات'. The English name is printed under the logo on every page.
  authority: 'Communication and Information Technology Regulatory Authority (CITRA), State of Kuwait',
  // No parent ministry is named anywhere in the booklet.
  parent: null,
  country: 'Kuwait',
  location:
    'State of Kuwait. CITRA offices at Sharq, Al Hamra Tower, floors 56, 57 and 61. Registry delivered as cloud SaaS with a Kuwait-based secondary DNS server and local hosting of the File Management System (FMS) data',
  // Not an EPC tender: this is an IT services contract (domain registry SaaS, hosting, support, development, ICANN
  // consultancy). None of the listed sectors fits. 'Urban infra' is the closest honest label, as national digital
  // infrastructure. Used in the demo as an out-of-sector, low-fit example.
  sector: 'Urban infra',
  mode: 'IT services: software licences and fully managed registry SaaS, with 12 months of technical support, development and consultancy. Lump sum, lowest compliant price, indivisible',
  // Art. 7.1 (p. 12): all bids priced in Kuwaiti dinars.
  currency: 'KWD',
  valueDisplay: null,
  valueCr: null,

  summary: [
    {
      label: 'Tender type',
      value: 'Public tender, indivisible: no partial award. A single bidder must cover the whole scope',
      page: 1,
      confidence: 'high',
      source: 'المناقصة العامة غير قابلة للتجزئة',
    },
    {
      label: 'Tendering body and rules',
      value:
        'CITRA tenders the contract itself, through its Purchases Committee, under its own Tenders and Auctions Regulation (Decision No. 133 of 2016). Public Tenders Law No. 49 of 2016 (amended by Law No. 74 of 2019) and its Executive Regulation (Decree No. 30 of 2017) apply only where the CITRA regulation is silent',
      page: 28,
      confidence: 'high',
      note: 'Art. 37, p. 28; also Art. 16, p. 17 and the bid form, p. 6. Not a CAPT-run tender, although bidders must be registered with CAPT (Art. 2.3, p. 8).',
      source: 'تخضع هذه المناقصة الى لائحة المناقصات والمزايدات الخاصة للهيئة',
    },
    {
      label: 'Estimated contract value',
      value: 'Not stated in this document',
      page: 14,
      confidence: 'high',
      note: 'Art. 9.1 refers to an internal estimated value of the tender, but no figure is printed. The contract value in Art. 23 (p. 21) and in the draft contract (p. 33) is left blank.',
      source: 'القيمة التقديرية للمناقصة',
    },
    {
      label: 'Contract period',
      value:
        '12 months, counted from the commencement date. Commencement is at most 15 days after contract signature. Phase 1 (licences, data migration, go-live) within 7 days of commencement; Phase 2 (launch) before the current licences expire; Phase 3 (support, development, consultancy) runs 12 months from launch',
      page: 21,
      confidence: 'medium',
      note: 'Art. 22, p. 21, repeated in the draft contract, p. 32. Internally inconsistent: Phase 3 alone runs 12 months from launch, so the contract lasts longer than 12 months from commencement. The expiry date of the current licences is not given.',
      source: 'وهي (12شهر) تبدأ من تاريخ مباشرة العمل بحد اقصى 15 يوما من تاريخ توقيع العقد',
    },
    {
      label: 'Bid security (initial guarantee)',
      value:
        'KWD 2,150. Certified cheque, or an unconditional, irrevocable bank guarantee with no reservations from a bank accredited in Kuwait, in favour of CITRA. Cash and uncertified cheques are not accepted. Valid for the bid validity period. Bids without the full amount are excluded',
      page: 4,
      confidence: 'high',
      note: 'Repeated in Art. 10, p. 15. Figure checked on the page image. Returned only after 90 days from closing, or when the winner lodges the final guarantee and signs. No interest is paid.',
      source: 'تامينا اوليا مبلغ وقدرة (2,150 د.ك)',
    },
    {
      label: 'Performance security (final guarantee)',
      value:
        '10% of the total contract value. Certified cheque or unconditional, irrevocable bank guarantee from a bank accredited in Kuwait. Valid from issue until 3 months after completion, including the warranty and maintenance period. CITRA may deduct penalties, damages and costs without notice or court action, and the contractor must top it up within 10 working days',
      page: 20,
      confidence: 'high',
      note: 'Art. 21, p. 20, and the draft contract, p. 32. Deadline conflict: Art. 21 gives one month from the award notice, but Art. 9.3 (p. 14) gives 5 days from notification.',
      source: 'بنسبة (10%) من القيمة الاجمالية للعقد',
    },
    {
      label: 'Bid validity',
      value:
        '90 days from the tender closing date. If no decision is made in time, CITRA may ask for one extension of the same length, with the bid security renewed. A bidder who refuses is excluded',
      page: 13,
      confidence: 'high',
      note: 'Art. 8, pp. 13-14. The bid form (p. 6) also commits the bidder to 90 days.',
      source: 'ولمدة (90 يوما) من تاريخ اقفال المناقصة',
    },
    {
      label: 'Payment terms',
      value:
        '70% after Phase 1 (licences supplied, data migrated, project operating) and final acceptance. 10% after launch: registry fully migrated from the current systems, technical activation tests passed, and approval by the CITRA team. 20% for support, development and consultancy, paid 5% per quarter after CITRA approves the periodic reports. No advance payment',
      page: 21,
      confidence: 'high',
      note: 'Art. 23, pp. 21-22; repeated in the draft contract, p. 33. Checked on the page images. The English specification (p. 41) speaks of a "fixed monthly rate" for maintenance and support, which does not match the quarterly 5% instalments.',
      source: 'يستحق المبلغ بعد تنفيذ أعمال هذه المرحلة والقبول النهائي',
    },
    {
      label: 'Price basis',
      value:
        'Priced in KWD. Lump sum as stated in the bid form. Prices are fixed for the whole term, with no adjustment for exchange rates, duties, taxes or new legislation. The only exception is the hardship doctrine of Kuwaiti civil law',
      page: 16,
      confidence: 'high',
      note: 'Art. 7.1 and 7.11, pp. 12-13; Art. 13, p. 16.',
      source: 'الأسعار المتفق عليها بموجب العقد ثابته طوال مدته',
    },
    {
      label: 'Tax retention',
      value:
        '5% of the contract value, or of each payment, is withheld until the contractor shows Kuwaiti income tax clearance. For a foreign winner, the final payment is withheld until tax clearance',
      page: 27,
      confidence: 'high',
      note: 'Art. 36, pp. 27-28 (Decree 3/1955 as amended by Law 2/2008).',
      source: 'ويتم حجز نسبة (5%) من قيمة العقد أو من قيمة كل دفعة مسددة',
    },
    {
      label: 'Document fee',
      value: 'Not stated. The tender documents are sold (Art. 18 refers to those who bought them), but no price is given',
      page: 17,
      confidence: 'medium',
      note: 'The fee is presumably in the tender advertisement, which is not part of this booklet.',
      source: 'لكل من قام بشراء وثائق المناقصة',
    },
    {
      label: 'Viewing copy only',
      value:
        'This file is watermarked as a viewing copy. Bids must be written on the official tender documents issued to the bidder (not transferable), and the original booklet received, signed and stamped on every page, must be returned with the bid',
      page: 11,
      confidence: 'high',
      note: 'Art. 5.1, p. 11 and Art. 5.8, p. 12. Watermark on every page.',
      source: 'في وثائق المناقصة الرسمية الصادرة إلى المناقصين',
    },
    {
      label: 'Language precedence',
      value:
        'Not stated. No clause says which language prevails, although the conditions are in Arabic and the technical specification is in English. The only language rule is that price corrections must be rewritten in red ink in Arabic numerals and words',
      page: 13,
      confidence: 'low',
      note: 'Art. 7.6, p. 13. Absence inferred from a full read of the booklet.',
      source: 'بالمداد الأحمر بالأرقام والحروف العربية',
    },
  ],

  dates: [
    // No date is printed anywhere in the booklet: the submission deadline (Art. 6, p. 12) and the pre-bid meeting
    // (Art. 18, p. 17) are both "as set in the advertisement". The only date available is the PDF file's creation
    // date from metadata (2024-08-11 09:14 +03:00). It is not printed on any page, so source is ''.
    { label: 'Booklet file created (PDF metadata only, not printed)', date: '2024-08-11', page: 1, confidence: 'low', source: '' },
  ],

  eligibility: [
    {
      label: 'Nationality and registration',
      value:
        'Bidder must be Kuwaiti (individual or company), entered in the Commercial Register and registered in the CITRA supplier or contractor register. For a foreign bidder, that first paragraph and Art. 23 of the Commercial Law (Decree-Law 68/1980) do not apply',
      page: 8,
      confidence: 'medium',
      note: 'Art. 2.1. The foreign-bidder sentence appears to let foreign firms bid directly, but Art. 4.5 (p. 10) still asks for a Kuwaiti local company or a Kuwaiti agency contract, and Art. 2.4 asks for 10 years in Kuwait. Clarify before relying on it.',
      source: 'أن يكون كويتيا - فردا كان ام شركة - ومقيدا في السجل التجاري',
    },
    {
      label: 'Registrations',
      value:
        'Valid registration certificate from the Central Agency for Public Tenders (CAPT), a Kuwait Chamber of Commerce and Industry certificate showing the relevant activity, and registration with CITRA',
      page: 8,
      confidence: 'high',
      note: 'Art. 2.3.',
      source: 'يجب أن يكون المناقص مسجلاً لدى الجهاز المركزي للمناقصات العامة',
    },
    {
      label: 'Conflict of interest',
      value:
        'Excluded: CITRA board members, staff and committee members, their relatives to the fourth degree, and the consultant that studied the works or prepared the tender documents (and its staff). "Bidder" includes partners, agents, directors and employees',
      page: 8,
      confidence: 'high',
      note: 'Art. 2.2.',
      source: 'يجب ألا يكون المناقص عضواً في مجلس إدارة الهيئة أو موظفاً فيها',
    },
    {
      label: 'Kuwait IT experience',
      value:
        'At least 10 years of experience in Kuwait in IT systems. Certificate from the Central Agency for Information Technology (CAIT) registering the bidder as a specialised IT company for 2022',
      page: 9,
      confidence: 'high',
      note: 'Art. 2.4. The certificate year (2022) looks stale for a 2024/2025 tender.',
      source: 'خبرة سابقة كحد أدنى 10 سنوات في الكويت في مجال نظم وتقنية المعلومات',
    },
    {
      label: 'CITRA cloud licence',
      value: 'Valid CITRA licence or permit to provide cloud computing services, covering all software offered in the bid',
      page: 9,
      confidence: 'high',
      note: 'Art. 2.5.',
      source: 'ترخيص أو إذن ساري من قبل الهيئة العامة للاتصالات وتقنية المعلومات لتقديم خدمات الحوسبة السحابية',
    },
    {
      label: 'Hosting references',
      value:
        'At least 3 projects in Kuwait or another GCC state in each of: (a) electronic hosting applications; (b) cloud hosting and infrastructure services. Client list required',
      page: 9,
      confidence: 'high',
      note: 'Art. 2.6.',
      source: 'على ألا تقل عن 3 مشاريع في كل مجال من المجالات التالية',
    },
    {
      label: 'Domain-registry references',
      value:
        'Prior work in Kuwait or another GCC state on applications for domain name registration, renewal, management and addressing, with a client list. No minimum number is set',
      page: 10,
      confidence: 'high',
      note: 'Art. 4.4. The compliance form (p. 37, item 6) also asks for prior experience with ICANN.',
      source: 'تطبيقات ذات صلة بتسجيل وتجديد وإدارة وعنونة أسماء النطاقات',
    },
    {
      label: 'Local company or Kuwaiti agent',
      value:
        'Official copy of the local company memorandum of association, or of the agency contract between the foreign company and its Kuwaiti partner or merchant agent, notarised under Kuwaiti rules',
      page: 10,
      confidence: 'high',
      note: 'Art. 4.5.',
      source: 'صورة رسمية لعقد تأسيس الشركة المحلية – أو عقد وكالة',
    },
    {
      label: 'National labour and manpower',
      value:
        'Valid certificate of the national labour percentage for non-government employers, a manpower certificate, and a Public Authority for Manpower clearance showing no suspension. Missing the national labour certificate means exclusion (Law 19/2000, Art. 6)',
      page: 10,
      confidence: 'high',
      note: 'Art. 4.1-4.3, p. 10, and Art. 35, p. 27.',
      source: 'شهادة نسبة العمالة الوطنية في الجهات غير الحكومية (سارية المفعول)',
    },
    {
      label: 'Team certifications',
      value:
        'CVs of the implementing team, who must hold (or have equivalents of): AWS Certified SysOps Administrator, AWS Certified Solutions Architect Associate, RedHat Certified System Administrator, RedHat Certified Engineer, RedHat Certified Architect. CITRA may require any team member to be replaced at the same or a higher level',
      page: 10,
      confidence: 'high',
      note: 'Art. 4.7, p. 10, and Art. 4.10, p. 11.',
      source: 'ويجب أن تتوفر الشهادات التالية',
    },
    {
      label: 'Authorised agent',
      value: 'Proof that the bidder is an authorised agent for every solution proposed',
      page: 11,
      confidence: 'high',
      note: 'Art. 4.12.',
      source: 'وكيل معتمد لجميع الحلول المقترحة',
    },
    {
      label: 'NDA with PACI',
      value: 'A signed, up-to-date non-disclosure agreement between the bidder and the Public Authority for Civil Information (PACI)',
      page: 10,
      confidence: 'medium',
      note: 'Art. 4.8. Probably deliberate, because the registry must integrate with PACI and Kuwait National ID (pp. 23, 39), but it is unusual as a bid-stage document. Confirm at clarification.',
      source: 'اتفاقية عدم افشاء الأسرار بينه وبين الهيئة العامة للمعلومات المدنية',
    },
    {
      label: 'ICANN consultant',
      value:
        'The team must include a consultant with at least 10 years of experience who takes part in ICANN committees, knows the ICANN regulations, is based in Kuwait and is employed by the bidder',
      page: 23,
      confidence: 'high',
      note: 'Art. 25.8 (a contract obligation), backed by compliance item 6, p. 37.',
      source: 'استشاري في فريق العمل ذو خبرة لا تقل عن 10 سنوات ومشارك في اللجان التابعة لمنظمة ICANN',
    },
    {
      label: 'All conditions mandatory',
      value:
        'Every condition in Art. 2 must be met and every supporting document supplied. Any bid that fails a condition or omits a document is excluded',
      page: 9,
      confidence: 'high',
      note: 'Art. 2.7-2.8.',
      source: 'سيتم استبعاد أي عطاء لا يستوفي جميع الشروط الواردة',
    },
  ],

  scope: [
    {
      text: 'Purpose: supply the licences and technical support needed to operate and maintain the existing .kw domain-name infrastructure, including the registry systems, the domain-name website and the supporting automated portals',
      page: 8,
      source: 'لتوفير التراخيص اللازمة وخدمات الدعم الفني لتشغيل وصيانة البنية التحتية الحالية',
    },
    {
      text: 'Phase 1: supply the Registry Solution software licences, migrate the data and bring the project into operation within 7 days of commencement',
      page: 21,
      source: 'توريد تراخيص البرامج Registry Solution ونقل المعلومات وتشغيل المشروع',
    },
    {
      text: 'Phase 2: launch the project before the current licences expire, with no interruption to current services (Art. 25.6)',
      page: 21,
      source: 'قبل مدة انتهاء التراخيص الحالية',
    },
    {
      text: 'Phase 3: technical support, development and consultancy for 12 months from launch',
      page: 21,
      source: 'تبدأ من تاريخ إطلاق المشروع ولمدة 12 شهر',
    },
    {
      text: 'Registry Solution, 12 months: SaaS for up to 10,000 domains. Registry platform (Live, OT&E, DR), DNS services, fully managed solution, technical support, software licences, cloud infrastructure, hosting of registry websites and registry email, and local data hosting for the FMS',
      page: 58,
      source: 'Software as a Service offering for up to 10,000 domains',
    },
    {
      text: 'Registry functions: comply with IETF and ICANN gTLD standards and the CITRA policy matrix. Regulator visibility and control, multi-level admin portal, full audit trail, IP locking, 2FA, DNSSEC, authcode encryption, web WHOIS, RDAP, local and international payment gateways, registrar accounting and credit, bulk tools, IDN with Arabic variants, premium-names EPP extension, abuse tools, escrow in ICANN gTLD format, WHMCS EPP plugin, TMCH, OT&E, API',
      page: 38,
      source: 'CITRA desires to ensure compliance and best practices in the management of the .kw country code Top Level Domain',
    },
    {
      text: 'Integrations: keep all accredited-registrar portals connected. Integrate with PACI, the Kuwait National ID app (Hawyti) and Sahel, and with any other third party CITRA names during the contract',
      page: 23,
      source: 'الهيئة العامة للمعلومات المدنية، وتطبيق هويتي، وتطبيق سهل',
    },
    {
      text: 'Platform requirements: runs in Docker for testing and deployment, IP anycast with at least 200 nodes worldwide, WAF for all applications, signed-zone propagation only, and application source code made available to CITRA royalty-free on request',
      page: 39,
      source: 'Source code for the application shall be made available to CITRA on a royalty-free basis on request',
    },
    {
      text: 'Service levels (monthly): DNS service 100% available (0 min downtime). Name servers at most 432 min down (about 99%). RDDS, EPP and RDAP at most 864 min each (about 98%). Round-trip-time and update-time targets per ICANN. Critical faults: 1 h response and 4 h resolution in working hours. Major: 24 h / 48 h. Minor: 48 h / 72 h. Weekly emergency thresholds: 4 h for DNS and DNSSEC, 24 h for EPP, RDDS and RDAP',
      page: 40,
      source: 'DNS service availability 0 min downtime = 100% availability',
    },
    {
      text: 'Data escrow deposits (OpenPGP per RFC 4880, signed, via SFTP or HTTPS), monthly per-registrar transaction and registry activity reports (CSV per RFC 4180), WHOIS on port 43 plus web WHOIS with searchability, and TLS 1.2+ for all registry interfaces',
      page: 43,
      source: 'Registry objects, such as domains, contacts, name servers, registrars, etc. will be compiled into a file',
    },
    {
      text: 'Hosting: at least 15 websites including 4 Django apps (PHP and static also), MySQL and PostgreSQL, on Linux. Email hosting with unlimited accounts, DKIM, spam filter, and up to 25,000 transactional emails a month. Anycast DNS with unmetered QPS, DDoS protection, 200+ nodes, DNSSEC signing and a Kuwait-based secondary DNS',
      page: 54,
      source: 'It should be capable of hosting a minimum of 15 websites including 4 Django Applications',
    },
    {
      text: 'File Management System: WHMCS upload plugin and CITRA document-validation portal. CITRA is building a next-generation front and back end with Kuwait National ID login. The winner must take it over unaltered and, if the previous contract has not finished it, complete it within this contract',
      page: 57,
      source: 'the bid-winner is responsible to continue developing the solution and deliver it within the duration of the signed contract',
    },
    {
      text: 'Ongoing development: 30 hours a month for 1 year of web design and front- and back-end development on www.nic.kw (www.kw), support.nic.kw, registry.nic.kw, login.nic.kw, whois.kw, fms.nic.kw, go.kw and any other site CITRA asks for',
      page: 57,
      source: 'Web Design, HTML, Web Development (Frontend & Backend), adding and modifying existing features',
    },
    {
      text: 'Operating system support: premium local 24x7 support SLA for 12 months, covering troubleshooting and bug fixing, preventive maintenance, patching, OS and software installation, upgrades, firewall hardening and backups',
      page: 58,
      source: 'Local support Service Level Agreement, Premium 24x7',
    },
    {
      text: 'Consultancy: 30 hours a month for 1 year on compliance with ICANN standards, regulations and policies, delivered by the Kuwait-based ICANN consultant',
      page: 58,
      source: 'Specialized services for compliance with ICANN standards, regulations, and policies',
    },
    {
      text: 'Support desk run to ITIL: Sunday to Thursday, 07:00-16:00, plus emergencies outside those hours, at no extra charge. Warranty and maintenance backed by the global developer of the proposed servers and systems',
      page: 22,
      source: 'من الأحد إلى الخميس اعتباراً من الساعة السابعة صباحاً وحتى الرابعة عصراً',
    },
    {
      text: 'Local training for 5 CITRA staff on all systems developed, and a user manual covering every function of the registry and its supporting sites, at no extra cost',
      page: 26,
      source: 'يلتزم مناقص الفائز بتدريب 5 موظفين',
    },
    {
      text: 'Exit: at the end of the contract, hand over the project, all data, software and requirements to CITRA and to any new provider without disrupting services, and support the transition',
      page: 22,
      source: 'بطريقة تضمن استمراره بعد انتهاء مدة العقد للهيئة وللجهة الجديدة',
    },
  ],

  evaluation: [
    {
      label: 'Award basis',
      value:
        'Lowest total price among bids that meet the tender documents. There is no technical scoring: the technical side is pass/fail through the compliance form, the document checks and the demo trial',
      page: 14,
      confidence: 'high',
      note: 'Art. 9.1. No weighting or scoring table appears anywhere in the booklet.',
      source: 'يتم ترسية المناقصة على المناقص الذي قدّم أقل سعر إجمالي',
    },
    {
      label: 'Abnormally low bids',
      value:
        'CITRA may award to a higher bid if the lowest prices are much lower than, and unjustifiably below, the estimated value, under Art. 23 of the CITRA regulation',
      page: 14,
      confidence: 'high',
      source: 'وتقل بنسبة غير مبررة عن القيمة التقديرية للمناقصة',
    },
    {
      label: 'Ties and negotiation',
      value:
        'Equal prices are decided by drawing lots. In all cases, CITRA may call all bidders to negotiate, or call the highest-priced bidder to negotiate down to the lowest prices',
      page: 14,
      confidence: 'high',
      note: 'The wording "highest-priced bidder" is unusual but is what the text says.',
      source: 'استدعاء صاحب العطاء الأعلى سعرا للتفاوض معه وصولا الى اقل الأسعار',
    },
    {
      label: 'Technical compliance form',
      value:
        'All 7 items in Annex 1 are mandatory: fit with current systems, migration on schedule, experience, team certifications, demo to the CITRA team, ICANN experience, and passing CITRA technical tests. Fill it in fully and attach a searchable electronic copy. Non-compliant bids are excluded',
      page: 37,
      confidence: 'high',
      source: 'تعد جميع بنود المتطلبات والمواصفات الفنية المذكورة في نموذج المطابقة أدناه إلزامية',
    },
    {
      label: 'Demo and trial',
      value:
        'Bidder gives a visual presentation and a trial version of the proposed systems. The CITRA technical team tests them, and the bid is excluded if they do not meet the specification or are not compatible with current systems',
      page: 11,
      confidence: 'high',
      note: 'Art. 4.11.',
      source: 'على المناقص أن يقدم عرض مرئي ونسخة تجريبية من الأنظمة والحلول المقترحة',
    },
    {
      label: 'Arithmetic rules',
      value:
        'Where the amount in figures and the amount in words differ, the lower applies. Where the checked total and the bid-form total differ, the lower applies. An arithmetic error above 5% of the total excludes the bid unless public interest dictates otherwise',
      page: 13,
      confidence: 'high',
      note: 'Art. 7.3-7.4.',
      source: 'إذا كان الخطأ الحسابي يجاوز 5% من السعر الإجمالي استبعد العطاء',
    },
    {
      label: 'Price review before award',
      value:
        'CITRA reviews the winner\'s unit prices before award without changing the total. An unpriced item is deemed included in the total. A winner who refuses the review may be excluded, with the bid security forfeited',
      page: 13,
      confidence: 'high',
      note: 'Art. 7.8-7.9.',
      source: 'يتم إجراء الموازنة التثمينية مع المناقص الفائز قبل ترسية المناقصة عليه',
    },
  ],

  submission: [
    {
      label: 'Deadline',
      value:
        'As set in the tender advertisement, which is not part of this booklet. Bids are sealed with red wax and delivered to CITRA. Late bids and late price changes are ignored',
      page: 12,
      confidence: 'high',
      note: 'Art. 6, p. 12 and Art. 5.4, p. 11.',
      source: 'بعد أن تختم بالشمع الأحمر بموعد أقصاه (طبقاً للموعد المحدد في الإعلان)',
    },
    {
      label: 'Addressee and envelope contents',
      value:
        'Envelopes addressed to the CITRA Purchases Committee, Public Tender No. 6-2024/2025, containing the bid form with the value and price schedule, the tender originals, the bill of quantities, the bid security, the national labour certificates and CDs, all filled in and stamped',
      page: 12,
      confidence: 'high',
      note: 'Art. 5.6.',
      source: 'لجنة مشتريات الهيئة العامة للاتصالات وتقنية المعلومات',
    },
    {
      label: 'Copies',
      value: 'One original paper copy, one paper copy and two electronic copies (PDF)',
      page: 12,
      confidence: 'medium',
      note: 'Art. 5.9, p. 12. Art. 4.14 (p. 11) says two paper copies and one digital copy. Plan for the larger set.',
      source: 'يقدم العطاء على نسخة واحدة ورقية اصلية وصورة عنها و نسختين الكترونيه (PDF)',
    },
    {
      label: 'Original booklet',
      value: 'Return the original booklet received with the bid, signed and stamped with the company seal on every page',
      page: 12,
      confidence: 'high',
      note: 'Art. 5.8. Art. 5.1 (p. 11) also requires every page to be signed by the authorised signatory and stamped.',
      source: 'كراسة الشروط والمواصفات الفنية الاصلية التي استلمتها ضمن العطاء',
    },
    {
      label: 'Electronic means',
      value:
        'Electronic means may be used for all or part of the procedure if they meet the same requirements. A bid that breaches Art. 5.2 or 5.3 is void unless the Contracts Committee unanimously accepts it in the public interest',
      page: 12,
      confidence: 'high',
      note: 'Art. 5.7. No portal is named.',
      source: 'يجوز استعمال الوسائل الالكترونية لإتمام الإجراءات السابقة',
    },
    {
      label: 'Bid form',
      value:
        'Total value in figures and in words, covering all costs. Acceptance of all conditions without reservation. Commitment for 90 days. Commitment to complete contracting once notified of award; failure to do so counts as withdrawal',
      page: 6,
      confidence: 'high',
      source: 'ونوافق على كل ما تضمنته بدون أدنى تحفظ',
    },
    {
      label: 'Signatory evidence',
      value:
        'If signing under authorisation, attach the authorisation letter. A foreign power of attorney must be certified by the official authorities. Attach an attested signature specimen of the signatory',
      page: 3,
      confidence: 'high',
      source: 'في حالة التوقيع بالتفويض يرفق كتاب التفويض مع العطاء',
    },
    {
      label: 'Alterations',
      value:
        'No erasures or changes to the tender documents, and no items or conditions struck out. Price corrections must be rewritten in red ink in figures and words and initialled. Bids with marks or signs are refused',
      page: 13,
      confidence: 'high',
      note: 'Art. 5.2 and 5.5 (pp. 11-12); Art. 7.6-7.7 (p. 13).',
      source: 'يحظر على مقدم العطاء شطب أي بند من بنوده',
    },
    {
      label: 'Pre-bid meeting',
      value:
        'Held at the date and place given in the advertisement. Open to bidders who bought the documents, in person or by authorised representative. The minutes become part of the tender documents',
      page: 17,
      confidence: 'high',
      note: 'Art. 18. Questions and answers are circulated to all bidders before closing.',
      source: 'سيعقد اجتماع تمهيدي للرد على الاستفسارات المقدمة بشأن المناقصة',
    },
    {
      label: 'Clarifications',
      value:
        'Any error, omission or discrepancy in the technical documents or quantities must be raised with CITRA by official letter before the bid is submitted',
      page: 15,
      confidence: 'high',
      note: 'Art. 9.6. No clarification deadline is stated.',
      source: 'فعلى المناقص أن يستوضح الهيئة قبل تقديم عطائه بكتاب رسمي',
    },
  ],

  contacts: [
    {
      name: 'Purchases Committee (لجنة مشتريات الهيئة)',
      role: 'Addressee of the bid envelopes',
      org: 'Communication and Information Technology Regulatory Authority (CITRA)',
      address: 'Sharq, Al Hamra Tower, floors 56, 57 and 61, Kuwait (CITRA address as First Party in the draft contract, p. 31)',
      page: 12,
    },
    {
      name: 'Chairman of the Board of Directors (name left blank)',
      role: 'Signs the contract for CITRA as First Party',
      org: 'Communication and Information Technology Regulatory Authority (CITRA)',
      address: 'Sharq, Al Hamra Tower, floors 56, 57 and 61, Kuwait',
      page: 31,
    },
  ],

  clauses: [
    { ref: 'Art. 9.3 / Art. 21', title: 'Final guarantee deadline', summary: 'Art. 9.3 gives 5 days from notification to lodge the final guarantee, or the winner may be treated as withdrawn and loses the bid security. Art. 21 gives one month from the award notice. The two conflict.', page: 14, source: 'فإذا لم يقدمه خلال (5) أيام من تاريخ إخطاره' },
    { ref: 'Art. 9.4', title: 'Contract signature', summary: 'Winner must sign within 30 days of lodging the final guarantee. Failure without an accepted reason means withdrawal, loss of the final guarantee and forfeiture of the bid security.', page: 14, source: 'لتوقيع العقد خلال مدة لا تتجاوز (30 يوما)' },
    { ref: 'Art. 12', title: 'Liability for damage', summary: 'Contractor bears full liability for damage to its own property and workers, with no recourse to CITRA, and for damage to CITRA property caused by it or its staff.', page: 16, source: 'يكون المناقص الفائز مسئولا مسئولية كاملة عن الأضرار أو الإصابات' },
    { ref: 'Art. 13', title: 'Fixed prices', summary: 'Prices fixed for the whole term. No revision for currency, duties, taxes or new legislation, subject only to the hardship doctrine of the Kuwaiti Civil Code.', page: 16, source: 'الأسعار المتفق عليها بموجب العقد ثابته طوال مدته' },
    { ref: 'Art. 15', title: 'Intellectual property', summary: 'Contractor alone is liable for any IP infringement, indemnifies third parties, and compensates CITRA for any claims, suits or judgments.', page: 17, source: 'يكون المناقص الفائز مسئولا مسئولية كاملة عن أي انتهاك أو مساس بحقوق الملكية الفكرية' },
    { ref: 'Art. 17 / Contract §7.3', title: 'Law and jurisdiction', summary: 'Kuwaiti law. Kuwaiti courts decide any dispute. No arbitration.', page: 17, source: 'وتختص بالفصل فيه المحاكم الكويتية' },
    { ref: 'Art. 20', title: 'Hardship', summary: 'If exceptional, unforeseeable events cause heavy losses that seriously upset the contract economics, CITRA shares part of the loss, as assessed by the Kuwaiti courts.', page: 18, source: 'فإن الجهة العامة المتعاقدة تلتزم بمشاركة المناقص الفائز في تحمل نصيب من الخسارة' },
    { ref: 'Art. 21', title: 'Final guarantee: call and top-up', summary: '10% of the contract value, valid until 3 months after completion. CITRA may deduct penalties and costs without notice, court action or proof of loss. Contractor tops up within 10 working days, or CITRA may terminate or take over the work at the contractor\'s cost.', page: 20, source: 'خلال عشرة أيام عمل من تاريخ إخطاره' },
    { ref: 'Art. 23', title: 'Payment schedule', summary: '70% after Phase 1 and final acceptance, 10% after launch and activation tests, 20% at 5% per quarter against approved reports. The price includes all fees, salaries, expenses, holiday work and overtime.', page: 21, source: 'يستحق المبلغ بعد تنفيذ أعمال هذه المرحلة والقبول النهائي' },
    { ref: 'Art. 25.2', title: 'Exit and handover', summary: 'Hand over the project, data and software so that the service continues after expiry, both to CITRA and to any new provider, without disruption, and support the transition.', page: 22, source: 'بطريقة تضمن استمراره بعد انتهاء مدة العقد للهيئة وللجهة الجديدة' },
    { ref: 'Art. 25.8', title: 'Kuwait-based ICANN consultant', summary: 'Team must include a consultant with at least 10 years of experience who takes part in ICANN committees, is available inside Kuwait and is employed by the contractor.', page: 23, source: 'ويكون الاستشاري متوفر داخل دولة الكويت وموظف لدى المناقص' },
    { ref: 'Art. 26', title: 'Subcontracting and assignment', summary: 'No subcontracting without prior written CITRA approval, and the contractor stays jointly liable with the subcontractor. No assignment of the contract. Receivables may be assigned only to an accredited bank.', page: 24, source: 'لا يجوز للمناقص الفائز التعاقد من الباطن' },
    { ref: 'Art. 27', title: 'Variations', summary: 'CITRA may increase or decrease the works by up to 25% of the contract value at the same prices. The contractor cannot object to a decrease. Above 25% needs the contractor\'s consent. The final guarantee is increased pro rata.', page: 24, source: 'في حدود نسبة قدرها (25%) من قيمة العقد' },
    { ref: 'Art. 29', title: 'Delay penalties', summary: '1% per week or part-week for undelivered or rejected equipment, and 1% per week for any delayed obligation until fixed, "from the total contract value". No cap. Penalties are due without notice or proof of loss, and CITRA may also execute at the contractor\'s cost or terminate and forfeit the final guarantee.', page: 25, source: 'غرامة قدرها (1%) واحد بالمائة' },
    { ref: 'Art. 30', title: 'Set-off', summary: 'Any sum owed to CITRA may be deducted from the final guarantee, from any payment under this or any other CITRA contract, or from sums held by any other government body in Kuwait, without notice or court action.', page: 26, source: 'او لدى أي جهة حكومية أخرى بالدولة' },
    { ref: 'Art. 32', title: 'Termination for default', summary: 'Grounds: breach, slow progress, lack of seriousness, unauthorised assignment or subcontracting, bribery or fraud, bankruptcy. Consequences: the final guarantee is forfeited and losses are recovered from sums held by CITRA or any other government body.', page: 26, source: 'مصادرة التامين النهائي' },
    { ref: 'Art. 33', title: 'Suspension', summary: 'No claim for extra cost, compensation, salaries, equipment or overheads if work is stopped or postponed for any reason.', page: 27, source: 'لايحق المناقص الفائز المطالبه باية تكاليف اضافيه' },
    { ref: 'Art. 34', title: 'Air freight', summary: 'Staff and goods carried by air must use Kuwait Airways or carriers with rights under Kuwait\'s bilateral agreements (Council of Ministers decisions of 1985, 1987 and 2019).', page: 27, source: 'طائرات شركة الخطوط الجوية الكويتية' },
    { ref: 'Art. 36', title: 'Income tax retention', summary: '5% of the contract value or of each payment is withheld until tax clearance. For a foreign contractor, the final payment is withheld until tax clearance.', page: 27, source: 'ويتم حجز نسبة (5%) من قيمة العقد أو من قيمة كل دفعة مسددة' },
    { ref: 'Art. 38', title: 'Termination for convenience', summary: 'CITRA may end the contract at any time in the public interest by written notice. The contractor cannot object and is paid only for work done up to the notice.', page: 28, source: 'يحق للهيئة العامة للاتصالات وتقنية المعلومات انهاء العقد في أي وقت تشاء' },
    { ref: 'Art. 39', title: 'Confidentiality', summary: 'Strict confidentiality during and after the contract, with access limited to staff who need to know. A breach exposes the contractor to civil and criminal liability.', page: 28, source: 'ان يتحلى بالسرية التامة' },
    { ref: 'Spec §1', title: 'Source code', summary: 'Application source code is to be made available to CITRA royalty-free on request. This matters for a SaaS or proprietary registry vendor.', page: 39, source: 'Source code for the application shall be made available to CITRA on a royalty-free basis on request' },
    { ref: 'Spec §6', title: 'Next-generation platform takeover', summary: 'CITRA plans a new front and back end (replacing WHMCS and FMS, with National ID login) to go live before signing. The winner takes it over unaltered and, if it is unfinished, must complete it within the contract.', page: 57, source: 'the bid-winner is responsible to continue developing the solution and deliver it within the duration of the signed contract' },
  ],

  flags: [
    {
      title: 'Out of sector for an EPC contractor',
      detail:
        'This is an IT services tender: domain registry SaaS, hosting, DNS, web development and ICANN consultancy for the .kw ccTLD. There are no civil, MEP or construction works. Screen out unless the group has a licensed Kuwaiti IT subsidiary.',
      page: 1,
      severity: 'high',
      source: 'مشروع أسماء نطاقات المستوى الأعلى لرمز دولة الكويت ccTLD',
    },
    {
      title: 'No dates in the booklet',
      detail:
        'The submission deadline and the pre-bid meeting are both "as set in the advertisement". No closing date, clarification deadline or opening date is printed. Get the tender advertisement (Kuwait Al-Youm or the CITRA website) before any go/no-go.',
      page: 12,
      severity: 'high',
      source: 'طبقاً للموعد المحدد في الإعلان',
    },
    {
      title: 'Kuwait-only eligibility gates',
      detail:
        'Bidders need 10 years of IT work in Kuwait, a CAIT specialist-IT certificate (for 2022), a CITRA cloud-services licence covering all offered software, CAPT and CITRA registration, and 3 hosting references in each of 2 fields in Kuwait or the GCC. Newcomers are effectively excluded.',
      page: 9,
      severity: 'high',
      source: 'خبرة سابقة كحد أدنى 10 سنوات في الكويت في مجال نظم وتقنية المعلومات',
    },
    {
      title: 'Uncapped delay penalties on total contract value',
      detail:
        'Art. 29: 1% per week or part-week, worded as "from the total contract value", with no maximum stated. Penalties are due without notice or proof of loss and can be set off against other government receivables (Art. 30).',
      page: 25,
      severity: 'high',
      source: 'عن كل أسبوع او جزء من الأسبوع',
    },
    {
      title: 'Open-ended development scope',
      detail:
        'If CITRA\'s next-generation platform (the WHMCS and FMS replacement with National ID login) is not finished by the previous contractor, the winner must complete it within this fixed-price contract. The size of that work is unknown.',
      page: 57,
      severity: 'high',
      source: 'the bid-winner is responsible to continue developing the solution and deliver it within the duration of the signed contract',
    },
    {
      title: 'Viewing copy: not valid for bidding',
      detail:
        'The file is watermarked as a viewing copy. Bids must use the official purchased documents, and the signed and stamped original booklet must be returned with the bid. The document price is not stated here.',
      page: 12,
      severity: 'medium',
      source: 'كراسة الشروط والمواصفات الفنية الاصلية التي استلمتها ضمن العطاء',
    },
    {
      title: 'Timeline has almost certainly passed',
      detail:
        'The tender belongs to financial year 2024/2025 and the file was created in August 2024. As of September 2026 this booklet is almost certainly for a closed or awarded tender. Treat it as a reference only.',
      page: 1,
      severity: 'medium',
      source: 'المناقصة العامة رقم (6 - 2025/2024)',
    },
    {
      title: 'Source code royalty-free to CITRA',
      detail:
        'The specification requires the application source code to be made available to CITRA royalty-free on request. Most commercial registry SaaS vendors will not accept this without escrow terms. It is also a conflict with licence-based pricing.',
      page: 39,
      severity: 'medium',
      source: 'Source code for the application shall be made available to CITRA on a royalty-free basis on request',
    },
    {
      title: 'Contradictory deadlines and durations',
      detail:
        'Final guarantee: 5 days (Art. 9.3, p. 14) against one month (Art. 21, p. 20). Contract: 12 months from commencement (Art. 22), yet Phase 3 support runs 12 months from launch. Phase 1 must be done within 7 days of commencement, which is tight for a registry migration.',
      page: 21,
      severity: 'medium',
      source: 'تبدأ من تاريخ إطلاق المشروع ولمدة 12 شهر',
    },
    {
      title: 'Support hours conflict and 100% DNS availability',
      detail:
        'Art. 25.1 and 25.13 set support for Sunday to Thursday, 07:00-16:00, plus emergencies. The specification (pp. 41, 58) asks for a 24x7 premium local SLA. The SLA matrix requires 0 minutes of DNS downtime a month, with emergency thresholds on top. No service-credit regime is defined, so Art. 29 penalties would apply.',
      page: 22,
      severity: 'medium',
      source: 'من الأحد إلى الخميس اعتباراً من الساعة السابعة صباحاً وحتى الرابعة عصراً',
    },
    {
      title: 'Local ICANN consultant hard to source',
      detail:
        'The consultant must have at least 10 years of experience, take part in ICANN committees, be resident in Kuwait and be on the bidder\'s payroll (Art. 25.8). This is a rare profile, and it is also a mandatory compliance item (p. 37).',
      page: 23,
      severity: 'medium',
      source: 'ويكون الاستشاري متوفر داخل دولة الكويت وموظف لدى المناقص',
    },
    {
      title: 'No language-precedence clause',
      detail:
        'The conditions are in Arabic and the technical specification (pp. 38-61) is in English, but no clause says which prevails in a conflict. Under Kuwaiti practice the Arabic text is likely to be treated as controlling. Raise this at the pre-bid meeting.',
      page: 38,
      severity: 'medium',
      source: '',
    },
    {
      title: 'Set-off against any government receivable',
      detail:
        'Art. 30 and Art. 32 let CITRA recover penalties and losses from sums owed to the contractor by any other government body in Kuwait. That is a cross-default exposure for groups with other Kuwaiti public contracts.',
      page: 26,
      severity: 'medium',
      source: 'او لدى أي جهة حكومية أخرى بالدولة',
    },
    {
      title: 'Final-guarantee form copied from another tender',
      detail:
        'The final-guarantee template names tender 18-2023/2024 for an email protection system, not this tender. The index page numbers are also off by one or two. These are drafting slips to correct at clarification.',
      page: 5,
      severity: 'low',
      source: 'نظام حماية البريد الإلكتروني',
    },
    {
      title: 'Specification is reused ICANN gTLD boilerplate',
      detail:
        'The escrow and reporting sections keep gTLD placeholders ({gTLD} file names, "Specification 4 of this Agreement", IANA registrar IDs, 2009 sample dates). This is a sign the requirements were not fully tailored to a ccTLD, so expect clarification on which parts apply.',
      page: 44,
      severity: 'low',
      source: '{gTLD}_{YYYY-MM-DD}_{type}_S{#}_R{rev}.{ext}',
    },
    {
      title: 'Copy count inconsistent',
      detail: 'Art. 4.14 asks for 2 paper copies and 1 digital copy. Art. 5.9 asks for 1 original, 1 paper copy and 2 PDF copies. Submit the larger set.',
      page: 11,
      severity: 'low',
      source: 'يلتزم بتوفير عدد (2) نسخة ورقية و نسخة رقمية',
    },
    {
      title: 'Estimated value not disclosed',
      detail:
        'CITRA holds an internal estimate (Art. 9.1) but does not publish it, and the contract value is blank. The only sizing signals are the KWD 2,150 bid security and the scope table (up to 10,000 domains, 30 development hours and 30 consultancy hours a month for 1 year).',
      page: 14,
      severity: 'low',
      source: 'القيمة التقديرية للمناقصة',
    },
  ],
};
