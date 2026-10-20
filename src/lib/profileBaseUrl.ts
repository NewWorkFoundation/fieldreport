/** Production's apex redirects to www; preflight requests must go there directly. */
export function profileBaseUrl(value: string) {
  return value.replace(/\/+$/, '').replace(/^https:\/\/dearcc\.org(?=\/|$)/, 'https://www.dearcc.org')
}
