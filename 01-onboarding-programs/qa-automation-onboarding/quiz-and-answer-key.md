# Quiz and answer key

Ten questions, given after Day 9. One point each. Give feedback with every answer, right or wrong. Eight or more means ready for the final practice; fewer than eight means review the days named in the key before Day 10.

## Questions

1. Which keyboard shortcut opens the integrated terminal in VS Code?
2. What does the Command Palette (Ctrl+Shift+P) do?
3. In a terminal, what does `pwd` show you?
4. What does `npm install` do?
5. Copilot shows grey suggestion text as you type. How do you accept it, and how do you dismiss it?
6. Why should you read Copilot's code before relying on it?
7. Which command runs a Playwright test suite?
8. Which prompt is better for Copilot, and why?
   - A: "Write a test."
   - B: "On the /checkout page, write a test that checks the order total changes when the quantity changes."
9. In an automated test, what is the difference between a selector and an assertion?
10. Which tool records your clicks in a browser and turns them into a starting test?

## Answer key

| # | Answer | Feedback and where to review |
|---|---|---|
| 1 | Ctrl+` (backtick) | The terminal lives inside VS Code, so you never switch apps. Day 1. |
| 2 | Runs any VS Code action by typing its name | Useful when you forget where a menu item is. Day 1. |
| 3 | The folder you are in now (the current directory path) | "Where am I?" Check before running any command. Day 2. |
| 4 | Installs the packages a project lists in its package.json | Run it once after getting a project, before running tests. Day 2. |
| 5 | Tab accepts it; Esc dismisses it | The grey text is only a suggestion until you accept it. Day 3. |
| 6 | It is a suggestion, not guaranteed correct | It can miss cases or invent things. Read it, then run it. Days 3 and 5. |
| 7 | `npx playwright test` | Day 7. |
| 8 | B | It names the page, the action and the expected result. Vague prompts get vague tests. Day 9. |
| 9 | A selector finds the element on the page; an assertion checks that something is true and fails the test if it is not | Both are needed: find it, then check it. Day 8. |
| 10 | Playwright codegen (`npx playwright codegen` followed by the page address) | A starting point to edit, not a finished test. Days 7 and 10. |
