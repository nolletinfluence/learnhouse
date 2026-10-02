"""Russian and English mail localization contracts."""

import string
from unittest.mock import patch

import pytest

from src.db.organization_config import GeneralCustomization
from src.services.email.translations import (
    DEFAULT_LANGUAGE,
    EMAIL_TRANSLATIONS,
    SUPPORTED_LANGUAGES,
    SUPPORTED_UI_LANGUAGES,
    normalize_language,
    t,
)


def _placeholders(text):
    return {name for _, name, _, _ in string.Formatter().parse(text) if name}


@pytest.mark.parametrize("value,expected", [("ru", "ru"), ("en", "en"), ("RU-ru", "ru"), (" EN_us ", "en"), (None, "ru"), ("", "ru"), ("fr", "ru"), ("ar", "ru"), ("sk", "ru")])
def test_normalizes_only_supported_languages(value, expected):
    assert normalize_language(value) == expected


def test_default_and_available_languages_match_the_school_ui():
    assert DEFAULT_LANGUAGE == "ru"
    assert GeneralCustomization().default_language == "ru"
    assert set(SUPPORTED_LANGUAGES) == set(SUPPORTED_UI_LANGUAGES) == {"ru", "en"}


def test_unsupported_language_uses_russian():
    assert t("fr", "invitation.heading") == EMAIL_TRANSLATIONS["ru"]["invitation.heading"]
    assert t(None, "invitation.heading") == t("ru", "invitation.heading")


def test_preserves_explicit_english():
    assert t("en-US", "invitation.heading") == "You've been invited!"


def test_missing_russian_key_falls_back_to_english():
    with patch.dict(EMAIL_TRANSLATIONS["ru"], {"invitation.heading": ""}):
        assert t("ru", "invitation.heading") == EMAIL_TRANSLATIONS["en"]["invitation.heading"]


def test_unknown_key_and_missing_arguments_are_safe():
    assert t("ru", "unknown.key") == "unknown.key"
    assert "{org_name}" in t("ru", "invitation.subject")
    assert "Acme" in t("ru", "invitation.subject", org_name="Acme")


@pytest.mark.parametrize("language", SUPPORTED_LANGUAGES)
def test_supported_bundles_have_all_keys_and_preserve_placeholders(language):
    source = EMAIL_TRANSLATIONS["en"]
    assert set(EMAIL_TRANSLATIONS[language]) == set(source)
    for key, english in source.items():
        assert _placeholders(EMAIL_TRANSLATIONS[language][key]) == _placeholders(english), key
        values = {name: "Sample" for name in _placeholders(english)}
        rendered = t(language, key, **values)
        assert "{" not in rendered, key
        assert "learnhouse" not in rendered.lower(), key
    assert t(language, "academy_link_text") == "BestDevs LMS"
