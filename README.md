# Classroom suite

Three tools that share one roster and one origin:

| Path | What it is |
|---|---|
| `/` | Launcher page with links to all three |
| `/gradebook/` | Standards gradebook (entry, grouping, iReady, ORF, report card) |
| `/planner/` | Lesson planner |
| `/fluency/` | Oral reading fluency assessment |

Plus `sw.js`, `suite-theme.css`, `suite-sync.js`, `suite-nav.js`, `suite-boot.js` and the icons at the root, shared by all three.

## The look

`suite-theme.css` holds the palette, type and spacing for all three tools. Saturated colour is reserved for the 1–4 marks, so a row of scores reads at a glance with nothing else competing; everything else is type, spacing and one hairline. Blur appears on exactly two things — the sticky header and the corner switcher — because that is the one job it does well, and because blurring a 24-row roster is slow on a classroom Chromebook.

The planner and the running-records tool are retoned through **their own CSS variables**, which they already had. That means neither tool's rules or markup were rewritten to restyle them, and removing the one `<link>` to `suite-theme.css` from a page restores it exactly as it was.

Type is IBM Plex Sans with IBM Plex Serif for titles and reading passages, loaded from Google Fonts and cached by the service worker after the first visit. If the very first load is offline it falls back to Segoe UI or the system sans and everything still lays out correctly.

Print flattens completely: no glass, no tint, no shadows, so Synergy entry sheets and student records stay black on white.

**Each app lives in its own directory on purpose.** A web app manifest claims a *scope*, and a browser will not install a second app whose start page falls inside an already-installed app's scope — it offers to open it in the existing app instead. When all three sat at the root they shared one scope, so only the first could ever be installed. One directory per app gives each a scope of its own.

---

## Why these have to be hosted together

Two things depend on it.

**A service worker will not run from `file://`.** Installing to a home screen and working offline both require the app to be served over HTTPS (or localhost). That is the whole reason this is a folder rather than a single file you double-click.

**The live link between the gradebook and the running-records tool is an origin-scoped thing.** The gradebook reads the ORF tool's data straight out of browser storage. That only works when both are the same origin. Right now, as local files, they share the `file://` origin. Once the gradebook is hosted and the ORF tool is not, that link silently breaks. Keeping both in this folder keeps them on one origin and the link keeps working.

---

## Portability

Nothing in these files assumes a particular address. Every path is relative and each manifest uses `"scope": "./"`, so the same folder works unchanged at a domain root, in a subfolder such as `user.github.io/classroom/`, or opened straight off disk. The service worker is registered as `../sw.js` from each app directory, which gives it the suite root as its scope without needing any special response header — so hosts that cannot set headers, GitHub Pages among them, work fine.

### If your school blocks the host

Managed Chrome profiles often block `*.pages.dev` and `*.workers.dev` wholesale, because free instant subdomains are a common phishing and proxy vector. The block follows the profile, so it applies on personal hardware too.

Check `chrome://policy` and search for `URLBlocklist`. That is the actual list, and picking a host that is not on it is faster than any appeal. `github.io` is often allowed where the free-subdomain hosts are not, since it is not usable as an open redirect in the same way. Others worth testing on the school profile: `netlify.app`, `vercel.app`, `web.app`.

Because the suite is path-independent, moving hosts means re-uploading the same folder. Nothing inside changes.

**Last resort that always works:** open `index.html` from a folder on disk. All three tools run, they share one origin so the roster and fluency links still work, and Chrome treats `file://` as a secure context so the synced-file button still works too. You lose only installation and the service worker — and offline was never a question for files already on your machine. Keep the folder in Google Drive and both the tools and `classroom.json` follow you between computers.

---

## Putting it online

Any HTTPS static host works. Three routes, all free.

### Option A — Cloudflare Pages, no repository at all (simplest)

1. Make a free Cloudflare account.
2. Workers & Pages → Create → Pages → **Upload assets**.
3. Drag this whole folder in. Name the project, deploy.
4. You get `https://<project>.pages.dev`, on HTTPS, in about a minute.

