Feature: Desktop OPML and preferences
  Newcastle imports and exports subscriptions through OPML and stores user preferences that shape playback, discovery, display, and sync settings.

  Rule: OPML import converts outlines into subscriptions

    Scenario: Import valid OPML with feed outlines
      Given OPML content contains outline elements with `xmlUrl` attributes
      When the OPML is imported
      Then each unique feed not already subscribed is subscribed through the desktop library API
      And the import result counts successful imports
      And the library is reinitialized after import
      And the progress dialog closes when import finishes

    Scenario: Import OPML with duplicate subscribed feeds
      Given OPML content contains a feed URL that is already subscribed
      When the OPML is imported
      Then the existing subscription is skipped
      And the skipped feed is not counted as imported

    Scenario: Import OPML with invalid or unavailable feeds
      Given OPML content contains multiple feed URLs
      And some feeds fail during subscription
      When the OPML is imported
      Then successful feeds are still imported
      And failed feeds are counted as errors
      And the import continues after each failed feed

    Scenario: Import OPML without feed URLs
      Given OPML content contains no outline elements with `xmlUrl`
      When the OPML is imported
      Then the operation fails with "No podcast feeds found in OPML file"
      And import state is reset

  Rule: OPML export reflects current subscriptions

    Scenario: Export OPML
      Given the user has subscribed podcasts
      When OPML is exported
      Then the generated OPML document uses version 2.0
      And it contains one RSS outline per podcast
      And each outline includes escaped title, feed URL, and description values
      And the generated filename includes the current date

    Scenario: Export OPML with no subscriptions
      Given the user has no subscribed podcasts
      When the settings page is displayed
      Then the export action is disabled

  Rule: Preferences update renderer behavior

    Scenario: Default preferences
      Given the app starts with no user preference overrides
      Then auto play is false
      And iTunes search is enabled
      And skip interval is 30 seconds
      And theme follows the system
      And What's New count is 10

    Scenario: Change playback preferences
      Given the user changes skip interval or auto play
      When preferences are updated in renderer state
      Then future player controls use the updated skip interval
      And auto play state reflects the selected value

    Scenario: Change What's New count
      Given the user changes the What's New count
      When latest episodes are requested
      Then the result size respects the selected count
      And the latest episodes cache is invalidated when the count changes

    Scenario: Disable iTunes search
      Given iTunes search is disabled in preferences
      When the Add Podcast dialog opens
      Then the dialog defaults to RSS URL entry
      And the iTunes search tab is not shown

    Scenario: Store desktop sync settings
      Given a sync endpoint and token are provided
      When desktop settings are saved
      Then string settings are persisted in local preferences
      And non-string values are ignored
      And future settings reads return the persisted strings
