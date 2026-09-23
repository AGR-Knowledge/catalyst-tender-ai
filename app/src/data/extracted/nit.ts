import type { ExtractedTender } from './types';

export const NIT: ExtractedTender = {
  key: 'nit',
  fileNames: ['NIT.pdf'],
  docType: 'Notice Inviting Bid',
  pages: 3,
  language: 'English, with Hindi letterhead',
  scanned: false,

  title:
    'Construction of New Two-Lane Bridge with its approaches from Km 0+000 to Km 4+385 across River Brahmaputra on NH-17 at Jogighopa in the State of Assam on EPC mode',
  shortName: 'Jogighopa Brahmaputra bridge, NH-17',
  refNo: 'NHIDCL/Assam/NH17/JogighopaBridge/2020-21',
  issued: '2021-02-19',
  authority: 'National Highways & Infrastructure Development Corporation Limited (NHIDCL)',
  parent: 'Ministry of Road Transport & Highways, Govt. of India',
  country: 'India',
  location: 'Jogighopa, Assam (NH-17, Km 0+000 to Km 4+385)',
  sector: 'Transport',
  mode: 'EPC',
  currency: 'INR',
  valueDisplay: '₹ 504.26 Cr',
  valueCr: 504.26,

  summary: [
    {
      label: 'Estimated cost',
      value: '₹ 504.26 Cr, exclusive of GST',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Construction period',
      value: '30 months',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Maintenance period',
      value: '120 months',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'State and NH',
      value: 'Assam, NH-17',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Project length',
      value: 'Km 0+000 to Km 4+385, bridge with approaches across River Brahmaputra',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Bid type',
      value: 'National Competitive Bids',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Portal',
      value: 'Central Public Procurement Portal (CPPP), https://eprocure.gov.in/eprocure/app',
      page: 1,
      confidence: 'high',
      note: 'URL is printed with a space after "https://". Shown here without the space.',
    },
    {
      label: 'Bid security',
      value: 'Bid Securing Declaration, submitted physically',
      page: 1,
      confidence: 'medium',
      note: 'The NIT names a Bid Securing Declaration but gives no EMD amount. Terms are in the data sheet, which is not part of this file.',
    },
    {
      label: 'Document fee',
      value: 'Payable, submitted physically. Amount not stated in the NIT',
      page: 1,
      confidence: 'medium',
      note: 'Amount and payment mode are not given in these 3 pages.',
    },
  ],

  dates: [
    { label: 'NIT issued', date: '2021-02-19', page: 1, confidence: 'high' },
    { label: 'Bid document download opens', date: '2021-02-19', page: 1, confidence: 'high' },
    {
      label: 'Bid document download closes',
      date: '2021-03-11',
      time: '11:00',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Online bid submission deadline',
      date: '2021-03-11',
      time: '15:00',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Online bid opening',
      date: '2021-03-12',
      time: '16:30',
      page: 1,
      confidence: 'high',
    },
  ],

  eligibility: [
    {
      label: 'Who may bid',
      value: 'Eligible contractors, under National Competitive Bids',
      page: 1,
      confidence: 'high',
      note: 'Qualification criteria are not given in the NIT.',
    },
    {
      label: 'Joint bidding',
      value: 'Joint bidding appears to be allowed. A Joint Bidding Agreement is listed among the physical documents',
      page: 1,
      confidence: 'medium',
      note: 'Inferred from the mention of a Joint Bidding Agreement. The disclaimer on page 3 also refers to a "Selected Bidder JV or Contractor".',
    },
  ],

  scope: [
    {
      text: 'Construction of a new two-lane bridge with its approaches across River Brahmaputra on NH-17 at Jogighopa, Assam',
      page: 1,
    },
    { text: 'Chainage Km 0+000 to Km 4+385', page: 1 },
    { text: 'Delivery on EPC mode', page: 1 },
    { text: 'Construction over 30 months, followed by 120 months of maintenance', page: 1 },
  ],

  evaluation: [
    {
      label: 'Bid parts',
      value: 'Technical bid and financial bid, both submitted online',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Bid opening',
      value: 'Online, 12/03/2021 at 1630 hrs IST',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Right to reject',
      value: 'NHIDCL may accept or reject all or any of the bids without assigning any reason',
      page: 1,
      confidence: 'high',
    },
  ],

  submission: [
    {
      label: 'Online submission',
      value: 'Financial bid and technical bid at https://eprocure.gov.in/eprocure/app by 11/03/2021, up to 1500 hrs IST',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Other modes',
      value: 'Bids through any other mode shall not be entertained',
      page: 1,
      confidence: 'high',
    },
    {
      label: 'Physical submission',
      value: 'Bid Securing Declaration, document fee, Power of Attorney and Joint Bidding Agreement etc., by the date in the data sheet',
      page: 1,
      confidence: 'high',
      note: 'The physical submission date and address are in the data sheet, which is not included.',
    },
  ],

  contacts: [
    {
      name: 'K. C. Bhatt',
      role: 'Dy. General Manager/Tech',
      org: 'National Highways & Infrastructure Development Corporation Ltd.',
      email: 'kc.bhatt@gov.in',
      phone: '+91-11-23461626',
      address: 'Third Floor, PTI Building, 4 Sansad Marg, New Delhi-110001',
      page: 2,
    },
    {
      name: 'Shri Subhash Chandra',
      role: 'Independent External Monitor (IEM)',
      org: 'NHIDCL',
      email: 'subhash59@hotmail.com',
      phone: 'Mobile 9717790920, Landline 011-26888030',
      address: 'B-9, Tower 10, New Moti Bagh Complex, 702, New Delhi-110021',
      page: 2,
    },
  ],

  clauses: [
    {
      ref: 'Notice Inviting Bid',
      title: 'Mode of submission',
      summary:
        'Bids are accepted online on CPPP only. Bid Securing Declaration, document fee, Power of Attorney and Joint Bidding Agreement are submitted physically by the data sheet date.',
      page: 1,
    },
    {
      ref: 'Notice Inviting Bid',
      title: 'Integrity Pact and IEM',
      summary:
        'Under the SOP for adoption of the Integrity Pact, Shri Subhash Chandra is appointed IEM for NHIDCL, with CVC and MoRTH approval.',
      page: 2,
    },
    {
      ref: 'Disclaimer',
      title: 'No reliance on RFP information',
      summary:
        'Information in the RFP, including the Feasibility Report, may not be complete or accurate. Bidders must carry out their own investigations and take independent advice.',
      page: 3,
    },
    {
      ref: 'Disclaimer',
      title: 'No liability of the Authority',
      summary:
        'The Authority accepts no liability for loss or cost arising from the RFP and may update, amend or supplement it at its discretion.',
      page: 3,
    },
    {
      ref: 'Disclaimer',
      title: 'Bid costs',
      summary:
        'The bidder bears all costs of preparing and submitting its bid, whatever the outcome of the bidding process.',
      page: 3,
    },
  ],

  flags: [
    {
      title: 'Physical documents alongside online bid',
      detail:
        'Bid Securing Declaration, document fee, Power of Attorney and Joint Bidding Agreement must be submitted physically. The date is only in the data sheet, so the courier plan depends on a document not in this pack.',
      page: 1,
      severity: 'high',
    },
    {
      title: '120-month maintenance obligation',
      detail:
        'Completion period is 30 months of construction plus 120 months of maintenance. Price and resource the 10-year maintenance tail.',
      page: 1,
      severity: 'high',
    },
    {
      title: 'Major river bridge',
      detail:
        'Two-lane bridge with approaches over 4.385 km across River Brahmaputra at Jogighopa. Check marine and foundation capability before committing.',
      page: 1,
      severity: 'medium',
    },
    {
      title: 'Integrity Pact with IEM',
      detail:
        'An Integrity Pact applies and Shri Subhash Chandra is the IEM. Confirm the pact signing requirement in the RFP.',
      page: 2,
      severity: 'medium',
    },
    {
      title: 'Feasibility Report not warranted',
      detail:
        'The disclaimer says the Feasibility Report may not be complete or accurate. Budget for own site and design investigations.',
      page: 3,
      severity: 'medium',
    },
    {
      title: 'Key terms missing from the NIT',
      detail:
        'Qualification criteria, document fee amount, bid validity and physical submission date are not stated here. Obtain the full RFP and data sheet.',
      page: 1,
      severity: 'medium',
    },
    {
      title: 'Download closes before submission',
      detail:
        'Bid document download closes at 1100 hrs on 11/03/2021, four hours before the 1500 hrs submission deadline on the same day.',
      page: 1,
      severity: 'low',
    },
  ],
};
