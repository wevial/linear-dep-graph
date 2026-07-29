# Contributing

Thanks for helping improve Linear Dependency Graph.

## Development setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add a Linear personal API key.
3. Run `npm run dev`.
4. Before submitting a change, run `npm run check`.

## Project conventions

- Keep the application dependency-light and local-first.
- Never commit API keys, `.env`, captured Linear responses, or private issue data.
- Keep Linear API calls read-only unless a separate, explicitly reviewed feature
  requires writes.
- Prefer focused GraphQL queries and server-side caching.
- Add or update tests for data normalization and configuration behavior.
- Preserve keyboard access and readable graph labels.

## Pull requests

Describe:

- The user-facing problem being solved.
- The approach taken.
- The checks you ran.
- Any effect on credentials, network access, or Linear API usage.
