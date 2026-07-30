import os
import time
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    A sliding-window in-memory rate limiter middleware.
    Protects all API endpoints from abuse by restricting the number of requests 
    a single client IP can make within a specified time window.
    """

    def __init__(self, app):
        super().__init__(app)
        self.limit = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "200"))
        self.window = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/", "/health"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if current_time - t < self.window
        ]

        if len(self.requests[client_ip]) >= self.limit:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "limit": self.limit,
                    "window_seconds": self.window
                },
                headers={
                    "Retry-After": str(int(self.window - (current_time - self.requests[client_ip][0])))
                }
            )

        self.requests[client_ip].append(current_time)

        response = await call_next(request)

        remaining = max(0, self.limit - len(self.requests[client_ip]))
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(self.window - (current_time - self.requests[client_ip][0])))

        return response
