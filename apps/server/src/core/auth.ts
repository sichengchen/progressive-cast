import { UnauthorizedError } from "./errors";

export interface AuthGuard {
  authorize(request: Request): Promise<void>;
}

export class StaticBearerAuthGuard implements AuthGuard {
  private readonly expectedTokenBytes: Uint8Array;

  constructor(private readonly expectedToken: string) {
    this.expectedTokenBytes = new TextEncoder().encode(expectedToken);
  }

  async authorize(request: Request): Promise<void> {
    if (!this.expectedToken) {
      throw new UnauthorizedError("Server auth token is not configured");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const actualToken = authorization.slice("Bearer ".length).trim();
    const actualBytes = new TextEncoder().encode(actualToken);

    if (!timingSafeEqual(actualBytes, this.expectedTokenBytes)) {
      throw new UnauthorizedError();
    }
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return mismatch === 0;
}
