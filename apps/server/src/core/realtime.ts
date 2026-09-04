import type { PlaybackRealtimeEvent, RealtimeTicketResponse } from "@rajio-app/contracts";

export interface RealtimeCoordinator {
  issueTicket(input: { baseUrl: string; deviceId: string }): Promise<RealtimeTicketResponse>;
  connect(request: Request, ticket: string): Promise<Response>;
  publish(event: PlaybackRealtimeEvent): Promise<void>;
}
