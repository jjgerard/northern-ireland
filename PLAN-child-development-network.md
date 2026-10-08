# Plan: UK & Ireland Child Development Network site

A hand-off document for a new chat/repo. It describes what to build, what can
be reused from this repository, and, most importantly, what data may sensibly
be collected and published. Read **Part 2 (data and privacy)** before writing
any harvesting code.

> Not legal advice. The privacy analysis below is a working assessment for
> planning. The final decisions need the university Data Protection Officer
> (DPO), who will probably ask for a DPIA (see 2.6).

---

## 1. Product

A static-first web platform with four parts.

1. **Map** of child development labs and local/regional child development
   networks across the UK, with Ireland (ROI) as an optional later extension.
2. **Lab pages**: click a lab to see its researchers, their subject areas, a
   link to each researcher's own page, and a link to the lab's own site.
3. **Events calendar**: a coordinating calendar with a separate calendar per
   area of child development (infancy, language, social-emotional,
   neurodevelopment, education, etc.).
4. **Lab profile schema** (per lab/institution): structured records on
   (a) ethics processes and (b) participant recruitment, so the process can be
   compared across the UK nations and Ireland.

### 1.1 Reuse from this repository

This repo is a no-build static site (plain HTML/CSS/JS, Leaflet +
markercluster, JSON data files, GitHub Pages deploy). It is a good starting
point because the new site needs the same shape: a map page, filters, a
sidebar list, and a prepared JSON dataset.

| Reuse as-is / adapt | From | Notes |
|---|---|---|
| Map + cluster + sidebar list + filters | `schools.html`, `app.js` | Swap `schools` for `labs`; filters become institution, nation/region, topic, lab type. Map view changes from NI to UK+IE (roughly centre `[54.5, -4]`, zoom 5). |
| Site chrome, design tokens, cards | `styles.css`, `index.html`, `home.js` | Rename brand, nav (Map, Calendar, Compare, About). |
| Data-file pattern + build scripts | `data/*.json`, `scripts/` | Same idea: a script builds committed JSON; the site only reads JSON. |
| GitHub Pages workflow | `.github/workflows/pages.yml` | Unchanged. |
| Table/slice builder UI | `enrolments.html`, `enrolments.js` | Good model for the cross-country **Compare** page (ethics/recruitment comparison tables). |
| Location approach | `scripts/build-schools.ps1` | Postcode-centre geocoding via postcodes.io. Same approach works for UK labs. Labs only need institution/building-level accuracy. |
| Safe-by-default precedent | `README` ("does not retain the directory's contact-email field") | Keep this stance: drop contact fields at import time. |

The README refers to the "Language Atlas" site as the interaction pattern
(page-specific map + filters + prepared JSON, with per-entry schemas). It is
not in this repo, so give the new chat access to it (or paste its schema
files) if the per-lab schema should follow it.

Recommendation: start a **new repository** copied from this one's structure,
not a branch of this one, because the content, licence and privacy posture are
different. Also decide early whether it will be a *public* repo (see 2.5).

---

## 2. Data sources, feasibility and privacy

### 2.1 Short answer

**Decision: labs are harvested; researchers add themselves.** The site
auto-populates labs, networks and lab links only. It never harvests named
researchers. Researchers create their own entries from a verified
institutional email, and can edit or delete them at any time.

- **Harvesting labs and institutions is feasible and low-risk.** These are
  organisations, and almost all of the needed information is published in
  open, structured, reusable form.
- **Named researchers are personal data under UK GDPR (and EU GDPR for
  Ireland), even though much of it is public.** Harvesting them would need a
  lawful basis, notice to every person found, accuracy checks and an opt-out.
  Self-registration avoids most of that: the data comes from the person, the
  privacy notice is given at signup, and the person controls what is shown.
  "It's all public" does not on its own make harvesting permitted, so we do
  not rely on it.
- **The circulated list is not a safe benchmark either way.** See 2.2.
- **Do not scrape Google or Google Scholar.** Use open scholarly APIs instead
  (2.3). This is the main practical recommendation: it is both more
  defensible and more accurate.

### 2.2 The "is it OK because someone already googled it?" question

The legal question is not *how* the information was found. Searching the web
is not itself the problem. The questions are what is being collected, about
whom, what it is combined into, who it is shown to, and for how long.

