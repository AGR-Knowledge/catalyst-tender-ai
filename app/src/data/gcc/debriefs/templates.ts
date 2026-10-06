import type { LessonArea } from './vocab';

/**
 * The words of the generated debriefs (plan 035 step 2.2.3), in a Project
 * Director's voice. Keys are `{ending}:{reason}`, with `{ending}:*` as the
 * fallback. Slots, filled by the generator from the tender's facts:
 * - `{employer}` the employer's short name (`EMPLOYER_SHORT`, else its full name);
 * - `{sector}` the sector in lower case; `{lc}` "local content", or "ICV" in the UAE and Oman;
 * - `{rival}` the rival's short name; `{place}` and `{bidders}` from the result;
 * - `{weeks}` the tender period in weeks.
 * A template whose slot has no value is skipped.
 *
 * No money in any of them: no currency, no figure in millions, no share of a
 * price and no gap to the winner (the Bid record holds those).
 */

export interface LessonTemplate { area: LessonArea; text: string }

export const LESSONS: Record<string, LessonTemplate[]> = {
  /* ---------------------------------------------------------------- lost */
  'lost:price': [
    { area: 'pricing', text: '{rival} priced the {sector} work below our cost build-up again. Before the next {employer} bid, benchmark our unit rates against their recent awards, not against our own past bids.' },
    { area: 'sourcing', text: 'Our main supplier quotes came in late, so the estimate carried allowances on the largest packages. Issue RFQs within a day of DG1 and chase the long-lead items first.' },
    { area: 'pricing', text: 'We ranked {place} of {bidders} with a compliant bid. The difference sat in preliminaries and site overheads: review the site staffing we price for a job of this length.' },
    { area: 'process', text: 'The price was frozen two days before submission, which left no time to test alternatives. Lock the scope a week earlier and hold one value-engineering review.' },
    { area: 'relationship', text: '{employer} awards on the lowest compliant price once the technical pass mark is met. Effort beyond the pass mark earned nothing; spend it on the price.' },
    { area: 'sourcing', text: 'We priced the main materials from a single supplier. Two competing quotes on each of them would have moved us closer to the winner.' },
    { area: 'bid-decision', text: 'With {bidders} bidders on a price-led evaluation, only bid where we hold a real cost advantage, such as plant already on a nearby site or a local yard.' },
    { area: 'pricing', text: 'Our temporary works were priced for the worst case. {rival} priced them for the likely case and took the risk; decide that trade-off at the pricing review, not by default.' },
  ],
  'lost:technical': [
    { area: 'technical', text: 'Our method statement read as generic. {employer} scored the site-specific methodology highest; next time write it around this site\'s constraints, not our standard template.' },
    { area: 'technical', text: 'The evaluators marked down our key staff for thin {sector} experience. Name the project manager and the design lead before DG2 and build the bid around them.' },
    { area: 'process', text: 'Technical clarifications waited a week because nobody owned them. Give each clarification an owner and a two-day answer target.' },
    { area: 'compliance', text: 'Two deviations in our technical offer cost marks. Run the compliance matrix against the technical volume before the red-team review, not after it.' },
    { area: 'technical', text: '{rival} offered a shorter programme with more crews. Ours was realistic but read as slow: show the critical path and the float, not only the bar chart.' },
    { area: 'process', text: 'The red-team review came too late to change the method statement. Hold it at least a week before submission.' },
    { area: 'process', text: 'In a {weeks}-week tender period the method statement got the last week. Start it at DG1, alongside sourcing, not after it.' },
  ],
  'lost:local-content': [
    { area: 'sourcing', text: 'Our {lc} score fell behind {rival}\'s because two main packages were quoted by foreign suppliers. Shortlist a local supplier for every major package at Stage 2.' },
    { area: 'compliance', text: 'We submitted the {lc} commitment without the baseline evidence for our subcontractors. Collect the certificates with the prequalification documents, not in the last week.' },
    { area: 'relationship', text: '{employer} weighs {lc} heavily on {sector} tenders. Ask at the clarification stage how the {lc} score is calculated, and model it before pricing.' },
    { area: 'sourcing', text: 'A local fabricator could have taken the steelwork. Keep a short list of local fabricators we have audited, so the {lc} plan is not written from scratch each time.' },
  ],
  'lost:pq': [
    { area: 'compliance', text: 'We failed a prequalification line on similar-project experience. Check every PQ line against the credentials vault at DG1, and pair with a partner where we fall short.' },
    { area: 'bid-decision', text: 'The experience requirement was clear in the booklet. DG1 should have stopped this bid or named a JV partner; it went forward on hope.' },
    { area: 'process', text: 'A certificate in our PQ file was renewed after the opening date, so it did not count. Renewals falling near an opening date belong on the DG1 checklist.' },
  ],
  'lost:*': [
    { area: 'relationship', text: '{employer} gave no reason beyond the ranking. Ask for a debrief meeting in writing on the day the result arrives; it is harder to get a week later.' },
    { area: 'process', text: 'Two of our clarification answers went in late, and the evaluation noted it. Give each clarification an owner and a two-day answer target.' },
    { area: 'compliance', text: 'Our bid bond wording differed from the employer\'s template. Use the template word for word, and have the bank confirm it before submission.' },
    { area: 'bid-decision', text: 'We had little history with {employer}. Before bidding a new employer again, attend the pre-bid meeting and learn how they evaluate.' },
  ],

  /* ----------------------------------------------------------------- won */
  'won:price': [
    { area: 'pricing', text: 'We won on price because the supplier quotes were in two weeks before submission, so the estimate carried no allowances. Keep that RFQ timetable on every bid.' },
    { area: 'sourcing', text: 'Two competing quotes on each main package kept the price honest. Repeat the three-quote rule on every package that matters to the price.' },
    { area: 'relationship', text: '{employer} confirmed that our price was the lowest compliant one. The technical offer only needed to pass, and we did not over-invest in it.' },
    { area: 'process', text: 'The price was frozen five working days before submission, which left time for one value-engineering pass. Make that the norm, not the exception.' },
    { area: 'pricing', text: 'We beat {rival} by pricing the temporary works properly rather than cutting them. Keep this job\'s temporary-works rates for the next {sector} bid.' },
  ],
  'won:technical': [
    { area: 'technical', text: 'Our methodology was written for this site: access, phasing and the live works. {employer} scored it highest; reuse the structure, not the words.' },
    { area: 'technical', text: 'Naming the project manager and the design lead early let us write the bid around them. Do it again at DG2.' },
    { area: 'process', text: 'The red-team review found three gaps a week before submission, in time to fix them. Hold it at the same point next time.' },
    { area: 'compliance', text: 'A clean compliance matrix meant there were no deviations to explain at evaluation.' },
  ],
  'won:track-record': [
    { area: 'relationship', text: '{employer} knows our site teams from earlier contracts, and the references carried real weight. Keep the close-out on those jobs as good as the bid.' },
    { area: 'technical', text: 'We cited completed {sector} projects with measured results. Keep the project sheets current in the credentials vault so they are ready for the next bid.' },
    { area: 'relationship', text: 'Our record on the last {employer} contract, handed over early with no delay damages, was mentioned at award. Delivery is our best bid document.' },
    { area: 'process', text: 'We reused the proposal structure from our last {employer} win, updated for this scope. It saved a week of writing and kept the story consistent.' },
    { area: 'bid-decision', text: 'Bidding for employers who know us pays. When capacity is tight, give repeat employers the priority at DG1.' },
  ],
  'won:local-content': [
    { area: 'sourcing', text: 'Our {lc} plan named local suppliers package by package and scored ahead of {rival}. Keep those suppliers engaged with regular RFQs.' },
    { area: 'compliance', text: 'The {lc} evidence was ready with the prequalification, so nothing had to be chased at evaluation.' },
    { area: 'relationship', text: '{employer} raises its {lc} expectations every year. Plan for a stronger score on the next bid, not the same one.' },
    { area: 'process', text: 'The {lc} plan was drafted at Stage 2 with the suppliers, not in the last week. That is why it held up at evaluation.' },
  ],
  'won:programme': [
    { area: 'technical', text: 'Our shorter programme came from phasing the works around the live network. Keep the phasing study as a template.' },
    { area: 'sourcing', text: 'Long-lead items were quoted with firm delivery dates, which made the programme credible to the evaluators.' },
    { area: 'process', text: 'Planning started at DG2 rather than after pricing; that is why the programme held together.' },
    { area: 'technical', text: 'We used the {weeks}-week tender period to test two phasing options with the suppliers; the better one won the bid.' },
  ],
  'won:alternative': [
    { area: 'technical', text: 'The alternative design saved the employer time on site and scored well. Offer a costed alternative whenever the booklet allows one.' },
    { area: 'compliance', text: 'We submitted the compliant base bid beside the alternative, so the evaluators could compare them. Always do both.' },
    { area: 'pricing', text: 'Pricing the alternative separately kept the base bid clean and easy to evaluate.' },
  ],
  'won:partner': [
    { area: 'sourcing', text: 'Our partner\'s specialist experience closed the gap in our credentials. Agree the JV terms before DG2, as we did here.' },
    { area: 'relationship', text: '{employer} valued a single point of responsibility in the JV. Keep one project manager across both firms.' },
    { area: 'process', text: 'Weekly joint reviews with the partner kept both halves of the bid consistent.' },
  ],
  'won:*': [
    { area: 'process', text: 'Everything went out on time: RFQs, inputs, the review and the submission. Keep this bid\'s timetable as the model.' },
    { area: 'relationship', text: 'We attended the pre-bid meeting and asked the right questions; the answers shaped our offer.' },
  ],

  /* ------------------------------------------------------- cancelled */
  'cancelled:budget': [
    { area: 'bid-decision', text: '{employer} withdrew the budget after we had priced the works. Ask at the clarification stage whether funding is committed before we spend on a full bid.' },
    { area: 'relationship', text: 'Stay in touch with {employer}: the scheme is likely to come back, and our pricing only needs updating.' },
    { area: 'process', text: 'Archive the priced BOQ and the supplier quotes with their validity dates, so a re-tender starts from them.' },
  ],
  'cancelled:over-budget': [
    { area: 'pricing', text: 'Every bid came in above {employer}\'s budget, so the estimate was low rather than our price high. Ask for the budget range at the pre-bid meeting where the rules allow.' },
    { area: 'relationship', text: '{employer} plans to re-tender a reduced scope. Ask which items drove the cost, so our next offer fits their budget.' },
    { area: 'process', text: 'Keep the priced BOQ and the quotes: a re-tender usually follows within months.' },
  ],
  'cancelled:scope': [
    { area: 'relationship', text: '{employer} re-scoped the works after the clarifications. Our questions exposed the gaps, which is worth being known for.' },
    { area: 'process', text: 'Archive the pack and the supplier quotes; the re-tender will reuse most of the scope.' },
    { area: 'bid-decision', text: 'The scope was unclear from the start. Next time, flag an unclear scope at DG1 and commit only once the addenda settle it.' },
  ],
  'cancelled:postponed': [
    { area: 'bid-decision', text: '{employer} postponed the tender indefinitely. Check the employer\'s programme and budget year before DG1.' },
    { area: 'process', text: 'Keep the quotes and the programme: a postponed tender usually returns with the same scope.' },
    { area: 'relationship', text: 'Ask {employer} for the new timetable in writing, and set a reminder to check the portal for the re-issue.' },
  ],
  'cancelled:procedure': [
    { area: 'compliance', text: '{employer} annulled the procedure after the opening. Keep our bid documents and the opening record, in case of a re-tender or a query.' },
    { area: 'relationship', text: 'Ask {employer} for the reason in writing; it tells us whether the re-tender is worth pursuing.' },
    { area: 'process', text: 'Record who attended the opening and what was read out; it matters if the procedure is challenged.' },
  ],
  'cancelled:*': [
    { area: 'relationship', text: '{employer} gave no reason for the cancellation. Ask for one in writing; it tells us whether to bid the re-tender.' },
    { area: 'process', text: 'Archive the pack with the supplier quotes and their validity dates.' },
  ],

  /* ------------------------------------------------------- withdrawn */
  'withdrawn:partner': [
    { area: 'bid-decision', text: 'Our JV partner withdrew after sourcing had started. When a bid depends on a partner, sign a teaming agreement with exit terms before DG1.' },
    { area: 'compliance', text: 'Without the partner we could not meet the prequalification alone. At DG1, mark every bid that depends on a partner\'s credentials.' },
    { area: 'relationship', text: 'Keep a second partner in view for each sector where we rely on joint ventures.' },
  ],
  'withdrawn:quotes': [
    { area: 'sourcing', text: 'No compliant quotes came in for the main packages. Test the supplier market before DG1 on specialist packages.' },
    { area: 'bid-decision', text: 'The thin supply market was visible at DG1 in the package list; we should have asked the question then.' },
    { area: 'process', text: 'Two RFQs went unanswered for a week before anyone chased. Chase on day three and escalate on day five.' },
  ],
  'withdrawn:local-content': [
    { area: 'sourcing', text: 'Supplier quotes could not meet the {lc} minimum. Build a local supplier list per package before we commit to a tender with a high {lc} bar.' },
    { area: 'bid-decision', text: 'The {lc} minimum was in the booklet at DG1. Check it against our supplier base before pursuing.' },
    { area: 'compliance', text: 'Ask the employer at the clarification stage how the {lc} minimum is measured; our reading may have been stricter than theirs.' },
  ],
  'withdrawn:*': [
    { area: 'bid-decision', text: 'We stopped after the team had started sourcing. The reason was visible earlier; raise it at DG1 next time.' },
    { area: 'process', text: 'Archive what we built so far: the packages and the supplier contacts are reusable.' },
  ],

  /* ---------------------------------------------------------- No-Bid */
  'no-bid:capacity': [
    { area: 'bid-decision', text: 'The {sector} team was committed to other submissions. Check team load at DG1, not at DG2, so we stop before the pack is built.' },
    { area: 'process', text: 'We spent two weeks on the pack before capacity stopped it. A capacity check at DG1 would have saved that time.' },
    { area: 'relationship', text: 'Tell {employer} early that we are not bidding; a courteous decline keeps us on their list.' },
    { area: 'bid-decision', text: 'A {weeks}-week tender period with the team already committed was never going to work. Say so at DG1 and save the pack.' },
    { area: 'process', text: 'Three bids landed in the same fortnight. Keep a twelve-week load chart for each team and read it at every DG1.' },
  ],
  'no-bid:risk': [
    { area: 'compliance', text: 'The contract carried uncapped liabilities. Read the conditions of contract before DG1 and raise a query where they are unbalanced.' },
    { area: 'bid-decision', text: 'The terms were in the booklet from the start. Flag unbalanced risk at DG1, so we decide before sourcing.' },
    { area: 'pricing', text: 'We could not price the delay damages and the open indemnity inside a competitive bid. A qualified bid is usually rejected, so declining early was right.' },
    { area: 'relationship', text: 'Raise the unbalanced clauses with {employer} as a query. If other bidders do the same, the terms may change on the next tender.' },
  ],
  'no-bid:price': [
    { area: 'pricing', text: 'Recent awards for similar {sector} work sat well below our levelled price. Compare against published awards before we start sourcing.' },
    { area: 'bid-decision', text: 'The field for this tender is price-led. Bid only where we have a cost advantage to show.' },
    { area: 'sourcing', text: 'The levelled supplier prices were already above the recent awards before our own costs were added. Test the market price at Stage 2, before the pack is built.' },
    { area: 'process', text: 'Keep a list of published awards per sector, so the committee sees the market price at DG2 without a search.' },
  ],
  'no-bid:below-value': [
    { area: 'bid-decision', text: 'Once the scope was confirmed it fell below our value band. Ask for the quantities at the clarification stage before we commit a team.' },
    { area: 'process', text: 'An addendum cut the scope. Re-check the value band whenever an addendum changes the BOQ.' },
    { area: 'relationship', text: 'Tell {employer} we would bid a combined package: small separate contracts do not carry our overheads.' },
    { area: 'pricing', text: 'At this size our preliminaries weigh too much on the price. Smaller jobs need a lighter site set-up if we want to win them.' },
  ],
  'no-bid:*': [
    { area: 'relationship', text: 'Send {employer} a short decline letter with our reasons; it keeps the door open for the next one.' },
    { area: 'process', text: 'Archive the DG2 pack: if the tender returns, it is a quick start.' },
    { area: 'bid-decision', text: 'The DG2 committee stopped this on facts we had at DG1. Bring the capacity and risk checks forward.' },
    { area: 'relationship', text: 'Ask {employer} to keep us on the bidders list for the next phase.' },
  ],

  /* -------------------------------------------------------- rejected */
  'rejected:*': [
    { area: 'pricing', text: 'The final price fell below the DG2 minimum margin after the last supplier re-quotes. Re-check the margin at every re-price, not only at DG3.' },
    { area: 'bid-decision', text: 'At DG2 the margin range already sat close to the minimum. Where it does, set a DG2 condition to review it at the re-price.' },
    { area: 'sourcing', text: 'Two supplier re-quotes rose late. Ask for firm prices with a longer validity on the main packages.' },
  ],
};

