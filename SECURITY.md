# Security policy

## Intended deployment

Linear Dependency Graph is a local, single-user tool. It binds to
`127.0.0.1` by default and reads a personal Linear API key from `.env`.

Do not expose the server to an untrusted network without adding authentication,
request forgery protection, a production secret store, and Linear OAuth.

## Credential handling

- Keep `.env` permissioned to the current user (`chmod 600 .env`).
- Never place an API key in browser code, a URL, screenshots, logs, commits, or
  issue reports.
- Rotate the key immediately if it is accidentally exposed.
- Use the narrowest Linear permissions suitable for read-only project access.

## Reporting a vulnerability

Please report vulnerabilities privately to the repository maintainer rather
than opening a public issue containing exploit details or credentials.
