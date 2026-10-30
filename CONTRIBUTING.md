# Contributing to NexSync

Thank you for your interest in contributing to NexSync! This document outlines the guidelines and processes for contributing to this project.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- [Bun](https://bun.sh) (JavaScript/TypeScript runtime)
- Git
- Modern web browser with Chrome recommended for development

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/nexsync.git
   cd nexsync
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start development server**
   ```bash
   bun dev
   ```

This will start both the client (port 3000) and server (port 8080).

## Git Workflow

### Branching Strategy

We use GitHub Flow for this repository:

- **`main`**: Production-ready code
- **`develop`**: Pre-release with pending features (optional)
- **Feature branches**: From `main` for specific features or fixes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Implement features
   - Write tests (if applicable)
   - Follow code quality standards

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

4. **Push to your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a pull request**
   - Fill out the PR template
   - Request reviews from appropriate team members
   - Address any feedback

## Code Quality Standards

### TypeScript

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for TypeScript
- Use strict mode in `tsconfig.json`
- No implicit any types

### Linting

- Run `bun lint` to check code quality
- Run `bun run lint:fix` to automatically fix lint issues

### Formatting

- Use Prettier for code formatting
- Run `bun run format:check` to verify formatting
- Run `bun run format` to apply formatting

### Testing

- **Server tests**: Located in `apps/server/src/__tests__/`
- **Client tests**: Located in `apps/client/src/__tests__/`
- **Run all tests**: `bun test`

## Development Guidelines

### Code Reviews

- Provide constructive feedback
- Focus on code quality, not style
- Ensure tests are comprehensive
- Check for security vulnerabilities

### Performance Considerations

- Optimize real-time audio processing
- Minimize WebSocket message size
- Use efficient data structures
- Profile for bottlenecks

### Documentation

- Keep `README.md` updated
- Add inline comments for complex logic
- Update `CLAUDE.md` for new workflows

## What Makes a Good Pull Request?

### Code Quality

- [ ] Follows existing code patterns
- [ ] Includes comprehensive tests
- [ ] Passes all CI checks
- [ ] No linting errors
- [ ] Formatted correctly

### Documentation

- [ ] Updated README if necessary
- [ ] Added comments for complex code
- [ ] Updated API documentation (if applicable)

### Testing

- [ ] Tests cover new functionality
- [ ] Edge cases are tested
- [ ] Tests don't break existing functionality
- [ ] Coverage is adequate

## Troubleshooting

### Common Issues

**Not able to run tests**

```bash
# Ensure you're in the project root
# Run dependencies first
bun install

# Run specific test suites
bun test  # All tests
bun run test:watch  # Watch mode
```

**Linting errors**

```bash
# Auto-fix lint errors
bun run lint:fix

# Check formatting
bun run format:check
bun run format
```

**Dependency issues**

```bash
# Clear package caches
rm -rf node_modules .turbo .next

# Reinstall
bun install
```

## Maintainer's Guide

### Merging Pull Requests

1. **Review PR thoroughly**
   - Check code quality
   - Ensure tests pass
   - Verify documentation
   - Look for potential issues

2. **Test in development**
   - Run all tests locally
   - Test new features
   - Verify no regressions

3. **Merge**
   - Use squash merge for small PRs
   - Use regular merge for larger PRs
   - Update version if necessary

### Releasing

1. **Create a release branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update version** in `package.json`

3. **Update changelog** if applicable

4. **Merge to main**
   ```bash
   git checkout main
   git merge release/v1.2.0
   ```

5. **Tag and release**
   ```bash
   git tag v1.2.0
   git push origin main --tags
   ```

## Communication

### Channels

- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions
- **Discussions**: For general questions and discussions

### Best Practices

- Be respectful and professional
- Provide context for your changes
- Ask questions when unsure
- Follow the project's coding standards

## Security

### Vulnerabilities

- Report security vulnerabilities immediately
- Use GitHub's security features
- Don't push sensitive information to version control

### Dependencies

- Keep dependencies up to date
- Use `npm audit` or equivalent
- Monitor for security advisories

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgements

Thanks to all contributors who have helped improve NexSync!

## Additional Resources

- [Official Documentation](https://github.com/user-attachments/nexsync)
- [Discord/Slack Communities](if applicable)
- [Official Website](https://beatsync.gg)

---

_Last updated: October 29, 2026_

Feel free to reach out if you have any questions about contributing! 🚀