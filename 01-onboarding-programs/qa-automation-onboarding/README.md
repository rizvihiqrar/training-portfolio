# QA automation onboarding: a two-week plan for people new to testing tools

**In one sentence:** after ten one-hour days, a tester who has never written code can open a project in VS Code, ask an AI assistant for help, and write and run a basic automated browser test.

| | |
|---|---|
| Audience | Manual or non-technical QA team members. No coding needed to start. |
| Goal | Week 1: move around VS Code, open the terminal, and get a code snippet from a plain-English prompt. Week 2: write and run a basic Playwright test with AI help, and read the pass or fail result. |
| Length | 10 days, 1 hour a day (two weeks) |
| Format | Self-paced or group watch sessions. Days 5 and 10 are hands-on with no video: the goal is to do, not only watch. |
| Trainer | Iqrar Rizvi (designed the plan and the practice days) |

## In plain words

You do not need to know how to code. Each day is one hour: you watch a short lesson, then try the skill yourself.

- **VS Code** is a free program for writing code. Week 1 teaches you to move around in it.
- **Copilot** is an AI helper inside VS Code. You describe what you want in plain English and it suggests code. You always check what it gives you.
- **Playwright** is a free tool that clicks through a website for you and checks that it works. Week 2 teaches you to write and run a simple test with it.

By the end you can:

1. find your way around VS Code and its terminal;
2. ask an AI helper for code and say what it did;
3. write and run a simple automated test, and read whether it passed or failed.

## Outline

**Week 1: foundations, VS Code and AI tools**

| Day | Topic | Time |
|---|---|---|
| 1 | [VS Code for beginners](https://www.youtube.com/watch?v=B-s71n0dHUk): interface, file explorer, extensions, terminal | about 60 min |
| 2 | [Command line crash course](https://www.youtube.com/watch?v=oxuRxtrO2Ag): the few terminal commands testers use | about 40 min |
| 3 | [GitHub Copilot: getting started](https://www.pluralsight.com/courses/github-copilot-getting-started): how AI suggests code in VS Code (subscription needed) | about 60 min |
| 4 | [Copilot in action](https://www.youtube.com/watch?v=Fi3AJZZregI): a short demo, then try it yourself | 15 min plus practice |
| 5 | **Practice day.** Ask Copilot for three things in plain English. No right or wrong; explore. See the [lesson plan](lesson-plan-day-5-practice.md). | about 60 min |

**Week 2: QA automation with Playwright and AI help**

| Day | Topic | Time |
|---|---|---|
| 6 | [What is QA automation?](https://www.youtube.com/watch?v=RIiNLR3-As8): a non-technical overview and how AI changes the role | 20 min plus discussion |
| 7 | [Playwright beginner tutorial](https://www.youtube.com/watch?v=wawbt1cATsk): setup, a first test, running it in VS Code | about 60 min |
| 8 | [Automated web testing with Playwright](https://www.pluralsight.com/courses/playwright-automated-web-testing): selectors and assertions only (subscription needed) | about 60 min |
| 9 | [Write Playwright tests with AI](https://www.youtube.com/watch?v=1nQNL4BDPIY): describe a test in plain English, let Copilot write it, run it | 30 min plus practice |
| 10 | **Final practice.** Pick one real user flow; use Playwright's recorder and Copilot to write and run the test. Scored with the [rubric](rubric-day-10-final-practice.md). | about 60 min |

The video and course links point to the original authors' pages; nothing from those courses is copied here. I have not re-checked them since I made the plan, so test every link before running a group.

## Materials

Read these in the browser:

| Page | For | What it is |
|---|---|---|
| [Day 5 lesson plan](lesson-plan-day-5-practice.md) | Trainer | One page: timings, steps, checks |
| [Quiz and answer key](quiz-and-answer-key.md) | Trainer and learner | Ten questions with feedback, to give after Day 9 |
| [Day 10 rubric](rubric-day-10-final-practice.md) | Trainer | How the final practice is scored |
| [Learner survey](survey.md) | Learner | What learners thought and what to change |

Download these Word files (click the link, then the download button on the file page):

| File | What it is |
|---|---|
| [Two-week schedule](materials/qa-automation-2-week-schedule.docx) | The plan as a handout, with clickable links |
| [Ten-day cheat sheet](materials/qa-automation-10-day-cheat-sheet.docx) | Short notes for each day: what to know, commands, shortcuts |
| [Testing types cheat sheet](materials/testing-types-cheat-sheet.docx) | Unit, integration, system, smoke, regression and the rest, in plain words |
| [Test strategy and automation test plan template](materials/test-strategy-and-automation-test-plan-template.docx) | A fill-in template for the next step after the course |

## How learning was checked

- **Week 1 benchmark (Day 5):** the learner navigates VS Code, opens the terminal, and has Copilot generate a snippet from a plain-English prompt, while a trainer watches.
- **Quiz:** ten questions after Day 9.
- **Week 2 benchmark (Day 10):** the learner writes and runs a basic Playwright test with AI help and reads the pass or fail result in the terminal. A trainer scores it with the rubric.
- **A week later:** one follow-up question, "show me the last test you wrote, and tell me what it checks".

## Results

No learner data is published in this repository. The numbers a trainer would collect are the Day 10 rubric score, the quiz score, and the survey answers.

## What I would improve next time

- Add a short checkpoint quiz after Day 5, so someone who is lost is found before Week 2 starts.
- Offer a free alternative for each of the two paid course days, so cost never blocks a learner. Day 5 already has a no-Copilot fallback in the lesson plan.
- Pair learners on the two practice days. Explaining what the AI wrote to another person catches more misunderstandings than reading it alone.
