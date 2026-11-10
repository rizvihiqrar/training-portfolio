# Rubric: Day 10 Practical Round

The task: pick one real user flow in an app you know, then use Playwright's recorder and Copilot to write a test and run it. About 60 minutes. The trainer watches and scores, then gives feedback in the same conversation.

Score each row 0, 1 or 2. Total out of 10.

| Row | 0 | 1 | 2 |
|---|---|---|---|
| **Choice of flow** | No clear flow, or too big to finish | A flow, but vague (for example "test the site") | One specific flow with a clear expected result (for example "log in, see the dashboard") |
| **Prompt quality** | No prompt, or "write a test" | Names the page or the action, not both | Names the page, the action and the expected result |
| **A test that runs** | Does not run | Runs but fails and the learner cannot say why | Runs, and the learner can say what each step does |
| **A real assertion** | None | An assertion that would pass whatever the page showed | At least one assertion that would fail if the feature broke |
| **Reading the result** | Cannot find the pass or fail result | Finds it but cannot explain it | Reads it and explains what passed, or why it failed |

| Total | Meaning | Next step |
|---|---|---|
| 9 to 10 | Ready to work with a mentor on a real suite | Pair on a real test next week |
| 6 to 8 | Solid start | Repeat the practice with a second flow |
| 0 to 5 | Not there yet | Redo Days 7 to 9 with a trainer beside them |

**Trainer notes:** Record which row lost the points most often across the group. If it is "a real assertion", add a short exercise to Day 8: break the app on purpose and see whether the test notices.
