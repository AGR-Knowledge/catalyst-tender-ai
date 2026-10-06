import type { Rng } from '../../lifecycle/rng';

/**
 * Fictional people for supplier contacts (plan 031): first and family names
 * by the supplier's home country, emails at `{supplier id}.example`, and
 * phone numbers in the country's format. Combinations are drawn at random;
 * a drawn name that matches a well-known real person is swapped (`NOT_REAL`).
 */

type Locale = 'gulf' | 'indian' | 'filipino' | 'egyptian' | 'german' | 'italian' | 'english' | 'nordic' | 'dutch' | 'iberian' | 'french' | 'korean' | 'japanese' | 'chinese' | 'polish' | 'slavic' | 'turkish' | 'levant';

const POOLS: Record<Locale, { first: string[]; last: string[] }> = {
  gulf: {
    first: ['Faisal', 'Khalid', 'Omar', 'Sultan', 'Majed', 'Nasser', 'Tariq', 'Yousef', 'Hamad', 'Saeed', 'Rashid', 'Fahad', 'Salem', 'Mansour', 'Huda', 'Noura', 'Reem', 'Maha', 'Latifa', 'Amal', 'Dana'],
    last: ['Al-Harbi', 'Al-Qahtani', 'Al-Mutairi', 'Al-Dosari', 'Al-Shehri', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Suwaidi', 'Al-Mansoori', 'Al-Kaabi', 'Al-Marri', 'Al-Kuwari', 'Al-Balushi', 'Al-Rawahi', 'Al-Hinai', 'Al-Enezi', 'Al-Rashidi', 'Al-Ajmi'],
  },
  indian: {
    first: ['Rajesh', 'Anil', 'Priya', 'Suresh', 'Deepa', 'Arvind', 'Joseph', 'Lakshmi', 'Vinod'],
    last: ['Nair', 'Menon', 'Pillai', 'Iyer', 'Varghese', 'Kurian', 'Rao'],
  },
  filipino: {
    first: ['Ramil', 'Mark', 'Jonathan', 'Maricel', 'Rowena', 'Arnel'],
    last: ['Santos', 'Reyes', 'Mendoza', 'Dela Cruz', 'Bautista', 'Villanueva'],
  },
  egyptian: {
    first: ['Hany', 'Tamer', 'Amr', 'Sherif', 'Mona', 'Karim'],
    last: ['Fahmy', 'Mostafa', 'Farouk', 'Naguib', 'Abdelaziz', 'Shalaby'],
  },
  german: {
    first: ['Jürgen', 'Stefan', 'Katrin', 'Andreas', 'Martina', 'Tobias', 'Sabine', 'Lukas', 'Birgit', 'Matthias'],
    last: ['Becker', 'Hoffmann', 'Keller', 'Brandt', 'Vogel', 'Lehmann', 'Hartmann', 'Krüger', 'Seidel', 'Winkler'],
  },
  italian: {
    first: ['Marco', 'Giulia', 'Luca', 'Francesca', 'Paolo', 'Chiara', 'Stefano', 'Elena', 'Davide'],
    last: ['Rinaldi', 'Colombo', 'Ferri', 'Galli', 'Moretti', 'Conti', 'Marchetti', 'Fontana', 'Barbieri'],
  },
  english: {
    first: ['James', 'Sarah', 'David', 'Helen', 'Richard', 'Claire', 'Owen', 'Fiona', 'Gareth', 'Niamh'],
    last: ['Whitfield', 'Hughes', 'Barker', 'Doyle', 'Walsh', 'Pritchard', 'Harding', 'Kerrigan', 'Ashworth'],
  },
  nordic: {
    first: ['Anders', 'Karin', 'Johan', 'Lena', 'Erik', 'Maria', 'Henrik', 'Sofia'],
    last: ['Lindqvist', 'Berg', 'Holm', 'Sandberg', 'Nyström', 'Ekström', 'Lundgren'],
  },
  dutch: {
    first: ['Pieter', 'Anouk', 'Joris', 'Femke', 'Sander', 'Marloes', 'Bram'],
    last: ['de Vries', 'van Dijk', 'Jansen', 'Visser', 'Bakker', 'Mulder', 'de Graaf'],
  },
  iberian: {
    first: ['Javier', 'Lucía', 'Miguel', 'Carmen', 'João', 'Inês', 'Rui', 'Marta', 'Pablo'],
    last: ['García', 'Ferreira', 'Navarro', 'Santos', 'Costa', 'Ortega', 'Carvalho', 'Serrano'],
  },
  french: {
    first: ['Julien', 'Claire', 'Mathieu', 'Élodie', 'Nicolas', 'Camille', 'Olivier'],
    last: ['Moreau', 'Girard', 'Lefèvre', 'Faure', 'Rousseau', 'Chevalier', 'Perrin'],
  },
  korean: {
    first: ['Min-jun', 'Seo-yeon', 'Ji-hoon', 'Yu-na', 'Dong-hyun', 'Hye-jin', 'Sung-ho'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Yoon'],
  },
  japanese: {
    first: ['Takeshi', 'Yuki', 'Hiroshi', 'Aiko', 'Kenji', 'Naoko', 'Daisuke'],
    last: ['Tanaka', 'Sato', 'Watanabe', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Ishikawa'],
  },
  chinese: {
    first: ['Wei', 'Na', 'Jun', 'Xiaoming', 'Mei', 'Hao', 'Lin'],
    last: ['Zhang', 'Wang', 'Chen', 'Liu', 'Zhou', 'Xu', 'Sun'],
  },
  polish: {
    first: ['Piotr', 'Agnieszka', 'Tomasz', 'Katarzyna', 'Marek', 'Ewa'],
    last: ['Nowak', 'Mazur', 'Krawczyk', 'Wójcik', 'Dudek', 'Kaczmarek'],
  },
  slavic: {
    first: ['Marko', 'Ana', 'Luka', 'Petra', 'Ivan', 'Maja'],
    last: ['Novak', 'Horvat', 'Kovačić', 'Babić', 'Kralj', 'Zupan'],
  },
  turkish: {
    first: ['Emre', 'Elif', 'Burak', 'Zeynep', 'Mehmet', 'Aylin'],
    last: ['Yılmaz', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk'],
  },
  levant: {
    first: ['Georges', 'Rania', 'Karim', 'Nadia', 'Samir', 'Leila', 'Walid', 'Yasmine'],
    last: ['Haddad', 'Khoury', 'Saadeh', 'Ben Salah', 'Trabelsi', 'Gharbi', 'Nassar'],
  },
};

const LOCALE: Record<string, Locale> = {
  SA: 'gulf', AE: 'gulf', QA: 'gulf', OM: 'gulf', KW: 'gulf', BH: 'gulf',
  DE: 'german', AT: 'german', CH: 'german', IT: 'italian', GB: 'english', IE: 'english', SE: 'nordic', NL: 'dutch', BE: 'dutch',
  ES: 'iberian', PT: 'iberian', FR: 'french', KR: 'korean', JP: 'japanese', CN: 'chinese', PL: 'polish', SI: 'slavic', HR: 'slavic',
  TR: 'turkish', LB: 'levant', TN: 'levant',
};

export const GCC_CODES = new Set(['SA', 'AE', 'QA', 'OM', 'KW', 'BH']);

/**
 * Drawn combinations that match a well-known real person (a minister, an
 * official, an athlete, an actor or a musician), found in the names audit of
 * plan 043 (2026-10-06), each with the fictional name shown instead. The
 * generator draws and de-duplicates on the drawn name and swaps only the name
 * it keeps (`fictionalName`), so its random stream is unchanged. "Fahad
 * Al-Enezi" was Qurain's CEO, so a draw of it was refused; it maps to the CEO's
 * new name so that a draw of it is still refused.
 */
const NOT_REAL: Record<string, string> = {
  'Fahad Al-Enezi': 'Fawaz Al-Eidan',
  'Salem Al-Dosari': 'Salem Al-Khuraiji', 'Saeed Al-Ghamdi': 'Saeed Al-Fuhaid', 'Khalid Al-Dosari': 'Khalid Al-Jubaili',
  'Khalid Al-Zahrani': 'Khalid Al-Sharekh', 'Yousef Al-Shehri': 'Yousef Al-Huwaidi', 'Hamad Al-Kuwari': 'Hamad Al-Dhuwaihi',
  'Reem Al-Mansoori': 'Reem Al-Nuaimat', 'Tariq Al-Harbi': 'Tariq Al-Muzaini', 'Fahad Al-Mutairi': 'Fahad Al-Thunayan',
  'Noura Al-Balushi': 'Noura Al-Shuraim', 'Khalid Al-Rashidi': 'Khalid Al-Hamdhan',
  'Sherif Farouk': 'Sherif Sallam', 'Karim Abdelaziz': 'Karim Halawa', 'Karim Fahmy': 'Karim Tawfik', 'Amr Mostafa': 'Amr Rizk',
  'Amr Fahmy': 'Amr Desouky', 'Hany Abdelaziz': 'Hany Barsoum', 'Hany Mostafa': 'Hany Abdelmoneim', 'Mona Farouk': 'Mona Gaafar',
  'Amr Abdelaziz': 'Amr Mansy', 'Georges Saadeh': 'Georges Moukarzel',
  'Marta Ortega': 'Marta Valdés', 'Pablo García': 'Pablo Arrieta', 'Xiaoming Zhang': 'Xiaoming Fang',
  'Ji-hoon Lee': 'Ji-hoon Seong', 'Seo-yeon Park': 'Seo-yeon Baek', 'Dong-hyun Yoon': 'Dong-hyun Gil',
  'Jürgen Vogel': 'Jürgen Dörfler', 'Matthias Brandt': 'Matthias Ostermann', 'Jürgen Becker': 'Jürgen Wendling', 'Matthias Hartmann': 'Matthias Kühnel',
  'Mark Bautista': 'Mark Dimaculangan', 'Mark Mendoza': 'Mark Lumibao',
  'Lakshmi Menon': 'Lakshmi Panicker', 'Anil Menon': 'Anil Kartha', 'Priya Pillai': 'Priya Kaimal',
  'David Walsh': 'David Ormerod', 'James Doyle': 'James Tolley', 'Owen Harding': 'Owen Mallory',
  'Henrik Holm': 'Henrik Ahlgren', 'Anders Nyström': 'Anders Vikberg', 'Marco Conti': 'Marco Belloni',
};

/** A person's name for a supplier in `country`. In a GCC firm the technical leads are often expatriates. */
export function personName(r: Rng, country: string, role: 'md' | 'tendering' | 'qa' | 'hse'): string {
  const home = LOCALE[country] ?? 'english';
  const locale: Locale = home === 'gulf' && role !== 'md' && r.chance(0.55)
    ? r.weighted([['indian', 5], ['egyptian', 3], ['filipino', 2]] as const)
    : home;
  const p = POOLS[locale];
  return `${r.pick(p.first)} ${r.pick(p.last)}`;
}

/** The name shown for a drawn name: the drawn one, unless it matches a real person. */
export const fictionalName = (drawn: string): string => NOT_REAL[drawn] ?? drawn;

/** "Jürgen Brandt" → "jurgen.brandt". */
export function emailLocal(name: string): string {
  const ascii = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/ı/g, 'i').replace(/ß/g, 'ss').toLowerCase();
  const [first, ...rest] = ascii.split(' ');
  return `${first.replace(/[^a-z]/g, '')}.${rest.join('').replace(/[^a-z]/g, '')}`;
}

/** Digit patterns per country: `#` is a digit, the rest is kept. */
const PHONE: Record<string, string> = {
  SA: '+966 5# ### ####', AE: '+971 5# ### ####', QA: '+974 #### ####', OM: '+968 9### ####', KW: '+965 #### ####', BH: '+973 3### ####',
  DE: '+49 ### #######', AT: '+43 ### ######', CH: '+41 ## ### ## ##', IT: '+39 0## ### ####', GB: '+44 #### ######', IE: '+353 ## ### ####',
  SE: '+46 ## ### ## ##', NL: '+31 ## ### ####', ES: '+34 9## ### ###', PT: '+351 2## ### ###', FR: '+33 # ## ## ## ##', KR: '+82 ## #### ####',
  JP: '+81 ## #### ####', CN: '+86 ### #### ####', PL: '+48 ## ### ## ##', SI: '+386 # ### ## ##', HR: '+385 ## ### ####', TR: '+90 ### ### ## ##',
  LB: '+961 # ### ###', TN: '+216 ## ### ###',
};

export function phoneOf(r: Rng, country: string): string {
  const pattern = PHONE[country] ?? '+44 #### ######';
  // The first digit after the country code is never 0 unless the pattern says so.
  let first = true;
  return pattern.replace(/#/g, () => {
    const d = first ? r.int(2, 9) : r.int(0, 9);
    first = false;
    return String(d);
  });
}
