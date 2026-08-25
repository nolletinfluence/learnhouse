from src.services.media.urls import build_course_thumbnail_url


def test_course_thumbnail_url_uses_public_media_origin_and_encodes_segments():
    assert build_course_thumbnail_url(
        "https://media.bestdevs.kg/",
        "org/1",
        "course/1",
        "cover image.jpg",
    ) == (
        "https://media.bestdevs.kg/content/orgs/org%2F1/courses/"
        "course%2F1/thumbnails/cover%20image.jpg"
    )


def test_course_thumbnail_url_is_none_without_a_file():
    assert (
        build_course_thumbnail_url(
            "https://media.bestdevs.kg",
            "org_1",
            "course_1",
            "",
        )
        is None
    )
