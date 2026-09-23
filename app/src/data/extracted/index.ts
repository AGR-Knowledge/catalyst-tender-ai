import type { ExtractedTender } from './types';
import { NIT } from './nit';
import { RFP_RANGPO } from './rfp-rangpo';
import { TOR_AKKAR } from './tor-akkar';

/** Pre-extracted records for the demo documents in data/bids, matched by file name on upload. */
export const EXTRACTED: ExtractedTender[] = [NIT, RFP_RANGPO, TOR_AKKAR];
