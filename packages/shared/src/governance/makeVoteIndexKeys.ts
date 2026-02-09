import { Array as A } from 'effect'

/**
 * Generates Gateway API KVS key objects for fetching votes by their on-chain index (1-based).
 * Given an [inclusive, inclusive] range, returns keys for the closed interval.
 *
 * @param fromIndexInclusive - The inclusive lower bound (first vote index to fetch)
 * @param toIndexInclusive - The inclusive upper bound (last vote index to fetch)
 * @returns Array of key objects for the Gateway API KeyValueStoreData request
 *
 * @example
 * // First run: fetch votes 1-5
 * makeVoteIndexKeys(1, 5) // returns keys for indices 1, 2, 3, 4, 5
 *
 * @example
 * // Continuation: fetch votes 6-8
 * makeVoteIndexKeys(6, 8) // returns keys for indices 6, 7, 8
 */
export const makeVoteIndexKeys = (
  fromIndexInclusive: number,
  toIndexInclusive: number
) => {
  const count = toIndexInclusive - fromIndexInclusive + 1
  if (count <= 0) return A.empty<{ key_json: { kind: 'U64'; value: string } }>()
  return A.makeBy(count, (i) => ({
    key_json: {
      kind: 'U64' as const,
      value: (fromIndexInclusive + i).toString()
    }
  }))
}