To update, drag the folder in again as a new deployment. No git, no build step, no command line.

One thing to decide up front: if you think you will later want version history and deploys on push, connect a Git repository from the start instead of uploading. Cloudflare does not let a Git-connected project switch to direct upload afterwards.

### Option B — Cloudflare Pages from a private GitHub repository

Cloudflare Pages builds from **private** repositories on the free plan, which is the specific thing GitHub Pages will not do. Push the folder to a private repo, then in Cloudflare choose Connect to Git, pick the repo, leave the framework as None and the output directory as `/`. Every push redeploys.

### Option C — GitHub Pages with a public repository

Often the one that survives a school filter. The repository has to be public on a free account, which is acceptable here — none of these files contain student data, and the data itself never leaves your browser and your own synced file. The only thing on display is the code.

1. Repo → Settings → General → bottom of the page → **Change visibility** → Public.
2. Repo → Settings → **Pages** → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`. Save. Pages is off by default; making the repo public does not switch it on.
3. Make sure `.nojekyll` is in the repo root. Without it GitHub runs the files through Jekyll, which skips anything beginning with an underscore and can mangle a static site in ways that are tedious to debug.
4. Wait a minute or two, then open `https://<username>.github.io/<repo>/`.

Your site is at `/<repo>/`, not the domain root. That is fine — every path in these files is relative. If you would rather have the root, rename the repository to `<username>.github.io`; you get one of those per account.

**Do not run two hosts at once.** `username.github.io` and `project.pages.dev` are different origins, so each has its own copy of everything: roster, marks, plans, and the permission for your synced file. Work on one, and export a backup from the other before you stop using it. Deleting the Cloudflare Pages project, or at least your bookmark to it, is the reliable way to avoid entering marks into the wrong one for a week.

The `_headers` file is Cloudflare-specific and simply ignored by GitHub Pages. Nothing depends on it.

### Putting a login in front of it

None of the above hides the site itself. The URL is unguessable and the app is empty until data is loaded into it, so an accidental visitor sees a blank gradebook — but if you would rather it be properly gated:

Cloudflare Zero Trust → Access → Applications → self-hosted, pointed at your `pages.dev` hostname, with a policy allowing your email address and an email one-time-PIN login. Free for up to 50 users. Cloudflare's own docs have a short procedure for enabling Access on a `pages.dev` domain; the extra steps in it only apply if you have added a custom domain, which you have not.

**Set the session duration long** — a month rather than the default — or the installed app will keep bouncing you to a login screen. Offline use is unaffected either way, since the service worker serves the cached copy without asking the network.

### About repository privacy, corrected

An earlier version of this file said a private repository would work on GitHub Pages. It will not on a free account: GitHub Pages only publishes from public repositories unless you are on Pro, Team or Enterprise, and even then the published site stays public unless you are on Enterprise Cloud with Pages access control. If you want a private source and a gated site without paying, Cloudflare is the route.

---

### Installing it

**Three installable apps.** Open `/gradebook/`, `/planner/` or `/fluency/` and install each one you want. Each has its own manifest, scope, icon and start page, so they sit side by side in your dock or on your home screen. They are the same cached files underneath, the corner switcher moves between them, and any of them can connect the sync file.

If an app offers **Open in Gradebook** rather than **Install**, its start page is inside another app's scope — check that each manifest's `scope` matches its own directory.

An **Install** button appears in the corner switcher whenever the browser considers the page installable, which saves hunting for the browser's own control. If it is not showing, the browser is telling you something — work down this list:

1. **Reload once.** The service worker registers on first visit; the install offer usually only appears on a later load.
2. **Are you already in the installed app?** The button hides itself in standalone mode.
3. **Which browser?** Chrome and Edge on desktop and Android support this. Firefox desktop does not install web apps at all. On iPhone and iPad use Safari → Share → *Add to Home Screen*. On macOS Safari it is File → *Add to Dock*.
4. **Use the menu instead of the address bar.** Chrome: ⋮ → *Cast, save and share* → *Install page as app*. Edge: ⋯ → *Apps* → *Install this site as an app*. Chrome on Android: ⋮ → *Add to home screen*.
5. **Ask the browser what is wrong.** F12 → Application → Manifest. Chrome lists installability errors there in plain language, which beats guessing.
6. **School-managed device?** Chrome policy can disable web app installation entirely, and nothing in the page can override that. The site still works perfectly in a normal tab, including offline.

