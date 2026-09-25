import type { AntiBriberyState, ScreeningState, Supplier, Trade } from '../types';

/**
 * Supplier records from compact tuples, in the style of `data/gcc/build.ts`.
 * The builder only reshapes literals; nothing here derives a value.
 */

/**
 * [id, name, country, city, trades, avl, icv | null, prequal,
 *  [sanctions, checkedAt, antiBribery, checkedAt],
 *  [onTime %, NCRs 12m, quotes 12m, awards 12m], load, [response %, avg days], national, contactPersonId?]
 */
export type SupplierTuple = [
  string, string, string, string, Trade[], string[], number | null, Supplier['prequal'],
  [ScreeningState, string, AntiBriberyState, string],
  [number, number, number, number], Supplier['load'], [number, number], boolean, string?,
];

export const suppliers = (tenant: string, rows: SupplierTuple[]): Supplier[] =>
  rows.map(([id, name, country, city, trades, avl, icv, prequal, [s, sAt, ab, abAt], [onTimePct, ncrs12m, quotes12m, awards12m], load, [ratePct, avgDays], national, contactPersonId]) => ({
    id, tenant, name, country, city, trades, avl, ...(icv === null ? {} : { icv }), prequal,
    screening: { sanctions: { state: s, checkedAt: sAt }, antiBribery: { state: ab, checkedAt: abAt } },
    performance: { onTimePct, ncrs12m, quotes12m, awards12m }, load, response: { ratePct, avgDays }, national,
    ...(contactPersonId ? { contactPersonId } : {}),
  }));
