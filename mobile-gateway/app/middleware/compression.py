"""
Compression Middleware for Mobile API Gateway.

Supports multiple compression algorithms:
- Brotli (best compression ratio, preferred for mobile)
- Gzip (widely compatible)
- Deflate (legacy support)

Automatically selects the best compression based on:
1. Client's Accept-Encoding header
2. Response content type
3. Response size (skip small payloads)
"""

import gzip
import zlib
from io import BytesIO
from typing import Callable, Optional

try:
    import brotli

    BROTLI_AVAILABLE = True
except ImportError:
    BROTLI_AVAILABLE = False

from starlette.datastructures import Headers, MutableHeaders
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ..config import settings


class CompressionMiddleware:
    """
    ASGI middleware for automatic response compression.

    Features:
    - Supports Brotli, Gzip, and Deflate
    - Skips compression for small payloads
    - Skips already compressed content
    - Mobile-optimized settings
    """

    # Content types that should be compressed
    COMPRESSIBLE_TYPES = {
        "application/json",
        "application/xml",
        "text/html",
        "text/plain",
        "text/css",
        "text/javascript",
        "application/javascript",
        "application/x-javascript",
        "image/svg+xml",
    }

    # Content types that are already compressed (skip)
    SKIP_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "audio/mpeg",
        "application/zip",
        "application/gzip",
        "application/x-brotli",
    }

    def __init__(
        self,
        app: ASGIApp,
        minimum_size: int = 500,
        compression_level: int = 6,
    ):
        """
        Initialize compression middleware.

        Args:
            app: The ASGI application
            minimum_size: Minimum response size to trigger compression (bytes)
            compression_level: Compression level (1-9 for gzip, 0-11 for brotli)
        """
        self.app = app
        self.minimum_size = minimum_size
        self.compression_level = compression_level

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Get accepted encodings from request
        headers = Headers(scope=scope)
        accept_encoding = headers.get("accept-encoding", "")

        # Select best compression algorithm
        encoding = self._select_encoding(accept_encoding)

        if encoding is None:
            # No compression requested/supported
            await self.app(scope, receive, send)
            return

        # Buffer the response to check size before compressing
        response_started = False
        response_headers: list = []
        response_body = BytesIO()

        async def send_wrapper(message: Message) -> None:
            nonlocal response_started, response_headers

            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_started = True
                # Don't send yet - wait for body to check if compression is needed

            elif message["type"] == "http.response.body":
                body = message.get("body", b"")
                more_body = message.get("more_body", False)

                response_body.write(body)

                if not more_body:
                    # Full response received, now compress and send
                    await self._send_compressed_response(
                        send,
                        response_headers,
                        response_body.getvalue(),
                        encoding,
                    )

        await self.app(scope, receive, send_wrapper)

    def _select_encoding(self, accept_encoding: str) -> Optional[str]:
        """
        Select the best compression encoding based on client preferences.

        Priority: brotli > gzip > deflate
        """
        accept_encoding = accept_encoding.lower()

        if BROTLI_AVAILABLE and "br" in accept_encoding:
            return "br"
        elif "gzip" in accept_encoding:
            return "gzip"
        elif "deflate" in accept_encoding:
            return "deflate"

        return None

    def _should_compress(
        self, headers: list, body_size: int, content_type: Optional[str]
    ) -> bool:
        """
        Determine if the response should be compressed.
        """
        # Check size threshold
        if body_size < self.minimum_size:
            return False

        # Check if already compressed
        for name, value in headers:
            if name.lower() == b"content-encoding":
                return False

        # Check content type
        if content_type:
            base_type = content_type.split(";")[0].strip().lower()

            if base_type in self.SKIP_TYPES:
                return False

            if base_type in self.COMPRESSIBLE_TYPES:
                return True

            # Default: compress if it looks like text
            if base_type.startswith("text/") or base_type.endswith("+json"):
                return True

        return False

    def _get_content_type(self, headers: list) -> Optional[str]:
        """Extract content type from headers."""
        for name, value in headers:
            if name.lower() == b"content-type":
                return value.decode("utf-8")
        return None

    async def _send_compressed_response(
        self,
        send: Send,
        headers: list,
        body: bytes,
        encoding: str,
    ) -> None:
        """
        Compress and send the response.
        """
        content_type = self._get_content_type(headers)

        if not self._should_compress(headers, len(body), content_type):
            # Send uncompressed
            await send(
                {
                    "type": "http.response.start",
                    "status": 200,
                    "headers": headers,
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": body,
                    "more_body": False,
                }
            )
            return

        # Compress the body
        compressed_body = self._compress(body, encoding)

        # Update headers
        new_headers = []
        for name, value in headers:
            name_lower = name.lower()
            # Skip content-length (will be updated)
            if name_lower != b"content-length":
                new_headers.append((name, value))

        new_headers.append((b"content-encoding", encoding.encode()))
        new_headers.append((b"content-length", str(len(compressed_body)).encode()))
        new_headers.append((b"vary", b"Accept-Encoding"))

        # Extract status from headers or default to 200
        status = 200
        for name, value in headers:
            if name.lower() == b":status":
                status = int(value.decode())
                break

        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": new_headers,
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": compressed_body,
                "more_body": False,
            }
        )

    def _compress(self, data: bytes, encoding: str) -> bytes:
        """
        Compress data using the specified encoding.
        """
        if encoding == "br" and BROTLI_AVAILABLE:
            # Brotli compression - quality 4 is a good balance for speed/ratio
            quality = min(self.compression_level, 11)
            return brotli.compress(data, quality=quality)

        elif encoding == "gzip":
            buf = BytesIO()
            with gzip.GzipFile(
                mode="wb", fileobj=buf, compresslevel=self.compression_level
            ) as f:
                f.write(data)
            return buf.getvalue()

        elif encoding == "deflate":
            return zlib.compress(data, level=self.compression_level)

        return data


def get_compression_stats(original_size: int, compressed_size: int) -> dict:
    """
    Calculate compression statistics.
    """
    ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
    return {
        "original_size": original_size,
        "compressed_size": compressed_size,
        "compression_ratio": round(ratio, 2),
        "bytes_saved": original_size - compressed_size,
    }
