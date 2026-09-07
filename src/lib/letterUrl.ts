/** The Letter site. Override with VITE_LETTER_URL. */
export const LETTER_URL = (
  (import.meta.env.VITE_LETTER_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://theletter.dearcc.org'
)
