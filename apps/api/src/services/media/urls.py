from urllib.parse import quote


def build_course_thumbnail_url(
    media_base_url: str,
    org_uuid: str,
    course_uuid: str,
    filename: str | None,
) -> str | None:
    if not filename or not media_base_url.strip():
        return None
    base = media_base_url.rstrip("/")
    return (
        f"{base}/content/orgs/{quote(org_uuid, safe='')}/courses/"
        f"{quote(course_uuid, safe='')}/thumbnails/{quote(filename, safe='')}"
    )
