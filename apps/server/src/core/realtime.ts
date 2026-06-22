import type { PlaybackRealtimeEvent, RealtimeTicketResponse } from "@newcastle/contracts";

export interface RealtimeCoordinator {
  issueTicket(input: { baseUrl: string; deviceId: string }): Promise<RealtimeTicketResponse>;
  connect(request: Request, ticket: string): Promise<Response>;
  publish(event: PlaybackRealtimeEvent): Promise<void>;
}
