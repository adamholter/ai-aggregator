# Identified Bugs and Issues

## Critical Issues
1.  **Security Risk**: `app.secret_key` defaults to `'change-me-in-production'` (server.py:38). This must be overridden in production to prevent session hijacking.
2.  **Rate Limiting Scalability**: The rate limiting implementation (`_rate_limit_records`, server.py:98) uses in-memory dictionaries. This will not work correctly across multiple worker processes (e.g., with Gunicorn), as each worker will have its own limit counter.
3.  **Concurrency**: The `_TESTING_CATALOG_LOG_LOCK` and `_USAGE_LOG_LOCK` (server.py:124, 131) are thread locks, which only work within a single process. File access race conditions can still occur with multiple workers.

## Potential Issues
1.  **Hardcoded Configuration**:
    - `MONITOR_SHEET_ID` and `MONITOR_SHEET_GID` (server.py:88-90) have hardcoded defaults.
    - `BLOG_POSTS_API_URL` (server.py:67) defaults to a specific user's blog.
2.  **Error Handling**:
    - Many `try...except` blocks catch generic `Exception` and print to stdout (e.g., server.py:589, 606). This can mask specific errors and makes debugging harder. Structured logging should be used.
    - `fetch_category_payload` (server.py:1834) uses `app.test_client()` to make internal requests. This is an unusual pattern that adds overhead and complexity.
3.  **Data Persistence**:
    - User data (`users.json`) and pins (`pins.json`) are stored in JSON files. This is not ACID-compliant and can lead to data corruption or loss under high concurrency.
4.  **Frontend**:
    - `script.js` is very large (6800+ lines) and contains mixed concerns (state management, UI rendering, API calls). This makes it hard to maintain and test.
    - `innerHTML` is used in `showToast` (script.js:450), which could be a potential XSS vector if `message` isn't strictly sanitized (though `escapeHtml` is used).

## Minor Issues
1.  **Code Duplication**:
    - `compress_llm_entry`, `compress_openrouter_entry`, etc., share similar logic for string formatting.
    - `load_category_payload` and `fetch_category_payload` have overlapping responsibilities.