/** What the employer told us at a debrief that was held (`said`), by the same keys. */
export const SAID: Record<string, string[]> = {
  'lost:price': [
    'Our bid was technically compliant and ranked {place} of {bidders}; the award went to the lowest compliant price.',
    'The evaluation was on price once the pass mark was met. Our technical offer passed comfortably.',
    '{rival} was lower on price. Our offer was compliant, with no deviations to note.',
  ],
  'lost:technical': [
    'Our methodology scored below the winner\'s on site-specific phasing, and our key staff scored lower on {sector} experience.',
    'The technical panel preferred {rival}\'s approach to the live works. Our programme was judged realistic but long.',
  ],
  'lost:local-content': ['Our {lc} score decided it: the winner\'s supply chain was mostly local, and ours was not.'],
  'lost:pq': ['We did not meet the similar-experience requirement, so our commercial envelope was not opened.'],
  'lost:*': ['The decision was close, and the employer gave no single reason beyond the ranking.'],
  'won:price': [
    'We were the lowest compliant bid, and the evaluators found our programme credible.',
    'Our price was the lowest after the technical pass mark, with no deviations to clarify.',
  ],
  'won:technical': [
    'Our methodology scored highest, and our key staff were the strongest on {sector} experience.',
    'The technical panel ranked our offer first; the price was competitive rather than the lowest.',
  ],
  'won:track-record': ['The panel valued our record on their earlier contracts and the named site team.'],
  'won:local-content': ['Our {lc} plan scored highest of the bidders, with named local suppliers for each main package.'],
  'won:programme': ['Our programme was the shortest the panel found credible, with the long-lead items already confirmed.'],
  'won:alternative': ['The alternative design shortened the time on site, and the compliant base bid made it easy to compare.'],
  'won:partner': ['Our partner\'s specialist record answered the experience question the panel had about us.'],
  'won:*': ['Our offer was the most complete, with the fewest clarifications of any bidder.'],
  'cancelled:budget': ['The budget line has moved, and the scheme may return in a later programme.'],
  'cancelled:over-budget': ['Every bid exceeded the budget; the employer plans to re-tender a smaller first phase.'],
  'cancelled:scope': ['The scope is being revised after the clarifications, and a new tender will follow.'],
  'cancelled:postponed': ['The project is on hold until the employer\'s next budget year.'],
  'cancelled:procedure': ['The procedure was annulled on a point of the tender rules, not on any bid; a re-tender will follow.'],
  'cancelled:*': ['The employer issued the cancellation without a reason and said a new tender may follow.'],
};

