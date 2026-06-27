Feature: Desktop playback
  Newcastle plays podcast episodes from the best available source and records progress for resume and sync.

  Rule: Playback source prefers local downloaded audio

    Scenario: Get source for a downloaded episode
      Given an episode exists with a downloaded file path
      When playback source is requested for the episode
      Then the source is a file URL for the downloaded file path
      And `isLocal` is true

    Scenario: Get source for a streaming episode
      Given an episode exists without a downloaded file path
      When playback source is requested for the episode
      Then the source is the episode audio URL
      And `isLocal` is false

    Scenario: Get source for a missing episode
      Given no episode exists for the requested episode id
      When playback source is requested
      Then the operation fails with "Episode not found"

  Rule: Playback progress is persisted locally and queued for sync

    Scenario: Save progress for an existing episode
      Given an episode and its podcast exist locally
      When progress is saved with current time, duration, and completion state
      Then playback progress is upserted for that episode
      And a `playback.checkpoint` outbox entry is created
      And the checkpoint locator includes feed URL, episode guid when present, and audio URL
      And checkpoint timestamps use the local save time

    Scenario: Save progress for a missing episode or podcast
      Given the episode or its podcast cannot be found locally
      When progress is saved
      Then the operation fails with "Episode not found"
      And no outbox entry is created

    Scenario: Mark an episode complete from renderer state
      Given an episode exists in loaded renderer state
      And the current playback duration is known
      When the episode is marked completed
      Then progress is saved at current time equal to duration
      And the progress is considered completed

    Scenario: Determine completion from progress threshold
      Given an episode exists in loaded renderer state
      When progress is saved at at least 95 percent of duration
      Then renderer playback progress marks the episode completed
      When progress is saved below 95 percent of duration
      Then renderer playback progress does not mark the episode completed

  Rule: Player state supports play, pause, seek, skip, and resume behavior

    Scenario: Start playing a new episode
      Given an episode is selected for playback
      When playback starts
      Then the current episode becomes that episode
      And current time resets to 0
      And duration is initialized from the episode duration when available
      And playback enters loading and playing state
      And show notes are populated from content, show notes, or description

    Scenario: Resume the same episode
      Given the selected episode is already the current episode
      When playback starts again
      Then the current episode is unchanged
      And current time is not reset
      And playback enters playing state

    Scenario: Pause playback
      Given playback is currently playing
      When playback is paused
      Then playback enters paused state
      And current progress is saved when a duration is available

    Scenario: Restore saved position after audio metadata loads
      Given an episode has saved progress greater than 0 and less than audio duration
      When the audio element loads metadata
      Then the audio current time is set to the saved time
      And renderer current time reflects the saved time

    Scenario: Clamp skip and seek actions to the episode duration
      Given an episode is loaded with a known duration
      When the user skips backward beyond the start
      Then current time becomes 0
      When the user skips forward beyond the duration
      Then current time becomes the duration
      And each seek or skip saves progress when duration is available

    Scenario: Finish playback
      Given an episode is playing
      When the audio reaches the end
      Then playback is paused
      And final progress is saved at duration
      And any local blob URL used for playback is revoked
