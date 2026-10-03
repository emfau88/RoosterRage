// Small, distinct symbols extend the existing gold/ivory icon language.
const shell = '<ellipse cx="48" cy="49" rx="22" ry="29" fill="#fff0c0" stroke="#704023" stroke-width="5"/>';
const target = '<circle cx="48" cy="48" r="27" fill="none" stroke="#e56838" stroke-width="6"/><circle cx="48" cy="48" r="12" fill="none" stroke="#e56838" stroke-width="5"/><path d="M48 12v17m0 38v17M12 48h17m38 0h17"/>';
const shapes = {
  'critical-yolk': `${shell}${target}`,
  'precision-egg': `${shell}<path d="M12 76L80 18m-16 0h16v16"/><circle cx="48" cy="48" r="8" fill="#e56838"/>`,
  'blast-shell': `${shell}<path d="M48 33l5 10 12-1-8 9 4 12-13-6-12 6 3-12-8-9 12 1z" fill="#e56838"/><path d="M16 28L8 20m70 8 8-8M15 63l-9 5m75-5 9 5"/>`,
  'storm-egg': `${shell}<path d="M51 19L32 51h16l-4 27 22-35H50z" fill="#39b6ef" stroke="#25597a" stroke-width="3"/>`,
  'ricochet-eggs': '<path d="M10 77L41 26l21 38 22-45m-18 0h18v18"/><circle cx="41" cy="26" r="8" fill="#fff0c0"/><circle cx="62" cy="64" r="8" fill="#fff0c0"/>',
  'shell-shock': `${shell}<path d="M8 50h24m-10-12 12 12-12 12M64 50h25m-12-12 12 12-12 12"/><path d="M51 32l-8 15 11 10-7 14" stroke="#e56838"/>`,
  'second-wind': '<path d="M31 63C8 39 29 17 48 37c19-20 41 2 17 26L48 79z" fill="#e56838"/><path d="M21 69C23 27 46 7 70 12c6 24-7 42-31 46m-21 23 47-55" stroke="#fff0c0"/>',
};
export const PORTAL_ICONS = Object.freeze(Object.fromEntries(Object.entries(shapes).map(([id,content]) => [id,
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><g fill="none" stroke="#e7b658" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`)}`
])));
