# Claude Code Instructions — Beastmaking

## Main rule
**Always use specialized agents** for each action. Never code or modify directly without delegating to the appropriate agent.

## Agent routing table

| Agent | When to use | Do not use if |
|-------|------------|---------------|
| `architect` | Architecture decisions, data model design, design patterns, navigation structure, state management strategy | Just reading existing code -> agent `Explore` (subagent_type: Explore) |
| `code-writer` | Business logic, custom hooks, workout/timer logic, complex components with interactions (workout screens, exercise config, progress tracking), animations, data persistence | The task is trivial, no state, calculations or interactions -> `quick-coder` |
| `css-styler` | NativeWind styling, theming (dark/light), animations (Reanimated/Moti), colors, press states, spacing, visual polish — **any task involving visual appearance** | Also need to modify component logic -> combine `code-writer` + `css-styler` in parallel |
| `quick-coder` | Simple UI components **without styling**, adding fields, wiring props, minor logic modifications, loading states, skeletons | Component has complex state/interactions -> `code-writer`, styling (colors, spacing, animations, press states, theme) -> `css-styler` |
| `bug-fixer` | TypeScript errors, rendering bugs, state issues, Expo module problems, NativeWind styling bugs, navigation issues, platform-specific bugs | The bug is clearly a styling issue -> `css-styler` |
| `code-reviewer` | Post-implementation review, TypeScript types, re-renders audit, error handling, convention consistency | The task is an architecture review -> `architect` |
| `refactorer` | Hook extraction, component splitting, duplicate code removal, file reorganization | The modification changes behavior -> `code-writer` or `bug-fixer` |
| `test-writer` | Unit tests of utility functions, hook tests, component tests, workout logic tests, timer tests | — |
| `doc-writer` | README, JSDoc, CHANGELOG, deployment guides, props documentation | — |
| `devops` | EAS Build config, app.config.ts, OTA updates, environment variables, CI/CD, app store submission | — |
| `ux-reviewer` | Mobile ergonomics, usability, visual hierarchy, design consistency, user flows, thumb zone analysis, haptic feedback review | — |
| `security-auditor` | Secure storage review, API key exposure, deep link validation, certificate pinning, biometric auth, sensitive data in JS bundle/bridge | — |
| `perf-auditor` | JS thread bottlenecks, re-renders, FlatList optimization, image caching, memory leaks, app startup time, Reanimated worklet usage | — |
| `a11y-fixer` | Detect AND fix accessibility issues: labels, roles, states, hints, touch targets, VoiceOver/TalkBack support, screen reader navigation | Only detection needed (no fixes) -> use `code-reviewer` with a11y focus |

## Skills per agent

For each agent, the skills to invoke before and after work are defined below.

| Agent | Skill(s) at start | Skill(s) at end |
|-------|-------------------|-----------------|
| `architect` | `architecture-patterns` + `expo-react-native-typescript` (if Expo/RN decisions) | — |
| `code-writer` | `expo-react-native-typescript` (always) + `clean-code` (always) + `test-driven-development` (if core logic) + `typescript-advanced-types` (if complex types) + `architecture-patterns` (if new module) | `superpowers:verification-before-completion` |
| `quick-coder` | — (passive reference to `expo-react-native-typescript` + `tailwind-design-system`) | — |
| `bug-fixer` | `systematic-debugging` (always, mandatory) + `expo-react-native-typescript` (if Expo/RN error) | `superpowers:verification-before-completion` |
| `code-reviewer` | `clean-code` (always) + `typescript-advanced-types` (if suspect types) + `userinterface-wiki` (if UI/animations) | — |
| `refactorer` | `clean-code` (always) + `typescript-advanced-types` (if fuzzy types) | `superpowers:verification-before-completion` |
| `test-writer` | `superpowers:test-driven-development` + `vitest` (unit/integration tests) | `superpowers:verification-before-completion` |
| `css-styler` | `userinterface-wiki` (always, mandatory) + `ui-ux-pro-max` (complex design) or `tailwind-design-system` (design tokens) or `frontend-design` (layout/hierarchy) | — |
| `ux-reviewer` | `ui-ux-pro-max` (always, with stack: react-native) | — |
| `doc-writer` | `crafting-effective-readmes` (if README) or `changelog-automation` (if CHANGELOG) | — |
| `devops` | `deployment-pipeline-design` (if CI/CD) or `security-requirement-extraction` (if security) | `superpowers:verification-before-completion` |
| `security-auditor` | `security-requirement-extraction` (always, mandatory) | — |
| `perf-auditor` | `expo-react-native-typescript` (always, mandatory) | — |
| `a11y-fixer` | `expo-react-native-typescript` (always, mandatory) | `superpowers:verification-before-completion` |

