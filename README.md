# Classroom suite

Five tools for one second-grade classroom, sharing one origin and one roster:

| Path | What it is |
|---|---|
| `/` | Launcher |
| `/gradebook/` | Standards gradebook: Enter marks, Skill groups, Math goal, Students, ORF reading progress, Conferences, Setup (iReady comes in there) |
| `/planner/` | Lesson planner: Today, Week, Settings, sub plans, and files and links on each lesson |
| `/fluency/` | Oral reading fluency: Assess and Passages |
| `/groups/` | Small groups: the math rotation board (2 to 6 groups, each with its own name, station, picture and colour, set in Setup), reading cards, Walk to WIN slides |

They install together as one app ("Classroom"), work offline, and keep their
data in the browser. Shared files sit at the root: `sw.js`, `suite-theme.css`,
`suite-sync.js`, `suite-planner-sync.js`, `suite-nav.js`, `suite-boot.js` and
the icons.

## The look

`suite-theme.css` holds the palette, type and spacing for every tool.
Saturated colour is kept for the 1–4 marks; everything else is type, spacing
and one hairline. IBM Plex Sans, with Plex Serif for titles and reading
passages, cached by the service worker after the first visit. Print is black
on white.

## Putting it online

It is hosted on **GitHub Pages** from a public repository. The contents of
this folder go at the repository root, `.nojekyll` included. Every path is
relative and every manifest's scope is the suite root, so the folder works at
a domain root or in a subfolder such as `user.github.io/classroom/`.

Some school networks block whole hosts (`*.pages.dev`, for one). Check
`chrome://policy` → URLBlocklist before moving it anywhere else.

**Updating.** `npm run build` stamps `sw.js` with a name computed from the
files, so a changed site always reaches devices; `npm test` fails if the
stamp is stale. Open the app and it offers a reload. To see what a device is
running: Gradebook → Setup → This device. If a change does not appear,
DevTools → Application → Service Workers → Unregister, then reload (your
data is untouched).

## Installing it

Open any tool and choose **Install** in the corner switcher (Chrome or Edge),
or Safari → Share → *Add to Home Screen* on an iPhone or iPad. It installs
once, as one app, at the suite root. On iOS each home-screen app keeps its
own storage, so a new icon means removing and re-adding the app: back up
first. Installing is a convenience: everything works in a bookmarked tab too.

## Syncing your data

**A computer (Chrome or Edge)** watches one folder: Sync → **Choose the sync
folder**, one your phone also reaches (iCloud Drive, kept downloaded). It
merges what lands there within seconds and keeps a current `classroom.json`.

**A phone or iPad** taps: **Send** after changes (Save to Files, into that
folder) and **Get the latest** when starting (pick `classroom.json`). Getting
merges and can be undone.

**A computer that can reach neither:** **Email the sync file** from any
device; saved into a watched Downloads folder, it merges on its own.

**Live, through Firebase:** Sync → **Planner sync**, signed in with your
Firebase email and password. The planner, the math board, the reading cards,
the Walk to WIN slides and lesson files reach your other devices within
seconds; the boards carry children by id only, and everything typed is checked
for a child's name before it leaves the device. A computer that only projects
signs in as the display user and changes nothing. Security rules:
`tools/firestore.rules`.

Merges are three-way: whichever device actually changed a thing wins. **Back
up anyway** (Setup → *Save a backup file*): a mistake syncs too.

## Lesson files and links

On a lesson card, **Add files & links** (or **Files & links**). Drop, paste or
choose files, or paste a link or a note, for this lesson, this week, or every
lesson in the unit. They belong to the curriculum lesson (Reveal U3 L4,
Benchmark U2 W3 D1), not the date, so they move with the lesson and are there
next year. With Planner sync on they reach every device, and the display opens
them; without it they stay on this device. Up to 20 MB a file. Curriculum
resources only: file names, links and notes are checked for children's names,
but a file's contents are not.

## Sub plans

In the planner, the **Sub plan** button. A full plan (block by block, from the
planner's schedule and lessons) or a one-pager. Each day's lesson targets and
materials can be edited for that day. **The published files hold no standing
notes**: names and behaviour notes load from a private JSON kept outside the
repository (Sub plan → *Load standing notes*).

## Term marks, and Synergy

Grading is done in Synergy. The gradebook works out a mark per standard for
each marking period (Setup › Term marks) for conferences, Math goal and Skill
groups. **Setup › Your data › Download all marks** saves every mark as a CSV.

## Data, plainly

Rosters, marks, plans and running records live in your browser and your own
sync file. With Planner sync on, the planner, the boards (by id) and lesson
files also sit in your own Firebase project. No student name is ever in this
repository: it is public.
