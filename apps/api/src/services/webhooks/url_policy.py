import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import HTTPException, status

from config.config import get_learnhouse_config

BESTDEVS_DEVELOPMENT_CALLBACK = (
    "http://host.docker.internal:8080/api/v1/integrations/learnhouse/webhooks"
)


def is_exact_development_callback(url: str) -> bool:
    if url != BESTDEVS_DEVELOPMENT_CALLBACK:
        return False
    return bool(get_learnhouse_config().general_config.development_mode)


def validate_webhook_url(url: str) -> None:
    if is_exact_development_callback(url):
        return

    parsed = urlparse(url)
    if parsed.scheme not in ("https", "http"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL must use https:// (or http:// for local testing).",
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL has no valid hostname.",
        )

    try:
        resolved = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not resolve hostname: {hostname}",
        )

    for _, _, _, _, sockaddr in resolved:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL must not point to a private or internal address.",
            )