- **Lab-level data** (lab name, institution, department, lab website, general
  location, broad topics) is organisational. It is not personal data unless it
  identifies an individual, e.g. a lab that is just "Dr X's lab" with the
  person's name in the title. Compiling this is fine.
- **Person-level data** (name, role, area of work, link to profile) is
  personal data. Anyone processing it needs a lawful basis and must meet the
  transparency, accuracy, minimisation and objection rules.
- **The circulated list** was a manual compilation, shared with a community
  of fellow researchers, for the purpose of that community. That is a
  relatively contained use and is probably within what listed people would
  expect. It does *not* establish that building a persistent, searchable,
  public, regularly updated database of named individuals is the same thing.
  The audience (anyone on the open web), the permanence, the systematic
  automation and the combination of data across sources all change the
  assessment. So:
  - If the list contains only labs/institutions: use it freely as a seed.
  - If it contains named people: treat those names as candidate data that
    still has to go through the process below. Check who compiled it and
    whether it was ever intended for onward use. Do not publish it as-is.
  - Whether circulating the list was itself fine is a question for whoever
    compiled it and their institution; it does not need resolving to proceed
    here, but it is a reason to involve the DPO early.
- Consequently, "analogous searches" are acceptable **to the extent the output
  stays at lab/organisation level, or the person-level output is limited to
  minimal, professional, public-facing facts with notice and opt-out.**

### 2.3 Recommended sources (open, structured, reusable)

Prefer these to scraping web pages. Verify each source's current licence/terms
in the new chat before relying on it.

| Need | Source | Why |
|---|---|---|
| Institution identity and coordinates | **ROR** (Research Organization Registry), HESA/Jisc HEI lists | Open, stable IDs, includes lat/long and country; works for UK and Ireland. |
| Researcher identity and topics | **OpenAlex** (open API, CC0 data) | Authors, affiliations, institutions, topics, works. No scraping. Beware author disambiguation errors. |
| Researcher self-curated profile | **ORCID public API** | The person controls what is public and links to their own page. Best source for "link to the researcher". |
| Funded projects and PIs | **UKRI Gateway to Research**, Wellcome grants, Irish funders (e.g. SFI, IRC) | Publicly funded records with named PIs; good for lab discovery. |
| Lab/network pages | Institution and department "research groups" pages, society directories | Fetch only the page the institution publishes for this purpose; respect `robots.txt` and ToS; rate-limit; identify the crawler with a contact address. |
| Existing networks | Developmental sections/societies, regional baby/child lab networks, collaboration networks | Candidates for the "networks" layer; cite and ask permission to list. |

Avoid: Google/Google Scholar scraping (against ToS and brittle), social
media, personal sites, anything behind a login, and any LinkedIn-style
scraping.

### 2.4 Field-level rules

**Lab / institution / network (default: harvest and publish)**
name, institution (ROR ID), department, nation/region, approximate location,
lab website URL, topic tags, type (lab / network / centre), source URL, date
checked.

**Lab harvesting rule.** Harvest the lab name, URL and institution only. Do
not pull staff names, contact details or member lists from lab pages. If a lab
is named after a person ("Dr X Lab"), flag it for review, since the name
itself is then personal data.

**Researcher (self-entered only; the minimum set)**
display name, role category (PI / postdoc / student / staff), subject areas
(chosen from the site's topic list, or imported from the person's own ORCID
at their request), link to their own institutional profile page or ORCID,
lab memberships (claimed, then confirmed by a lab lead or moderator),
`createdAt`, `lastConfirmed`, status (`pending-email` / `active` /
`membership-pending`). OpenAlex/ORCID may be used to *prefill the form for
the person who is signing up*, never to create entries for others.

**Never collect or publish**
email addresses and phone numbers (link out to the profile instead); photos;
home addresses; personal social media; protected-characteristic inferences;
anything about students who are not already listed on a public staff/student
research page; personal data about participants or families; any data drawn
from non-public sources.

Be cautious about listing PhD students and early-career researchers by name
unless they appear on a lab page or opt in. They have less control over their
public footprint and the highest turnover (accuracy problem).

### 2.5 UK GDPR checklist for the self-registered researcher layer

