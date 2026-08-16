# Bruno AI Context - Common Use Cases and Common Mistakes

## Common Use Cases

- API Development: Test endpoints during development
- Integration Testing: Validate API contracts between services
- CI/CD Automation: Run collections in pipelines using Bruno CLI
- Team Collaboration: Share API collections via Git
- API Documentation: Provide working examples for API consumers
- Migration: Convert from Postman/Insomnia to Git-based workflow
- Load Testing: Test API performance and response times
- Monitoring: Health checks and API availability testing

## Common Mistakes

- Missing `opencollection.yml` - every collection MUST have one
- Using `meta:` instead of `info:`
- Putting `http:` blocks in `opencollection.yml`
- Using `test` instead of `tests` for script type
- Putting tests at root level instead of under `runtime.scripts`
- Using `.yaml` extension instead of `.yml`

When helping with Bruno-related tasks, prioritize the YAML file format (OpenCollection spec), proper directory structure, and Git-collaborative workflow.
