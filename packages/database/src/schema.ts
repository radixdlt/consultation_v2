import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  unique,
  varchar
} from 'drizzle-orm/pg-core'

export const voteCalculationState = pgTable(
  'vote_calculation_state',
  {
    id: serial('id').primaryKey(),
    type: varchar('type', { length: 50 }).notNull(),
    entityId: integer('entity_id').notNull(),
    lastVoteCount: integer('last_vote_count').notNull().default(0),
    isCalculating: boolean('is_calculating').notNull().default(false)
  },
  (table) => [unique().on(table.type, table.entityId)]
)

export const voteCalculationResults = pgTable(
  'vote_calculation_results',
  {
    stateId: integer('state_id')
      .notNull()
      .references(() => voteCalculationState.id, { onDelete: 'cascade' }),
    vote: varchar('vote', { length: 255 }).notNull(),
    votePower: numeric('vote_power').notNull().default('0')
  },
  (table) => [primaryKey({ columns: [table.stateId, table.vote] })]
)

// Revote support: old rows are deleted before inserting new ones within the same
// transaction in commitVoteResults, so the composite PK works correctly.
export const voteCalculationAccountVotes = pgTable(
  'vote_calculation_account_votes',
  {
    stateId: integer('state_id')
      .notNull()
      .references(() => voteCalculationState.id, { onDelete: 'cascade' }),
    accountAddress: varchar('account_address', { length: 255 }).notNull(),
    vote: varchar('vote', { length: 255 }).notNull(),
    votePower: numeric('vote_power').notNull().default('0')
  },
  (table) => [primaryKey({ columns: [table.stateId, table.accountAddress, table.vote] })]
)
