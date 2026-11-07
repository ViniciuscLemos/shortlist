# shortlist

Paste your resume and a job ad, and see how close they are: what the ad asks for, what your resume shows, what's missing, and what to fix before sending it.

It's a work in progress. The part that reads and compares is done and tested; the page comes next.

## How it reads

- **The job ad** is split by its headers, the way ads are actually written in Brazil and abroad: *Requisitos* / *Requirements* is required, *Diferenciais* / *Nice to have* is a plus, *Responsabilidades* / *What you'll do* counts as mentioned. A line like "Docker (desejável)" inside the requirements is still a plus. *Benefícios* is skipped, so "auxílio para curso de inglês" isn't read as "English required". It also picks up "3+ anos de experiência" and the level in the title (júnior, pleno, sênior).
- **The resume** is split into its sections (experience, projects, skills, education...), so it knows *where* each skill shows up. React in a job line that says what you built with it is worth more than React in a list of 30 technologies: a skill that's only listed counts 60%.
- **Experience** is added up from the date ranges ("mar 2023 - atual", "01/2020 – 12/2021"), and two jobs at the same time don't count twice.
- **Skills** come from a dictionary of about 90, each with the ways people write it ("Node.js", "NodeJS", "node"; "testes unitários", "unit tests", "TDD"). Short names that are also plain words ("Go", "Excel", "REST", "C") only count written the technical way, so "I go to" and "excel at" don't turn into skills.

## What it says

A score from 0 to 100 (required counts 3, mentioned 2, a plus 1), a sentence about the match, what's missing, and a few checks on the resume itself: contact at the top, a GitHub or LinkedIn link, lines with numbers in them ("reduced cart abandonment by 18%"), lines that start with what you did instead of "responsible for", and skills the ad asks for that only show up in a list.

## Why no AI (yet)

Everything runs in the browser: the resume never leaves the computer, it's instant, it's free to host, and when it says "Kubernetes is missing" you can see exactly which line of the ad asked for it. An AI step to rewrite the weak lines is planned on top of this, as an option.

## Running

```bash
npm install
npm test
```
