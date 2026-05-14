Place the app.html file from SkyLight100/data/index.html (or the Codex-generated copy)
here as app.html.

The cloud server reads this file and patches it at request time to:
  - Route all API calls through /api/user/boards/[boardId]/proxy/...
  - Replace the PIN authentication with cloud session auth
  - Inject a subscription status banner if subscription is inactive

To set up:
  cp "C:\Users\ME\Documents\Codex\2026-05-13\files-mentioned-by-the-user-skylight\public\app.html" app.html
