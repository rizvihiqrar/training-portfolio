# Rubric: Day 10 Practical Round

**The task:** Pick one real user flow in an app you know, then use Playwright's recorder and Copilot to write a test and run it. About 60 minutes. The trainer watches, scores, and gives feedback in the same conversation.

**How to score:** Give each of the five criteria a score from 1 to 4. The total is out of 20.

| Score | Level | In short |
|---|---|---|
| 1 | Beginning | Not yet doing it |
| 2 | Developing | Doing it with gaps |
| 3 | Proficient | Doing it well on their own |
| 4 | Strong | Doing it well, and going further |

## Criteria

| Criterion | 1: Beginning | 2: Developing | 3: Proficient | 4: Strong |
|---|---|---|---|---|
| **Choice of flow** | No clear flow, or too big to finish | A flow, but vague, such as "test the site" | One specific flow, finished in the hour | One specific flow with a clear expected result, such as "log in and see the dashboard" |
| **Prompt quality** | No prompt, or just "write a test" | Names the page or the action, not both | Names the page, the action and the expected result | Names all three, and improves the prompt after seeing the first result |
| **A test that runs** | Does not run | Runs but fails, and the learner cannot say why | Runs, and the learner can say what each step does | Runs, and the learner fixes a failure without help |
| **A real check** | No check at all | A check that would pass whatever the page showed | At least one check that would fail if the feature broke | A check that is shown to fail when the feature is broken on purpose |
| **Reading the result** | Cannot find the pass or fail result | Finds it but cannot explain it | Explains what passed, or why it failed | Explains it, and says what to test next |

## What the Total Means

| Total | Level | Next step |
|---|---|---|
| 17 to 20 | Strong | Pair on a real test next week |
| 13 to 16 | Proficient | Repeat the practice with a second flow |
| 9 to 12 | Developing | Repeat the practice with a trainer beside them, focusing on the lowest criteria |
| 5 to 8 | Beginning | Redo Days 7 to 9 with a trainer |

**Trainer notes:** Record which criterion scored lowest across the group. If it is "A real check", add a short exercise to Day 8: break the app on purpose and see whether the test notices.
