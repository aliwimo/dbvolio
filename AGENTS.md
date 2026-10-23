# Git Commit Guidelines

## Objective

Create Git commits that are clear, meaningful, atomic, and easy to understand during code reviews, debugging, and future maintenance.

Every commit must explain **what changed and why it changed**. Commit messages must describe the actual implementation, not merely the task or files modified.

## 1. Commit Message Format

Use the Conventional Commits specification:

`<type>(<scope>): <description>`

Format:
- `type`: The category of change.
- `scope`: The affected module, component, or domain. Optional when it adds no value.
- `description`: A concise summary written in the imperative mood.

Examples:

- `feat(auth): add refresh token rotation`
- `fix(appointments): prevent double booking`
- `refactor(users): extract profile validation`
- `perf(reports): optimize aggregation queries`
- `test(payments): cover failed transactions`
- `docs(api): document pagination parameters`
- `build(docker): update PHP runtime image`
- `ci(github): cache dependencies during builds`
- `chore(deps): update framework dependencies`
- `style(dashboard): align form controls consistently`

## 2. Commit Message Length Limits

Follow these limits for every commit message:

- **Subject target:** 50 characters or fewer.
- **Subject maximum:** 72 characters. Never exceed this limit.
- **Body line length:** Wrap lines at 72 characters.
- **Body length:** Usually 2–4 lines when additional context is necessary.
- **Subject and body:** Separate them with exactly one blank line.
- **Footer:** Keep issue references and breaking-change notes concise.

The subject includes the type, scope, punctuation, and description.

Prioritize clarity while keeping messages concise. If a meaningful description requires more than 50 characters, exceeding the target is acceptable, but never exceed 72 characters.

Do not add a body when the subject already explains the change sufficiently.

Example:

```text
fix(auth): reject expired reset tokens
```

Example with additional context:

```text
fix(appointments): prevent overlapping bookings

Validate time conflicts before confirming a reservation.
This prevents concurrent requests from creating duplicate slots.
```

Avoid unnecessarily long subjects:

```text
fix(appointments): improve the entire booking validation system
and prevent all possible conflicts
```

Do not split a subject across multiple lines.

## 3. Allowed Commit Types

Choose the most appropriate type:

| Type | Use when |
|---|---|
| `feat` | Adding new functionality |
| `fix` | Correcting a bug or incorrect behavior |
| `refactor` | Improving internal structure without changing intended behavior |
| `perf` | Improving performance |
| `test` | Adding or modifying tests |
| `docs` | Changing documentation |
| `style` | Formatting or stylistic changes without behavioral impact |
| `build` | Changing build tools, dependencies, or build configuration |
| `ci` | Changing CI/CD pipelines and automation |
| `chore` | Maintenance that does not fit another category |
| `revert` | Reverting a previous commit |

Do not use `feat` for bug fixes, `fix` for refactoring, or `chore` as a generic category for every change.

## 4. Writing Good Descriptions

Every commit description must:

- Start with an imperative verb, such as `add`, `fix`, `prevent`, `remove`, `extract`, `update`, or `optimize`.
- Describe the actual change precisely.
- Explain the affected behavior or purpose.
- Be concise without sacrificing important context.
- Use English consistently unless the repository specifies another language.
- Avoid unnecessary capitalization and trailing periods.
- Remain understandable without opening the diff.

Prefer specific descriptions over generic summaries.

Bad:
- `fix bug`
- `update code`
- `changes`
- `implement feature`
- `fix appointments`
- `update API`

Good:
- `fix(appointments): reject overlapping reservations`
- `feat(auth): allow password reset by email`
- `refactor(orders): extract pricing rules into service`
- `fix(api): return 404 for missing resources`

Choose descriptions that communicate the actual change rather than simply naming the affected files.

## 5. Use a Commit Body When Necessary

Use a commit body when the subject alone cannot adequately explain the change.

The body should explain:
- Why the change was necessary.
- What important implementation decisions were made.
- Any non-obvious behavior, constraints, or side effects.
- Relevant trade-offs or compatibility considerations.

Keep the body concise, normally 2–4 lines, with each line no longer than 72 characters.

Example:

```text
fix(appointments): prevent overlapping reservations

Validate the requested time range against existing active
appointments before confirming a booking.

Concurrent requests could previously create overlapping slots.
```

Do not add a body just to repeat the subject. Keep straightforward commits concise.

## 6. Atomic Commits

Each commit must represent one logical change.