/** Stopped endings, optional: what would have let us bid, by the same keys. */
export const WOULD_LET_US_BID: Record<string, string> = {
  'withdrawn:partner': 'A signed teaming agreement with a second partner.',
  'withdrawn:quotes': 'Two qualified suppliers for the main packages before DG1.',
  'withdrawn:local-content': 'Two qualified local suppliers for the main packages.',
  'no-bid:capacity': 'Another month on the submission date, or a second estimator for the team.',
  'no-bid:risk': 'A cap on liabilities and balanced payment terms.',
  'no-bid:price': 'A local supplier base that lets us price below the recent awards.',
  'no-bid:below-value': 'Combining it with the next phase into one contract.',
  'rejected:*': 'Firm supplier prices held to the submission date.',
};

/** How a Project Director names each employer in a sentence; others read in full. */
export const EMPLOYER_SHORT: Record<string, string> = {
  'Batinah Coastal Roads Office': 'the Coastal Roads Office',
  'Capital Area Roads Directorate': 'the Roads Directorate',
  'Capital Schools Development Office': 'the Schools Development Office',
  'Central Cities Water Services Company': 'CCWS',
  'Central Doha Utilities Programme': 'the Utilities Programme',
  'Central Region Roads Programme Office': 'the Roads Programme Office',
  'Crescent Bay Health Holding': 'Crescent Bay Health',
  'Saltreed Developments': 'Saltreed',
  'Dhofar Regional Works Office': 'the Dhofar Works Office',
  'Doha Drainage Works Authority': 'the Drainage Works Authority',
  'Eastern Cities Water Services Company (ECWS)': 'ECWS',
  'Eastern Province Municipal Projects Office': 'the Municipal Projects Office',
  'Eastern Province Roads Programme Office': 'the Roads Programme Office',
  'Chillmont Cooling Utilities Company': 'Chillmont Cooling',
  'Gulf Coast Industrial Utilities Company': 'Gulf Coast Utilities',
  'Gulfshore Hospitality Developments': 'Gulfshore',
  'Berthwick Real Estate': 'Berthwick',
  'Housing Cities Utilities Programme': 'the Housing Cities Programme',
  'Industrial Cities Infrastructure Office': 'the Industrial Cities Office',
  'Interior Links Roads Authority': 'the Interior Links Authority',
  'National Water Grid Projects Office': 'the Water Grid Office',
  'Northern Cities Water Services Company': 'NCWS',
  'Northern Emirates Education Projects Office': 'the Education Projects Office',
  'Northern Governorates Public Works Office': 'the Public Works Office',
  'Northern Governorates Roads Programme': 'the Northern Roads Programme',
  'Northern Growth Corridor Authority': 'the Corridor Authority',
  'Coralwick Properties': 'Coralwick',
  'Peninsula Public Works Office': 'the Peninsula Works Office',
  'Port Cities Access Roads Office': 'the Access Roads Office',
  'Riyadh Municipal Projects Office': 'the Municipal Projects Office',
  'Sharjah Campus Development Office': 'the Campus Development Office',
  'Southern Cities Water Services Company': 'SCWS',
  'Southern Governorates Sanitation Agency': 'the Sanitation Agency',
  'Southern Municipalities Drainage Office': 'the Drainage Office',
  'Upstream Facilities Engineering Company': 'Upstream Facilities',
  'Western Cities Water Services Company': 'WCWS',
  'Western Region Municipal Projects Office': 'the Municipal Projects Office',
};
