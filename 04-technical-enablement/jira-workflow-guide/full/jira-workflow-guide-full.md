# Jira for New Testers: Full Version

The longer version of the course page: who it is for, the choices behind it, the three sessions and how learning was checked. All names, tickets and numbers in the practice project are made up.

## Who It Is For

Testers, analysts and support staff who are about to work in a team's Jira but have never used it. They know what a bug is. They do not need to know how Jira is set up, who the administrator is or what a sprint is. Developers do not need it.

## The Practice Project

Every learner is invited to the same made-up Jira project, Harbourline, key HBL. The trainer sets it up before the course in a free Jira account. It holds ten sample tickets: four bugs in the login page, three in the booking page, two questions waiting for an answer and one ticket that is stuck. The six statuses on the course page are added as a custom workflow. The project is not published in this portfolio. Because everyone sees the same tickets, a trainer can predict each result and spot a wrong one at a glance. Nothing in it is real, and a learner cannot harm anything by breaking it.

## Design Decisions

- **The relay comes first.** Before any screen is shown, learners are told that each status belongs to one person. Learners who know whose turn it is rarely lose a ticket.
- **Six parts to every ticket.** Summary, steps, expected, actual, severity and evidence. The expected result is the one most often missing, so the quiz asks about it.
- **Six statuses only.** Real projects have more. A learner who understands six can read a longer workflow. A learner shown twelve remembers none.
- **One query, written out.** Session 3 teaches `project = HBL AND status = "In Test"` and nothing longer, because the search box is where learners get stuck in a real project.
- **What it cost:** no boards, sprints, epics, reports or automation rules.

## The Three Sessions

| Session | Minutes | Activity | Check |
|---|---|---|---|
| 1. The Ticket | 30 | Look at one poor ticket and say what is missing; write a bug ticket from a page of notes | The ticket has all six parts and another learner can follow the steps |
| 2. The Workflow | 30 | Walk the six statuses as a relay with named roles; move three practice tickets and say whose turn each is | The learner moves each ticket and names the owner |
| 3. Finding Tickets | 30 | Type the one query; change the status; save it as a filter | The saved filter returns the tickets the trainer expects |

## How Learning Was Checked

- **During each session:** a "show me" check at the end, listed above, so anyone lost is found within the half hour.
- **After session 3:** the six-question quiz on the course page, one question at a time, with the right answer and a reason after each pick. Five or more means ready for a real project.
- **A month later:** one question, "have you written a ticket since?"

No learner results are published here. The figures that would belong in this section (quiz scores, how many learners finished) do not exist yet, and I would rather say so than invent them.

## Materials

| Item | Where |
|---|---|
| Course page with the quiz and the status table | [README](../README.md) |
| Quiz questions, without answers | [Quiz](../quiz.md) |

## What I Would Change

- Build a second practice project with a workflow that has gone wrong.
- Add a session on replying when a developer cannot reproduce a bug.
- Record a two-minute screen capture of each session's activity for learners working alone.
- Pair learners, one writing and one reproducing.
