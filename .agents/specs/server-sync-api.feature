Feature: Server sync HTTP API
  The sync backend exposes a small authenticated API for desktop clients and no media proxy behavior.

  Rule: Public operational routes

    Scenario: Health check
      When `GET /healthz` is requested
      Then the response status is 200
      And the body is `ok`

    Scenario: Server metadata
      When `GET /api/meta` is requested
      Then the response status is 200
      And the body includes app version, protocol version, and realtime capability
      And the protocol version matches the shared sync contract version
      And API CORS headers are present

    Scenario: Unsupported media or RSS routes
      When `/api/rss`, `/api/download`, or `/api/media/episode.mp3` is requested
      Then the response status is 404

  Rule: API CORS and auth are consistent

    Scenario: CORS preflight for API routes
      Given an API route receives an OPTIONS preflight request
      When the request is handled
      Then the response status is 204
      And `Access-Control-Allow-Origin` is `*`
      And allowed headers include `Authorization, Content-Type`
      And allowed methods include `GET, POST, PUT, OPTIONS`

    Scenario: Missing bearer token on sync route
      Given a request to `/api/sync/state` has no Authorization header
      When the request is handled
      Then the response status is 401
      And the response body contains an error

    Scenario: Invalid bearer token on sync route
      Given a request to an authenticated sync route has the wrong bearer token
      When the request is handled
      Then the response status is 401

    Scenario: Auth token is not configured on server
      Given the server auth guard has no expected token
      When an authenticated route is requested
      Then the response status is 401
      And the error says the server auth token is not configured

  Rule: JSON request and error responses are structured

    Scenario: Invalid JSON body
      Given an authenticated sync POST or PUT route receives malformed JSON
      When the request is handled
      Then the response status is 400
      And the response body is `{ "error": "Request body must be valid JSON" }`

    Scenario: Domain validation error
      Given an authenticated sync route receives syntactically valid JSON with invalid domain data
      When the request is handled
      Then the response status is 400
      And the response body contains the domain error message

    Scenario: Unhandled server error
      Given a route handler throws an unexpected error
      When the request is handled
      Then the response status is 500
      And the response body is `{ "error": "Internal server error" }`

  Rule: Sync API routes expose server state mutations

    Scenario: Read sync state
      Given the request has a valid bearer token
      When `GET /api/sync/state` is requested
      Then the response status is 200
      And the body contains subscriptions, playback history, current playback, and preferences

    Scenario: Bootstrap sync state
      Given the request has a valid bearer token
      And the request body contains a complete bootstrap snapshot
      When `POST /api/sync/bootstrap` is requested
      Then the response status is 200
      And the response body is the merged sync state

    Scenario: Upsert subscription
      Given the request has a valid bearer token
      And the request body contains a feed URL
      When `POST /api/sync/subscriptions/upsert` is requested
      Then the response status is 204
      And future state includes the feed URL as an active subscription

    Scenario: Delete subscription
      Given the request has a valid bearer token
      And the request body contains a feed URL
      When `POST /api/sync/subscriptions/delete` is requested
      Then the response status is 204
      And future state includes the feed URL as a deleted subscription with a deleted timestamp

    Scenario: Save playback checkpoint
      Given the request has a valid bearer token
      And the request body contains a device id and checkpoint
      When `POST /api/sync/playback/checkpoint` is requested
      Then the response status is 204
      And future state includes the checkpoint
      And current playback reflects the checkpoint unless it is completed

    Scenario: Clear current playback
      Given the request has a valid bearer token
      And the request body contains a device id
      When `POST /api/sync/playback/clear-current` is requested
      Then the response status is 204
      And future state has no current playback

    Scenario: Update preferences
      Given the request has a valid bearer token
      And the request body contains sync preferences
      When `PUT /api/sync/preferences` is requested
      Then the response status is 200
      And the response body contains normalized preferences