Installation is a convenience, not a requirement. Everything — offline use, sync, storage — works the same in an ordinary bookmarked tab.

The running-records tool is reached through the switcher rather than installed separately, since it is always opened in the middle of doing something else.

### Updating it

Redeploy the changed file, then **bump `CACHE` in `sw.js`** (for example `classroom-suite-v7` → `-v8`). Next time you open the app it notices the new version and offers a reload link.

Page loads go to the network first and fall back to the cache, so a page that moves can never keep serving from a stale cache. Scripts and icons stay cache-first, which is why the version bump still matters for them. The install step caches each file separately rather than as one batch: a single missing path costs that one file instead of stopping the new worker from taking over at all.

### When a change does not appear

1. Hard reload: Ctrl+Shift+R, or Cmd+Shift+R on a Mac.
2. F12 → Application → Service Workers → **Unregister**, then reload. This only clears cached app files; your data is untouched.
3. Check the URL in a private window. That has no service worker and no cache, so whatever it shows is what the server is really sending.
4. If a page 404s in a private window, the problem is the deploy, not the cache — check the paths in the repo and the build log in Cloudflare.

---

## The three tools as one app

A small switcher sits in the bottom corner of every page, so you move between the gradebook, the planner and the running-records tool the way you'd move between tabs. It is injected by `suite-nav.js`; delete the one script tag at the bottom of a file to remove it from that page.

They stay three separate files on purpose. Each can fail, be edited, or be rolled back without touching the other two, and the assessment tool in particular is used in a moment where a mis-tap into a different screen matters. What they share is an origin, a roster link, a sync file, and now navigation — which is most of what being "one app" actually buys.

### The planner now syncs on its own

It no longer depends on the gradebook being open. `suite-boot.js` starts sync and registers the service worker on the planner and the running-records tool, which have no boot code of their own.

### One caveat about the planner's Team view

The planner's team sharing was written against Claude's published-artifact storage. That does not exist on GitHub Pages, so once hosted here, Team will not sync with colleagues. Everything else in the planner works normally, and its data is now covered by the sync file below. If team sharing matters more than offline install, keep using the planner as a published artifact and treat the copy here as read-only.

---

## Connecting the planner to the gradebook

Gradebook → **Planning**.

The planner records where you are in a curriculum (Reveal U2 L5, Benchmark U1 W3 D2). The gradebook records standards. Nothing bridges those two on its own, so the Planning tab is where you say what each unit covers — at unit level, not per lesson. Roughly a dozen rows per subject.

Nothing is filled in by default, deliberately. Only you know what your Reveal and Benchmark units actually cover, and a wrong guess here would quietly corrupt the coverage and reteach views.

Once units are mapped, three things start working:

- **Entry gets faster.** The Enter tab shows a row of buttons for the standards the planner says you taught that day, so you stop hunting in the dropdown.
- **Coverage gaps surface.** Units you have taught where fewer than half the class has a mark on the standards, and units taught with no standards attached at all.
- **Reteach prompts.** For the most recent unit in each subject, who is still sitting at 1 or 2 on its standards — before you move on rather than after.

iReady-derived marks are excluded from both the coverage count and the reteach list, since neither question is about a screener.

---

## Moving between assignments

The Enter tab has a stepper above the roster: arrows for newer and older, a dropdown of every assignment with how many students are marked, and **Next unfinished**, which cycles through the ones still missing somebody. `Alt` with the left and right arrow keys does the same without leaving the roster.

An assignment was never stored as its own record — it is simply the marks that share a standard, a date and a context ("exit ticket", "worksheet"). The list is rebuilt from that, so nothing needed migrating and everything you have already entered appears. Marks derived from iReady or the ORF tool are left out, since those are not assignments you graded. A student logged as not turning work in counts toward the assignment being finished, which is the point of logging them.