## Skill invocation rule for agents

Every prompt sent to an agent **MUST** explicitly include the instruction to invoke skills from the table above.

### Mandatory format in the prompt

**At the start of the prompt:**
> "Start by invoking the skill `<skill-name>` with the Skill tool before any analysis or action."

**At the end of the prompt:**
> "Once your work is done, invoke the skill `<skill-name>` with the Skill tool to validate."

### Example — calling bug-fixer

Not allowed:
> "Fix the timer bug in WorkoutScreen.tsx"

Correct:
> "Start by invoking the skill `systematic-debugging` with the Skill tool. Then, fix the timer bug in WorkoutScreen.tsx. Once done, invoke `superpowers:verification-before-completion` with the Skill tool."

### Rule for conditional skills

If an agent has multiple possible skills, apply this priority:
1. Skill most specific to the task type (e.g., `ui-ux-pro-max` if the design is complex multi-component)
2. Design system skill (`tailwind-design-system`) for tokens or global classes
3. General skill (`frontend-design`) for layout decisions

State the chosen skill explicitly in the prompt sent to the agent.

## Mandatory workflow
1. Analyze the request -> choose the appropriate agent(s)
2. Delegate via the **Task tool** with a detailed prompt
3. Summarize the result to the user

## Rule if no agent used — NON-NEGOTIABLE

**This rule ALWAYS applies, even when Claude is focused on a technical problem.**

### Allowed direct actions (without warning)
- Read-only git commands: `git status`, `git log`, `git diff`
- Reading **a single file** whose path is known with certainty, **only** to prepare context for an agent

### Actions requiring user notification
Before any action outside the list above, Claude MUST stop and display:
> "I'm going to do X directly without an agent. Confirm or should I delegate to `<agent>`?"

### 2+ files threshold -> mandatory delegation
Any analysis requiring reading **2 or more files** must be delegated to an agent (`bug-fixer`, `code-reviewer`, or `Explore`). Claude must **never** read multiple files himself to diagnose or understand code.

### Reading a single file
If reading a single file is necessary to prepare context for an agent, Claude MUST signal:
> "I'm reading [path/file] to prepare context for the `<agent>` agent. Confirm?"

## Anti-patterns to avoid

| Forbidden | Correct |
|-----------|---------|
| Reading multiple files yourself to diagnose a bug | Delegate to `bug-fixer` or `Explore` |
| Doing an `Edit` directly after reading files without going through an agent | Delegate to `quick-coder`, `code-writer`, or `bug-fixer` |
| Forgetting to warn the user under pretext of being "focused on the problem" | Stop, display the warning message, wait for confirmation |
| Doing a code review directly | Delegate to `code-reviewer` |

## Parallelization
Launch multiple agents **in parallel** when tasks are independent.

## Permissions and system actions

### General rule
Agents can perform all their actions without asking for prior confirmation (bypass default permissions).

### Exception — `sudo apt-get install`
Before executing any `sudo apt-get install` command, the agent **must stop and ask for confirmation** from the user:
> "The following system dependencies are missing: [list]. I can install them with `sudo apt-get install [packages]`. Confirm?"

Never bypass a missing dependency without reporting the problem and suggesting installation.

