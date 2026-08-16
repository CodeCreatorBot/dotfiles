# Bruno AI Context - JavaScript API, Scripting, Tests, and Cookies

## JavaScript API Reference

### Request Object (req)

Available in pre-request scripts and tests to access and modify the current request.

URL Methods:

- `req.getUrl()` - Get the current request URL
- `req.setUrl(url)` - Set the request URL

HTTP Method:

- `req.getMethod()` - Get HTTP method
- `req.setMethod(method)` - Set HTTP method

Header Methods:

- `req.getHeader(name)` - Get a specific header value
- `req.getHeaders()` - Get all headers as an object
- `req.setHeader(name, value)` - Set a single header
- `req.setHeaders(headers)` - Set multiple headers at once

Body Methods:

- `req.getBody()` - Get request body
- `req.setBody(body)` - Set request body

Configuration:

- `req.setTimeout(milliseconds)`
- `req.setMaxRedirects(count)`
- `req.getTimeout()`

Request Information:

- `req.getName()`
- `req.getAuthMode()`
- `req.getTags()`

### Response Object (res)

Available in post-response scripts and tests to access response data.

Properties:

- `res.status`
- `res.statusText`
- `res.headers`
- `res.body`
- `res.responseTime`

Methods:

- `res.getStatus()`
- `res.getHeader(name)`
- `res.getHeaders()`
- `res.getBody()`

### Bruno Runtime Object (bru)

Core scripting API for variable management and flow control.

Runtime Variables:

- `bru.setVar(key, value)`
- `bru.getVar(key)`

Environment Variables:

- `bru.setEnvVar(key, value)`
- `bru.getEnvVar(key)`

Process Environment:

- `bru.getProcessEnv(key)`

Request Chaining:

- `bru.setNextRequest(requestName)`
- `bru.sleep(milliseconds)`

Utilities:

- `bru.cwd()`
- `bru.interpolate(string)`
- `bru.disableParsingResponseJson()`

Test Results:

- `bru.getTestResults()`

## Typical Script Placement

```yaml
runtime:
  scripts:
    - type: before-request
      code: |-
        const email = bru.interpolate('{{$randomEmail}}');
        bru.setVar('userEmail', email);
    - type: after-response
      code: |-
        if (res.status === 201) {
          bru.setVar('newUserId', res.body.id);
        }
    - type: tests
      code: |-
        test('status is 201', function() {
          expect(res.status).to.equal(201);
        });
```

## Testing Framework

Bruno uses Chai.js for assertions under `runtime.scripts` with `type: tests`:

```javascript
test('Status code is 200', function() {
  expect(res.status).to.equal(200);
});

test('Response has correct structure', function() {
  expect(res.body).to.be.an('object');
  expect(res.body).to.have.property('data');
  expect(res.body.data).to.be.an('array');
});

test('Response time is acceptable', function() {
  expect(res.responseTime).to.be.below(2000);
});

test('Headers are correct', function() {
  expect(res.headers['content-type']).to.include('application/json');
});
```

## Runner Control

```javascript
bru.runner.skipRequest();
```

```javascript
const tags = req.getTags();
if (!tags.includes('integration-test')) {
  bru.runner.skipRequest();
}
```

## Cookie Management

```javascript
const jar = bru.cookies.jar();

jar.setCookie('https://api.example.com', 'sessionId', 'abc123');

jar.setCookie('https://api.example.com', {
  key: 'authToken',
  value: 'xyz789',
  domain: 'example.com',
  path: '/api',
  secure: true,
  httpOnly: true,
  maxAge: 3600
});

const cookie = await jar.getCookie('https://api.example.com', 'sessionId');
const allCookies = await jar.getCookies('https://api.example.com');

jar.deleteCookie('https://api.example.com', 'sessionId');
jar.deleteCookies('https://api.example.com');
jar.clear();
```
