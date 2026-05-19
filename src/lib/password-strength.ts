/**
 * Scores a password on a 0–3 scale based on length and character variety.
 *
 * Scoring criteria (each criterion adds 1 point, result clamped to 0–3):
 *   - Length ≥ 8 characters  (+1)
 *   - Length ≥ 12 characters (+1 additional, so ≥12 gives +2 total for length)
 *   - Contains both uppercase and lowercase letters (+1)
 *   - Contains at least one digit (+1)
 *   - Contains at least one special character (+1)
 *
 * @param pwd - The password string to score
 * @returns A score of 0 (very weak) to 3 (strong)
 */
export function scorePassword(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd || pwd.length === 0) return 0;

  let score = 0;

  // Length scoring
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;

  // Mixed case
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;

  // Digits
  if (/\d/.test(pwd)) score += 1;

  // Special characters
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  // Clamp to 0–3
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}
