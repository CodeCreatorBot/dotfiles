# Bruno AI Context - Best Practices and Example Workflows

## Best Practices When Working with Bruno

1. Use YAML format - Use `.yml` files for all API definitions (OpenCollection spec)
2. Always include opencollection.yml - Every collection MUST have one with `opencollection: 1.0.0`
3. Use environment variables - `{{variableName}}` for values that change across environments
4. Write comprehensive tests - Test status codes, response structure, and data validation
5. Organize logically - Use folders and meaningful names for easy navigation
6. Include error handling - Validate data in pre-request scripts
7. Document clearly - Use descriptive names and add comments in scripts
8. Keep secrets secure - Use `secret: true` in environment files for API keys and tokens
9. Consider Git workflow - Structure collections for easy version control
10. Test across environments - Use different environment files for dev/staging/prod
11. Chain requests - Use `bru.setNextRequest()` for complex workflows
12. Leverage dynamic variables - Use `{{$randomEmail}}` etc. for test data generation

## Example Workflows

### Request Chaining

```javascript
if (res.status === 200) {
  bru.setVar('authToken', res.body.token);
  bru.setNextRequest('Get User Profile');
}
```

### Conditional Testing

```javascript
const env = bru.getEnvVar('environment');
if (env === 'production') {
  bru.runner.skipRequest();
}
```

### Data-Driven Testing

```javascript
const testUser = {
  email: bru.interpolate('{{$randomEmail}}'),
  name: bru.interpolate('{{$randomFullName}}'),
  phone: bru.interpolate('{{$randomPhoneNumber}}')
};
req.setBody(JSON.stringify(testUser));

test('User created successfully', function() {
  expect(res.status).to.equal(201);
  bru.setVar('userId', res.body.id);
});
```

## CLI Run Patterns

```bash
bru run <collection_path> --tests-only --bail
bru run <collection_path> --env <env>
bru run <collection_path> --global-env <global_env>
bru run <collection_path> --env <env> --global-env <global_env>
bru run <collection_path> --env-file <path/to/overrides.env>
bru run <collection_path> --env-var key=value --env-var key2=value2
bru run <collection_path> --csv-file-path <path/to/data.csv>
bru run <collection_path> --json-file-path <path/to/data.json>
bru run <collection_path> --iteration-count <n>
bru run <collection_path> --tests-only --bail --reporter-json <report_dir>/result.json --reporter-junit <report_dir>/result.xml --reporter-skip-body
```
