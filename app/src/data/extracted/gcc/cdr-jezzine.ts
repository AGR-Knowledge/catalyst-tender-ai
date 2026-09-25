import type { ExtractedTender } from '../types';

export const T887_JEZZINE: ExtractedTender = {
  key: 'cdr-jezzine-lot3',
  fileNames: ['T887_1.pdf', 'cdr-jezzine-lot3.pdf'],
  docType:
    'Request for Bids (RFB), Small Works, One-Envelope Bidding Process: Tender Documents Volume I (Tendering Conditions & Conditions of Contract)',
  pages: 266,
  language: 'English',
  scanned: false,

  title:
    'Rehabilitation of Selected Road Links in Lebanon: Rehabilitation of Remaining Roads for Lot 3 - Jezzine Caza, Jezzine Entrance',
  shortName: 'Jezzine Entrance road rehab (Lot 3, CDR)',
  refNo: 'RFB No. PW015 RE',
  // Cover and RFB title page print "APRIL 2024" / "Issued on: APRIL 2024" (pp. 1, 5). No day is given; the 1st is a placeholder.
  issued: '2024-04-01',
  authority: 'Council for Development and Reconstruction (CDR), Republic of Lebanon',
  parent: 'Republic of Lebanon (the Borrower); CDR acts as its implementing agency. Financed by the World Bank (IBRD)',
  country: 'Lebanon',
  location:
    'Jezzine Entrance, Caza (district) of Jezzine, Lebanon. Site "as defined in drawings" (Volume 4, not in this file)',
  sector: 'Transport',
  mode: 'Build-only admeasurement (unit-rate BoQ) works contract, World Bank SPD Small Works GCC; Employer design, Contractor designs Temporary Works only',
  // Bid may be in any hard currency plus local currency, and "USD is considered as a local currency in the Republic of Lebanon" (BDS ITB 15.1, p. 41).
  // Evaluation, bid security, fee, insurance and qualification thresholds are all in USD. GCC 48.1 names LBP as the Employer's country currency (p. 188).
  currency: 'USD',
  valueDisplay: null,
  valueCr: null,

  summary: [
    {
      label: 'Estimated contract value',
      value: 'Not stated in this document',
      page: 2,
      confidence: 'high',
      note: 'No cost estimate or budget in the 266 pages. Proxies only: bid security US$ 50,000 (p. 42), construction cash-flow requirement US$ 1.50 M for 3 months (p. 59), average turnover US$ 2.0 M (p. 60), similar-contract threshold US$ 1.0 M (p. 61). The priced BoQ is in Volume 3, not in this file.',
    },
    {
      label: 'Financing',
      value:
        'World Bank, Roads and Employment Project (REP), Loan/Grant No. 8705-LB / TF0A4481; financing agreement amount US$ 200 M. CDR pays by the Bank Direct Payment method, and only for certified monthly statements covering periods ending on the Loan Closing Date',
      page: 2,
      confidence: 'high',
      note: 'US$ 200 M from BDS ITB 2.1 on p. 36 (printed 30). The Loan Closing Date itself is not stated anywhere in the document.',
    },
    {
      label: 'Completion period',
      value: '100 days from the Commencement/Start Date: 10 days mobilisation plus 90 days construction',
      page: 3,
      confidence: 'high',
      note: 'Repeated as the Intended Completion Date in PCC GCC 1.1(v), p. 184 (printed 178). No sectional completion (PCC 2.2, p. 185).',
    },
    {
      label: 'Defects liability period',
      value: 'One year (365 days) from Completion, extended while defects remain uncorrected',
      page: 188,
      confidence: 'high',
      note: 'PCC GCC 1.1(p) on p. 184 says "One Year"; PCC GCC 38.1 on p. 188 (printed 182) says 365 days.',
    },
    {
      label: 'Bid security',
      value:
        'US$ 50,000 (or equivalent in a freely convertible currency), unconditional bank guarantee from a Lebanese bank or a foreign bank through its correspondent in Lebanon, in strict conformity with the Section IV form (any other text means rejection). A certified bank cheque in favour of CDR is also accepted. Bid-Securing Declaration not allowed',
      page: 42,
      confidence: 'high',
      note: 'BDS ITB 19.1 and 19.3(d), printed p. 36. Same amount in the Specific Procurement Notice, p. 4. Validity 28 days beyond bid validity (ITB 19.3, p. 21).',
    },
    {
      label: 'Bid validity',
      value:
        '126 days after the bid submission deadline. Must be extended (with the bid security) by any suspension period ordered by the Complaints Authority under Public Procurement Law 244/2021, once that Authority exists',
      page: 42,
      confidence: 'high',
    },
    {
      label: 'Cost of bidding document',
      value:
        'USD 250, non-refundable, paid in cash ("fresh USD") on written application. Document collected by a duly authorised person. Inspection Monday to Thursday 09:00-15:00 Beirut time',
      page: 3,
      confidence: 'high',
    },
    {
      label: 'Performance security',
      value:
        '10% of the Accepted Contract Amount, as an unconditional performance bank guarantee (bank in Lebanon, or foreign bank through a Lebanese correspondent), same currencies as the contract, due within 10 days of contract notification (signature of the agreement by both parties)',
      page: 188,
      confidence: 'high',
      note: 'PCC GCC 54.1 (printed 182) and BDS ITB 48.1 on pp. 45-46. Valid until 28 days after the Certificate of Completion (GCC 54.1, pp. 170-171). Performance bond option marked "Not Applicable" (p. 203).',
    },
    {
      label: 'Advance payment',
      value: '15% of the Accepted Contract Amount, paid no later than the Start Date, against an unconditional bank guarantee of equal amount that reduces as the advance is recovered. Interest-free',
      page: 188,
      confidence: 'high',
      note: 'PCC GCC 53.1; mechanism in GCC 53.1-53.3 on p. 170. Receipt of the advance is one of the precedent conditions for the Start Date (PCC GCC 1.1(dd), p. 184).',
    },
    {
      label: 'Retention',
      value: '10% of each payment until Completion; half released at Completion, half after the defects liability period. May be replaced by an on-demand bank guarantee',
      page: 188,
      confidence: 'high',
      note: 'Rate from PCC GCC 50.1; release and substitution from GCC 50.2 on p. 169. No retention cap is stated.',
    },
    {
      label: 'Liquidated damages',
      value: '0.2% of the Contract Price per day, capped at 10% of the final Contract Price. No early-completion bonus (0%)',
      page: 188,
      confidence: 'high',
    },
    {
      label: 'Price basis and tax',
      value:
        'Fixed prices, no price adjustment. Contract Price excludes VAT because the contract is 100% foreign funded (Law 379/2001 as amended by Law 64/2017). If award is delayed more than 56 days past bid validity the adjustment factor is 1 (no uplift)',
      page: 41,
      confidence: 'high',
      note: 'BDS ITB 14.5 and 14.9 (p. 41), BDS ITB 18.3(a) (p. 42), PCC GCC 49.1 (p. 188). VAT Mandate in Appendix 2, p. 252.',
    },
    {
      label: 'Procurement method',
      value:
        'National competitive procurement by RFB under the World Bank Procurement Regulations for IPF Borrowers (July 2016), open to all eligible bidders. Single-envelope, single stage. Award to the lowest evaluated cost bidder that meets the qualification criteria',
      page: 3,
      confidence: 'high',
      note: 'Based on the World Bank SPD Small Works, One-Envelope, March 2021 (p. 5).',
    },
    {
      label: 'Lots',
      value: 'One lot (contract) in this RFB',
      page: 36,
      confidence: 'high',
      note: 'Section III 2.2 (pp. 54-55) still carries multiple-lot award text and refers to a lot table in the notice that is not printed.',
    },
    {
      label: 'Bid submission deadline',
      value: 'Not stated in this document. The notice prints 12:00 noon Beirut time followed by a blank line for the date; the BDS defers to the notice',
      page: 4,
      confidence: 'high',
      note: 'BDS ITB 22.1 (p. 43) and 25.1 (p. 44) say "As stated in the Specific Procurement Notice". The notice only says bidding was expected in Q2 2024 (p. 2).',
    },
    {
      label: 'Governing law and language',
      value: 'Law of the Republic of Lebanon. Contract language English',
      page: 185,
      confidence: 'high',
    },
    {
      label: 'Documents not in this file',
      value:
        'Bill of Quantities (Volume 3), Specifications (Volume 2), Drawings (Volume 4) and the Environmental and Social Management Plan are bound separately',
      page: 70,
      confidence: 'high',
      note: 'Also pp. 127, 128 and 135. Quantities, pile numbers and lengths, and the site layout cannot be extracted from this volume.',
    },
  ],

  dates: [
    // Month only: cover and RFB title page print "APRIL 2024" (pp. 1, 5). Day is a placeholder.
    { label: 'Tender documents issued (month only)', date: '2024-04-01', page: 5, confidence: 'low' },
    // Indicative: the notice says bidding "is expected to occur during the Second Quarter of 2024". No actual deadline or opening date is printed (p. 4 is blank).
    { label: 'Bidding expected (Q2 2024, indicative)', date: '2024-04-01', page: 2, confidence: 'low' },
  ],

  eligibility: [
    {
      label: 'Nationality',
      value: 'Bidders of any nationality, except firms, goods and services from Israel (excluded under ITB 4.8(a) and 5.1)',
      page: 121,
      confidence: 'high',
      note: 'Section V, printed p. 115. General rule in ITB 4.4, p. 13.',
    },
    {
      label: 'Joint ventures',
      value: 'JV allowed, existing or by letter of intent, maximum 2 members, all jointly and severally liable. CDR JV agreement form requires compliance with Lebanese JV law and certification by the relevant public notary',
      page: 36,
      confidence: 'high',
      note: 'BDS ITB 4.1 on p. 36; JV liability in ITB 4.1 on pp. 11-12; JV agreement form on pp. 117-120.',
    },
    {
      label: 'Public Procurement Law 244/2021 conditions',
      value:
        'No proven ethics violations; legal capacity; no criminal conviction (even under appeal) of the firm, directors or involved staff for professional misconduct, false statements or corrupting procurement; not insolvent or bankrupt; no usury or money-laundering conviction; no conflict of interest with CDR decision makers. Same conditions apply to subcontractors',
      page: 36,
      confidence: 'high',
      note: 'BDS "Add ITB 4.12" on pp. 36-37; subcontractors in "Add ITB 34.4" on p. 45.',
    },
    {
      label: 'Reliance on other firms',
      value:
        'Qualification documents must be in the bidder\'s own name. A bidder may use another firm\'s qualifications only if it is a branch of that firm or its mother company, with legally certified documents proving the relationship',
      page: 41,
      confidence: 'high',
      note: 'BDS ITB 17.3 on pp. 41-42 and ITB 11.1(i) on p. 38. This relaxes ITB 39.2 (p. 31), which excludes parents and affiliates; the BDS prevails.',
    },
    {
      label: 'Contract non-performance and litigation',
      value:
        'No contract non-performance through contractor default since 1 Jan 2012; no consistent history of court or arbitral awards against the bidder since 1 Jan 2012; financial position must stay sound assuming all pending litigation is lost. Applies to each JV member',
      page: 57,
      confidence: 'high',
    },
    {
      label: 'ES and SEA/SH history',
      value:
        'Declare any civil works contract suspended, terminated or with performance security called for ES (including SEA) breaches in the past 5 years (Form CON-3). Not disqualified by the Bank for SEA/SH non-compliance at award (Form CON-4), including each proposed subcontractor',
      page: 58,
      confidence: 'high',
    },
    {
      label: 'Financial resources (cash flow)',
      value:
        'Access to liquid assets, unencumbered real assets, credit lines or other means, independent of the advance payment, of at least US$ 1.50 M for the construction cash flow over 3 months from contract notification, plus adequate finance for current commitments. JV: lead member at least 50%, other member at least 50%',
      page: 59,
      confidence: 'high',
      note: 'Checked visually on the rendered page (printed 53).',
    },
    {
      label: 'Audited financial statements',
      value: 'Audited balance sheets (or acceptable statements) for the last ten years, showing current soundness and long-term profitability. Each JV member',
      page: 59,
      confidence: 'high',
      note: 'Criterion 3.1(iii) runs over pp. 59-60. Ten years is long for a works contract of this size; Form FIN-3.1 on p. 107 shows only 5 year columns.',
    },
    {
      label: 'Average annual construction turnover',
      value:
        'At least US$ 2.0 M, as certified payments received on contracts in progress or completed, averaged over the best 5 of the last 10 years since 1 Jan 2014. JV: lead at least 50%, other at least 50%',
      page: 60,
      confidence: 'high',
    },
    {
      label: 'General construction experience',
      value: 'Construction contracts in at least the last 10 years, since 1 Jan 2014. Single entity and each JV member',
      page: 60,
      confidence: 'high',
    },
    {
      label: 'Specific experience (4.2(a))',
      value:
        'Between 1 Jan 2013 and the deadline, substantially completed (80% or more): (i) one road works contract of at least US$ 1.0 M including road pile works of at least US$ 500,000; OR (ii) two works contracts with a combined value of at least US$ 1.0 M, one a road project and the other including piling works of at least US$ 400,000, through a partnership with a specialised piling contractor that alone executed one reinforced concrete pile contract with piles worth at least US$ 400,000',
      page: 61,
      confidence: 'medium',
      note: 'Criterion starts on p. 60 (printed 54). Option (ii) wording is unclear: the JV column says each member must meet one contract so that both combined meet it, so it reads as a road contractor plus piling contractor JV (max 2 members). Only the bidder\'s share counts for JV or subcontract references, and JV members cannot aggregate values to meet a single-contract minimum. Checked visually.',
    },
    {
      label: 'Piling capability',
      value:
        'Proven experience in concrete piling works and 3 pile drilling rigs owned or leased (two working at the same time and one standby)',
      page: 3,
      confidence: 'high',
      note: 'Specific Procurement Notice para 3. The 3 rigs are also in the Section III equipment list on p. 63.',
    },
    {
      label: 'Key equipment',
      value:
        '1 asphalt paver with laser sensors (paving width at least 3.0 m), 1 steel roller 6/8 t, 1 pneumatic tyre roller 6/8 t, 1 asphalt milling machine, 3 pile drilling rigs (Form EQU for each)',
      page: 63,
      confidence: 'high',
    },
    {
      label: 'Key personnel (Section III)',
      value:
        'Project Manager (road construction, excellent English) 20 yrs general / 15 yrs relevant; Project Planner, Pavement Engineer and Material Engineer 15 / 12 yrs each; Environmental Expert 7 / 5 yrs on road projects; OHS 10 / 5 yrs; Social Expert 10 / 8 yrs in GBV/SEA risk; Road Safety Expert (civil engineer, internationally certified) 7 / 5 yrs',
      page: 62,
      confidence: 'medium',
      note: 'Checked visually. Section VII (p. 134) lists only 5 positions with lower PM experience (15 yrs), and Form PER-1 (pp. 82-83) lists 4 different titles. Clarify which list governs.',
    },
    {
      label: 'Lebanese contractors only',
      value:
        'NSSF quittance certificate and Order of Public Works and Buildings Contractors quittance, both valid beyond bid opening; Order of Engineers membership certificate for each engineer for the bid year; Ministry of Finance registration certificate',
      page: 38,
      confidence: 'high',
      note: 'BDS ITB 11.1(i), runs over pp. 38-39.',
    },
    {
      label: 'Foreign companies',
      value: 'Before signing, the awarded bidder must show registration of the foreign company (SCA or joint-stock company) or its Lebanese branch at the Lebanese Ministry of Economy and Trade, if applicable',
      page: 45,
      confidence: 'high',
      note: 'BDS "Add ITB 47.3". The Arabic company-type terms on this page are garbled in the text layer.',
    },
    {
      label: 'Subcontracting',
      value:
        'Maximum 30% of the total contract amount. Any subcontracting above 10% must be named in the Letter of Bid with full details. Subcontractor qualifications and experience are not counted: the bidder must qualify on its own',
      page: 44,
      confidence: 'high',
    },
  ],

  scope: [
    { text: 'Rehabilitation of the Jezzine Entrance road, one lot of the World Bank Roads and Employment Project (rehabilitation of primary, secondary and tertiary roads in 25 Cazas, about 580.93 km in total)', page: 126 },
    { text: 'Pavement reconstruction (aggregate base course, bituminous base course) and pavement rehabilitation (milling and overlay, deep patching)', page: 126 },
    { text: 'Concrete piling works and structural concrete repairs. Notice describes retaining walls plus concrete piling alongside pavement and drainage', page: 126 },
    { text: 'Storm water drainage improvement: new culverts, ditches and channels', page: 126 },
    { text: 'Rehabilitation of existing side barriers (New Jersey, concrete barrier, guardrails); median separators, sidewalks and curbs where needed; new stone masonry guard walls; reinstatement of existing stone wall', page: 126 },
    { text: 'Road marking and signing, thermoplastic sheets with signs and warnings, traffic calming (speed humps, bumps, tables)', page: 126 },
    { text: 'Relocation of hazardous electrical, telephone or street lighting poles', page: 126 },
    { text: 'Traffic management during construction, reinstatement of roads disturbed by the works and tapering to existing roads. Detailed Traffic Management Plan Manual (MUTCD or similar) within 28 days of notice to commence, with continuous interlocked New Jersey barriers wherever opposing traffic shares a carriageway', page: 96 },
    { text: 'Milled asphalt to be delivered to local municipalities on request at no extra cost', page: 126 },
    { text: 'ESMP, CDR Safety, Health & Environmental Regulations and the COVID-19 note apply. ESMP delivery is a subsidiary obligation priced in other BoQ items, except provisions for maintaining through traffic', page: 133 },
    { text: 'Employer may add, reduce or omit any part of the scope or any BoQ quantity to suit its budget, with the contract amount recalculated and no right of claim (notice wording)', page: 3 },
    { text: 'Contractor designs Temporary Works only and obtains third-party approvals for them; permanent works to Employer drawings and specifications', page: 151 },
  ],

  evaluation: [
    {
      label: 'Method',
      value: 'Most Advantageous Bid = substantially responsive, lowest evaluated cost, and bidder meets the Section III qualification criteria (post-qualification of the lowest bidder, then the next lowest)',
      page: 29,
      confidence: 'high',
      note: 'ITB 35.1 on p. 29; post-qualification in ITB 39 on pp. 31-32; notice para 4 on p. 3.',
    },
    {
      label: 'Evaluated price',
      value: 'Bid price excluding provisional sums and contingencies, including competitively priced dayworks, after arithmetic corrections, discounts and nonconformity adjustments',
      page: 30,
      confidence: 'high',
    },
    {
      label: 'Single currency',
      value: 'US Dollars, at the Central Bank of Lebanon selling rate 28 days before the bid submission date',
      page: 44,
      confidence: 'high',
    },
    {
      label: 'Technical adequacy',
      value: 'Assessment of capacity to mobilise key equipment and personnel consistent with the proposed methods, schedule and material sourcing, in line with Section VII',
      page: 54,
      confidence: 'high',
    },
    {
      label: 'Nonconformity pricing',
      value: 'Missing or non-conforming items priced at the average of other substantially responsive bids, or the Employer\'s best estimate',
      page: 44,
      confidence: 'high',
    },
    {
      label: 'Preferences and alternatives',
      value: 'No domestic margin of preference. Alternative bids, alternative completion times and alternative technical solutions are not permitted',
      page: 44,
      confidence: 'high',
      note: 'Alternatives in BDS ITB 13 on p. 41.',
    },
    {
      label: 'Abnormally low or unbalanced bids',
      value: 'Written price analysis may be required. The Employer may reject the bid or raise the performance security to up to 20% of the Contract Price',
      page: 31,
      confidence: 'high',
    },
    {
      label: 'Standstill and debriefing',
      value: '10 Business Day standstill after Notification of Intention to Award. Debriefing request within 3 Business Days',
      page: 32,
      confidence: 'high',
      note: 'Debriefing in ITB 46.1 on p. 34.',
    },
  ],

  submission: [
    {
      label: 'Mode',
      value: 'Hard copy only, in one sealed envelope containing sealed "ORIGINAL" and "COPIES" envelopes: 1 original plus 1 hard copy. Electronic bidding not permitted. Late bids rejected and returned unopened',
      page: 42,
      confidence: 'high',
      note: 'Copies in BDS ITB 20.1 (p. 42); envelopes in ITB 21.1 (p. 23); no e-bidding in BDS ITB 22.1 (p. 43).',
    },
    {
      label: 'Address',
      value:
        'Attention: President of CDR, Council for Development and Reconstruction, Tallet El Serail, Beirut Central District, Legal Affairs Division, Tenders Department, Ground Floor, Beirut. Deadline 12:00 noon Beirut time on the notice date',
      page: 43,
      confidence: 'high',
    },
    {
      label: 'Envelope marking',
      value: 'Outer envelope must NOT show the bidder\'s name and address, only the project name and "Do Not Open before the Tender Opening Session"',
      page: 43,
      confidence: 'high',
      note: 'BDS ITB 21.2 overrides ITB 21.2(a) on p. 24, which requires the bidder name.',
    },
    {
      label: 'Handwritten prices',
      value: 'Original Price Schedule(s) must be filled in by hand only, or the bid is rejected',
      page: 42,
      confidence: 'high',
    },
    {
      label: 'Letter of Bid',
      value: 'On letterhead, completed, signed and bearing a LBP 50,000 fiscal stamp. Signatory holds a power of attorney; the representative\'s authority document must be under 3 months old at submission',
      page: 40,
      confidence: 'high',
      note: 'Stamp in BDS "Add ITB 12.2" (p. 40) and the form footnote on p. 69; power of attorney in BDS ITB 20.3 on pp. 42-43.',
    },
    {
      label: 'Schedules with the bid',
      value: 'Priced Bill of Quantities, Schedule of Payment Currencies, Mobilisation Schedule, Construction Schedule; breakdown of every unit rate (material, labour, equipment, other charges, overhead and profit) and of dayworks rates',
      page: 38,
      confidence: 'high',
      note: 'Price analysis per BDS "Add ITB 14.8" on p. 41; breakdown form on p. 72.',
    },
    {
      label: 'Administrative documents',
      value:
        'Certified constitution and registration documents; bid document purchase receipt; litigation information; subcontracting proposals above 10%; permanent address certificate; bidding documents and all addenda and pre-bid minutes signed and stamped; signed banking-secrecy waiver declaration; Beneficial Ownership Disclosure Form from the successful bidder',
      page: 38,
      confidence: 'high',
      note: 'List runs over pp. 38-39. Banking secrecy waiver also in BDS ITB 3.3 (p. 36).',
    },
    {
      label: 'ES documents with the bid',
      value:
        'SEA/SH declaration; Code of Conduct for Contractor\'s Personnel; Management Strategies and Implementation Plans for traffic management, water resource protection, site boundary marking, consents and permits (asphalt plant EIA/ESMP, quarry, borrow pit), GBV/SEA prevention, and OHS manuals; Traffic Management Plan brief',
      page: 39,
      confidence: 'high',
      note: 'Runs over pp. 39-40. SEA/SH declaration from the notice, p. 4; TMP brief from p. 96.',
    },
    {
      label: 'Technical proposal',
      value: 'Key personnel schedule and CVs (PER-1/2), equipment forms, site organisation chart, method statement (quarries, borrow pits, haulage, work fronts, H&S plan), mobilisation and construction schedules. Missing or weak technical information may lead to rejection',
      page: 81,
      confidence: 'high',
      note: 'Forms on pp. 81-96.',
    },
    {
      label: 'Language',
      value: 'English. Supporting documents may be in Arabic, French or English; otherwise a certified English translation',
      page: 38,
      confidence: 'high',
    },
    {
      label: 'Bid currency',
      value: 'Any hard currency plus local currency; USD counts as local currency. Foreign-currency needs may be stated in up to three currencies as a % of the bid price',
      page: 41,
      confidence: 'high',
    },
    {
      label: 'Clarifications and pre-bid meeting',
      value: 'Written requests must reach CDR at least 10 days before the deadline; CDR replies no later than 6 days before. Answers also on www.cdr.gov.lb and the Public Procurement Authority platform. Pre-bid meeting in the CDR Board Meeting Room, First Floor, date to be communicated. No site visit organised by the Employer',
      page: 37,
      confidence: 'high',
      note: 'Pre-bid meeting and site visit on p. 38.',
    },
    {
      label: 'Bid opening',
      value: 'Public opening at the same CDR address, 12:00 noon Beirut time on the notice date. Letter of Bid and price schedules initialled and numbered by CDR',
      page: 44,
      confidence: 'high',
    },
  ],

  contacts: [
    {
      name: 'Tenders Department contact person',
      role: 'Contact person named in the Specific Procurement Notice',
      org: 'Council for Development and Reconstruction (CDR), Tenders Department',
      phone: '+961 1 981431/2 (fax +961 1 981255)',
      address: 'Tallet El-Serail, Beirut, Lebanon. Web: www.cdr.gov.lb/procurement, www.ppa.gov.lb',
      page: 4,
    },
    {
      name: 'President of CDR',
      role: 'Addressee for clarifications and bid submission (e-mail "Not Applicable")',
      org: 'Council for Development and Reconstruction, Legal Affairs Division, Tenders Department',
      phone: '+961-1-980096 (fax +961-1-981255)',
      address: 'Tallet Al Serail, Beirut Central District, Beirut, Lebanon. Web: https://www.cdr.gov.lb',
      page: 37,
    },
    {
      name: 'President of CDR (complaints)',
      role: 'President of CDR; recipient of procurement-related complaints until the Complaints Authority is created',
      org: 'Council for Development and Reconstruction',
      phone: 'Fax +961-1-981252',
      page: 49,
    },
    {
      name: 'Associated Consulting Engineers (ACE)',
      role: 'Consultant named on the cover; role not stated (the RFB title page says CDR prepared the document)',
      org: 'Associated Consulting Engineers',
      address: 'B.P. 11-3446, Beirut, Lebanon',
      page: 1,
    },
  ],

  clauses: [
    { ref: 'Notice para 2', title: 'Employer may vary scope and quantities', summary: 'CDR may add, reduce or eliminate any part of the works or any BoQ quantity to suit its budget; the contract amount is recalculated and the contractor must price for this with no right to claim.', page: 3 },
    { ref: 'Notice para 1', title: 'Payment tied to Loan Closing Date', summary: 'Direct Payment by the Bank; the Borrower pays certified monthly statements covering only periods ending on the Loan Closing Date, which is not stated.', page: 2 },
    { ref: 'BDS ITB 17.3', title: 'Qualifications of other firms', summary: 'Documents must be in the bidder\'s name; only a branch or the mother company may lend qualifications, with certified proof of the relationship.', page: 41 },
    { ref: 'BDS ITB 19.1 / 19.3(d)', title: 'Bid security', summary: 'US$ 50,000 unconditional BG from a Lebanese bank or a foreign bank via a Lebanese correspondent, in the exact Section IV wording, or a certified bank cheque to CDR. Unsuccessful bidders\' cheques returned after the CDR Board decision.', page: 42 },
    { ref: 'BDS ITB 20.3', title: 'Handwritten price schedules', summary: 'Original price schedules must be handwritten, otherwise the bid is rejected.', page: 42 },
    { ref: 'BDS ITB 34.2', title: 'Subcontracting cap', summary: 'Maximum 30% subcontracted; more than 10% must be named in the Letter of Bid; subcontractor experience does not count towards qualification.', page: 44 },
    { ref: 'Sec. III 4.2(a)', title: 'Road and piling experience', summary: 'One road contract of at least US$ 1.0 M with at least US$ 500,000 of piles, or a road contract plus a specialised piling partner with an RC pile contract of at least US$ 400,000, since 1 Jan 2013.', page: 61 },
    { ref: 'PCC GCC 1.1(dd)', title: 'Start Date preconditions', summary: 'Start Date only after contract signature (and any approvals), site access, receipt of the advance payment against its guarantee, and submission of the performance guarantee.', page: 184 },
    { ref: 'PCC GCC 4.1 / 5.1', title: 'Project Manager authority', summary: 'PM needs Employer approval before substantial variations, cost or time increases, determinations, interim payment certificates and taking-over certificates. PM may not delegate.', page: 185 },
    { ref: 'PCC GCC 24.4', title: 'Disputes', summary: 'Amicable settlement 60 days, then arbitration: Lebanese contractor at CCIA-BML Beirut (1 arbitrator); foreign contractor under UNCITRAL, 3 arbitrators, Cairo Arbitration Center, ICC as appointing authority. Lebanese law, English. Valid only if a Council of Ministers decree authorises arbitration (Law 440/2002); otherwise Lebanese courts. CDR is the appointing authority for the Adjudicator.', page: 186 },
    { ref: 'PCC GCC 30.1 / 30.3', title: 'Programme', summary: 'Programme within 28 days of the Letter of Acceptance, updates every 56 days, progress reports every 30 days. Late programme update: 10% of the gross value of the next interim certificate withheld until provided.', page: 187 },
    { ref: 'PCC GCC 51.1 / 61.2(g)', title: 'Delay damages and termination', summary: 'LDs 0.2% per day capped at 10%, which is reached after 50 days of delay; 50 days of delay is then a fundamental breach allowing termination.', page: 188 },
    { ref: 'PCC GCC 54.1', title: 'Performance security', summary: '10% performance bank guarantee within 10 days of contract signature, valid to 28 days after the Certificate of Completion (GCC 54.1).', page: 188 },
    { ref: 'PCC GCC 45.1', title: 'Late payment', summary: 'Payment within 28 days of each certificate (GCC 45.1); late payment interest at simple annual SOFR + 2%. Contractor may terminate if a certificate is unpaid for 84 days (GCC 61.2(d)).', page: 188 },
    { ref: 'PCC GCC 60.2 / 62.1', title: 'Withholding and termination deduction', summary: '5% of the contract price withheld if as-built drawings or O&M manuals are late (due within 28 days of completion). On termination for contractor default, 10% of the value of unfinished work is deducted.', page: 189 },
    { ref: 'App. 1 cl. 3.2', title: 'Safety and ES deductions', summary: 'Deductions of USD 100 per person per day (PPE), USD 500 per location per day (public areas) and USD 100 per occurrence per day (other), doubled for repeats, capped at 1% of the Contract Price, with no extension of time or cost relief.', page: 217 },
    { ref: 'BDS ITB 50.1', title: 'Complaints', summary: 'Complaints go to the Administrative Complaints Authority under Law 244/2021 once it exists; until then to the President of CDR under World Bank Annex III, with the State Council appeal route.', page: 46 },
  ],

  flags: [
    {
      title: 'No bid deadline or opening date in the document',
      detail:
        'The notice leaves the submission and opening dates blank (12:00 noon Beirut time, date not printed) and the BDS defers to the notice. Only "Second Quarter of 2024" is indicated. Obtain the dated notice or addendum before planning.',
      page: 4,
      severity: 'high',
    },
    {
      title: 'Piling is the qualification gate',
      detail:
        'Bidders must prove concrete piling experience (a road contract with at least US$ 500,000 of piles, or a piling JV partner with a US$ 400,000 RC pile contract) and field 3 pile drilling rigs, two working at once plus a standby. Subcontractor experience does not count, so a pure road contractor needs a 2-member JV with a piling firm.',
      page: 61,
      severity: 'high',
    },
    {
      title: '100-day programme with piling, and LDs that reach termination in 50 days',
      detail:
        '10 days mobilisation and 90 days construction, including piling, drainage, walls and paving, in a live town-entrance road. LDs at 0.2% per day hit the 10% cap after 50 days, and that delay is then a fundamental breach allowing termination with a further 10% deduction on unfinished work.',
      page: 188,
      severity: 'high',
    },
    {
      title: 'Timeline has moved on',
      detail:
        'Documents are dated April 2024 with bidding expected in Q2 2024. As of Sep 2026 this is almost certainly closed or awarded; the notice also warns that unawarded REP lots are re-bid. Check CDR and PPA portals for status.',
      page: 2,
      severity: 'medium',
    },
    {
      title: 'Payments only up to the Loan Closing Date, which is not given',
      detail:
        'The notice says the Borrower pays certified statements covering only periods ending on the Loan Closing Date. Any delay or extension that pushes work past closing risks going unfunded. Ask CDR for the closing date of Loan 8705-LB / TF0A4481.',
      page: 2,
      severity: 'medium',
    },
    {
      title: 'Key personnel requirements are heavy and inconsistent',
      detail:
        'Section III asks for 8 named roles, including a Project Manager with 20 years (15 relevant) plus Planner, Pavement and Material Engineers with 15 years each, for a 100-day job. Section VII lists 5 roles (PM 15 years) and Form PER-1 lists 4 different titles. Clarify which list is evaluated.',
      page: 62,
      severity: 'medium',
    },
    {
      title: 'BoQ, drawings, specifications and ESMP not in this file',
      detail:
        'Volume I refers to Volume 2 (Specifications), Volume 3 (BoQ) and Volume 4 (Drawings) and a separately bound ESMP. Pile quantities, road length and site layout cannot be assessed without them.',
      page: 70,
      severity: 'medium',
    },
    {
      title: 'Unilateral scope and quantity changes with no claim',
      detail:
        'The notice lets CDR add, cut or remove any item or quantity with no right to claim. This conflicts with GCC 41.1 (rate review above 25% quantity change, p. 163). The notice is not part of the bidding documents (ITB 6.2), but price the risk and raise it at clarification.',
      page: 3,
      severity: 'medium',
    },
    {
      title: 'Arbitration may not be available',
      detail:
        'Arbitration (Beirut or Cairo) is valid only if the Council of Ministers issues a decree under Law 440/2002; otherwise disputes go to Lebanese courts. CDR, the Employer, is also the appointing authority for the Adjudicator, and the Adjudicator fee is "to be determined".',
      page: 187,
      severity: 'medium',
    },
    {
      title: 'Strict formalities that reject bids',
      detail:
        'Price schedules handwritten only; bid security in the exact form wording; outer envelope anonymous; LBP 50,000 fiscal stamp on the Letter of Bid; power-of-attorney authority document under 3 months old. Any slip can mean rejection.',
      page: 42,
      severity: 'medium',
    },
    {
      title: 'Ten years of audited accounts',
      detail:
        'Criterion 3.1(iii) asks for audited balance sheets for the last ten years for each bidder or JV member, while Form FIN-3.1 shows 5 year columns. Newer entities or recent restructurings may not comply.',
      page: 59,
      severity: 'low',
    },
    {
      title: 'Lebanese banking and compliance items',
      detail:
        'Bid and performance guarantees must come from a Lebanese bank or through a Lebanese correspondent; document fee in cash "fresh USD"; signed waiver of Lebanese banking secrecy over the contract account; foreign firms must register with the Ministry of Economy and Trade before signing.',
      page: 42,
      severity: 'low',
    },
    {
      title: 'Drafting inconsistencies to raise at clarification',
      detail:
        'BDS refers to "Envelope No. 1 (Administrative and Technical Offer)" in a one-envelope process (p. 40); Section III keeps multiple-lot text and a missing lot table (pp. 54-55); experience windows start 2012, 2013 or 2014 by criterion; PCC 49.1 cites GCC Clause 45 for price adjustment; Appendix 1 D1 cites clause 5.6 (ladders) for PPE (p. 217); an ES Performance Security form is included (p. 205) but no amount is set.',
      page: 40,
      severity: 'low',
    },
    {
      title: 'Low minimum insurance amounts',
      detail:
        'PCC sets minimums "in Fresh Dollars" of US$ 100,000 per occurrence for works and third-party property and US$ 20,000 per occurrence for equipment and for each personal-injury category. The heading says "amounts and deductibles" without separating them. Check against lender and corporate insurance policy.',
      page: 186,
      severity: 'low',
    },
  ],
};
