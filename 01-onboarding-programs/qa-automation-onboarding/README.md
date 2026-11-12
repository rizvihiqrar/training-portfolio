# QA Automation Onboarding

| At a Glance | |
|---|---|
| Audience | All-level testers |
| Level | Beginner. No coding needed. |
| Length | 10 hours: 10 days, 1 hour a day |
| Format | Self-paced or group. Days 5 and 10 are hands-on with no video. |
| Tools | VS Code, Copilot, Playwright |
| Trainer | Iqrar Rizvi |

## Getting Started

Install these two free tools before Day 1:

- [VS Code](https://code.visualstudio.com/Download), where you will write and run everything
- [Node.js](https://nodejs.org/en/download), which Playwright needs from Day 7

## The Problem

Many testers have never written code, and most automation courses assume they have. This one starts from zero: ten one-hour days that fit around a full workload, ending with a first automated test that runs.

## What I Did

- **Linked free videos from their authors, never copied them,** and added two paid courses where depth matters most: the AI helper and checks inside a test.
- **Made Days 5 and 10 hands-on with no video,** because the skill is doing, not watching.
- **Named one habit early:** always check what the AI gives you. On Day 5 every learner has to find one thing to fix.
- **Wrote the materials:** a lesson plan, a quiz, a scored practical round, a feedback form and handouts.
- **Stopped at a first working test.** No frameworks, large suites or pipelines.

```prompt
On the login page, enter a valid email and password, click Sign in, and check that the dashboard heading appears.
Write this as a Playwright test. Use getByRole and getByLabel for the selectors.
After the test, explain each step in everyday words.
```

## The Result

No learner data is published here, so I make no claim about how well it worked. What exists is a complete, ready-to-run course: every day planned, a practical round scored on five criteria, and a score sheet that gives each person a next step. Below, the prompt above in VS Code, as a learner meets it on Days 9 and 10.

<!-- site:run login -->

```ts
import { test, expect } from '@playwright/test';
test('user sees the dashboard after signing in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('learner@example.com');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
// $ npx playwright test   1 passed
```

<!-- /site:run -->

An example of the idea, not a recording of a real learner.

## What I Would Change

- A short quiz after Day 5 will find anyone lost before Week 2 starts.
- A free option for each paid course day means cost never blocks a learner.
- Pairing learners on the practice days catches more misunderstandings, because explaining the AI's code beats reading it alone.
- Re-checking every video link keeps the plan current. I did this on 12 November and replaced eight links that had gone or no longer matched the plan.

## Units

| Unit | Days | Hours | You Will Learn To |
|---|---|---|---|
| 1. VS Code and the Terminal | 1 - 2 | 2 | Open a project, find files and run a command without help |
| 2. Working With the AI Helper | 3 - 4 | 2 | Ask Copilot for code in everyday words and say what it did |
| 3. Practice Day: Ask Copilot | 5 | 1 | Try three prompts, then find one thing the AI got wrong |
| 4. Playwright With AI Help | 6 - 9 | 4 | Write, run and read a first automated test, with Copilot's help |
| 5. Practical Round | 10 | 1 | Test one real flow on your own and explain the result |
| **Total** | **10** | **10** | |

## Two-Week Schedule

Pick a day to see its goal, time and video.

<!-- site:schedule -->

| Day | Topic | Goal | Time | Source |
|---|---|---|---|---|
| 1 | [VS Code for Beginners](https://www.youtube.com/watch?v=UTQp6mvhb0Y) | Find your way around VS Code and its terminal | 60 min (first hour) | freeCodeCamp |
| 2 | [Command Line Crash Course](https://www.youtube.com/watch?v=uwAqEzhyjtw) | Use the few terminal commands testers need | 45 min | Traversy Media |
| 3 | [GitHub Foundations: GitHub Copilot](https://www.pluralsight.com/courses/github-foundations-github-copilot) | See how AI suggests code as you type | 30 min | Pluralsight |
| 4 | [Get to Know GitHub Copilot in VS Code](https://www.youtube.com/watch?v=jXp5D5ZnxGM) | Watch a short demo, then try it yourself | 5 min plus practice | Visual Studio Code |
| 5 | Practice Day | Ask Copilot for three things in everyday words | 60 min | Hands-on |
| 6 | [What Is Automated Testing?](https://www.youtube.com/watch?v=pQPUs9uaKUM) | Understand what automation does and where AI fits | 16 min plus discussion | Testopic |
| 7 | [Get Started With Playwright and VS Code](https://www.youtube.com/watch?v=WvsLGZnHmzw) | Set up and run your first test in VS Code | 20 min plus practice | Playwright |
| 8 | [Playwright Foundations With TypeScript](https://www.pluralsight.com/courses/playwright-for-typescript) | Choose selectors and write checks that can fail | 60 min (selectors and assertions only) | Pluralsight |
| 9 | [Test Like a Pro With Playwright and Copilot](https://www.youtube.com/watch?v=rjbaIVOGfyo) | Describe a test in everyday words and let Copilot write it | 15 min plus practice | Visual Studio Code |
| 10 | Practical Round | Test one real flow with the recorder and Copilot | 60 min | Hands-on |

[Download the printable schedule](materials/qa-automation-2-week-schedule.docx)

<!-- /site:schedule -->

## Grading

One grid for the Day 10 practical round. Score each criterion 1 to 4 and add them up (out of 20).

| Criterion | 1 Beginning | 2 Developing | 3 Proficient | 4 Strong |
|---|---|---|---|---|
| Choice of flow | Unclear or too big | Vague, such as "test the site" | One flow, finished in the hour | One flow with a clear expected result |
| Prompt quality | Just "write a test" | Names the page or the action | Names page, action and result | Improves the prompt after the first try |
| A test that runs | Does not run | Runs, fails, cannot say why | Runs, can say what each step does | Fixes a failure without help |
| A real check | No check | A check that always passes | A check that fails if the feature breaks | Shown to fail when broken on purpose |
| Reading the result | Cannot find it | Finds it, cannot explain it | Explains what passed or failed | Explains it and says what to test next |
| **Total (out of 20)** | **5 to 8** | **9 to 12** | **13 to 16** | **17 to 20** |
| **Next step** | Redo Days 7 to 9 with a trainer | Repeat with a trainer beside them | Repeat with a second flow | Pair on a real test next week |

## Course Materials

### Day 5 Lesson Plan

| Length | Step | Objective | Goals | Check |
|---|---|---|---|---|
| 5 min | Open | Say today is about doing, not watching | Name one thing from Days 1 to 4 that helped or confused | One sentence each |
| 5 min | Setup check | Make sure VS Code, Copilot and the terminal open | Open an empty folder and the terminal (Ctrl+`) | Everyone has a terminal |
| 10 min | Prompt 1 | Show inline chat (Ctrl+I) | Ask for a password-check function | Ghost text accepted (Tab) or dismissed (Esc) |
| 10 min | Prompt 2 | Ask "what does that line do?" | Ask for a function that totals a list of prices | Explain one line in their own words |
| 10 min | Prompt 3 | Remind them to review before trusting | Paste short code and ask for an everyday-words explanation | Compare the explanation with the code |
| 15 min | Review | Ask each learner to find one thing the AI got wrong | Run each function with a few inputs | One problem found per learner |
| 5 min | Close | Recap: AI suggests, I review, I run it | Write down one thing to try tomorrow | Terminal opened, snippet reviewed |

### Quiz

One question at a time. Eight or more means you are ready for the practical round.

<!-- site:quiz -->

1. Which keyboard shortcut opens the integrated terminal in VS Code? **Answer:** Ctrl+` It opens the terminal inside VS Code.
2. What does the Command Palette (Ctrl+Shift+P) do? **Answer:** Runs any VS Code action when you type its name. Type what you want and VS Code finds the action.
3. In a terminal, what does pwd show you? **Answer:** The folder you are in. pwd prints the working directory.
4. What does npm install do? **Answer:** Installs the packages a project lists in package.json. It reads package.json and installs what the project needs.
5. Copilot shows grey suggestion text. How do you accept and dismiss it? **Answer:** Tab to accept, Esc to dismiss. Tab accepts ghost text and Esc dismisses it.
6. Why read Copilot's code before relying on it? **Answer:** It can be wrong or incomplete. AI suggests, you review: it can miss cases or be wrong.
7. Which command runs a Playwright test suite? **Answer:** npx playwright test. It runs every test in the project.
8. Which prompt is better for Copilot, A: Write a test. or B: On /checkout, write a test that checks the total changes when the quantity changes. **Answer:** B: On /checkout, write a test that checks the total changes when the quantity changes. B names the page, the action and the expected result.
9. In an automated test, what is the difference between a selector and an assertion? **Answer:** A selector finds an element, an assertion checks the result. Find the thing, then check what it shows.
10. Which tool records your clicks and turns them into a starting test? **Answer:** Playwright codegen (the recorder). Codegen records a flow and writes a first test you then improve.

<!-- /site:quiz -->

### Feedback Form

Give it on Day 10 and again a month later. Anonymous.

<!-- site:feedback -->

Rate each from 1 (disagree) to 5 (agree):

1. The plan was the right amount for one hour a day.
2. The order of the days made sense.
3. The practice days helped me more than the videos.
4. I can use VS Code and the terminal without help.
5. I can write and run a basic automated test with AI help.
6. I can tell when an AI suggestion needs checking.

Then two written questions: which day was hardest, and what would have made it easier? What would you cut, and what would you add?

<!-- /site:feedback -->

### Cheat Sheets

<!-- site:downloads -->

- [Ten-Day Cheat Sheet](materials/qa-automation-10-day-cheat-sheet.docx): one page of keys and commands for each day.
- [Testing Types Cheat Sheet](materials/testing-types-cheat-sheet.docx): smoke, regression, integration and the rest in one line each.

<!-- /site:downloads -->

Copilot prompts for testers, ready to copy:

```prompt
On the /checkout page, write a Playwright test that checks the order total updates when the quantity changes.
What are 5 edge cases I should test for a password reset flow?
Why is this Playwright test failing? Here is the terminal error: (paste it)
Replace the CSS selectors in this recorded test with getByRole and getByLabel where possible.
```

### Test Strategy and Automation Test Plan Template

A fill-in template for the step after the course. The two rules that matter most, written as scenarios:

```gherkin
Feature: Test strategy for a release

  Scenario: Start testing
    Given the build is deployed to staging
    And the smoke suite passes 100%
    And the requirements are final
    Then testing starts

  Scenario: Stop testing
    Given 90% or more of the planned cases pass
    And no Blocker or Critical defect is open
    And the product owner has signed off
    Then the release can ship
```

The folder layout of an automation plan. Click a folder or file to see what it is for.

<!-- site:tree -->

```text
automation-plan/                   The project: everything for the tests lives here
├── .github/workflows/
│   └── playwright.yml             Runs the tests for you whenever the code changes
├── tests/                         All the checks, in one place
│   ├── smoke/                     A few quick checks of the most important things
│   │   └── login.smoke.spec.ts    Checks that a person can sign in
│   └── regression/                Bigger checks that old features still work
├── page-objects/                  A cheat sheet of the buttons and boxes on each page
│   └── LoginPage.ts               Where the sign-in page's buttons and fields are named
└── playwright.config.ts           Settings: which browser to use, how long to wait
```

<!-- /site:tree -->

<!-- site:download -->

[Download the Word Template](materials/test-strategy-and-automation-test-plan-template.docx)

<!-- /site:download -->

<!-- site:fold -->

[Read the full version](full/qa-automation-onboarding-full.md), with the design decisions, how learning was checked, and the materials.

<!-- /site:fold -->
