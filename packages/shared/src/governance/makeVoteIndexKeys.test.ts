import { makeVoteIndexKeys } from 'shared/governance/index'
import { describe, expect, it } from 'vitest'

describe('makeVoteIndexKeys', () => {
  it('generates keys 1-5 for first run (1, 5)', () => {
    const keys = makeVoteIndexKeys(1, 5)

    expect(keys.length).toBe(5)
    expect(keys.map((k) => k.key_json.value)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('generates keys 6-8 for continuation run (6, 8)', () => {
    const keys = makeVoteIndexKeys(6, 8)

    expect(keys.length).toBe(3)
    expect(keys.map((k) => k.key_json.value)).toEqual(['6', '7', '8'])
  })

  it('returns empty array when from exceeds to (6, 5)', () => {
    const keys = makeVoteIndexKeys(6, 5)

    expect(keys.length).toBe(0)
    expect(keys).toEqual([])
  })

  it('generates single key for single vote (1, 1)', () => {
    const keys = makeVoteIndexKeys(1, 1)

    expect(keys.length).toBe(1)
    expect(keys.map((k) => k.key_json.value)).toEqual(['1'])
  })

  it('generates keys with correct structure', () => {
    const keys = makeVoteIndexKeys(1, 2)

    expect(keys).toEqual([
      { key_json: { kind: 'U64', value: '1' } },
      { key_json: { kind: 'U64', value: '2' } }
    ])
  })
})
