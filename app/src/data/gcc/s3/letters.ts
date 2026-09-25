import type { LetterTemplate } from './types';

/**
 * The courteous No-Bid decline letter to the employer (spec §10). It thanks
 * the employer, regrets not bidding on this occasion and asks to be
 * considered again. It never states internal reasons: those stay in the DG2
 * record.
 */

export const DECLINE_LETTER: LetterTemplate = {
  subject: 'Tender {reference}: {title}',
  body: [
    '{date}',
    '',
    '{issuer}',
    'Tender Committee',
    '',
    'Subject: {title}, tender {reference}',
    '',
    'Dear Sir or Madam,',
    '',
    'Thank you for the opportunity to tender for {title}. We appreciate the time your team has given to the tender process and to our questions.',
    '',
    'After careful consideration, we regret that we will not submit a bid on this occasion.',
    '',
    'We value our relationship with {issuer} and would be grateful to be considered for your future tenders.',
    '',
    'Yours faithfully,',
    '',
    '{signatory}',
    'Bid Manager',
    'For and on behalf of {company}',
  ].join('\n'),
};

