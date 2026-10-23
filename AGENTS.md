# Git Commit Guidelines

## 1. Commit Message Format

Use Conventional Commits:

`<type>(<scope>): <description>`

Common types:
- `feat`: New functionality
- `fix`: Bug fixes
- `refactor`: Code restructuring without behavior changes
- `perf`: Performance improvements
- `test`: Tests
- `docs`: Documentation
- `style`: Formatting without behavioral changes
- `build`: Build system or dependencies
- `ci`: CI/CD configuration
- `chore`: Other maintenance
- `revert`: Reverting a commit

The scope is optional when it adds no meaningful context.

## 2. Length and Style

- **Subject:** Aim for 50 characters; maximum 72 characters.
- **Body:** Optional; explain why the change was necessary.
- **Body lines:** Maximum 72 characters per line.
- Separate the subject and body with a blank line.
- Use English unless the repository specifies another language.
- Start descriptions with an imperative verb.
- Be specific, concise, and factual.
- Do not end the subject with a period.
- Never sacrifice clarity just to meet the 50-character target.

Good examples:

```text
feat(auth): add refresh token rotation
fix(booking): prevent overlapping reservations
refactor(users): extract profile validation
```

With a body:

```text
fix(booking): prevent overlapping reservations

Validate time conflicts before confirming a booking.
This prevents concurrent requests from creating duplicate slots.
```

Avoid vague messages such as `fix bug`, `update code`, or `various changes`.

## 3. Atomic Commits

- Each commit must represent one logical change.
- Separate unrelated features, fixes, refactoring, and dependency updates.
- Include relevant tests with their implementation when practical.
- Do not create a separate commit for every modified file.
- Base every message on the actual changes, not assumptions.

## 4. Before Committing

1. Inspect `git status` and the relevant diffs.
2. Understand the changes and identify unrelated modifications.
3. Run relevant tests or checks when practical.
4. Stage only the intended files or hunks.
5. Review the staged diff.
6. Verify the commit message follows these guidelines.

Never claim tests passed unless they were actually executed successfully.

## 5. Git Safety

- Preserve existing work; never discard changes you did not create.
- Never stage all changes blindly with `git add .` or `git add -A`.
- Never commit secrets, credentials, or production environment files.
- Never rewrite published history or force-push without explicit authorization.
- Do not bypass verification hooks or push changes unless authorized.
- Ask for clarification when changes cannot be safely separated.

## 6. Breaking Changes and References

Mark breaking changes with `!` and explain the impact in the body.

```text
feat(api)!: replace numeric IDs with UUIDs

BREAKING CHANGE: API consumers must now use UUIDs.
```

Include issue references only when known and relevant. Move references to the footer if they make the subject exceed 72 characters. Never invent issue IDs.

## 7. Completion

After committing, report:
- Commit hash and message.
- Tests and checks actually performed.
- Any failed or skipped checks.

**Priority:** Preserve work, commit logically related changes together, and write concise, descriptive messages that explain what changed and why.