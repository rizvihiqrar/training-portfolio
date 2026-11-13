# Jira for New Testers

| At a Glance | |
|---|---|
| Audience | Testers and analysts who have never used Jira |
| Level | Beginner. No coding needed. |
| Length | 90 minutes: 3 sessions of 30 minutes |
| Format | Self-paced or group. Every session ends with something you do. |
| Tools | Jira (a free account is enough) |
| Trainer | Iqrar Rizvi |

## Getting Started

Before session 1, the trainer sets up a practice project in Jira called Harbourline (key HBL) and invites each learner. It is made up: a login page, a booking page and ten sample tickets. Learners need a browser and a free Atlassian account to accept the invitation.

## The Problem

A tester writes "login broken" and moves the ticket along. The developer asks what broke, the tester answers two days later, and nobody can say whose turn it is. Most Jira training teaches the screens. This guide teaches two habits: write a ticket someone else can reproduce, and know whose turn each status is.

## What I Did

- **Taught the workflow as a relay:** six statuses, and one owner for each.
- **Gave every ticket six parts:** a short summary, steps, the result you expected, the result you got, a severity and evidence.
- **Used one made-up project,** Harbourline, so every learner sees the same tickets.
- **Ended each session by doing:** a ticket written, a ticket moved, a search saved.
- **Wrote a quiz** about whose turn it is, not about screen names.

```prompt
Here are my notes from testing the Harbourline login page.
Write one Jira bug ticket: a summary under twelve words, numbered steps,
the expected result, the actual result and a severity with one reason.
```

## The Result

No learner data is published here, so I make no claim about how well it worked. What exists is a complete 90-minute plan, a status table and a six-question quiz, all on a made-up project. Below, the ticket the prompt above produces from a learner's notes.

<!-- site:run ticket -->

```text
HBL-11 Login stays on the page after a correct password
Steps
1. Open the Harbourline login page
2. Enter a valid email and password
3. Select Sign in
Expected: the booking page opens
Actual: the login page reloads with no message
Severity: High, no customer can book
Evidence: screen recording attached
```

<!-- /site:run -->

An example of the idea, not a real ticket. The key, page and details are made up.

## What I Would Change

- A second practice project with a broken workflow will teach learners to spot a ticket stuck in the wrong status.
- A session on writing the reply when a developer cannot reproduce a bug will close the loop.
- Pairing learners, one writing and one trying to reproduce, will show gaps in a ticket faster than a trainer can.
- Asking one question a month later will show what stuck.

## Units

| Unit | Session | Minutes | You Will Learn To |
|---|---|---|---|
| 1. The Ticket | 1 | 30 | Write a bug ticket another person can reproduce |
| 2. The Workflow | 2 | 30 | Say whose turn it is, and move a ticket the right way |
| 3. Finding Tickets | 3 | 30 | Search with a short query and save it as a filter |
| **Total** | **3** | **90** | |

## Six Statuses

The workflow in the practice project. Jira lets a team choose its own, so a real project may differ.

| Status | Whose Turn | The Tester's Job | Then |
|---|---|---|---|
| Raised | Triager | Write the ticket so it can be reproduced | Triaged |
| Triaged | Developer | Answer questions in the comments | In Progress |
| In Progress | Developer | Wait, and do not retest yet | In Test |
| In Test | Tester | Run the same steps on the build with the fix | Done, or Reopened if it still fails |
| Done | Nobody | Add the build number you checked | Nothing |
| Reopened | Developer | Say what still fails, with new evidence | In Progress |

## Quiz

One question at a time. Five or more means you are ready to work on a real project.

<!-- site:quiz -->

1. A fix is ready and the ticket is In Test. Whose turn is it? **Answer:** The tester's. The developer has handed it over.
2. Which part of a bug ticket do testers most often leave out? **Answer:** The expected result. Without it, nobody knows what counts as a bug.
3. A retest still fails. What do you do? **Answer:** Move it to Reopened and add what still fails. Do not open a second ticket for the same bug.
4. Why attach evidence? **Answer:** So the developer can see the bug without asking. A screenshot or recording saves a round trip.
5. What does this query find? project = HBL AND status = "In Test" **Answer:** Tickets in the Harbourline project that are waiting for a tester. The query reads like a sentence: this project, in this status.
6. You moved a ticket to Done, then found a new bug nearby. What now? **Answer:** Raise a new ticket and link it. A closed ticket should describe one fix.

<!-- /site:quiz -->

## See Also

Before a ticket is fixed, someone decides whose job the fix is. The product portfolio's [Rejected-Ticket Triage](https://rizvihiqrar.github.io/product-portfolio/case-studies/03-rejected-ticket-triage.html) shows how I decide, and its [Release Notes to a Change Brief](https://rizvihiqrar.github.io/product-portfolio/case-studies/08-release-notes-to-a-change-brief.html) shows what happens to a fixed ticket afterwards.

<!-- site:fold -->

[Read the full version](full/jira-workflow-guide-full.md), with the design decisions, the three sessions and how learning was checked.

<!-- /site:fold -->
