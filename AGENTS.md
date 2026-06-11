# AGENTS.md

## Behavioral Guidelines

These guidelines exist to reduce common LLM coding mistakes.

Tradeoff: prioritize correctness and maintainability over speed. For trivial tasks, use reasonable judgment.

---

## 1. Think Before Coding

Don't assume. Don't hide uncertainty. Surface tradeoffs.

Before implementing:

- State assumptions explicitly.
- If requirements are ambiguous, ask clarifying questions.
- If multiple interpretations exist, present them instead of choosing silently.
- If a simpler solution exists, mention it.
- Push back on unnecessary complexity when appropriate.
- If something is unclear, stop and explain what is unclear.

Never invent requirements that were not provided.

---

## 2. Simplicity First

Write the minimum code necessary to solve the problem.

- No speculative features.
- No premature abstractions.
- No configurability unless requested.
- No future-proofing unless requested.
- No handling of impossible scenarios.
- No unnecessary layers of indirection.

Before finishing, ask:

> Is there a simpler implementation that satisfies the requirement?

If yes, prefer the simpler version.

---

## 3. Surgical Changes

Modify only what is required.

When editing existing code:

- Do not refactor unrelated code.
- Do not reformat unrelated files.
- Do not rename unrelated symbols.
- Do not change comments unrelated to the task.
- Follow existing project conventions.

If your change creates unused code:

- Remove imports made unused by your changes.
- Remove variables made unused by your changes.
- Remove functions made unused by your changes.

Do not remove pre-existing dead code unless explicitly requested.

Every changed line should be traceable to the user's request.

---

## 4. Goal-Driven Execution

Convert requests into verifiable outcomes.

Examples:

- "Fix a bug" → create a reproduction and verify it is fixed.
- "Add validation" → verify invalid inputs fail correctly.
- "Refactor code" → verify behavior remains unchanged.

For non-trivial tasks, create a short execution plan:

1. Analyze
2. Implement
3. Verify

For larger tasks:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Do not stop until success criteria have been verified.

---

## 5. Verify Before Declaring Success

Never assume a change works.

When possible:

- Run tests.
- Run type checking.
- Run linting.
- Build the project.
- Verify affected functionality.

If verification cannot be performed:

- Explicitly state what could not be verified.
- Explain why.
- Describe remaining risks.

Do not claim success without verification.

---

## 6. CodeGraph (Required)

This repository uses CodeGraph.

Before performing code analysis, debugging, refactoring, or feature implementation:

- Use CodeGraph MCP tools as the primary navigation mechanism.
- Use CodeGraph to locate symbols, references, callers, callees, dependencies, and impact scope.
- Use CodeGraph to understand architecture before reading files.
- Determine affected code paths before making changes.

Do NOT start with:

- grep
- ripgrep
- find
- global text search
- reading large portions of the repository

Read source files only after the relevant locations have been identified through CodeGraph.

If CodeGraph is not initialized:

```bash
codegraph init -i
```

Preferred workflow:

1. Analyze repository structure with CodeGraph.
2. Locate relevant symbols and references.
3. Trace dependencies and call chains.
4. Determine impact scope.
5. Read only necessary files.
6. Implement changes.
7. Verify changes.

---

## 7. Decision Making

When multiple solutions are possible:

- Prefer the smallest change.
- Prefer the least risky change.
- Prefer the most maintainable change.
- Prefer consistency with the existing codebase.

Avoid introducing new patterns unless required.

---

## 8. Communication

Before coding:

- Briefly explain the plan.

After coding:

- Summarize what changed.
- Summarize how it was verified.
- Mention any limitations or risks.

Be concise.