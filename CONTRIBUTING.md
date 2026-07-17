# Contributing to Web Security Audit

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check the [existing issues](https://github.com/SkaFull/web-security-audit/issues) to avoid duplicates
2. Use the **Bug Report** template when creating a new issue
3. Include detailed steps to reproduce, expected vs actual behavior, and environment info

### Suggesting Features

1. Check the [existing issues](https://github.com/SkaFull/web-security-audit/issues) for similar requests
2. Use the **Feature Request** template
3. Describe the use case and why it's valuable to the project

### Security Vulnerabilities

**Do not report security vulnerabilities in public issues.** See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the coding standards below
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Ensure linting passes: `npm run lint`
7. Commit with clear messages
8. Push and create a Pull Request

## Development Setup

```bash
git clone https://github.com/SkaFull/web-security-audit.git
cd web-security-audit
npm install
npm test
```

## Coding Standards

### JavaScript

- Use ES6+ syntax
- Functions should have JSDoc comments for public APIs
- Use `const` and `let` (no `var`)
- Prefer async/await over raw Promises
- Error handling: always catch and handle errors gracefully

### Project Structure

```
scripts/
  lib/          # Core library modules (reusable)
  methods/      # Audit method implementations
  *.js          # Entry-point scripts (CLI tools)
steps/          # Step definition files (Markdown)
templates/      # Output templates
bin/            # CLI entry point
docs/           # Documentation
```

### Adding a New Audit Step

1. Create `steps/step-XX.md` following the existing format
2. Add the step to `MAIN.md` execution flow
3. Add the step to `SKILL.md` step index
4. Implement the corresponding script if needed
5. Add gate verification PowerShell script

### Adding a New Test Method

1. Create `scripts/methods/your-method.js`
2. Export a class with `constructor(domain, evidenceDir)` pattern
3. Implement `getResults()` method returning `{ tests, vulnerabilities }`
4. Add JSDoc comments for all public methods
5. Add unit tests in `__tests__/`

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

feat(steps): add step-10 trading platform audit
fix(http-client): handle proxy timeout correctly
docs(readme): add installation instructions
test(subdomain): add unit tests for enumerator
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`, `perf`

## Testing

- Write unit tests for all new code in `lib/` and `methods/`
- Run `npm test` before submitting PRs
- Target coverage: >80% for new code

## License

By contributing, you agree that your contributions will be licensed under the MIT License.