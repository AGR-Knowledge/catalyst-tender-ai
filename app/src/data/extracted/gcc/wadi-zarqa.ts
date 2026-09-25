import type { ExtractedTender } from '../types';

export const WADI_ZARQA: ExtractedTender = {
  key: 'wadi-zarqa',
  fileNames: ['RFP__Wadi_Zarqa.pdf', 'wadi-zarqa-pq.pdf'],
  docType: 'Request for Qualifications (RFQ): Invitation to Pre-Qualify Contractors',
  pages: 70,
  language: 'English',
  scanned: false,

  title:
    'Request for Qualifications (RFQ): Invitation to Pre-Qualify Contractors for the Design Build & Operate (DBO) of the Wadi Zarqa Wastewater Treatment Plant Phase I',
  shortName: 'Wadi Zarqa WWTP Phase 1 DBO (PQ)',
  refNo: 'Tender No. 33/2025',
  issued: '2025-10-23',
  authority: 'Water Authority of Jordan (WAJ)',
  parent: 'Ministry of Water and Irrigation (MWI), Hashemite Kingdom of Jordan',
  country: 'Jordan',
  location:
    'Wadi Zarqa, downstream of the existing As Samra WWTP, Zarqa Governorate (site described as in Zarqa and Mafraq Governorates); conveyance from West Zarqa Pump Station (WZPS)',
  sector: 'Water',
  mode: 'DBO (Design-Build-Operate), FIDIC Gold Book 2008. This document is the prequalification stage only',
  // Applicants state all monetary amounts in USD (ITA 14.2, p. 14). The contract/bid currency is not stated in this RFQ.
  currency: 'USD',
  valueDisplay: null,
  valueCr: null,

  summary: [
    {
      label: 'Procurement stage',
      value:
        'Prequalification only. Only prequalified contractors receive the Invitation for Bids (IFB) and may buy the Tender Documents. No price is submitted at this stage',
      page: 2,
      confidence: 'high',
    },
    {
      label: 'Estimated contract value',
      value: 'Not stated in this document',
      page: 2,
      confidence: 'high',
      note: 'No cost estimate, budget or loan amount appears anywhere in the 70 pages. The only money figures are the PQ thresholds (US$ 50M liquidity and net worth, US$ 100M turnover, US$ 150M per general-experience contract).',
    },
    {
      label: 'Capacity',
      value:
        'Phase 1: 150,000 m3/day annual average flow, online by 2030. Phase 2 (not in this contract) adds 200,000 m3/day for 350,000 m3/day total by 2034-2035. Design horizon 2049',
      page: 2,
      confidence: 'high',
      note: 'Repeated on pp. 65-66 (printed 60-61).',
    },
    {
      label: 'Design-build period',
      value: 'Approximately 36 months (2027-2030). Time for Completion 36 months for the design-build period',
      page: 2,
      confidence: 'high',
      note: '36 months confirmed in Section VII, p. 69 (printed 64). Award expected mid-2027.',
    },
    {
      label: 'Operation service period',
      value:
        '20 years (2030-2049) covering WWTP, conveyance pipelines and hydropower plant. Section VII mentions a possible 10-year base term plus one 10-year extension, subject to satisfactory performance and mutual agreement',
      page: 69,
      confidence: 'medium',
      note: 'Pp. 2 and 3 state a firm 20-year O&M. P. 69 (printed 64) says the 10+10 structure is a "potential" to be confirmed at bidding stage.',
    },
    {
      label: 'Funding',
      value:
        'WAJ has applied for funds from the European Investment Bank (EIB, sovereign soft loan) and the U.S. Department of State (grant) for design, construction and the first 2 years of operation. Years 3-20 of operation are funded by the Government of Jordan. MWI covers land acquisition',
      page: 2,
      confidence: 'high',
      note: 'Funding split for construction also on p. 65 (printed 60). Wording is "has applied for", so the financing is not yet stated as committed.',
    },
    {
      label: 'Conditions of contract',
      value: 'FIDIC General Conditions, Gold Book First Edition 2008, with specific clauses for EIB and U.S. DoS requirements',
      page: 2,
      confidence: 'high',
      note: 'Gold Book confirmed again on p. 69 (printed 64). The draft contract itself is not in this document.',
    },
    {
      label: 'Procurement rules',
      value:
        'WAJ procurement procedures, in line with the EIB Guide to Procurement; U.S. DoS rules at 22 CFR Part 228; Jordan Government Procurement Bylaw No. 8 of 2022 also applies. Section V prevails on nationality eligibility',
      page: 4,
      confidence: 'high',
    },
    {
      label: 'Financier approval rights',
      value: 'EIB and U.S. DoS approve the prequalified list, the selected contractor and the contract award',
      page: 4,
      confidence: 'high',
    },
    {
      label: 'Bid security (bidding stage)',
      value:
        'Not fixed here. A Bid Security or Bid-Securing Declaration will be required, in a form and amount to be specified in the Bidding Documents',
      page: 17,
      confidence: 'high',
      note: 'ITA 29.2, printed p. 12. No security is required with the PQ application.',
    },
    {
      label: 'Performance security (contract stage)',
      value:
        'Amount not stated. Performance Security plus any Parent Company Guarantee must cover the whole design-build phase and extend through the 20-year operation phase',
      page: 17,
      confidence: 'high',
      note: 'ITA 29.3 to 29.6 on pp. 17-18 (printed 12-13). May be one instrument for the whole Contract Period or separate ones for design-build and operation (PDS, p. 23).',
    },
    {
      label: 'Document fee',
      value: 'None stated for the RFQ, which is a free download from the MWI website. Tender Documents at IFB stage are to be purchased (price not stated)',
      page: 4,
      confidence: 'medium',
      note: 'The absence of a PQ fee is inferred: no fee is mentioned anywhere.',
    },
    {
      label: 'Application validity',
      value: 'Not stated in this document',
      page: 26,
      confidence: 'low',
      note: 'The PDS sets no validity period for applications.',
    },
    {
      label: 'Download / web page',
      value: 'https://www.mwi.gov.jo/AR/Modules/tenders (RFQ download and addenda)',
      page: 25,
      confidence: 'high',
      note: 'Also given in the notice on p. 4.',
    },
    {
      label: 'Advertisement cost',
      value: 'The awarded bidder bears the cost of one gazette advertisement',
      page: 5,
      confidence: 'high',
    },
  ],

  dates: [
    { label: 'RFQ issued / available', date: '2025-10-23', page: 1, confidence: 'high' },
    { label: 'Deadline for clarification questions', date: '2025-12-08', time: '12:00', page: 25, confidence: 'high' },
    { label: 'Application submission deadline (hard copy)', date: '2025-12-29', time: '12:00', page: 26, confidence: 'high' },
    { label: 'Opening of applications', date: '2025-12-29', time: '13:00', page: 26, confidence: 'high' },
    // Indicative only. Table 1 gives the month, not a day ("February, 2026").
    { label: 'Employer selects qualified list (indicative)', date: '2026-02-01', page: 5, confidence: 'low' },
    // Indicative only. Table 1 gives "June, 2026". Bid preparation period is 5 months from IFB.
    { label: 'Invitation for Bids (indicative)', date: '2026-06-01', page: 5, confidence: 'low' },
    // Indicative only. "Mid 2027" in Table 1; award expected mid-2027 per Section VII p. 69.
    { label: 'Expected Notice to Proceed (indicative)', date: '2027-07-01', page: 5, confidence: 'low' },
  ],

  eligibility: [
    {
      label: 'Nationality',
      value:
        'Firms from all countries are eligible. Private entities, eligible state-owned entities and JVs (existing or by letter of intent)',
      page: 22,
      confidence: 'high',
      note: 'PDS ITA 4.1, printed p. 17. Also Section V, p. 59.',
    },
    {
      label: 'Jordanian classification',
      value:
        'Jordanian contractors (single or JV partner) must hold MOPWH/GTD First Grade in Wastewater Treatment Plants, Construction/Buildings, Water/Wastewater and Electromechanical Works and Services, all four combined. Jordanian subcontractors need First Grade in their own discipline',
      page: 22,
      confidence: 'high',
    },
    {
      label: 'JV size and liability',
      value:
        'JV-Consortium or JV-Legal Entity of at most 3 members (direct or indirect) contributing to the PQ requirements. Joint and several liability. Percentage share of each member and of the Lead Partner to be stated. Each member must also individually meet the applicable criteria',
      page: 22,
      confidence: 'high',
      note: 'PDS ITA 4.1 items 1-8 run over pp. 22-24 (printed 17-19).',
    },
    {
      label: 'One application per firm',
      value:
        'A firm may apply alone or in one JV, not both, and may be a Specialized Subcontractor on only one application. Only one firm per corporate group may prequalify',
      page: 10,
      confidence: 'high',
    },
    {
      label: 'Local entity',
      value:
        'If awarded, the bidder (each JV-Consortium member, or the JV-Legal Entity) and every subcontractor must set up a Jordanian legal entity and register with the Ministry of Industry and Trade, JCCA, the Jordan Engineers Association, JNBC and MPWH before the Contract Agreement is signed. A binding undertaking to do so is required with the application',
      page: 59,
      confidence: 'high',
      note: 'Also in PDS item 14, p. 24.',
    },
    {
      label: 'Sanctions and integrity',
      value:
        'Signed EIB Covenant of Integrity and EIB Environmental and Social Covenant are mandatory, and omitting them makes the applicant ineligible. All sanctions and exclusions by EU institutions or any MDB must be declared. EIB-excluded firms and EU/UN-sanctioned parties are ineligible',
      page: 10,
      confidence: 'high',
    },
    {
      label: 'Contract non-performance',
      value: 'No contract terminated for the applicant\'s default in the past 5 years. Applies to each JV member',
      page: 29,
      confidence: 'high',
    },
    {
      label: 'Pending litigation',
      value: 'All pending litigation in total no more than 100% of net worth, treated as resolved against the applicant',
      page: 30,
      confidence: 'high',
    },
    {
      label: 'Liquidity / access to credit',
      value:
        'Liquid assets, unencumbered real assets, credit lines (bank letters) or other means of at least US$ 50,000,000 for construction cash flow, net of other commitments and independent of any advance payment',
      page: 30,
      confidence: 'high',
      note: 'For a JV-Consortium, all parties combined (if no Guarantor). For a JV-Legal Entity, met with Guarantor(s).',
    },
    {
      label: 'Net worth and current ratio',
      value: 'Total equity above US$ 50,000,000. Average current ratio above 1 for 2022-2024',
      page: 31,
      confidence: 'high',
    },
    {
      label: 'Financial soundness',
      value:
        'Audited statements 2022-2024. Average EBITDA above 0 and average debt-to-equity (total financial liabilities / equity) below 3',
      page: 31,
      confidence: 'high',
      note: 'For a JV, each member must meet this, unless a Guarantor that meets it is provided.',
    },
    {
      label: 'Average annual turnover',
      value: 'Above US$ 100,000,000 on average for 2022-2024',
      page: 31,
      confidence: 'high',
    },
    {
      label: 'General construction experience',
      value:
        'At least 3 contracts (conventional or design & build), each of at least US$ 150,000,000, between 1 Jan 2010 and the deadline, as prime, JV member, subcontractor or management contractor. At least 2 must be fully completed. Only the applicant\'s share counts, and JV members\' contracts are not aggregated to reach a single-contract value',
      page: 32,
      confidence: 'high',
    },
    {
      label: 'Specific WWTP construction experience (4.2a)',
      value:
        'At least 2 municipal WWTP contracts (build or D&B) since 1 Jan 2010, each at least 75,000 m3/day, including BNR activated sludge, secondary clarifiers, disinfection, sludge thickening and dewatering, sludge digestion and CHP. At least 1 fully completed',
      page: 33,
      confidence: 'high',
    },
    {
      label: 'Specific conveyance construction experience (4.2b)',
      value:
        'At least 2 water or wastewater conveyance contracts since 1 Jan 2010, each with a pipeline of at least 1,200 mm diameter and at least 9 km length. At least 1 fully completed',
      page: 34,
      confidence: 'high',
    },
    {
      label: 'Hydropower construction experience (4.2c)',
      value:
        'At least 1 completed hydropower plant contract of at least 0.5 MW since 1 Jan 2010. Can be met by a named Hydropower Plant Construction Specialized Subcontractor',
      page: 34,
      confidence: 'high',
    },
    {
      label: 'Design experience (4.3a-c)',
      value:
        'Design of at least 2 WWTPs (same 75,000 m3/day and process criteria as 4.2a), 2 conveyance systems (at least 1,200 mm and 9 km) and 1 hydropower plant (at least 0.5 MW), since 1 Jan 2010, covering preliminary, final and shop-drawing design for all disciplines. Can be met by named Design Specialized Subcontractors',
      page: 34,
      confidence: 'high',
      note: 'Runs over pp. 34-36 (printed 29-31). Criterion 4.3b on p. 36 prints "1200 m", evidently a typo for 1200 mm.',
    },
    {
      label: 'O&M experience (4.4)',
      value:
        'At least 2 WWTP O&M contracts since 1 Jan 2010, one of at least 10 years and one of at least 5 years, each at least 75,000 m3/day with the same process components (BNR, clarifiers, disinfection, thickening and dewatering, digestion, CHP). Each substantially completed or continuously operational for at least 50% of its duration. Can be met by a named O&M Specialized Subcontractor',
      page: 37,
      confidence: 'high',
    },
    {
      label: 'ESHS certification',
      value: 'Valid ISO 9001, ISO 14001 and ISO 45001, or demonstrated equivalents, applicable to the worksite. Lead Partner must meet this',
      page: 38,
      confidence: 'high',
    },
    {
      label: 'ESHS documentation, experience and staff',
      value:
        'Ethics charter, subcontractor ESHS monitoring system and written procedures on 11 listed topics. At least 2 construction contracts in the last 15 years with major ESHS measures to international standards. In-house E&S Manager and/or H&S Manager. Lead Partner must meet these',
      page: 38,
      confidence: 'high',
      note: 'Runs over pp. 38-39 (printed 33-34).',
    },
    {
      label: 'Reliance on parent or affiliate',
      value:
        'Parent or affiliate technical experience is not counted unless that firm is a JV member or a named Specialized Subcontractor. Parent financial capacity can be relied on only with a binding Parent Company Guarantee undertaking submitted with the application',
      page: 26,
      confidence: 'high',
    },
  ],

  scope: [
    { text: 'Design, permitting, supply, construction, commissioning, operation, maintenance and transfer of the new Wadi Zarqa WWTP Phase 1, 150,000 m3/day', page: 3 },
    { text: 'Liquid line: inlet hydropower plant (about 1.4 MW in Phase 1, 3.2 MW at Phase 2), primary clarifiers, BNR secondary treatment with back-up chemical nutrient removal, chlorine disinfection. Tertiary filtration is an optional bid item', page: 66 },
    { text: 'Sludge line: gravity and mechanical thickening, thermal hydrolysis for Class A biosolids, mesophilic anaerobic digestion with CHP, dewatering, solar sludge drying, odour control', page: 67 },
    { text: 'Plant works: yard piping and utilities, riverbank stabilization and flood protection, power supply, administration and visitor centre, maintenance buildings, SCADA and flow/quality monitoring', page: 3 },
    { text: 'West Zarqa conveyor: about 12 km pipeline, 1,600-1,700 mm diameter (to be verified), up to 6 bar, replacing the existing 40-year-old 1,200 mm steel siphon. Jacking at Jerash Rd and Doqara Rd, pipe bridge or inverted siphon at the Zarqa River', page: 67 },
    { text: 'Upper 8 km of the pipeline lies in the existing 15 m easement next to a live transmission main to As Samra, which must not be affected. Lower 4 km needs a new easement up to 12 m wide. Employer buys the land', page: 67 },
    { text: 'Expansion of the West Zarqa PS pretreatment from 10,500 to 18,000 m3/hr (to be verified): screening, grit and grease removal, yard piping, reconfiguration of the emergency storage pond', page: 68 },
    { text: 'Optional bid item: build the Phase 2 East Zarqa conveyor (about 1,000 mm) where it runs parallel to the West Zarqa line, in a common trench', page: 68 },
    { text: 'Phase 1 design must include Phase 2 interface planning: site grading, facility layout, yard utilities, connection points, and hydraulic profiles for Phase 1 alone and Phase 1+2', page: 3 },
    { text: '20-year operation service of the WWTP, conveyance and hydropower, including sludge disposal to the As Samra sludge monofill and asset renewal', page: 69 },
    { text: 'Section VII technical data is preliminary, for information only, and not legally binding on the Employer', page: 65 },
  ],

  evaluation: [
    {
      label: 'Method',
      value:
        'Pass/fail against the Section III criteria only; no other method is used. Every applicant that substantially meets the criteria is prequalified, with no short-list cap',
      page: 16,
      confidence: 'high',
      note: 'ITA 25.1 on p. 16 and ITA 27.1 on p. 17.',
    },
    {
      label: 'Minor deviations',
      value: 'Employer may waive minor deviations that do not materially affect technical capability and financial resources',
      page: 16,
      confidence: 'high',
    },
    {
      label: 'Conditional prequalification',
      value: 'Possible, subject to submitting or correcting specified documents before or at bid submission',
      page: 17,
      confidence: 'high',
    },
    {
      label: 'Responsiveness',
      value: 'An application is responsive only if all ITA 11 documents are submitted. Clarifications may be requested, but no change to substance after opening',
      page: 16,
      confidence: 'high',
    },
    {
      label: 'Domestic preference',
      value: 'No margin of preference for domestic bidders. ITA 23.1 default applies and the PDS makes no change',
      page: 16,
      confidence: 'medium',
      note: 'Inferred from the PDS having no ITA 23 entry.',
    },
    {
      label: '35% Jordanian contractor rule waived',
      value: 'Council of Ministers exempted the project from the rule that Jordanian classified contractors get at least 35% of contract value',
      page: 26,
      confidence: 'high',
    },
    {
      label: 'Currency conversion',
      value: 'All amounts in USD, converted at the Central Bank of Jordan rate 30 days before the PQ submission',
      page: 28,
      confidence: 'high',
    },
    {
      label: 'Financier approval',
      value: 'EIB and U.S. DoS approve the prequalified list',
      page: 4,
      confidence: 'high',
    },
  ],

  submission: [
    {
      label: 'Mode',
      value: 'Hard copy in sealed envelopes plus a flash drive with one searchable PDF. Electronic submission is not accepted. By mail or by hand',
      page: 25,
      confidence: 'high',
    },
    {
      label: 'Sets',
      value: '1 original (1 hard + 1 soft copy) and 1 copy (1 hard + 1 soft copy). Hard copy prevails over the PDF, and the original over the copy',
      page: 25,
      confidence: 'high',
    },
    {
      label: 'Envelope marking',
      value:
        '"Application to Prequalify for the Design Build and Operate (DBO) of Wadi Zarqa Wastewater Treatment Plant Phase 1 – Tender No. 33/2025", with the applicant name and address and the Employer address on the cover',
      page: 25,
      confidence: 'high',
    },
    {
      label: 'Address',
      value:
        'Water Authority of Jordan, Tenders and Procurement Directorate, 6th floor, Shmeisani, behind the Marriott Hotel, P.O. Box 5012, Amman 11181. Attention: the procurement officer named in the notice',
      page: 26,
      confidence: 'high',
    },
    {
      label: 'Opening venue',
      value: 'WAJ offices, First Floor, Shmeisani, Amman, 29 Dec 2025 at 13:00',
      page: 26,
      confidence: 'high',
    },
    {
      label: 'Late applications',
      value: 'Returned unopened',
      page: 26,
      confidence: 'high',
      note: 'PDS ITA 18.1 overrides the ITA default, which let the Employer accept or reject late applications.',
    },
    {
      label: 'Language',
      value: 'English only. Supporting documents in other languages need an English translation, and untranslated information is not considered',
      page: 25,
      confidence: 'high',
    },
    {
      label: 'Contents',
      value:
        'Submission form, forms ELI-1.1/1.2, CON-2, FIN-3.1 to 3.4, EXP-4.1 to 4.4, CER, EXP-ESHS; power of attorney; EIB Covenants; JV agreement or LoI with roles and % and a joint-and-several statement; PCG undertaking where relied on; undertaking to form a Jordanian entity',
      page: 13,
      confidence: 'high',
    },
    {
      label: 'Financial forms',
      value: 'FIN forms stamped by the applicant\'s own auditor or another reputable audit firm. Certified translation of key statements if not in English',
      page: 30,
      confidence: 'high',
    },
    {
      label: 'Experience evidence',
      value: 'Completed works: client completion or performance certificate. Ongoing works: client letter with technical and financial characteristics',
      page: 32,
      confidence: 'high',
    },
  ],

  contacts: [
    {
      name: 'Procurement officer, Tenders and Procurement Directorate',
      role: 'Contact for clarifications and submission',
      org: 'Water Authority of Jordan, Tenders and Procurement Directorate',
      phone: '+962 6 5669965 (fax +962 6 5652278)',
      address: '6th floor, Shmeisani, behind the Marriott Hotel, P.O. Box 5012, Amman 11181, Jordan',
      page: 25,
    },
    {
      name: 'Secretary General, Water Authority of Jordan',
      role: 'Secretary General of WAJ (signatory of the procurement notice)',
      org: 'Water Authority of Jordan',
      page: 5,
    },
    {
      name: 'EIB procurement complaints',
      role: 'Copy recipient for concerns about clauses limiting competition',
      org: 'European Investment Bank',
      email: 'procurementcomplaints@eib.org',
      page: 18,
    },
  ],

  clauses: [
    { ref: 'ITA 4.2', title: 'One application per firm and group', summary: 'Apply alone or in one JV, not both. Specialized Subcontractor on only one application. Only one firm per corporate group may prequalify.', page: 10 },
    { ref: 'ITA 4.7 / Section VI', title: 'EIB covenants', summary: 'Covenant of Integrity and E&S Covenant are mandatory, and missing them means ineligibility. All sanctions and exclusions must be self-declared regardless of date. Books kept 6 years, with EIB audit and site-visit rights.', page: 10 },
    { ref: 'ITA 7.1', title: 'Clarifications', summary: 'Written requests answered if received at least 14 days before the deadline. The PDS sets 8 Dec 2025 12:00. Answers go to all holders and the MWI web page.', page: 12 },
    { ref: 'ITA 14.2 / Sec. III', title: 'Currency of statements', summary: 'All amounts in USD at the Central Bank of Jordan rate 30 days before submission.', page: 14 },
    { ref: 'ITA 25.2 / PDS ITA 25', title: 'Parent company reliance', summary: 'No reliance on a non-member parent\'s technical experience. Financial reliance allowed only with a binding PCG undertaking at PQ and an unconditional PCG at bid submission.', page: 26 },
    { ref: 'ITA 27.2', title: 'Conditional prequalification', summary: 'Applicant may be prequalified subject to correcting specified documents or deficiencies before or at bid submission.', page: 17 },
    { ref: 'ITA 29.2-29.6', title: 'Securities at bid and contract stage', summary: 'Bid Security or Bid-Securing Declaration at bidding. Performance Security and PCG(s) must cover the whole design-build phase and the operation phase, including design defects and malfunctions from design or construction found during operation.', page: 17 },
    { ref: 'ITA 30.1', title: 'Change in applicant structure', summary: 'Any post-PQ change to the applicant, JV members or Specialized Subcontractors needs written Employer approval. It is refused if the criteria are no longer met or competition falls. Submit within 60 days of the IFB.', page: 18 },
    { ref: 'ITA 31 / Bylaw 8-2022 cl. 50-53', title: 'Complaints', summary: 'Objection to the procuring entity within 5 working days of publication and before the deadline. Reply within 5 working days. Then a complaint to the Purchase Complaints Review Committee. Copy concerns to EIB.', page: 18 },
    { ref: 'PDS ITA 4.1 (items 1-14)', title: 'JV rules', summary: 'At most 3 contributing members. Qualifications aggregated, but each member must also meet individual criteria. JV-Consortium members jointly and severally liable. JV changes after the deadline need WAJ approval in consultation with EIB and U.S. DoS.', page: 22 },
    { ref: 'PDS ITA 4.1 item 14 / Sec. V', title: 'Jordanian legal entity', summary: 'Contract is not signed until the winner (and each JV-Consortium member and each subcontractor) has a Jordanian company registered with MoIT, JCCA (Law 13/1987), JEA (Law 15/1972), JNBC and MPWH.', page: 24 },
    { ref: 'PDS ITA 24.1', title: 'Subcontracting', summary: 'No subcontracting without prior consent of EIB, U.S. DoS and the Employer. Subcontractor rules to come with the IFB. The Council of Ministers waived the 35% Jordanian-contractor share rule.', page: 26 },
    { ref: 'Sec. III 3.1-3.4', title: 'Financial criteria', summary: 'US$ 50M liquidity, US$ 50M net worth, average current ratio above 1, average EBITDA above 0, average D/E below 3, average turnover above US$ 100M, all over 2022-2024.', page: 30 },
    { ref: 'Sec. VII §2', title: 'Periods and contract form', summary: 'Award mid-2027, 36-month design-build, 20-year operation (possibly a 10-year base plus 10-year extension), FIDIC Gold Book.', page: 69 },
  ],

  flags: [
    {
      title: 'Security must span design-build and the 20-year operation',
      detail:
        'ITA 29.4-29.6 require the Performance Security and any PCG to cover the entire design-build phase and extend through operation, including latent design and construction defects that appear in operation. Amounts are not yet set. Expect a long-tenor bank instrument or a rolling structure, and a PCG from any foreign parent.',
      page: 17,
      severity: 'high',
    },
    {
      title: 'Narrow O&M reference: THP, digestion and CHP at 75,000 m3/day or more, one contract of 10 years or more',
      detail:
        'Criterion 4.4 needs two WWTP O&M contracts since 2010 (at least 10 years and at least 5 years), each at least 75,000 m3/day with BNR, digestion and CHP. Few regional contractors hold this alone, so an international O&M operator as JV member or named O&M Specialized Subcontractor is almost certainly needed.',
      page: 37,
      severity: 'high',
    },
    {
      title: 'High financial and size thresholds',
      detail:
        'Three contracts of at least US$ 150M each (two completed) since 2010, turnover above US$ 100M, net worth and liquidity each at least US$ 50M. JV members cannot pool values to reach the single-contract US$ 150M test.',
      page: 32,
      severity: 'high',
    },
    {
      title: 'Jordanian entity for every party, before signing',
      detail:
        'The winner, each JV-Consortium member and every subcontractor must incorporate in Jordan and register with MoIT, JCCA, JEA, JNBC and MPWH before the Contract Agreement is signed. The Jordanian entity then needs a PCG from its foreign parent. Allow time and cost, and factor in the Jordanian tax exposure.',
      page: 59,
      severity: 'medium',
    },
    {
      title: 'Jordanian First Grade in four categories for local partners',
      detail:
        'A Jordanian JV partner must hold First Grade in WWTP, Buildings, Water/Wastewater and Electromechanical combined. Jordanian subcontractors need First Grade in their discipline. This narrows the pool of local partners.',
      page: 22,
      severity: 'medium',
    },
    {
      title: 'Financing only "applied for"',
      detail:
        'WAJ "has applied for" EIB and U.S. DoS funds. Years 3-20 of O&M rely on Government of Jordan budget, which is sovereign payment risk over 18 years. EIB and U.S. DoS approval is needed at PQ list, selection and award.',
      page: 2,
      severity: 'medium',
    },
    {
      title: 'Timeline has moved on',
      detail:
        'PQ closed 29 Dec 2025. IFB was indicated for June 2026 with a 5-month bid period. As of Sep 2026 this record describes a closed PQ. Check whether the IFB has been issued and who was prequalified.',
      page: 5,
      severity: 'medium',
    },
    {
      title: 'Scope data non-binding and internally inconsistent',
      detail:
        'Section VII is marked "for preliminary informational purposes only". Pipeline diameter is "up to 1,600 mm" on p. 3 but "1600mm-1700mm (to be verified)" on p. 67. P. 69 says 60-80% of WZPS flow is diverted and "the remaining 30 percent" continues to As Samra, which does not add up.',
      page: 65,
      severity: 'medium',
    },
    {
      title: 'Interface with As Samra BOT operator',
      detail:
        'The WZPS pretreatment works sit on a site run by the As Samra Project Company, whose contract ran to 30 Dec 2025. The DBO contractor must not affect WZPS operation or the adjacent live transmission main. Access rights depend on the Employer and SPC agreement.',
      page: 68,
      severity: 'medium',
    },
    {
      title: 'Parent Company Guarantee timing wording',
      detail:
        'PDS ITA 25 says that if the applicant is "prequalified and awarded the contract", the parent must furnish an unconditional PCG "at the time of Bid submission". The sequence is ambiguous, so plan for the PCG to be ready with the bid.',
      page: 26,
      severity: 'low',
    },
    {
      title: 'Minor drafting errors',
      detail:
        'Criterion 4.3b prints "1200 m" instead of 1200 mm (p. 36). Form EXP-4.1 asks for 15 years of continuous work while criterion 4.1 counts contracts from 1 Jan 2010 (p. 51). Raise these at clarification stage.',
      page: 36,
      severity: 'low',
    },
    {
      title: 'Winner pays gazette advertisement',
      detail: 'The awarded bidder bears the cost of one gazette advertisement.',
      page: 5,
      severity: 'low',
    },
  ],
};
