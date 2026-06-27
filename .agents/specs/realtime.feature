Feature: Realtime playback updates
  The sync backend can issue short-lived websocket tickets and broadcast playback events to connected clients.

  Rule: Realtime tickets authorize websocket connections

    Scenario: Issue realtime ticket
      Given a valid authenticated request contains a non-blank device id
      When a realtime ticket is requested
      Then the response contains a signed ticket
      And the expiration is about 60 seconds after issue time
      And the websocket URL points to `/ws/playback` with the ticket query parameter
      And the websocket protocol is `wss` for HTTPS API requests and `ws` for HTTP API requests

    Scenario: Reject realtime ticket request without device id
      Given an authenticated realtime ticket request has a blank device id
      When the request is handled
      Then the response status is 400
      And the error says "deviceId is required"

    Scenario: Reject websocket connection without ticket
      Given a websocket request has no ticket query parameter
      When `/ws/playback` is requested
      Then the response status is 401
      And the error says "Missing realtime ticket"

    Scenario: Reject invalid websocket ticket
      Given a websocket request has a malformed or incorrectly signed ticket
      When the realtime coordinator verifies the ticket
      Then the connection is rejected as unauthorized

    Scenario: Reject expired websocket ticket
      Given a websocket request has a validly signed ticket whose expiration is in the past
      When the realtime coordinator verifies the ticket
      Then the connection is rejected as unauthorized

    Scenario: Connect with valid websocket ticket
      Given a websocket request has a valid unexpired ticket
      When the realtime coordinator connects
      Then the request is forwarded to the playback coordinator durable object
      And the forwarded URL includes the ticket device id as `deviceId`

  Rule: Playback mutations broadcast realtime events

    Scenario: Broadcast active playback update
      Given a client saves an active playback checkpoint
      When the server updates current playback
      Then the realtime coordinator publishes a `playback.updated` event
      And the event contains current playback and the saved checkpoint

    Scenario: Broadcast playback cleared after completion
      Given a client saves a completed playback checkpoint
      When the server clears current playback
      Then the realtime coordinator publishes a `playback.cleared` event
      And the event contains null current playback and the saved checkpoint

    Scenario: Broadcast playback cleared manually
      Given a client clears current playback directly
      When the server clears current playback
      Then the realtime coordinator publishes a `playback.cleared` event
      And the event contains null current playback and null checkpoint
