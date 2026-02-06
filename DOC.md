# Codeforces API Integration Documentation

This document describes **which Codeforces APIs are required**, **why they are required**, and **how they map** to the planned platform features and internal endpoints.

The goal is to keep this platform:

* lightweight
* real‑time (or near real‑time)
* scalable from 2 coders → small private network

Official CF API reference: [https://codeforces.com/apiHelp](https://codeforces.com/apiHelp)

---

## 1. High‑Level Architecture

```
Frontend (Cute Dark UI)
   ↓
Backend API (Node/FastAPI)
   ↓
Codeforces Public API
   ↓
Cache + DB (Redis + Postgres)
```

**Important CF constraints**:

* No WebSockets → polling required
* Rate limits apply (handle carefully)
* All data is public → no auth tokens needed

---

## 2. Core Codeforces APIs Used

| CF API                  | Purpose                  |
| ----------------------- | ------------------------ |
| user.info               | Profile & rating info    |
| user.status             | Submissions & heatmaps   |
| user.rating             | Rating history & graphs  |
| contest.list            | Upcoming & past contests |
| contest.standings       | Contest problems & rank  |
| problemset.problems     | Problem metadata         |
| problemset.recentStatus | Live‑like submissions    |

---

## 3. User Profile & Connections

### 3.1 Fetch User Profile

**Endpoint**

```
GET https://codeforces.com/api/user.info?handles={handle}
```

**Used for**

* Profile page `/profile/<username>`
* Rating, rank, max rating
* Avatar, country, organization

**Stored Fields**

* handle
* rating
* maxRating
* rank
* maxRank
* avatar
* contribution

---

### 3.2 Added Connections (Friends)

CF does **not** support social graphs.

So:

* Store friend handles internally
* Fetch each friend via `user.info`

**Comparison graphs** use:

* your data vs friend data

---

## 4. Submissions, Heatmaps & Streaks

### 4.1 User Submissions

**Endpoint**

```
GET https://codeforces.com/api/user.status?handle={handle}&from=1&count=10000
```

**Used for**

* Daily submission heatmap
* Streak tracking
* Language usage chart
* Tag mastery
* Weekly/monthly summary

**Important Fields**

* creationTimeSeconds
* verdict
* programmingLanguage
* problem.tags
* problem.rating

---

### 4.2 Daily Submission Heatmap

Logic:

* Group accepted submissions by date
* Count per day

```
Map<Date, AcceptedCount>
```

---

### 4.3 Streak Tracker

Rules:

* A day counts if ≥1 ACCEPTED submission
* Consecutive days form a streak

Computed from `creationTimeSeconds`

---

## 5. Rating & Performance Analytics

### 5.1 Rating Change Over Time

**Endpoint**

```
GET https://codeforces.com/api/user.rating?handle={handle}
```

**Used for**

* Rating graphs
* Friend comparison charts
* Performance trend analysis

Fields:

* contestId
* oldRating
* newRating
* ratingUpdateTimeSeconds

---

### 5.2 Weekly / Monthly Summary

Derived from:

* `user.status`
* `user.rating`

Metrics:

* Problems solved
* Tags practiced
* Rating delta
* Languages used

---

## 6. Problems, Tags & Mastery

### 6.1 Problemset Metadata

**Endpoint**

```
GET https://codeforces.com/api/problemset.problems
```

**Used for**

* `/problemset/problems`
* Tag mastery charts
* Difficulty distribution

Important fields:

* contestId
* index
* rating
* tags

---

### 6.2 Tag Mastery

Logic:

```
Tag Mastery = Accepted problems per tag
```

Optional normalization:

* Easy (800‑1200)
* Medium (1300‑1800)
* Hard (1900+)

---

### 6.3 Problem Bookmarking

CF has no bookmark support.

Internal DB:

```
(user, contestId, index)
```

Linked to problemset metadata

---

## 7. Contests & Reminders

### 7.1 Contest List

**Endpoint**

```
GET https://codeforces.com/api/contest.list
```

**Used for**

* Upcoming contest list
* Countdown timers

Filter:

* phase == BEFORE

---

### 7.2 Contest Problems & Status

**Endpoints**

```
GET contest.standings?contestId={id}
GET user.status?handle={handle}&contestId={id}
```

Mapped to:

* `/contests/problems`
* `/contests/my_submissions`
* `/contests/status`

---

### 7.3 Contest Reminders

Internal Scheduler:

* Poll `contest.list`
* Trigger notifications at:

  * T‑24h
  * T‑1h
  * Contest start

---

## 8. Real‑Time Updates Strategy

CF has no sockets.

Strategies:

* Poll `problemset.recentStatus`
* Poll `user.status` every N seconds
* Cache aggressively

Recommended:

* Redis TTL = 30‑60 sec

---

## 9. Notifications System

Triggers:

* New ACCEPTED submission
* Rating change
* Streak broken
* Upcoming contest
* Friend solves hard problem

Sources:

* Compare cached vs fresh API data

---

## 10. Chat (DMs)

Not CF‑based.

Internal system:

* WebSocket or polling
* User handle used as identity

---

## 11. Study Material Zone

Internal content only:

* Blogs
* Algorithm notes
* Tip of the day

Optional automation:

* Rotate tips daily

---

## 12. Internal Endpoint Mapping

### /home

* Blogs only

### /profile

* `/<username>` → user.info + analytics
* `/settings` → preferences
* `/blog` → posts

### /problemset

* `/problems` → problemset.problems
* `/submit` → redirect to CF
* `/status` → user.status

### /contests

* `/problems` → contest.standings
* `/my_submissions` → user.status
* `/status` → contest phase

---

## 13. Rate Limiting & Safety

CF Guidelines:

* Avoid parallel heavy calls
* Cache responses
* Batch user handles

Recommended:

* 1 CF request / second
* Background refresh jobs

---

## 14. Future Extensions

* AtCoder / LeetCode adapters
* AI‑based weakness detection
* Predictive rating models
* Browser extension

---

## 15. Summary

This document defines a **clean, minimal CF API surface** that supports:

* analytics
* comparison
* gamification
* social learning

while staying within Codeforces limitations.

---