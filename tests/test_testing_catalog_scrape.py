import json
from unittest.mock import patch

import pytest

from datetime import datetime, timezone

from server import fetch_testing_catalog_feed


class DummyResponse:
    def __init__(self, text):
        self.text = text
        self.status_code = 200

    def raise_for_status(self):
        pass


def generate_feed_page(start_index, count, next_url=None):
    items = []
    for i in range(start_index, start_index + count):
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        items.append(
            f"""
            <item>
                <title>Story {i}</title>
                <link>https://testingcatalog.com/story/{i}</link>
                <pubDate>{now.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>
                <description>Sample entry {i}</description>
            </item>
            """
        )
    next_link = f'<link rel="next" href="{next_url}"/>' if next_url else ''
    return '<?xml version="1.0"?><rss><channel>' + ''.join(items) + next_link + '</channel></rss>'


@pytest.mark.parametrize("pages,total", [(3, 150)])
def test_testing_catalog_splits_pages(pages, total):
    feeds = [
        generate_feed_page(0, 50, next_url="https://testingcatalog.com/feed?page=2"),
        generate_feed_page(50, 50, next_url="https://testingcatalog.com/feed?page=3"),
        generate_feed_page(100, 50, next_url=None)
    ]

    with patch('server.requests.Session.get') as mock_get:
        mock_get.side_effect = [DummyResponse(feed) for feed in feeds]
        payload = fetch_testing_catalog_feed(force_refresh=True, max_pages=pages)

    count = len(payload.get('items', []))
    assert count >= total, f"Expected {total} items, got {count}"
