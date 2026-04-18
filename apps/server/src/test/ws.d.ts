declare module "ws" {
  export class WebSocketServer {
    constructor(options: { host?: string; port: number });
    on(event: "connection", listener: (socket: WebSocket, request: { url?: string }) => void): void;
  }

  export interface WebSocket {
    close(code?: number, reason?: string): void;
    on(event: "close", listener: () => void): void;
    readonly readyState: number;
    send(data: string): void;
  }
}
