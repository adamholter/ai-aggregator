from unittest.mock import patch

import pytest

from server import fetch_testing_catalog_feed


class DummyResponse:
    def __init__(self, text):
        self.text = text
        self.status_code = 200

    def raise_for_status(self):
        pass


def generate_listing_page(start_index, count, next_url=None):
    articles = []
    for i in range(start_index, start_index + count):
        date = f"2025-01-{(i % 28) + 1:02d}"
        articles.append(
            f"""
            <article class="story">
                <figure class="story-image">
                    <a href="/tag/ai/">AI News</a>
                    <img src="/images/{i}.jpg" />
                </figure>
                <div class="hh-date">
                    <time datetime="{date}T12:00:00Z">{date}</time>
                </div>
                <h2 class="story-title">
                    <a href="/story/{i}/">Story {i}</a>
                </h2>
                <p class="story-excerpt">Summary {i}</p>
            </article>
            """
        )
    head_next = f'<link rel="next" href="{next_url}"/>' if next_url else ''
    older = f'<a class="older-posts" href="{next_url}">Older</a>' if next_url else ''
    return f"<!DOCTYPE html><html><head>{head_next}</head><body>{''.join(articles)}{older}</body></html>"


@pytest.mark.parametrize("pages,total", [(3, 150)])
def test_testing_catalog_splits_pages(pages, total):
    pages_html = [
        generate_listing_page(0, 50, next_url="https://www.testingcatalog.com/page/2/"),
        generate_listing_page(50, 50, next_url="https://www.testingcatalog.com/page/3/"),
        generate_listing_page(100, 50, next_url=None)
    ]

    with patch('server.requests.Session.get') as mock_get:
        mock_get.side_effect = [DummyResponse(html) for html in pages_html]
        payload = fetch_testing_catalog_feed(force_refresh=True, max_pages=pages)

    count = len(payload.get('items', []))
    assert count >= total, f"Expected {total} items, got {count}"
