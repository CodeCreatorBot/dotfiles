# Bruno AI Context - Environments, Variables, Auth, Request Types

## Environment Files

Environment files define variables and secrets:

```yaml
variables:
  - name: baseUrl
    value: https://api.example.com
  - name: apiVersion
    value: v1
  - name: apiKey
    value: ""
    secret: true
  - name: clientSecret
    value: ""
    secret: true
```

## Variable System

- Environment Variables: `{{variableName}}` defined in environment files
- Runtime Variables: Set/get with `bru.setVar()` and `bru.getVar()`
- Secret Variables: Use `secret: true` in environment variable entries
- Collection Variables: Shared across all requests in collection
- Folder Variables: Shared within a folder
- Request Variables: Specific to individual requests
- Process Variables: System environment variables via `bru.getProcessEnv()`

## Dynamic Variables

Bruno supports dynamic variables that generate random data. Use them anywhere in your requests:

Identity:

- `{{$guid}}`
- `{{$randomEmail}}`
- `{{$randomFirstName}}`
- `{{$randomLastName}}`
- `{{$randomFullName}}`
- `{{$randomPhoneNumber}}`

Location:

- `{{$randomCity}}`
- `{{$randomCountry}}`
- `{{$randomStreetAddress}}`

Numbers and Text:

- `{{$randomInt}}`
- `{{$randomUUID}}`
- `{{$timestamp}}`
- `{{$isoTimestamp}}`

Job and Company:

- `{{$randomJobTitle}}`
- `{{$randomCompanyName}}`

Example usage:

```javascript
const email = bru.interpolate('{{$randomEmail}}');
bru.setVar('userEmail', email);
```

## Authentication Types

- Bearer Token: `auth: { type: bearer, token: "{{token}}" }`
- Basic Auth: `auth: { type: basic, username: "{{user}}", password: "{{pass}}" }`
- API Key: `auth: { type: apikey, key: x-api-key, value: "{{apiKey}}", placement: header }`
- OAuth2: Authorization Code, Client Credentials, Password Credentials
- AWS Signature
- Digest Auth
- NTLM

## Request Types Supported

- HTTP/REST
- GraphQL
- gRPC
- WebSocket
- SOAP
