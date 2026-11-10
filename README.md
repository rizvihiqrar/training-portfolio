![Training Portfolio: courses people can follow, and proof that they learned](docs/assets/banner.svg)

# Training portfolio

Courses, lesson plans, assignments, quizzes and presentations I have designed and taught for new hires, support teams and technical staff, with how I checked that people learned. I am a QA analyst with a background in customer support and training. Each course is a page plus the files a trainer really uses. Every company, system and person in the materials is invented, so nothing here depends on an employer's material.

> **If you have five minutes**, open these three files for the first course. Together they show how I plan a session, how I mark it, and how I teach a hands-on skill:
>
> - [**The course page**](01-onboarding-programs/qa-automation-onboarding/): a ten-day plan that takes a non-technical tester to a first automated test
> - [**A one-page lesson plan**](01-onboarding-programs/qa-automation-onboarding/lesson-plan-day-5-practice.md): timings, what the trainer does, what the learners do, and how each step is checked
> - [**The scoring rubric**](01-onboarding-programs/qa-automation-onboarding/rubric-day-10-final-practice.md): five rows scored 0 to 2, with a next step for each result

## In plain English

Training is how a new person becomes useful quickly. A good course says who it is for and what they can do at the end, how the trainer teaches it, how you check they got it, and what you change next time. This repository shows each of those parts for real courses, not only the slides.

## At a glance

- 1 course so far: a two-week QA automation onboarding plan (one hour a day), with more planned (see [the courses](#the-courses))
- Each course has a page, a one-page lesson plan, a quiz with an answer key, a scoring rubric and a learner survey
- Four ready-to-use Word handouts: the schedule, a ten-day cheat sheet, a testing types cheat sheet and a test strategy template
- Two [templates](templates/) so every course is laid out the same way
- A reading path for each reader: HR, recruitment, product, enablement, customer success, implementation and technical teams
- Honest results: where no learner numbers exist, the page says so instead of inventing them
- A [check](scripts/check-readme.mjs) that fails the build if this page links to a missing file or forgets a new course

## Start here, by role

| If you are in... | Look at | What you will find |
|---|---|---|
| HR | [01 Onboarding programs](01-onboarding-programs/), [05 Assessment and feedback](05-assessment-and-feedback/) | New-hire plans, evaluation forms, surveys |
| Recruitment | [06 Programme management](06-programme-management/), [08 Case studies](08-case-studies/) | Skills tracking, how I measure results |
| Product | [03 Sessions and decks](03-sessions-and-decks/), [08 Case studies](08-case-studies/) | Release training, how feedback comes back |
| Enablement | [01](01-onboarding-programs/), [05](05-assessment-and-feedback/), [06](06-programme-management/) | The whole programme: plan, teach, assess, report |
| Customer success | [07 Customer and implementation](07-customer-and-implementation/) | Onboarding kit, runbooks |
| Implementation | [07](07-customer-and-implementation/), [02 System training](02-system-training/) | Go-live training plan, hands-on assignments |
| Technical teams | [04 Technical enablement](04-technical-enablement/), [03](03-sessions-and-decks/) | Git workflow, QA automation, CI/CD |

## The courses

| Section | Course | Length | Status |
|---|---|---|---|
| 01 Onboarding programs | [QA automation onboarding](01-onboarding-programs/qa-automation-onboarding/) | 10 days, 1 hour each | Page, lesson plan, quiz, rubric, survey, 4 handouts |
| 02 System training | Assignments and a bank reconciliation course on an invented ERP | planned | Planned |
| 03 Sessions and decks | Two drop-in session decks, QA with AI tools | planned | Planned |
| 04 Technical enablement | Git workflow guide, Jira release reports | planned | Planned |
| 05 Assessment and feedback | Rubric, evaluation form, quiz bank, survey, certificate | planned | Planned |
| 06 Programme management | Schedule, attendance, skills tracker | planned | Planned |
| 07 Customer and implementation | Onboarding kit, go-live training plan | planned | Planned |
| 08 Case studies | Two or three one-page stories | planned | Planned |

## What a course pack contains

| Item | Purpose |
|---|---|
| Course page | Audience, goal, length, outline, how learning was checked, results, what I would improve |
| Lesson plan (one page) | Timings, activities, what to prepare, what to cut if time runs short |
| Slides with speaker notes | The teaching deck |
| Learner handout | What the learner keeps |
| Assignment and answer key | Marked, hands-on work |
| Quiz and answer key | Ten questions with feedback |
| Rubric | How the trainer scores and gives feedback |
| Survey | What learners thought, and what changed because of it |
| Certificate | Given on completion |

The layout is in the [course page template](templates/course-page-template.md) and the [lesson plan template](templates/lesson-plan-template.md).

## How I check that people learned

- **During the session:** a check at the end of every step in the lesson plan (a question, a short exercise, a show of hands), so a lost learner is found in minutes, not weeks.
- **At the end:** a marked assignment, a quiz, and a trainer-scored practice task with a rubric.
- **Later:** a one-month follow-up question, "have you used this since?", because a score on the day shows that people understood, not that the work changed.
- **After each run:** the survey answers and the common mistakes become the next run's first change, written at the bottom of the course page.

## Words used on this page

| Term | Meaning |
|---|---|
| Onboarding | The first weeks of a new person: what they learn and when |
| Lesson plan | A one-page plan for a session: steps, timings, checks |
| Rubric | A scoring guide: what each score looks like, so two trainers mark the same way |
| Benchmark | A task a learner must do to show they reached a stage |
| Enablement | Training and materials that help a team do its work well |
| Go-live | The day a customer or team starts using a system for real work |
| Runbook | Step-by-step instructions for handling a known situation |

## Roadmap

Built one piece at a time, each through its own pull request, and this page is updated with every piece. Sections 02 to 08 above show what is planned. My test automation work is in [qa-automation-platform](https://github.com/rizvihiqrar/qa-automation-platform), and my product case studies are in [product-portfolio](https://github.com/rizvihiqrar/product-portfolio).
