/** Canonical match record text: always `0W-0L`. */
export function formatWinLossRecord(wins: number, losses: number): string {
  return `${wins}W-${losses}L`
}
