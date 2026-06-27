Feature: Desktop sync client
  Newcastle can synchronize local subscription and playback changes with a configured sync backend.

  Rule: Sync only runs when configured

    Scenario: Sync without backend settings
      Given the local database has no sync base URL or no sync auth token
      When sync is requested
      Then sync returns without making network requests
      And local outbox entries remain unchanged

    Scenario: Normalize backend URL before sync
      Given the sync base URL has trailing slashes
      And the sync auth token is configured
      When sync sends requests
      Then requests use the backend URL without trailing slashes

  Rule: Local outbox entries are flushed before pulling remote state

    Scenario: Flush subscription upsert entry
      Given an outbox entry of kind `subscription.upsert`
      When sync runs
      Then the client posts the entry payload to `/api/sync/subscriptions/upsert`
      And the request uses bearer authorization and JSON content type
      And the outbox entry is deleted only after the request succeeds

    Scenario: Flush subscription delete entry
      Given an outbox entry of kind `subscription.delete`
      When sync runs
      Then the client posts the entry payload to `/api/sync/subscriptions/delete`
      And the outbox entry is deleted only after the request succeeds

    Scenario: Flush playback checkpoint entry
      Given an outbox entry of kind `playback.checkpoint`
      When sync runs
      Then the client posts to `/api/sync/playback/checkpoint`
      And the body contains the checkpoint payload and a desktop device id
      And the outbox entry is deleted only after the request succeeds

    Scenario: Stop sync on failed flush
      Given an outbox entry request receives a non-2xx response
      When sync runs
      Then sync fails with an error including the HTTP status
      And the failing outbox entry remains in the database
      And later outbox entries are not flushed
      And remote state is not pulled

  Rule: Remote state is pulled and applied locally

    Scenario: Pull remote state after flushing outbox
      Given sync backend settings are configured
      And all outbox entries flush successfully
      When sync runs
      Then the client requests `/api/sync/state` with bearer authorization
      And the response is applied to local state

    Scenario: Pull remote state fails
      Given the state request receives a non-2xx response
      When sync runs
      Then sync fails with an error including the HTTP status

    Scenario: Apply active remote subscription missing locally
      Given remote state contains an active subscription not present locally
      When remote state is applied
      Then the client fetches that feed by RSS
      And inserts the podcast using the remote subscribed timestamp as subscription date
      And inserts the feed episodes

    Scenario: Apply active remote subscription already local
      Given remote state contains an active subscription already present locally
      When remote state is applied
      Then the feed is not fetched again
      And the local podcast is left unchanged

    Scenario: Apply deleted remote subscription
      Given remote state contains a deleted subscription
      When remote state is applied
      Then any local podcast with that feed URL is removed

    Scenario: Apply remote playback checkpoint
      Given remote state contains a playback checkpoint locator
      And the locator matches a local episode by audio URL or guid under the same feed URL
      When remote state is applied
      Then local playback progress is saved for that episode and podcast

    Scenario: Skip remote checkpoint without local episode
      Given remote state contains a playback checkpoint for an unknown episode or feed
      When remote state is applied
      Then no local playback progress is written for that checkpoint
