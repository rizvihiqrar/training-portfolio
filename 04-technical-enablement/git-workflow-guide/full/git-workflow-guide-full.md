# Git for New Testers: Full Version

The longer version of the course page: who it is for, the choices behind it, the four sessions and how learning was checked. All names, files and numbers in the practice project are made up.

## Who It Is For

Testers, analysts and support staff who open a shared project but have never used version control. They can use a terminal after the QA Automation Onboarding course, or can learn the few commands here. Developers do not need it.

## The Practice Project

Every learner clones the same made-up project, `harbourline-tests`. The trainer prepares it in a private GitHub repository before the course and gives each learner its address. It holds a README, a `tests/` folder with `login.spec.ts`, and a second branch that changes the same line of that file, which session 4 pulls in to make a conflict. The project itself is not published in this portfolio. Because everyone starts from the same files, a trainer can predict each result and spot a wrong one at a glance. Nothing in it is real, and a learner cannot harm anything by breaking it.

Two things are set up before session 1: the three one-time `git config` lines on the course page, and GitHub sign-in. The first push asks for a sign-in, and in session 3 the trainer sits beside each learner for it.

## Design Decisions

- **Save points first.** A commit is explained as a save point with a label before any branch is mentioned. Learners who understand the save point stop fearing the rest.
- **One safe habit.** The first rule is never to work on the main copy. Every later command follows from it.
- **Eight commands only.** `reset`, `rebase`, `stash` and `cherry-pick` are left out on purpose. A tester who needs them later has the base to learn them.
- **The desktop and the terminal are both shown.** VS Code's source control panel does the same jobs as the commands. Learners may use either, but the cheat sheet teaches the commands, because help forums and the AI helper speak in commands.
- **The conflict gets a whole session.** It is the point where learners most often give up, so it is taught last, on a prepared conflict, with the trainer beside them.
- **What it cost:** no history rewriting, no reviewing someone else's pull request, no command-line merge tools.

## The Four Sessions

| Session | Minutes | Activity | Check |
|---|---|---|---|
| 1. Save Points | 30 | Explain a commit with a drawing; clone the project, change one line, run `git status`, commit | The learner shows their commit message |
| 2. Branches | 30 | Draw main and a branch; start a branch, commit twice, switch back to main and see the change disappear | The learner switches between the two and says what is different |
| 3. Sharing | 30 | Push the branch; open a pull request on GitHub; read what the page shows | A pull request exists with a clear title |
| 4. Conflicts | 30 | Pull a prepared change that touches the same line; read the markers; choose what stays; commit | The conflict markers are gone and the file reads correctly |

## How Learning Was Checked

- **During each session:** a "show me" check at the end, listed in the table above, so anyone lost is found within the half hour.
- **After session 4:** the eight-question quiz on the course page, one question at a time, with the right answer and a reason after each pick. Six or more means ready for a real project.
- **A month later:** one question, "have you used this since?"

No learner results are published here. The figures that would belong in this section (quiz scores, how many learners finished) do not exist yet, and I would rather say so than invent them.

## Materials

| Item | Where |
|---|---|
| Course page with the quiz and the eight-command table | [README](../README.md) |
| Quiz questions, without answers | [Quiz](../quiz.md) |

## What I Would Change

- Build a practice project that resets itself, so a learner can start again after a mistake.
- Add a session on reviewing someone else's pull request.
- Record a two-minute screen capture of each session's activity for learners working alone.
- Pair learners for the conflict session.