1. **Controller and purpose.** Decide who the controller is (likely the
   university, not an individual) and write one clear purpose, e.g. "to help
   child development researchers find collaborators and events across the UK
   and Ireland." Anything beyond that purpose (e.g. ranking people) is out.
2. **Lawful basis.** Self-registration is either consent or legitimate
   interests (the network's interest in a directory, with a short written
   legitimate interests assessment: purpose, necessity, balancing). Pick one
   and record it. With consent, withdrawal must be as easy as signing up.
   Check current ICO guidance, as the Data (Use and Access) Act 2025 amended
   parts of the regime.
3. **Transparency (Art. 13).** Because the data comes from the person, the
   privacy notice is shown at signup (purpose, fields, who sees them, how to
   edit/delete, controller contact). The harder Art. 14 duty to notify people
   whose data was found elsewhere largely does not arise, because no one is
   added without their own action.
4. **Right to object / erasure / rectification.** Researchers edit or delete
   their own entry directly after logging in. Also provide an email route for
   people who cannot log in (changed institution or name, lost access), handled
   case by case, with a fixed turnaround. Do not make an account the price of
   objecting. Someone who never signed up but is named elsewhere (e.g. in a
   lab's own free-text) can use the same route.
5. **Accuracy.** People keep their own entries current. Ask for
   re-confirmation annually and hide or delete entries that lapse. Lab
   membership is a claim until a lab lead or moderator confirms it.
6. **Minimisation and retention.** Collect only the 2.4 fields; delete lapsed
   entries after 12-18 months. Keep a log that a deletion happened without
   keeping the deleted personal data.
7. **Ireland.** If Irish researchers are listed, align with EU GDPR and the
   Irish DPC's approach. Treat it as "GDPR-compliant for both" and ask the DPO
   whether EU representative or other obligations arise.
8. **Special category data.** None should be collected. Topic tags are
   professional research areas, not special-category data about the person;
   do not add health, ethnicity, religion etc.
9. **Automated processing tools.** If an LLM or external API is used to
   extract names/roles from pages, that sends personal data to a processor.
   Check terms, location of processing and data-processing agreements, or
   keep extraction local/deterministic.

### 2.6 Process before launch

Building the site needs none of this. It applies before real researcher
entries are collected.

1. Tell the DPO what is being built. With self-registration only, the DPIA
   should be short.
2. Settle the controller, the lawful basis, and a short privacy notice.
3. Email the harvested labs: "your lab is listed, here is how to edit or
   remove it." This is courtesy and accuracy for organisational data, not a
   strict legal requirement.
4. Pilot with a few labs before opening registration to the network.
5. A named contact for removal requests and a documented turnaround.

### 2.7 Specific risks to design around

- **Keep person data out of git.** Harvested lab data can live in committed
  JSON. Researcher entries should not: they live in a database behind the
  login (see 4.2), so deleting an entry actually deletes it. A public repo's
  history cannot honour erasure. If the repo is private and has a short
  collaborator list, the problem is smaller but still exists, so the rule
  stays: no researcher data in commits.
- **Harassment / targeting.** Some child-development topics attract hostile
  attention (vaccines, gender, neurodiversity, education policy, adoption and
  care). A list that maps named people to named labs and locations, with
  links, makes them easier to target. Mitigate with minimal fields, no
  photos/emails, prompt takedown, and allowing a lab to list itself without
  naming everyone.
- **Child participants / safeguarding.** Labs host child visits. Show
  institution/building-level location only; link to the lab's own contact and
  recruitment page rather than listing visit logistics or schedules that
  involve children.
- **Misattribution and defamation.** Wrong lab-person links, or wrong
  statements about an institution's ethics process, can cause harm. Keep
  source URL, date and a "report an error" link on every record.
- **Scraping etiquette and rights.** Respect `robots.txt` and site terms,
  identify the crawler, cache and rate-limit, and avoid bulk copying of
  copyrighted text (store facts and links, not paragraphs). Database rights can
  apply to systematic extraction from a database; API/open-licence sources
  avoid this.
- **Comparative ethics data is about institutions, not people.** That lowers
  privacy risk but raises reputational/accuracy risk. Source from the
  institution's published policy where possible, record the source and date,
  mark the record as "volunteered by the lab" vs "from public policy", and
  offer the institution a right of reply before publishing comparisons.

### 2.8 Recommended approach (decision)

**Harvest labs, let researchers add themselves.**

- **Tier 1: labs and networks (automatic).** Seed from the supplied list, ROR,
  OpenAlex institution data and public lab pages. Store name, URL,
  institution, location and topics only, with a source URL and date. Publish
  after a light human check.
- **Tier 2: researchers (self-registered).** The site provides the
  functionality (signup, profile, lab-membership claims, edit, delete) but is
  not pre-populated with any named person. Signup requires a verified
  institutional email, so people can only create their own entry. Membership
  of a lab is a claim, confirmed by a lab lead or moderator. Show name, role,
  topics and links out only.
- **Tier 3: richer lab info (ethics, recruitment).** Volunteered by labs
  through a form, or extracted from public institutional policy pages with the
  source cited. Never speculate. Give institutions a right of reply before
  comparisons go live.

This captures most of the value (discovery and a UK-wide picture) while keeping
the personal-data footprint small and defensible. The supplied list is used
only for the lab layer; if it contains named people or contact details, strip
them at import (as `scripts/build-schools.ps1` does for the school contact
email).

Note: a public organisational list elsewhere (e.g. an OSF file of Northern
Ireland voluntary and community organisations) is a comparison for the lab
layer, not evidence that harvesting named people is fine. Do not cite it as
precedent for the researcher layer.

---

## 3. Data model (draft JSON)

Keep the repo pattern: build scripts produce committed JSON; the front end
reads it. Use enumerated, comparable values wherever possible so analysis
across institutions works, with free text plus `sourceUrl` and `lastVerified`
beside them.

```jsonc
// data/labs.json
{
  "id": "ror:…-lab-slug",
  "name": "…", "type": "lab | network | centre",
  "institution": { "name": "…", "ror": "…" },
  "department": "…",
  "nation": "England | Scotland | Wales | Northern Ireland | Ireland",
  "region": "…", "latitude": 0, "longitude": 0, "locationSource": "ROR | postcode",
  "websiteUrl": "…", "topics": ["language", "infancy", "…"],
  "memberIds": ["researcher-id"],       // filled at runtime from confirmed claims
  "sourceUrl": "…", "lastVerified": "YYYY-MM-DD", "status": "harvested | confirmed"
}

// researchers: self-registered, stored in the database behind login,
// NOT committed to git (see 2.7)
{
  "id": "…", "name": "…", "role": "PI | postdoc | student | staff",
  "topics": ["…"], "profileUrl": "…", "orcid": "…",
  "institutionalEmailVerified": true,       // email itself is not displayed
  "labClaims": [{ "labId": "…", "status": "pending | confirmed | rejected" }],
  "status": "pending-email | active | lapsed",
  "createdAt": "YYYY-MM-DD", "lastConfirmed": "YYYY-MM-DD"
}

// data/events.json
{
  "id": "…", "title": "…", "calendar": "infancy | language | …",
  "start": "ISO", "end": "ISO", "timezone": "Europe/London",
  "format": "in-person | online | hybrid", "location": "…",
  "url": "…", "organiser": "…", "labId": "optional", "status": "approved"
}

// data/ethics.json  (one record per institution; labs may inherit)
{
  "institutionRor": "…",
  "committeeStructure": "central | faculty | department | mixed",
  "reviewLevels": ["…"],               // e.g. proportionate / full
  "typicalReviewWeeks": { "min": 0, "max": 0 },
  "feesOrCharges": "none | per-review | …",
  "childSpecificRequirements": ["…"],
  "vettingScheme": "DBS | PVG | AccessNI | Garda | other | none",
  "parentalConsentModel": "opt-in | opt-out | mixed | varies",
  "ageOfConsentRules": "free text",
  "dataProtectionRequirements": ["DPIA required", "…"],
  "externalApprovals": ["NHS REC / IRAS", "local authority", "schools gatekeeper", "…"],
  "documentationUrl": "…", "source": "public-policy | volunteered", "lastVerified": "…"
}

// data/recruitment.json  (per lab or institution)
{
  "channels": ["participant database", "schools", "nurseries", "social media",
               "museum/science-centre", "birth/maternity routes", "community groups"],
  "databaseName": "…", "optInModel": "…", "incentives": "none | voucher | …",
  "travelExpenses": "…", "schoolAccessProcess": "…",
  "demographicsCollected": "yes | no | partial", "source": "…", "lastVerified": "…"
}
```

UK-specific points worth building into the ethics schema because they are
exactly what varies across the UK and Ireland: the vetting scheme (DBS in
England/Wales, PVG in Scotland, AccessNI in Northern Ireland, Garda vetting
in Ireland), NHS vs university ethics routes, how school and local-authority
access is brokered, and who may consent for a child.

---

## 4. Pages

| Page | Purpose | Based on |
|---|---|---|
| `index.html` | Overview, counts, links | `index.html`, `home.js` |
| `map.html` | Map of labs/networks with filters (nation, institution, topic, type), search, sidebar list | `schools.html`, `app.js` |
| Lab detail panel/page | Lab info, website link, members with topics and links, and its ethics/recruitment summary | extend map popup/sidebar |
| `calendar.html` | Month/list view, calendar switcher (one per area), filter by nation/format, "add to calendar" (ICS) | new |
| `compare.html` | Table builder to compare ethics/recruitment fields across institutions and nations, with export | `enrolments.html/js` |
| `about.html` + `privacy.html` | Purpose, sources, how to correct/remove, contact | new, required for 2.5 |
| `submit.html` | Labs add/update themselves, submit events, request removal | new |

### 4.1 Calendar approach (feasible without a backend)

- Events as committed JSON (or one ICS feed per calendar), rendered with a
  small library such as FullCalendar or a custom list/month view.
- Publish an **ICS feed per calendar area** so people can subscribe in
  Google/Outlook.
- Submissions via a form that creates a GitHub issue/PR (issue form template)
  or a Google Form/Sheet that a script converts to JSON; a moderator approves.
  Move to a small backend (e.g. Supabase/Cloudflare) later if volume grows.

### 4.2 Hosting reality

GitHub Pages is static: no login, no server-side storage. That is enough for
Phases 1-2 (labs only). Researcher self-registration, edit/delete and lab
membership confirmation need a small backend: authentication (verified
institutional email, magic-link or university single sign-on) plus a database
(e.g. Supabase or Cloudflare D1/Workers). The front end stays the same
static pages and calls the backend for researcher data.

Keeping the site private/members-only is optional once researchers
self-register, but still reduces harassment and scraping risk. If gating:
GitHub Pages access control for private sites needs GitHub Enterprise Cloud
(check current docs), so use something like Cloudflare Access or university
single sign-on rather than a shared password. Building locally needs no
hosting decision yet.

---

## 5. Phases

1. **Foundation.** New repo from this structure. Rebrand. Map page for labs
   using the supplied list as seed (labs only; strip any names/contacts at
   import). Geocode by institution. Privacy/about page. Confirm the list's
   contents and tell the DPO what is planned.
2. **Automated lab discovery.** ROR + OpenAlex institution data + public
   lab-page URLs into a review queue, with provenance fields. Human approve
   before publish. Add Ireland if wanted. No staff names harvested.
3. **Researcher self-registration.** Build the functionality (signup with
   verified institutional email, profile, lab-membership claims, lab-lead
   confirmation, edit/delete, annual reconfirmation, email route for people
   who cannot log in). Build and test with dummy accounts. Open to real
   people only after 2.6 steps 1-5.
4. **Calendar.** Event JSON + ICS + submission and moderation flow.
5. **Schema + comparison.** Ethics and recruitment forms/volunteered data,
   sourced public-policy extraction, compare page, right of reply.
6. **Maintenance.** Annual re-verification, takedown SLA, source refresh scripts.

---

## 6. Open questions for the owner (answer in the new chat)

1. Who is the controller: you, your department, or a formal network body? Is
   there a steering group that can own the site?
2. What exactly is in the circulated list (labs only, or names/emails too),
   and what was it shared for?
3. Public or private repo? Is a small backend acceptable?
4. Who confirms lab membership claims (lab leads, or network moderators)?
   How are lab leads themselves identified?
5. Include Ireland (ROI and NI are already covered under the UK) in v1 or
   later?
6. Which child development areas should have their own calendars?
7. Should ethics/recruitment comparison be public, or restricted to the
   network members?
8. Licence for the data and site (e.g. CC BY for lab-level data).