## Project context
- **Stack**: React Native 0.81 + Expo 54 + TypeScript + NativeWind (TailwindCSS for RN) + React 19
- **Platform**: Mobile (iOS + Android), NOT a web project
- **Styling**: NativeWind (className prop), never StyleSheet.create
- **Navigation**: Expo Router (file-based routing)
- **Animations**: React Native Reanimated / Moti (NOT Framer Motion)
- **Build/Deploy**: EAS Build + EAS Update (OTA)
- **Testing**: Vitest for unit tests, React Native Testing Library for components

## Mobile-specific considerations

### What does NOT apply (web-only)
- No `hover:` states — use `active:` for press feedback
- No CSS media queries — use Dimensions/useWindowDimensions or NativeWind breakpoints
- No Framer Motion — use React Native Reanimated or Moti
- No shadcn/ui — use custom components styled with NativeWind
- No `div`, `span`, `button` — use `View`, `Text`, `Pressable`
- No browser APIs (localStorage, etc.) — use AsyncStorage, expo-secure-store, etc.

### What DOES apply (mobile-specific)
- Touch targets min 44x44pt (60x60pt during workouts)
- Thumb zone: critical actions in bottom third of screen
- Haptic feedback via expo-haptics for important interactions
- Screen wake lock during active workouts
- Platform-specific code when needed (`Platform.OS`, `.ios.tsx`/`.android.tsx`)
- SafeAreaView for screen-level layout
- Keyboard avoidance for inputs (KeyboardAvoidingView)
- Gesture handling (swipe for navigation, long-press for options)

## Feedback loops

For significant features or modules, follow this review chain after implementation. Each step is a separate agent delegation. Skip steps that don't apply.

```
impl (code-writer/quick-coder)
  → tests (test-writer)
    → code-review (code-reviewer)
      → security (security-auditor) — if auth, storage, networking, or sensitive data
        → perf (perf-auditor) — if lists, animations, timers, or heavy computation
          → a11y (a11y-fixer) — if new screens or interactive components
            → ux-review (ux-reviewer) — if new user-facing flows
```

### When to trigger the full chain
- New screen or major feature: full chain
- New component with interactions: code-review → a11y → ux-review
- Bug fix: code-review only
- Styling change: ux-review only
- Refactor: code-review → perf (if performance-sensitive area)

### Correction loop (verify → fix → re-verify)

When a review agent (code-reviewer, ux-reviewer, security-auditor, perf-auditor, a11y-fixer) reports issues:

1. **Route the fix** to the appropriate agent:
   - Logic/type issues → `bug-fixer`
   - Styling/visual issues → `css-styler`
   - Structural issues → `refactorer`
2. **Re-review is mandatory**: after the fix, delegate back to the **same reviewer agent** that reported the issue
3. **Iterate until 0 critical issues**: repeat fix → re-review until no 🔴 Critical issues remain — **max 3 iterations**
4. **Escalate after 3 iterations**: if critical issues persist after 3 fix/re-review cycles, stop and escalate to the user with a summary of remaining issues

### Iterative verification (verification-before-completion)

Every agent that invokes `verification-before-completion` must follow this process:

1. **Run checks**: tests (`npm test`), lint (`npm run lint`), type-check (`npx tsc --noEmit`)
2. **If failure → fix and re-verify**: do not declare success — fix the issue and run the checks again
3. **If success → verify on device/simulator** when possible (Expo Go, EAS development build)
4. **Max 3 fix attempts**: if checks still fail after 3 fix/re-verify cycles, escalate to the user with the exact error output
5. **Rule: NEVER declare "done" without proof** — include test output, `tsc` OK, or lint clean in the completion summary

### Parallelization within the chain
After code-review passes, security / perf / a11y can run in parallel if they audit independent scopes.

## Context management — /fin command

### End-of-topic workflow
The `/fin` command signals the end of a topic. When invoked:

1. Summarize what was accomplished (2-3 lines)
2. Update `docs/architecture/` if important modifications occurred (delegate to `doc-writer`)
3. Ask the user to type `/compact`
