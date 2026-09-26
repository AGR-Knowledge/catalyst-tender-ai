import './tender.css';

export type DocLanguage = 'EN' | 'AR' | 'EN+AR';

const WORDS: Record<DocLanguage, string> = { EN: 'English', AR: 'Arabic', 'EN+AR': 'English and Arabic' };

/** The tender documents' language (ui-direction §6.2, §8): EN / AR / EN+AR. */
export function LangBadge({ lang }: { lang: DocLanguage }) {
  return (
    <span className="lang-badge" title={`Document language: ${WORDS[lang]}`}>
      <span className="sr-only">Document language: </span>
      <span aria-hidden>{lang}</span>
      <span className="sr-only">{WORDS[lang]}</span>
    </span>
  );
}
