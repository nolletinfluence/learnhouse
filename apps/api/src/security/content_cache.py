def content_cache_headers(file_path: str) -> dict[str, str]:
    parts = file_path.split("/")
    protected = len(parts) >= 4 and parts[0] == "orgs" and (
        parts[2] == "media"
        or len(parts) >= 6
        and (parts[2], parts[4]) in {
            ("courses", "activities"), ("podcasts", "episodes")
        }
    )
    if protected:
        return {"Cache-Control": "private, no-store", "Vary": "Authorization, Cookie"}
    return {"Cache-Control": "public, max-age=86400"}
