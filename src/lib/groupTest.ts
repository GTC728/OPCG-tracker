/** Groups whose code starts with TEST (case-insensitive) skip permanent lifetime / achievements. */
export function isTestGroupCode(groupCode: string | null | undefined): boolean {
  if (!groupCode) return false
  return /^test/i.test(groupCode.trim())
}
