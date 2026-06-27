Feature: Server sync domain
  The sync service merges client snapshots and mutations into authoritative server-side sync state.

  Rule: State read returns complete defaults

    Scenario: Read empty server state
      Given no records exist in server repositories
      When sync state is read
      Then subscriptions are empty
      And playback history is empty
      And current playback is null
      And preferences equal the shared default preferences with an updated timestamp

  Rule: Bootstrap merges by last update time

    Scenario: Bootstrap new records into empty server
      Given the server has no sync records
      When a client bootstraps subscriptions, playback history, current playback, and preferences
      Then all valid incoming records are stored
      And preferences are stored after normalization
      And the returned state contains the stored records

    Scenario: Bootstrap with newer client subscription
      Given the server has a subscription for a feed URL
      And the client bootstraps a subscription for the same feed URL with a later or equal updated timestamp
      When bootstrap runs
      Then the client subscription replaces the server subscription

    Scenario: Bootstrap with stale client subscription
      Given the server has a subscription for a feed URL
      And the client bootstraps a subscription for the same feed URL with an earlier updated timestamp
      When bootstrap runs
      Then the server subscription remains unchanged

    Scenario: Bootstrap with newer client playback checkpoint
      Given the server has a playback checkpoint for a locator
      And the client bootstraps a checkpoint for the same locator with a later or equal updated timestamp
      When bootstrap runs
      Then the client checkpoint replaces the server checkpoint

    Scenario: Bootstrap with stale client playback checkpoint
      Given the server has a playback checkpoint for a locator
      And the client bootstraps a checkpoint for the same locator with an earlier updated timestamp
      When bootstrap runs
      Then the server checkpoint remains unchanged

    Scenario: Bootstrap current playback
      Given the server has no current playback or has older current playback
      When a client bootstraps current playback
      Then the client current playback is stored

    Scenario: Bootstrap current playback with stale client record
      Given the server has newer current playback
      When a client bootstraps older current playback
      Then the server current playback remains unchanged

    Scenario: Bootstrap does not overwrite existing preferences
      Given the server already has preferences
      When a client bootstraps preferences
      Then existing server preferences remain unchanged

  Rule: Subscription mutations create tombstones

    Scenario: Upsert subscription
      Given a feed URL with surrounding whitespace
      When the subscription is upserted
      Then the stored feed URL is trimmed
      And status is `active`
      And deleted timestamp is null
      And subscribed and updated timestamps use the mutation time

    Scenario: Delete subscription
      Given a feed URL with surrounding whitespace
      When the subscription is deleted
      Then the stored feed URL is trimmed
      And status is `deleted`
      And deleted, subscribed, and updated timestamps use the mutation time

    Scenario: Reject missing subscription feed URL
      Given a blank feed URL
      When the subscription is upserted or deleted
      Then the operation fails with a bad request error

  Rule: Playback checkpoint mutations update history, current playback, and realtime

    Scenario: Save active checkpoint
      Given a valid device id and playback checkpoint
      When the checkpoint is saved
      Then negative current time and duration are clamped to 0
      And checkpoint last-played and updated timestamps use the server mutation time
      And the checkpoint is upserted in playback history
      And current playback is set with the trimmed device id
      And a realtime `playback.updated` event is published

    Scenario: Save completed checkpoint
      Given a valid device id and a completed playback checkpoint
      When the checkpoint is saved
      Then the checkpoint is upserted in playback history
      And current playback is cleared
      And a realtime `playback.cleared` event is published

    Scenario: Clear current playback
      Given a valid device id
      When current playback is cleared
      Then current playback is removed
      And a realtime `playback.cleared` event is published

    Scenario: Reject playback mutation without device id
      Given the device id is blank
      When a checkpoint is saved or current playback is cleared
      Then the operation fails with a bad request error

    Scenario: Reject checkpoint without locator feed or audio URL
      Given a checkpoint locator has a blank feed URL or blank audio URL
      When the checkpoint is saved or bootstrapped
      Then the operation fails with "Playback locator feedUrl and audioUrl are required"

  Rule: Preferences are normalized

    Scenario: Update preferences
      Given preferences contain booleans and numeric values
      When preferences are updated
      Then auto play is coerced to boolean
      And iTunes search defaults to the shared default when missing
      And skip interval is floored and clamped to at least 1
      And What's New count is floored and clamped to at least 1
      And updated timestamp uses the server mutation time

    Scenario: Invalid numeric preferences use defaults
      Given skip interval or What's New count is not finite
      When preferences are normalized
      Then the invalid numeric value is replaced by the shared default
