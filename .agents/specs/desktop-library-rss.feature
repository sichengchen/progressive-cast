Feature: Desktop library and RSS ingestion
  Newcastle maintains a local podcast library by fetching RSS or Atom feeds, parsing podcast metadata, and persisting podcast and episode records.

  Rule: RSS feeds are normalized into local podcast and episode records

    Scenario: Parse a valid podcast feed with podcast and episode metadata
      Given an RSS or Atom feed with podcast title, author, description, language, image, and episodes
      When the feed is parsed for a feed URL
      Then the podcast id is deterministic from the feed URL
      And the podcast title comes from the feed title, or the feed host when the title is missing
      And HTML descriptions are converted to plain text
      And relative image URLs are resolved against the feed URL
      And each episode with an audio URL is returned with title, guid, duration, publish date, image, and audio URL
      And episodes without any audio URL are excluded

    Scenario: Fetch a feed over HTTP
      Given a valid feed URL
      When the RSS service fetches the feed
      Then the request uses podcast-compatible Accept, Accept-Language, and User-Agent headers
      And a non-2xx response fails with an error that includes the HTTP status and status text when available
      And an empty feed body fails with an "RSS feed is empty" error

  Rule: Subscriptions are stored locally and queued for sync

    Scenario: Subscribe to a podcast by feed URL
      Given a feed URL that returns a valid feed
      When the user subscribes to the feed
      Then the podcast record is inserted or updated in SQLite
      And the feed episodes are inserted or updated in SQLite
      And a `subscription.upsert` outbox entry is created with the podcast feed URL
      And the subscribed podcast is returned to the caller

    Scenario: Unsubscribe from an existing podcast
      Given a podcast exists in the local database
      When the user unsubscribes from that podcast
      Then the podcast is removed from the local database
      And its episodes, playback progress, and download tasks are removed through database cascade behavior
      And a `subscription.delete` outbox entry is created with the podcast feed URL

    Scenario: Unsubscribe from a missing podcast
      Given no podcast exists for the requested podcast id
      When the user unsubscribes from that podcast id
      Then no local record changes
      And no sync outbox entry is created

  Rule: Library views expose stable local ordering

    Scenario: List podcasts
      Given multiple podcasts exist in the local database
      When the library is listed
      Then podcasts are returned ordered by title case-insensitively

    Scenario: List episodes for a podcast
      Given a podcast has multiple episodes with publish dates
      When episodes are listed for that podcast
      Then only episodes for that podcast are returned
      And they are ordered by newest publish date first

    Scenario: List all episodes
      Given multiple podcasts have episodes
      When all episodes are listed
      Then episodes are grouped by podcast id
      And episodes within each podcast are ordered by newest publish date first

  Rule: Podcast refresh updates feed content without changing subscription identity

    Scenario: Refresh an existing podcast
      Given a podcast exists in the local database
      And its feed URL returns updated podcast metadata and episodes
      When the podcast is refreshed
      Then the podcast metadata is updated
      And the original subscription date is preserved
      And episode metadata is inserted or updated without clearing downloaded file state

    Scenario: Refresh a missing podcast
      Given no podcast exists for the requested podcast id
      When the podcast is refreshed
      Then the operation fails with "Podcast not found"
