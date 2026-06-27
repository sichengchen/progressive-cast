Feature: Desktop downloads
  Newcastle stores episode audio locally for offline playback and reports download state through local persistence and renderer views.

  Rule: Download lifecycle is persisted

    Scenario: Download an existing episode successfully
      Given an episode exists with an audio URL
      And the audio URL returns a successful response body
      When the download starts
      Then the episode download task is marked `downloading`
      And the response bytes are written under the downloads directory
      And the file extension comes from the audio URL path, or `.mp3` when none exists
      And the episode is marked with downloaded path, file size, and downloaded timestamp
      And the final status is `downloaded` with 100 progress

    Scenario: Download a missing episode
      Given no episode exists for the requested episode id
      When the download starts
      Then no network request is made
      And the returned status is `missing` with 0 progress

    Scenario: Download fails
      Given an episode exists
      And fetching the audio URL fails or returns a non-2xx response
      When the download starts
      Then the returned status is `failed`
      And progress is 0
      And the error message describes the failure
      And the failed status is persisted

  Rule: Downloaded files affect playback and storage views

    Scenario: Playback prefers a downloaded file
      Given an episode has been downloaded successfully
      When playback source is requested
      Then playback uses the downloaded file URL instead of the remote audio URL

    Scenario: Delete a downloaded episode
      Given an episode exists with a downloaded file path
      When the download is deleted
      Then the local file is removed if present
      And downloaded path, file size, and downloaded timestamp are cleared from the episode
      And the download status is reset to `queued` with 0 progress

    Scenario: Delete a non-downloaded or missing episode
      Given the episode has no downloaded file path or does not exist
      When the download is deleted
      Then the operation completes without throwing
      And any existing local downloaded metadata for that episode id is cleared

    Scenario: Build downloaded episode list
      Given the library contains downloaded and non-downloaded episodes
      When downloaded episodes are requested in renderer state
      Then only episodes with downloaded paths are returned
      And storage stats count those episodes
      And total storage size is the sum of downloaded episode file sizes

    Scenario: Clear all downloads
      Given the renderer has downloaded episodes
      When all downloads are cleared
      Then each downloaded episode is deleted through the desktop downloads API
      And downloaded episode state is refreshed
      And storage stats are recalculated
