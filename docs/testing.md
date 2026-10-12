## Testing

If automated testing is required. Add the following scripts to package.json file. If scripts are not found, it will be indicated, and testing continues

- test:schemas
  TODO
- test:unit
  node --test-reporter=spec --experimental-test-coverage --experimental-test-module-mocks --test --test-only ./<path-to-test>/__tests__/unit/*.test.ts
- test:integration
  node --test-reporter=spec --test --test-only --test-isolation=process --test-concurrency=1 ./<path-to-test>/__tests__/integration/*.test.ts
- test:e2e
  TODO
- test
    - npm run test:unit && npm run test:integration && npm run test:schemas
  
path-to-test = src/**
