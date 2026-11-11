# QA Automation Onboarding: A Two-Week Plan for People New to Testing Tools

**In one sentence:** After ten one-hour days, a tester who has never written code can open a project in VS Code, ask an AI assistant for help, and write and run a basic automated browser test.

| | |
|---|---|
| Audience | Manual or non-technical QA team members. No coding needed to start. |
| Goal | Week 1: move around VS Code, open the terminal, and get a code snippet from a prompt written in everyday words. Week 2: write and run a basic Playwright test with AI help, and read the pass or fail result. |
| Length | 10 days, 1 hour a day (two weeks) |
| Format | Self-paced or group watch sessions. Days 5 and 10 are hands-on with no video: the goal is to do, not only watch. |
| Trainer | Iqrar Rizvi (designed the plan and the practice days) |

## What These Tools Are

You do not need to know how to code. Each day is one hour: you watch a short lesson, then try the skill yourself.

- **VS Code** is a free program for writing code. Week 1 teaches you to move around in it.
- **Copilot** is an AI helper inside VS Code. You describe what you want in everyday words and it suggests code. You always check what it gives you.
- **Playwright** is a free tool that clicks through a website for you and checks that it works. Week 2 teaches you to write and run a simple test with it.

By the end you can:

1. Find your way around VS Code and its terminal.
2. Ask an AI helper for code and say what it did.
3. Write and run a simple automated test, and read whether it passed or failed.

## Outline

**Week 1: Foundations, VS Code and AI Tools**

| Day | Topic | Time |
|---|---|---|
| 1 | [VS Code for beginners](https://www.youtube.com/watch?v=B-s71n0dHUk): interface, file explorer, extensions, terminal | 60 min |
| 2 | [Command line crash course](https://www.youtube.com/watch?v=oxuRxtrO2Ag): the few terminal commands testers use | 40 min |
| 3 | [GitHub Copilot: getting started](https://www.pluralsight.com/courses/github-copilot-getting-started): how AI suggests code in VS Code (subscription needed) | 60 min |
| 4 | [Copilot in action](https://www.youtube.com/watch?v=Fi3AJZZregI): a short demo, then try it yourself | 15 min plus practice |
| 5 | **Practice day.** Ask Copilot for three things in everyday words. No right or wrong; explore. See the [lesson plan](lesson-plan-day-5-practice.md). | 60 min |

**Week 2: QA Automation with Playwright and AI Help**

| Day | Topic | Time |
|---|---|---|
| 6 | [What is QA automation?](https://www.youtube.com/watch?v=RIiNLR3-As8): a non-technical overview and how AI changes the role | 20 min plus discussion |
| 7 | [Playwright beginner tutorial](https://www.youtube.com/watch?v=wawbt1cATsk): setup, a first test, running it in VS Code | 60 min |
| 8 | [Automated web testing with Playwright](https://www.pluralsight.com/courses/playwright-automated-web-testing): selectors and assertions only (subscription needed) | 60 min |
| 9 | [Write Playwright tests with AI](https://www.youtube.com/watch?v=1nQNL4BDPIY): describe a test in everyday words, let Copilot write it, run it | 30 min plus practice |
| 10 | **Practical round.** Pick one real user flow; use Playwright's recorder and Copilot to write and run the test. Scored with the [rubric](rubric-day-10-practical-round.md). | 60 min |

The video and course links point to the original authors' pages; nothing from those courses is copied here. I have not re-checked them since I made the plan, so test every link before running a group.

## Materials

Read these in the browser:

| Page | For | What it is |
|---|---|---|
| [Day 5 lesson plan](lesson-plan-day-5-practice.md) | Trainer | One page: timings, steps, checks |
| [Quiz](quiz.md) | Trainer and learner | Ten questions, to give after Day 9 (the trainer keeps the answers) |
| [Day 10 rubric](rubric-day-10-practical-round.md) | Trainer | How the practical round is scored |
| [Learner survey](survey.md) | Learner | What learners thought and what to change |

**[Download All Handouts (ZIP)](https://rizvihiqrar.github.io/training-portfolio/01-onboarding-programs/qa-automation-onboarding/qa-automation-onboarding-downloads.zip)** gets you the four Word files below in one package. Or take them one at a time (click the link, then the download button on the file page):

| File | What it is |
|---|---|
| [Two-week schedule](materials/qa-automation-2-week-schedule.docx) | The plan as a handout, with clickable links |
| [Ten-day cheat sheet](materials/qa-automation-10-day-cheat-sheet.docx) | Short notes for each day: what to know, commands, shortcuts |
| [Testing types cheat sheet](materials/testing-types-cheat-sheet.docx) | Unit, integration, system, smoke, regression and the rest, in everyday words |
| [Test strategy and automation test plan template](materials/test-strategy-and-automation-test-plan-template.docx) | A fill-in template for the next step after the course |

## Design Decisions

Every course is a set of choices. These are the main ones, why I made them, and what each cost me.

| Decision | Why | What I Gave Up |
|---|---|---|
| One hour a day for two weeks | It fits around a full workload, so people finish. An hour is enough for one short lesson and some practice, and a day between lessons gives it time to sink in. | A fast one-week bootcamp. |
| Two hands-on days with no video (Days 5 and 10) | The skill is doing, not watching. Day 5 checks that Week 1 stuck before Week 2 builds on it, and Day 10 shows whether a person can do it alone. | Two more days of new content. |
| Free videos, plus two paid courses (Days 3 and 8) | Free videos keep the cost low and work well for groups watching together. The two paid courses add depth where it matters most: the AI helper, and writing checks inside a test. | All-original lessons, which would take far longer to make, and a free option for every day: only Day 5 has a fallback so far (for learners without the AI helper), and Days 3 and 8 still need one. |
| Link to the original authors, never copy | The authors' own pages are the current version, and the lessons stay theirs. | Control over the wording, and certainty that every link still works: I have not re-checked them since I made the plan. |
| "Always check what the AI gives you" (in the Day 3 notes, practised on Day 5) | AI suggestions can be wrong or incomplete. The habit is named early, and on Day 5 every learner has to find one thing to fix. | Faster practice with less checking. |
| No prior coding needed | Many testers have never written code. The course goes only as far as a first working test, which builds confidence, and the rest can follow. | Depth: how to design a test framework, organize a large suite or run tests in a build pipeline. |
| A quiz after Day 9 and a scored practical round on Day 10 | The quiz shows who needs to review (eight or more is ready; fewer means going back over the days named in the quiz). The practical round shows who can do it, and the scoring guide gives each person a next step. | A single final exam. |

## How Learning Was Checked

- **Midpoint check (Day 5, the Week 1 benchmark):** The learner navigates VS Code, opens the terminal, and has Copilot generate a snippet from a prompt written in everyday words, while a trainer watches.
- **Quiz:** Ten questions after Day 9.
- **Practical round (Day 10, the Week 2 benchmark):** The learner writes and runs a basic Playwright test with AI help and reads the pass or fail result in the terminal. A trainer scores it with the rubric.
- **A week later:** One follow-up question, "show me the last test you wrote, and tell me what it checks".

## Results

No learner data is published in this repository. The numbers a trainer would collect are the Day 10 rubric score, the quiz score, and the survey answers.

## What I Would Improve Next Time

- Add a short checkpoint quiz after Day 5, so someone who is lost is found before Week 2 starts.
- Offer a free alternative for each of the two paid course days, so cost never blocks a learner. Day 5 already has a no-Copilot fallback in the lesson plan.
- Pair learners on the two practice days. Explaining what the AI wrote to another person catches more misunderstandings than reading it alone.
