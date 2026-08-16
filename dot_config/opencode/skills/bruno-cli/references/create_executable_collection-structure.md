# Bruno API Client - AI Assistant Context (YAML / OpenCollection Format)

## What is Bruno?

Bruno is an innovative API client that stores API collections directly in your filesystem.
As of Bruno v3.1, the default format is YAML based on the OpenCollection specification.
It is designed as a Git-first, offline-only alternative to Postman, perfect for teams who want to version control their API tests alongside their code.

Note: For legacy Bru format context, see `bruno-ai-context-bru.md`.

## Core Philosophy

- Offline-First: No cloud sync, everything stored locally
- Git-Collaborative: Collections designed for version control
- YAML Format: Human-readable `.yml` files (OpenCollection spec)
- File-Based: No databases, everything in the filesystem
- Developer-Friendly: Works with your existing workflow

## Key Features

- Multiple Protocol Support: HTTP/REST, GraphQL, gRPC, WebSocket, SOAP
- Powerful Scripting: JavaScript pre-request and post-response scripts
- Comprehensive Testing: Built-in test framework with Chai.js assertions
- Environment Management: Multiple environments with variable support
- Secret Management: Secure handling of API keys and tokens
- CLI Support: Run collections in CI/CD pipelines
- Request Chaining: Link requests together for complex workflows
- YAML Format: Human-readable, Git-friendly YAML files

## File Structure

A typical Bruno collection has this structure:

```text
my-api-collection/
├── opencollection.yml      # Collection root file (REQUIRED)
├── collection.yml          # Collection-level settings (optional)
├── environments/
│   ├── dev.yml             # Development environment
│   ├── staging.yml         # Staging environment
│   └── prod.yml            # Production environment
├── users/
│   ├── folder.yml          # Folder-level settings
│   ├── Get User.yml        # Individual request
│   ├── Create User.yml     # Individual request
│   └── Update User.yml     # Individual request
└── auth/
    ├── Login.yml
    └── Refresh Token.yml
```

## opencollection.yml Format

Always include the `opencollection` version header as the first line.
Use the latest version from the OpenCollection spec (currently `1.0.0`).

Minimal `opencollection.yml`:

```yaml
opencollection: 1.0.0

info:
  name: Your Collection Name
```

Full `opencollection.yml` with optional collection-level fields:

```yaml
opencollection: 1.0.0

info:
  name: Bruno Example
config:
  proxy:
    inherit: true
request:
  variables:
    - name: tokenVar
      value: tokenCollection
      disabled: true
  scripts:
    - type: before-request
      code: // console.log('Collection Level Script Logic')
docs:
  content: |-
    ### Markdown Docs
  type: text/markdown
```

IMPORTANT: `opencollection.yml` supports collection-level `info:`, `config:`, `request:` (variables/scripts), and `docs:`.
DO NOT add request-specific keys like `http:`. Those belong in individual request `.yml` files.

## YAML Request File Format

```yaml
info:
  name: Create User
  type: http
  seq: 1

http:
  method: POST
  url: "{{baseUrl}}/api/users"
  headers:
    - name: content-type
      value: application/json
    - name: accept
      value: application/json
  body:
    type: json
    data: |-
      {
        "name": "{{userName}}",
        "email": "{{userEmail}}",
        "role": "user"
      }
  auth:
    type: bearer
    token: "{{authToken}}"

runtime:
  scripts:
    - type: before-request
      code: |-
        const timestamp = Date.now();
        bru.setVar("requestId", `req_${timestamp}`);

        if (!bru.getVar("userName")) {
          throw new Error("userName is required");
        }
    - type: after-response
      code: |-
        if (res.status === 201) {
          bru.setVar("newUserId", res.body.id);
          bru.setVar("userCreated", true);
        }
    - type: tests
      code: |-
        test("User created successfully", function() {
          expect(res.status).to.equal(201);
          expect(res.body).to.have.property("id");
          expect(res.body.name).to.equal(bru.getVar("userName"));
        });

        test("Response time is acceptable", function() {
          expect(res.responseTime).to.be.below(2000);
        });

settings:
  encodeUrl: true
```
