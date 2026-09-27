/**
 * Arabic intake (plan 012): the Arabic sources, OCR, "Arabic text prevails"
 * and "Read in English", all read from the extraction records (plan 023).
 * The UI stays English and LTR; Arabic is content only.
 */
export { hasArabic, arabicOf, fieldsOf, bilingualSnippet, dateArabicOf } from './sources';
export { ocrOf, ocrPagesOf, reasonOf, pagesText, ocrText, ocrBadgeText, type OcrReading, type OcrReason } from './ocr';
export { prevailsOf, prevailsTitle, UNSTATED_TEXT, type Prevails } from './prevails';
export { readingOf, READING_LABEL, READING_SECTIONS, type Reading, type ReadingItem, type ReadingSection, type ReadingSectionId } from './reading';