- Group related modifications that contribute to the same outcome.
- Separate unrelated features, bug fixes, refactoring, formatting, and dependency updates.
- Keep tests with the implementation they verify when practical.
- Do not create a separate commit for every modified file.
- Do not combine unrelated changes merely because they were implemented together.
- Prefer small, reviewable commits that can be understood and reverted independently.

If a task contains several independent changes, create multiple commits with appropriate messages.

## 7. Inspect Changes Before Committing

Before creating a commit:

1. Run `git status` to inspect the working tree.
2. Inspect relevant changes using `git diff` and, when necessary, `git diff --cached`.
3. Understand the purpose of each change.
4. Identify unrelated modifications and preserve them.
5. Check for accidentally included secrets, credentials, generated files, temporary files, or local configuration.
6. Run relevant tests, linters, or build checks when practical.
7. Stage only the files belonging to the intended logical change.
8. Review the staged diff before committing.
9. Write a message that accurately represents the staged changes.

Never assume all modified files belong to the current task.

## 8. Working With Existing Changes

When the working tree already contains modifications:

- Do not overwrite, discard, reset, or revert changes you did not create.
- Do not stage or commit another contributor's work without understanding its purpose and obtaining appropriate authorization.
- Do not use `git add .` or `git add -A` blindly.
- Stage specific files or carefully selected hunks when necessary.
- If changes from different tasks are mixed together, separate them into logical commits when safe.
- If the changes cannot be safely separated, ask for clarification rather than risking data loss.

Never use destructive Git commands to make the working tree clean.

## 9. Accuracy and Verification

Commit messages must be based on inspected changes, not assumptions.

- Never claim that tests pass unless they were actually executed successfully.
- Never claim that a feature is complete if the implementation is partial.
- Never describe behavior that the code does not implement.
- Do not include speculative benefits or unsupported performance claims.
- Do not hide breaking changes behind vague descriptions.
- Use `!` after the type or scope when appropriate to indicate a breaking change, and explain the impact in the body.

Example:

```text
feat(api)!: replace numeric IDs with UUIDs

BREAKING CHANGE: API consumers must use UUIDs when requesting
user resources. Numeric identifiers are no longer supported.
```

Keep the breaking-change explanation concise and wrap lines at 72 characters.

## 10. Issue and Task References

When a relevant issue, ticket, or task identifier is explicitly available, include it when useful.

Examples:

- `fix(auth): reject expired reset tokens (PROJ-142)`
- `feat(reports): export monthly summaries (PROJ-208)`

Do not invent issue numbers, task references, or links.

Keep the subject within the 72-character maximum, including any reference. If a reference makes the subject too long, move it to the footer.

Example:

```text
fix(auth): reject expired reset tokens

Refs: PROJ-142
```

Follow repository-specific conventions if they differ from these guidelines.

## 11. Git Safety Rules

- Never amend, rewrite, squash, or rebase published commits unless explicitly requested.
- Never force-push without explicit authorization.
- Never commit secrets, API keys, private credentials, or production environment files.
- Never bypass hooks or verification checks simply to make a commit succeed.
- Never create empty commits unless explicitly required.
- Do not push commits unless requested or clearly authorized by the current task.
- Do not change Git configuration globally to enforce a local preference.

## 12. Final Commit Review

Before finishing, verify:

- [ ] The commit contains only intended changes.
- [ ] The commit type matches the change.
- [ ] The scope is meaningful and accurate.
- [ ] The subject is specific and concise.
- [ ] The subject targets 50 characters and never exceeds 72.
- [ ] Body lines do not exceed 72 characters.
- [ ] The body explains the purpose when necessary.
- [ ] The commit is atomic.
- [ ] No unrelated or sensitive files are included.
- [ ] Relevant checks and their actual results are known.

After committing, report the commit hash, commit message, and verification results. Mention any checks that were not run or failed.

## 13. Agent Decision Rule

When deciding how to commit a change, prioritize these principles in order:

1. Preserve existing work and avoid data loss.
2. Ensure the commit accurately represents the implementation.
3. Separate unrelated changes.
4. Follow repository-specific conventions.
5. Apply Conventional Commits consistently.
6. Keep the subject around 50 characters, with a hard maximum of 72.
7. Keep body lines within 72 characters.
8. Make the purpose clear without unnecessary detail.

If the intended change or ownership of existing modifications is unclear, ask before committing.

The goal is not merely to produce valid Git commits. The goal is to maintain a history that explains how the software evolved and why each meaningful change was made.