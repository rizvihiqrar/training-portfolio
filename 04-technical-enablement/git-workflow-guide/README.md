# Git for New Testers

| At a Glance | |
|---|---|
| Audience | Testers and analysts who have never used version control |
| Level | Beginner. No coding needed, and a first look at the VS Code terminal helps. |
| Length | 2 hours: 4 sessions of 30 minutes |
| Format | Self-paced or group. Every session ends with something you do. |
| Tools | Git, GitHub, VS Code |
| Trainer | Iqrar Rizvi |

## Getting Started

Install these before session 1, and make a free GitHub account:

- [Git](https://git-scm.com/downloads), the tool that keeps the save points
- [VS Code](https://code.visualstudio.com/Download), where you will open the practice project. Open its terminal with Ctrl+`.

Then type these three lines once, with your own name and email. The first tells Git who you are, the second does the same for your email, and the third keeps `git pull` simple in session 4:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global pull.rebase false
```

## The Problem

A tester copies a test file, edits it and emails it back. A teammate edits the same file, and one change is lost. Nobody can say which version ran last Friday. Version control prevents both, yet most guides begin with commands instead of the idea. This guide begins with one safe habit: never work on the main copy.

## What I Did

- **Taught one idea per session,** in this order: save points, branches, sharing, and conflicts.
- **Kept to eight commands,** the only ones a tester needs to send a change for review.
- **Used one made-up project,** `harbourline-tests`, so every learner types the same files and sees the same results.
- **Ended each session by doing:** a commit, a branch, a pull request, a fixed conflict.
- **Wrote a quiz** that checks the habit, not the vocabulary.

```prompt
I changed tests/login.spec.ts and want a teammate to review it.
Give me the Git commands in order, and say what each one does in everyday words.
```

## The Result

No learner data is published here, so I make no claim about how well it worked. What exists is a complete two-hour plan, an eight-command cheat sheet and an eight-question quiz, all on a made-up project. Below, the answer to the prompt above, as a learner sees it in session 3.

<!-- site:run branch -->

```bash
$ git switch -c add-login-check
Switched to a new branch 'add-login-check'
$ git add tests/login.spec.ts
$ git commit -m "Add login check"
[add-login-check 4f2a9c1] Add login check
$ git push -u origin add-login-check
Branch 'add-login-check' set up to track 'origin/add-login-check'.
Next: open a pull request on GitHub
```

<!-- /site:run -->

An example of the idea, not a recording of a real learner. The branch name and commit code are made up.

## What I Would Change

- A practice project learners can break and reset will remove the fear of losing work.
- A fifth session on reviewing a pull request, taught from the reviewer's side, will close the loop.
- Pairing learners for the conflict session will help, because explaining a conflict beats reading one alone.
- Asking one question a month later will show what stuck.

## Units

| Unit | Session | Minutes | You Will Learn To |
|---|---|---|---|
| 1. Save Points | 1 | 30 | Say what a commit is and make one with a clear message |
| 2. Branches | 2 | 30 | Start a branch so the main copy stays safe |
| 3. Sharing | 3 | 30 | Push a branch and open a pull request |
| 4. Conflicts | 4 | 30 | Read a conflict and choose what stays |
| **Total** | **4** | **120** | |

## Eight Commands

Everything a tester needs to send a change for review. Angle brackets mean "put your own name here".

| Command | Use It To |
|---|---|
| `git clone <address>` | Copy a project to your computer |
| `git status` | See what you changed |
| `git switch -c <name>` | Start a new branch and move onto it |
| `git add <file>` | Choose what goes into the next commit |
| `git commit -m "<message>"` | Save the snapshot with a message |
| `git push -u origin <name>` | Send your branch to GitHub |
| `git pull` | Bring in your teammates' changes |
| `git switch main` | Go back to the main copy |

## Quiz

One question at a time. Six or more means you are ready to work on a real project.

<!-- site:quiz -->

1. What does a commit do? **Answer:** Saves a snapshot of your changes with a message. A commit is a save point you can return to.
2. Why work on a branch instead of main? **Answer:** Main stays working while you try your change. Nothing reaches main until someone has reviewed it.
3. Which command starts a new branch and moves you onto it? **Answer:** git switch -c add-login-check. The -c means create.
4. What does git add do? **Answer:** Chooses which changes go into the next commit. You can add some files and leave others for later.
5. What does git push do? **Answer:** Copies your branch's commits to GitHub. Until you push, nobody else can see your work.
6. What is a pull request? **Answer:** A request for a teammate to review your branch and merge it. It is where the discussion happens.
7. Git says CONFLICT in a file. What happened? **Answer:** You and a teammate changed the same lines, and you choose what stays. Git will not guess which change is right.
8. Which file should never be committed? **Answer:** A file with a password or key in it. Once pushed, a secret stays in the history.

<!-- /site:quiz -->

## See Also

A pull request that is sent back is a decision like any other: does the fix belong in the requirement or in the code? The product portfolio's [Ticket Triage](https://rizvihiqrar.github.io/product-portfolio/case-studies/03-rejected-ticket-triage.html) shows how I decide.

<!-- site:fold -->

[Read the full version](full/git-workflow-guide-full.md), with the design decisions, the four sessions and how learning was checked.

<!-- /site:fold -->
