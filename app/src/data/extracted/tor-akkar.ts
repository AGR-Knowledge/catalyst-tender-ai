import type { ExtractedTender } from './types';

export const TOR_AKKAR: ExtractedTender = {
  key: 'tor-akkar',
  fileNames: ['T842_TOR.pdf'],
  docType: 'Terms of Reference',
  pages: 18,
  language: 'English',
  scanned: false,

  title:
    'Detailed Engineering Design for the Construction of Akkar Governmental Hospital, Terms of Reference, Appendix A - Construction',
  shortName: 'Akkar Governmental Hospital design',
  refNo: 'T842_TOR',
  issued: null,
  authority: 'Council for Development and Reconstruction',
  parent: null,
  country: 'Lebanon',
  location: 'Sahleh, Akkar District',
  sector: 'Buildings',
  mode: 'Design consultancy',
  currency: 'USD',
  valueDisplay: 'US$ 3,000,000',
  valueCr: null,

  summary: [
    {
      label: 'Construction budget',
      value: 'US$ 3,000,000 allocated for the construction works',
      page: 2,
      confidence: 'high',
    },
    {
      label: 'Medical equipment and furniture budget',
      value: 'Approximately US$ 1,000,000',
      page: 2,
      confidence: 'high',
    },
    {
      label: 'Project name',
      value: 'Akkar Governmental Hospital, as a One Day Surgery Hospital',
      page: 1,
      confidence: 'low',
      note: 'Cover and page 2 text say Akkar, but the page 2 header reads HARBATA GOVERNMENTAL HOSPITAL.',
    },
    {
      label: 'Site',
      value: 'Plot in Sahleh (Akkar District), owned by the Municipality of Sahleh',
      page: 2,
      confidence: 'high',
    },
    {
      label: 'Required functions',
      value:
        'Image department, outpatient clinics, laboratory department, one-day surgery operating room, emergency department',
      page: 2,
      confidence: 'high',
    },
    {
      label: 'Total time frame',
      value: '6 months',
      page: 14,
      confidence: 'high',
    },
    {
      label: 'Phase durations (time frame)',
      value:
        'Phase 1: ND + 1. Phase 2: ND + 2. Phase 3: Phase 2 approval + 1. Phase 4: Phase 2 approval + 2. Phase 5: Phase 4 approval + 1',
      page: 14,
      confidence: 'medium',
      note: 'Units are not stated, read as months from the 6 month total. Appendix C on page 17 gives different offsets for phases 2 and 4.',
    },
    {
      label: 'Design stages',
      value:
        '6 phases: investigation and medical program, conceptual design, permit documents, preliminary detailed design and loaded drawings, detailed final design and tender documents, tender assistance',
      page: 4,
      confidence: 'high',
    },
    {
      label: 'Site supervision',
      value: 'N.A.',
      page: 4,
      confidence: 'high',
    },
    {
      label: 'Fee basis',
      value: 'Lump sum, broken down by task, design fees and tender evaluation priced separately, total without VAT',
      page: 17,
      confidence: 'high',
    },
    {
      label: 'Payment schedule',
      value:
        'Phase 1: 10%. Phase 2: 30%. Phase 3: 10% on submission to Order of Engineers. Phase 4: 30%. Phase 5: 20%. Phase 6 tender evaluation: L.S. on approval of committee report',
      page: 17,
      confidence: 'high',
    },
  ],

  dates: [],

  eligibility: [
    {
      label: 'Minimum team',
      value:
        'Project Manager/ Architect, Structure Engineer, Senior Biomedical engineer, Electrical and Mechanical engineers/ or Electro-Mechanical Engineer, plus additional staff or specialists as needed',
      page: 15,
      confidence: 'high',
    },
    {
      label: 'Project manager',
      value:
        'University degree in Architecture, minimum 12 years of experience since graduation, design of at least one hospital project, permanent staff of the consultant for at least one year',
      page: 15,
      confidence: 'high',
    },
    {
      label: 'Civil engineer (structure)',
      value:
        'University degree in civil engineering, minimum 10 years of experience since graduation, structural design of at least one hospital project or project of similar complexity',
      page: 15,
      confidence: 'high',
    },
    {
      label: 'Senior biomedical engineer (or biomedical firm)',
      value:
        'University degree in the specialty, at least 10 years of experience, at least one similar project (design of installation of medical equipment and furniture in a new, rehabilitated or extended hospital) in the past 10 years',
      page: 15,
      confidence: 'high',
    },
    {
      label: 'Electrical engineer',
      value:
        'University degree in the field, at least 10 years in building projects and at least three years in the hospital sector, at least one similar hospital project within the last 10 years',
      page: 16,
      confidence: 'high',
    },
    {
      label: 'Mechanical engineer',
      value:
        'University degree in the field, at least 10 years in building projects and at least three years in the hospital sector, at least one project of similar nature within the last 10 years',
      page: 16,
      confidence: 'high',
    },
    {
      label: 'Staff approval',
      value: 'All project staff need CDR authorization. The client may refuse any staff, replacement within 15 days',
      page: 16,
      confidence: 'high',
    },
  ],

  scope: [
    { text: 'Design the hospital building to accommodate the medical program, per Ministry of Public Health requirements', page: 2 },
    { text: 'Establish an area program in coordination with the MOH', page: 2 },
    { text: 'Arrange all topographical and geotechnical surveys needed for preliminary and detailed design', page: 3 },
    { text: 'Prepare preliminary and detailed designs, specifications, bills of quantities and tender documents', page: 3 },
    { text: 'Phase 1: site visit, data collection on codes, roads and utilities', page: 5 },
    { text: 'Phase 1: topographic and soil investigation tender documents, supervise the survey works and interpret the geotechnical report', page: 5 },
    { text: 'Phase 1: finalize the medical program with Client and MOH, define floors and built-up areas', page: 5 },
    { text: 'Phase 1 deliverables: site report, survey tender documents, detailed medical program, built-up area and floor distribution, preliminary cost estimate', page: 6 },
    { text: 'Phase 2: conceptual design allowing future extension without cutting existing services', page: 6 },
    { text: 'Phase 2: preliminary list of major medical equipment', page: 6 },
    { text: 'Phase 2: comparative analysis of solutions within the allocated budget, environmental impact assessment, technical report, budgetary cost estimate', page: 7 },
    { text: 'Phase 2 deliverables: site plan 1/200, floor plans 1/100, section plans 1/50, rendered elevations and sections 1/100, perspective, circulation flow diagrams, area schedules and report', page: 7 },
    { text: 'Phase 3: building permit documents for Ordre des Ingénieurs, Town planning, Civil defense and Electricity authorities', page: 8 },
    { text: 'Phase 3: follow up and obtain all permits, approvals and licenses, report progress to the Client', page: 8 },
    { text: 'Phase 4: preliminary detailed architectural, structural, electrical and mechanical drawings, fire strategy, elevator traffic design', page: 9 },
    { text: 'Phase 4: medical and non medical equipment and furniture loaded drawings for all floors at 1/100', page: 9 },
    { text: 'Phase 4 report: design criteria and codes, system descriptions, area breakdown with cost estimate', page: 10 },
    { text: 'Phase 5: detailed final architectural, structural, electrical, mechanical and HVAC drawings', page: 10 },
    { text: 'Phase 5: structural calculation notes (Robot), acoustic design', page: 11 },
    { text: 'Phase 5: technical specifications, itemized and priced BOQ, full tender documents including conditions of contract and form of tender', page: 12 },
    { text: 'Phase 6: tender assistance, clarifications for tenderers, bidder meeting minutes, proposed answers to queries', page: 12 },
    { text: 'Phase 6: bid analysis, unit price comparison against the cost estimate, arithmetic checks, discrepancy letters', page: 13 },
    { text: 'Phase 6: assist in preparing contracts for each retained company', page: 14 },
  ],

  evaluation: [],

  submission: [
    {
      label: 'Reports',
      value: '2 copies unless otherwise stated',
      page: 14,
      confidence: 'high',
    },
    {
      label: 'Graphic documents, phases 1, 2, 4',
      value: 'One hard copy + one copy for MOH approval where requested',
      page: 14,
      confidence: 'low',
      note: 'A second copies clause on the same page says phases I, II and III go in two hard copies and one soft copy.',
    },
    {
      label: 'Graphic documents, phase 3',
      value: 'As per the regulation',
      page: 14,
      confidence: 'low',
      note: 'Conflicts with the second clause on the same page (two hard copies and one soft copy).',
    },
    {
      label: 'Graphic documents, phase 5',
      value: 'Two hard copies',
      page: 14,
      confidence: 'high',
    },
    {
      label: 'Final bid package',
      value: 'Five hard copies + 1 soft copy',
      page: 14,
      confidence: 'high',
    },
    {
      label: 'Phase 3 evidence',
      value: 'Documents confirming submittal to the Order des Ingénieurs',
      page: 8,
      confidence: 'high',
    },
    {
      label: 'Fee proposal',
      value: 'Work plan for each task, lump sum with price analysis per task, total without VAT in figures and letters',
      page: 17,
      confidence: 'high',
    },
  ],

  contacts: [],

  clauses: [
    {
      ref: '3.1.5',
      title: 'Responsibility of data correctness',
      summary: 'Consultant reviews and completes Client data and carries responsibility for its correctness.',
      page: 3,
    },
    {
      ref: '3.1.6',
      title: 'Standards',
      summary: 'Design to international standards for medical facilities on function, stability, security, aesthetics and environment.',
      page: 3,
    },
    {
      ref: '3.1.7',
      title: 'Lebanese regulations',
      summary: 'Design to Lebanese laws and codes, with emphasis on earthquake resistance, fire protection and user safety.',
      page: 3,
    },
    {
      ref: '6.3',
      title: 'Standard',
      summary: 'Para seismic calculation verification and fire protection and safety regulations apply.',
      page: 6,
    },
    {
      ref: '6.8',
      title: 'Cost estimate',
      summary: 'Preliminary cost estimate at Phase 2 is budgetary. No accuracy tolerance is stated.',
      page: 7,
    },
    {
      ref: '7',
      title: 'Permit documents',
      summary: 'Consultant is responsible for preparing, following up and obtaining all permits, and for the correctness of documents given to authorities.',
      page: 8,
    },
    {
      ref: '10.1',
      title: 'Tender period',
      summary: 'No additional copies or information may be distributed without written comment of the Client.',
      page: 12,
    },
    {
      ref: '10.2.2',
      title: "Bidder's queries",
      summary: 'Consultant proposes answers. Only the Client answers, and to all bidders.',
      page: 13,
    },
    {
      ref: '10.3.4',
      title: 'Confidentiality',
      summary: 'Bid analysis is done in Client offices in total confidentiality.',
      page: 13,
    },
    {
      ref: '13',
      title: 'Time frame',
      summary: '6 months in total, phases timed from ND or from prior phase approval.',
      page: 14,
    },
    {
      ref: 'Appendix B (f)',
      title: 'Client authorization',
      summary: 'CDR must authorize all staff, may refuse any, replacement within 15 days.',
      page: 16,
    },
    {
      ref: 'A - 3',
      title: 'Permit cost',
      summary: 'Taxes, fees, stamp duties and Ordre des Ingénieurs charges are paid by the Client, outside the fee.',
      page: 17,
    },
    {
      ref: 'A - 4',
      title: 'Site survey and geotechnical cost',
      summary: 'Subcontractor charges for site survey and geotechnical report are paid by the Client, outside the fee.',
      page: 18,
    },
  ],

  flags: [
    {
      title: 'Project name conflict',
      detail: 'Cover says Akkar Governmental Hospital, page 2 header says HARBATA GOVERNMENTAL HOSPITAL. Confirm the project and site with CDR.',
      page: 2,
      severity: 'high',
    },
    {
      title: 'No submission date',
      detail: 'The ToR gives no proposal submission date, issue date or contact details.',
      page: 1,
      severity: 'medium',
    },
    {
      title: 'Phase timing conflict',
      detail: 'Section 13 gives Phase 4 as Phase 2 approval + 2. Appendix C payment schedule gives Phase 2 + 3. Phase 2 also differs (ND + 2 vs Phase 1 + 1).',
      page: 17,
      severity: 'medium',
    },
    {
      title: 'Copies clause conflict',
      detail: 'Section 12 and a second clause numbered 1 on the same page give different copy counts for phases 1 to 3.',
      page: 14,
      severity: 'low',
    },
    {
      title: 'Permit risk sits with consultant',
      detail: 'Consultant must obtain all permits. Phase 3 duration depends on the administration, which can push the 6 month programme.',
      page: 8,
      severity: 'medium',
    },
    {
      title: 'Survey supervision despite N.A. supervision',
      detail: 'Site supervision is N.A., but Phase 1 includes supervising the topographic survey works and interpreting the geotechnical report.',
      page: 5,
      severity: 'low',
    },
    {
      title: 'Design within fixed budget',
      detail: 'Design must fit US$ 3,000,000 for construction and allow future extension. Solutions must stay within the allocated budget.',
      page: 6,
      severity: 'medium',
    },
    {
      title: 'No selection criteria',
      detail: 'The ToR does not state how consultant proposals are evaluated.',
      page: 17,
      severity: 'low',
    },
    {
      title: 'Data liability',
      detail: 'Consultant carries responsibility for correctness of Client supplied data.',
      page: 3,
      severity: 'low',
    },
    {
      title: 'Arabic text in deliverables',
      detail: 'Phase 1 report list includes Arabic terms for property and survey documents. Arabic reading needed.',
      page: 5,
      severity: 'low',
    },
  ],
};