**New assignment** starts one on today's date and puts the cursor in the "what was it?" box. It shows at the top of the list marked *new* until you enter the first mark.

---

## Sub plans

They live in the **planner**, on the *Sub plan* button in the bottom corner. Pick a day and print either document:

- **Full plan** — block by block, with what the planner says you are teaching in each one, your note for that lesson, the day's note, and an "if you cannot find it" fallback for every block. Ends with a page for the sub to write back to you.
- **The one-pager** — a single table of times, what happens and where to find it, plus the attention signal, the students to keep an eye on, and the behaviour ladder in one line each. For a sub who will not read three pages.

Both are generated fresh from the planner each time, so a plan is never out of step with where you actually are in a unit. Blocks carry a days field (M T W R F) so a Monday-only block stays off a Friday plan, and a block linked to a planner subject fills its own lesson in.

`sub-plans.js` is injected into the planner rather than built into it, the same way the switcher is — the planner's own code is untouched, and deleting one `<script>` tag removes the feature cleanly. The notes live under their own key, `suite:subplan:v1`, which syncs with everything else.

**The published files contain no standing notes at all** — no names, no behaviour notes, no phone number, only the empty time blocks. This site is served from a public repository, and children's behavioural information must never be committed to one. Load yours from a private JSON file (Planning → Sub plan → *Load standing notes*) and it lives in this browser and your synced `classroom.json`, which is where the roster already is. Keep that seed file out of the repo folder.

### Science and Social Studies

That block is free text in the planner rather than a lesson number, because "Lesson 4" says nothing useful about what it actually is. `suite-migrate.js` makes the switch once, before the planner boots, and rewrites anything already recorded as text ("Lesson 3") so no history is lost.

---

## Syncing your data

Connect once, from **any** of the three tools — the sync pill in the corner switcher, or Gradebook → Setup → Sync. Create the file inside your Google Drive folder (with Drive for Desktop installed), for example `Google Drive/Classroom/classroom.json`.

**One file holds all three tools.** `suite-sync.js` is shared, so the gradebook, the planner and the running-records tool all read and write the same JSON. Connecting from the planner is exactly as good as connecting from the gradebook, and whichever one is open keeps the file current. Nothing has to be open for the others to be covered, because on any one machine all three already share the same browser storage — the file is only the transport between machines.

Files written by the earlier gradebook-only version are read correctly, so there is nothing to migrate.

From then on every change is written to that file, Drive syncs it, and each tool checks roughly every twenty seconds for changes made on another machine.

The gradebook redraws itself when its own data arrives. The planner and the running-records tool read their data once at startup and never again, so when newer data arrives there they offer a **Reload** button rather than swapping it out underneath you — there may be an unsaved day on the screen. Newer always wins, so the machine you used last is the one that counts. On a second computer, choose **Open an existing one** and point at the same file.

No Google sign-in, no API, no server. It is an ordinary file that Drive happens to keep in step.

**Limits worth knowing.** This uses the File System Access API: Chrome and Edge on a computer only. Safari and iPads do not have it, and there the app still works but saves only in that browser, with the backup buttons to move data by hand. If you need the iPad, that is the point where the real Google Drive API and OAuth become worth the trouble.

**Back up anyway.** Setup → *Save a backup file*, once a week. Sync is not a backup: a mistake syncs too.

---

## If you installed an earlier layout

The apps used to sit at the root. Their scopes changed when they moved into directories, so an app installed from the old layout should be uninstalled and installed again from `/gradebook/` or `/planner/`. Update your bookmarks to the directory URLs too.

**Your data is untouched.** Local storage, the IndexedDB handle for the synced file and the sync file itself are all tied to the origin, not the path, and the origin has not changed.

---

## Data, plainly

Student names and marks live in two places: your browser's local storage, and the JSON file you connect. Nothing is uploaded anywhere, and none of it passes through GitHub. Before relying on this, it is worth a conversation with the district about where student data is allowed to live — the answer is usually easier than people expect, and it is much easier asked first.
