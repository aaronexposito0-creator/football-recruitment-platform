import json
from unittest.mock import Mock

import pytest

from core.pipeline.cache import RepositoryCache, SourceError
from scripts.verify_local_events import verify_bytes


def test_cache_is_offline_reproducible_and_detects_tampering(tmp_path):
    response = Mock(content=b'[{"competition_id":55}]')
    session = Mock()
    session.get.return_value = response
    cache = RepositoryCache(tmp_path, "a" * 40, session=session)
    first = cache.get_json("data/competitions.json")
    offline = RepositoryCache(tmp_path, "a" * 40, offline=True, session=Mock())
    assert offline.get_json("data/competitions.json") == first
    offline.session.get.assert_not_called()
    (cache.root / "data/competitions.json").write_text(json.dumps([{"competition_id": 99}]))
    with pytest.raises(SourceError, match="integrity"):
        offline.get_json("data/competitions.json")


def test_missing_cache_is_actionable(tmp_path):
    with pytest.raises(SourceError, match="Offline cache miss"):
        RepositoryCache(tmp_path, "a" * 40, offline=True).get_json("data/events/1.json")


def test_mutable_revision_and_traversal_rejected(tmp_path):
    with pytest.raises(ValueError, match="immutable"):
        RepositoryCache(tmp_path, "master")
    with pytest.raises(ValueError):
        RepositoryCache(tmp_path, "a" * 40).get_json("../../data.json")


def test_local_audit_rejects_missing_and_truncated_inputs_before_parsing(tmp_path):
    from core.pipeline.cache import sha256

    valid = b'[{"id":"event-1"}]'
    expected = {"events.json": sha256(valid)}
    with pytest.raises(SourceError, match="events.json"):
        verify_bytes(tmp_path, expected)
    (tmp_path / "events.json").write_bytes(valid[:7])
    with pytest.raises(SourceError, match="integrity"):
        verify_bytes(tmp_path, expected)
    (tmp_path / "events.json").write_bytes(valid)
    assert verify_bytes(tmp_path, expected) == 1
