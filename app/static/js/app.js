// State management
let currentUser = localStorage.getItem('cf_handle');
if (!currentUser && !window.location.pathname.includes('login.html') && window.location.pathname !== '/login') {
    window.location.href = '/login';
}

let ratingChart = null;
let tagChart = null;
let languageChart = null;
let difficultyChart = null;
let activeChatPartner = null;
let chatInterval = null;

const tips = [
    "Tip: Use Binary Search for 'Monotonic' answer ranges.",
    "Tip: DFS is great for tree traversals, while BFS is for shortest paths in unweighted graphs.",
    "Tip: Dynamic Programming often involves defining a state and a transition.",
    "Tip: Segment Trees can handle range queries and updates in O(log N).",
    "Tip: Use a Fenwick Tree for simpler prefix sum range queries.",
    "Tip: Read the problem twice before coding!"
];

function renderTip() {
    const tip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById('daily-tip').innerText = tip;
}
renderTip();

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });

    // Show selected view
    const selectedView = document.getElementById(`${viewId}-view`);
    if (selectedView) {
        selectedView.style.display = 'block';
        selectedView.classList.add('active');
    }

    // Update active button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${viewId}'`)) {
            btn.classList.add('active');
        }
    });

    // Special logic for views
    if (viewId === 'contests') fetchAllContests();
    if (viewId === 'problemset') fetchProblems();
    if (viewId === 'home') renderHomeContent();
    if (viewId === 'profile') renderProfileContent();
}

function logout() {
    localStorage.clear();
    window.location.href = '/login';
}

async function renderProfileContent() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/user/${currentUser}`);
        const user = await response.json();
        const container = document.getElementById('profile-view');

        container.innerHTML = `
            <div class="dashboard-grid">
                <section class="card">
                    <h3>My Stats</h3>
                    <div style="display:flex; gap:20px; align-items:center;">
                        <img src="${user.titlePhoto}" style="width:100px; border-radius:15px; border:2px solid var(--accent-pink);">
                        <div>
                            <h2 style="color:var(--accent-pink);">${user.handle}</h2>
                            <p>${user.rank || 'Unrated'}</p>
                            <p>Max Rating: ${user.maxRating || 0}</p>
                        </div>
                    </div>
                </section>
                <section class="card">
                    <h3>Quick Settings</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label>Primary Handle: <input type="text" id="setting-handle" value="${user.handle}" style="background:transparent; border:1px solid var(--accent-pink); color:white; padding:5px; border-radius:5px;"></label>
                        <button class="nav-btn" onclick="saveSettings()" style="background:var(--accent-pink); color:var(--background); font-weight:bold;">Save Changes</button>
                    </div>
                    <button class="nav-btn" onclick="logout()" style="margin-top:20px; color:var(--accent-pink);">Logout</button>
                </section>
                <section class="card" style="grid-column: span 2;">
                    <h3>My Platform Blogs</h3>
                    <div id="user-blogs-list">Loading blogs...</div>
                </section>
            </div>
        `;
        fetchUserBlogs();
    } catch (e) { showToast("Error loading profile"); }
}

async function saveSettings() {
    const handle = document.getElementById('setting-handle').value;
    try {
        const response = await fetch(`/api/user/settings?handle=${currentUser}&theme=dark-theme&primary_handle=${handle}`, { method: 'POST' });
        if (response.ok) showToast("Settings saved!");
    } catch (e) { showToast("Error saving settings"); }
}

async function fetchUserBlogs() {
    try {
        const response = await fetch(`/api/user/${currentUser}/blogs`);
        const data = await response.json();
        const container = document.getElementById('user-blogs-list');

        if (data.internal.length === 0 && data.external.length === 0) {
            container.innerHTML = "<p>No blogs yet. Share your knowledge!</p>";
            return;
        }

        container.innerHTML = [...data.internal, ...data.external].map(b => `
            <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                <h4 style="color:var(--accent-pink);">${b.title}</h4>
                <small>${new Date((b.timestamp || b.creationTimeSeconds) * 1000).toLocaleDateString()}</small>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = "Error loading blogs."; }
}

async function fetchProblems() {
    try {
        const response = await fetch('/api/problems');
        const data = await response.json();
        const problems = data.problems.slice(0, 50);
        const container = document.getElementById('problems-list');

        container.innerHTML = `
            <div style="margin-bottom:20px; display:flex; gap:10px;">
                <button class="nav-btn active" id="btn-problems-list" onclick="showProblemSubview('list')">All Problems</button>
                <button class="nav-btn" id="btn-problems-status" onclick="showProblemSubview('status')">Recent Status</button>
            </div>
            <div id="problemset-subview-content">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align:left; border-bottom:1px solid var(--accent-pink);">
                            <th style="padding:10px;">ID</th>
                            <th style="padding:10px;">Name</th>
                            <th style="padding:10px;">Rating</th>
                            <th style="padding:10px;">Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${problems.map(p => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:10px;">${p.contestId}${p.index}</td>
                                <td style="padding:10px;"><a href="https://codeforces.com/problemset/problem/${p.contestId}/${p.index}" target="_blank" style="color:var(--accent-pink); text-decoration:none;">${p.name}</a></td>
                                <td style="padding:10px;">${p.rating || 'N/A'}</td>
                                <td style="padding:10px;">${(p.tags || []).slice(0, 3).join(', ')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) { console.error("Error fetching problems", e); }
}

async function showProblemSubview(type) {
    const container = document.getElementById('problemset-subview-content');
    document.getElementById('btn-problems-list').classList.toggle('active', type === 'list');
    document.getElementById('btn-problems-status').classList.toggle('active', type === 'status');

    if (type === 'status') {
        container.innerHTML = "Loading...";
        const res = await fetch('/api/problemset/status');
        const subs = await res.json();
        container.innerHTML = `
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align:left; border-bottom:1px solid var(--accent-pink);">
                        <th style="padding:10px;">Author</th>
                        <th style="padding:10px;">Problem</th>
                        <th style="padding:10px;">Verdict</th>
                    </tr>
                </thead>
                <tbody>
                    ${subs.slice(0, 30).map(s => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                            <td style="padding:10px; color:var(--accent-pink);">${s.author.members[0].handle}</td>
                            <td style="padding:10px;">${s.problem.name}</td>
                            <td style="padding:10px; color:${s.verdict === 'OK' ? '#4caf50' : '#f44336'}">${s.verdict || 'PENDING'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        fetchProblems();
    }
}

function renderHomeContent() {
    const container = document.getElementById('blogs-container');
    container.innerHTML = `
        <div class="card">
            <h4>Mastering Dynamic Programming</h4>
            <p style="font-size:0.9rem; margin-top:10px; color:var(--text-secondary);">A deep dive into state transitions and optimization techniques...</p>
            <button class="nav-btn" style="margin-top:15px; font-size:0.8rem;">Read More</button>
        </div>
        <div class="card">
            <h4>Segment Trees vs Fenwick Trees</h4>
            <p style="font-size:0.9rem; margin-top:10px; color:var(--text-secondary);">When to use which data structure for range queries?</p>
            <button class="nav-btn" style="margin-top:15px; font-size:0.8rem;">Read More</button>
        </div>
    `;
}

async function fetchData() {
    const handle = document.getElementById('handle-input').value;
    if (!handle) return;

    try {
        const userResponse = await fetch(`/api/user/${handle}`);
        const user = await userResponse.json();
        currentUser = user.handle;
        updateProfile(user);

        document.getElementById('add-friend-btn').style.display = 'block';

        // Fetch Rating History
        const ratingResponse = await fetch(`/api/user/${handle}/rating`);
        const ratingData = await ratingResponse.json();
        renderRatingChart(ratingData, user.handle);

        // Calculate weekly delta
        const sevenDaysAgo = (Date.now() / 1000) - (7 * 24 * 60 * 60);
        const weeklyRatings = ratingData.filter(r => r.ratingUpdateTimeSeconds > sevenDaysAgo);
        let delta = 0;
        if (weeklyRatings.length > 0) {
            const first = weeklyRatings[0];
            const last = weeklyRatings[weeklyRatings.length - 1];
            delta = last.newRating - first.oldRating;
        }
        document.getElementById('weekly-delta').innerText = (delta >= 0 ? '+' : '') + delta;

        // Fetch Streak and Heatmap
        const streakResponse = await fetch(`/api/user/${handle}/streak`);
        const streakData = await streakResponse.json();
        updateStreakAndHeatmap(streakData);

        // Fetch Submissions for Tag, Language, and Difficulty
        const statusResponse = await fetch(`/api/user/${handle}/status`);
        const submissions = await statusResponse.json();
        renderStatsCharts(submissions);

        // Fetch Friends
        fetchFriends(user.handle);

    } catch (error) {
        console.error("Error fetching data:", error);
        alert("User not found or API error");
    }
}

function updateProfile(user) {
    document.getElementById('user-handle').innerText = user.handle;
    document.getElementById('user-avatar').src = user.avatar;
    document.getElementById('user-rank').innerText = `${user.rank || 'N/A'} (Max: ${user.maxRank || 'N/A'})`;
    document.getElementById('current-rating').innerText = user.rating || 0;
}

function updateStreakAndHeatmap(data) {
    document.getElementById('current-streak').innerText = data.current_streak;
    document.getElementById('max-streak').innerText = data.max_streak;

    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';

    // Render last 365 days
    const today = new Date();
    for (let i = 365; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = data.heatmap[dateStr] || 0;

        const dayEl = document.createElement('div');
        dayEl.className = 'heatmap-day';
        if (count > 0) {
            const level = Math.min(4, Math.ceil(count / 2));
            dayEl.classList.add(`level-${level}`);
        }
        dayEl.title = `${dateStr}: ${count} problems`;
        container.appendChild(dayEl);
    }
}
async function addFriend() {
    const friendHandle = prompt("Enter friend's CF handle:");
    if (!friendHandle || !currentUser) return;

    try {
        const response = await fetch(`/api/friends?my_handle=${currentUser}&friend_handle=${friendHandle}`, {
            method: 'POST'
        });
        const result = await response.json();
        alert(result.message);
        fetchFriends(currentUser);
    } catch (e) {
        alert("Error adding friend");
    }
}

async function fetchFriends(handle) {
    try {
        const response = await fetch(`/api/friends/${handle}`);
        const friends = await response.json();
        const list = document.getElementById('friend-list');
        list.innerHTML = friends.map(f => `
            <li class="contest-item">
                <span style="flex:1;">${f}</span>
                <div style="display:flex; gap:5px;">
                    <button onclick="openChat('${f}')" style="background:none; color:#a8e6cf; border:1px solid #a8e6cf; padding:2px 8px; border-radius:10px; font-size:0.8rem; cursor:pointer;">Chat</button>
                    <button onclick="compareWith('${f}')" style="background:none; color:#f1b4bb; border:1px solid #f1b4bb; padding:2px 8px; border-radius:10px; font-size:0.8rem; cursor:pointer;">Compare</button>
                </div>
            </li>
        `).join('');
    } catch (e) {
        console.error("Error fetching friends", e);
    }
}

function openChat(friend) {
    activeChatPartner = friend;
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('chat-with-user').innerText = friend;

    if (chatInterval) clearInterval(chatInterval);
    fetchMessages();
    chatInterval = setInterval(fetchMessages, 3000);
}

async function fetchMessages() {
    if (!currentUser || !activeChatPartner) return;
    try {
        const response = await fetch(`/api/chat?user1=${currentUser}&user2=${activeChatPartner}`);
        const messages = await response.json();
        const container = document.getElementById('chat-messages');
        container.innerHTML = messages.map(m => `
            <div style="align-self: ${m.sender === currentUser ? 'flex-end' : 'flex-start'}; background: ${m.sender === currentUser ? 'var(--accent-pink)' : 'rgba(255,255,255,0.1)'}; color: ${m.sender === currentUser ? '#000' : '#fff'}; padding: 5px 10px; border-radius: 10px; max-width: 80%;">
                <small style="display:block; font-size:0.6rem; opacity:0.7;">${m.sender}</small>
                ${m.content}
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) { console.error("Chat error", e); }
}

async function sendMessage() {
    const input = document.getElementById('chat-input-field');
    const content = input.value;
    if (!content || !currentUser || !activeChatPartner) return;

    try {
        await fetch(`/api/chat?sender=${currentUser}&receiver=${activeChatPartner}&content=${encodeURIComponent(content)}`, {
            method: 'POST'
        });
        input.value = '';
        fetchMessages();
    } catch (e) { showToast("Error sending message"); }
}

async function compareWith(friendHandle) {
    try {
        const response = await fetch(`/api/user/${friendHandle}/rating`);
        const friendRatingData = await response.json();

        // Add second dataset to rating chart
        if (ratingChart) {
            const friendDataset = {
                label: friendHandle,
                data: friendRatingData.map(entry => entry.newRating),
                borderColor: '#a8e6cf',
                backgroundColor: 'rgba(168, 230, 207, 0.2)',
                fill: true,
                tension: 0.4
            };

            // We need to sync labels (dates). For simplicity, we'll just append or merge.
            // A better way is to use time scales in Chart.js.
            // Let's re-render with both.
            renderComparisonChart(currentUser, friendHandle, friendRatingData);
        }
    } catch (e) {
        showToast("Error fetching friend data for comparison");
    }
}

function renderRatingChart(data, handle) {
    const ctx = document.getElementById('rating-chart').getContext('2d');
    if (ratingChart) ratingChart.destroy();

    ratingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(entry => new Date(entry.ratingUpdateTimeSeconds * 1000).toLocaleDateString()),
            datasets: [{
                label: handle,
                data: data.map(entry => entry.newRating),
                borderColor: '#f1b4bb',
                backgroundColor: 'rgba(241, 180, 187, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } }
            }
        }
    });
}

async function renderComparisonChart(myHandle, friendHandle, friendData) {
    const myResponse = await fetch(`/api/user/${myHandle}/rating`);
    const myData = await myResponse.json();

    const ctx = document.getElementById('rating-chart').getContext('2d');
    if (ratingChart) ratingChart.destroy();

    // Collect all unique dates and sort them
    const allLabels = Array.from(new Set([
        ...myData.map(e => e.ratingUpdateTimeSeconds),
        ...friendData.map(e => e.ratingUpdateTimeSeconds)
    ])).sort((a, b) => a - b);

    const labels = allLabels.map(t => new Date(t * 1000).toLocaleDateString());

    // Fill data points matching the labels
    const myPoints = allLabels.map(t => {
        const match = myData.find(e => e.ratingUpdateTimeSeconds === t);
        return match ? match.newRating : null;
    });
    const friendPoints = allLabels.map(t => {
        const match = friendData.find(e => e.ratingUpdateTimeSeconds === t);
        return match ? match.newRating : null;
    });

    ratingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: myHandle,
                    data: myPoints,
                    borderColor: '#f1b4bb',
                    tension: 0.4,
                    spanGaps: true
                },
                {
                    label: friendHandle,
                    data: friendPoints,
                    borderColor: '#a8e6cf',
                    tension: 0.4,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            }
        }
    });
}

function renderStatsCharts(submissions) {
    const tagsCount = {};
    const languagesCount = {};
    const difficultyCount = {};

    // Weekly stats
    let weeklySolved = 0;
    const weeklyTags = {};
    const sevenDaysAgo = (Date.now() / 1000) - (7 * 24 * 60 * 60);

    submissions.forEach(sub => {
        if (sub.verdict === 'OK') {
            const isWeekly = sub.creationTimeSeconds > sevenDaysAgo;
            if (isWeekly) weeklySolved++;

            (sub.problem.tags || []).forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
                if (isWeekly) weeklyTags[tag] = (weeklyTags[tag] || 0) + 1;
            });
            languagesCount[sub.programmingLanguage] = (languagesCount[sub.programmingLanguage] || 0) + 1;

            const r = sub.problem.rating || 0;
            const diffRange = Math.floor(r / 200) * 200;
            if (r > 0) {
                difficultyCount[diffRange] = (difficultyCount[diffRange] || 0) + 1;
            }
        }
    });

    // Update Weekly UI
    document.getElementById('weekly-solved').innerText = weeklySolved;
    const sortedWeeklyTags = Object.entries(weeklyTags).sort((a, b) => b[1] - a[1]);
    document.getElementById('weekly-tag').innerText = sortedWeeklyTags.length > 0 ? sortedWeeklyTags[0][0] : 'N/A';

    // Tag Radar
    const radarCtx = document.getElementById('tag-chart').getContext('2d');
    if (tagChart) tagChart.destroy();
    const sortedTags = Object.entries(tagsCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    tagChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: sortedTags.map(t => t[0]),
            datasets: [{
                data: sortedTags.map(t => t[1]),
                borderColor: '#f1b4bb',
                backgroundColor: 'rgba(241, 180, 187, 0.4)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { ticks: { display: false }, pointLabels: { color: '#fff' } } },
            plugins: { legend: { display: false } }
        }
    });

    // Language Donut
    const langCtx = document.getElementById('language-chart').getContext('2d');
    if (languageChart) languageChart.destroy();
    languageChart = new Chart(langCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(languagesCount),
            datasets: [{
                data: Object.values(languagesCount),
                backgroundColor: ['#f1b4bb', '#a8e6cf', '#ffd3b6', '#ffaaa5', '#dcedc1']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } }
    });

    // Difficulty Bar
    const diffCtx = document.getElementById('difficulty-chart').getContext('2d');
    if (difficultyChart) difficultyChart.destroy();
    const sortedDiff = Object.entries(difficultyCount).sort((a, b) => a[0] - b[0]);
    difficultyChart = new Chart(diffCtx, {
        type: 'bar',
        data: {
            labels: sortedDiff.map(d => d[0]),
            datasets: [{
                label: 'Solved',
                data: sortedDiff.map(d => d[1]),
                backgroundColor: '#f1b4bb'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } }
        }
    });
}

async function fetchUpcomingContests() {
    try {
        const response = await fetch('/api/contests/upcoming');
        const contests = await response.json();
        const list = document.getElementById('contest-list');
        list.innerHTML = contests.slice(0, 5).map(c => `
            <li class="contest-item">
                <div style="flex:1;">
                    <span style="display:block;">${c.name}</span>
                    <span class="contest-time">${new Date(c.startTimeSeconds * 1000).toLocaleString()}</span>
                </div>
                <button onclick="bookmarkContest(${c.id}, '${c.name.replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--accent-pink); cursor:pointer; font-size:1.5rem;">☆</button>
            </li>
        `).join('');
    } catch (e) {
        console.error("Error fetching contests", e);
    }
}

function bookmarkContest(id, name) {
    showToast(`Bookmarked ${name}!`);
}

async function fetchAllContests() {
    try {
        const response = await fetch('/api/contests/upcoming');
        const contests = await response.json();
        const container = document.getElementById('full-contest-list');

        container.innerHTML = `
            <div style="margin-bottom:20px; display:flex; gap:10px;">
                <button class="nav-btn active" id="btn-contests-list" onclick="showContestSubview('list')">Upcoming</button>
                <button class="nav-btn" id="btn-contests-status" onclick="showContestSubview('status')">Last Contest Status</button>
            </div>
            <div id="contests-subview-content">
                ${contests.map(c => `
                    <div class="card contest-item-full" style="margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h4 style="color:var(--accent-pink);">${c.name}</h4>
                                <small style="color:var(--text-secondary);">${new Date(c.startTimeSeconds * 1000).toLocaleString()}</small>
                            </div>
                            <div style="text-align:right;">
                                <span class="badge" style="display:inline-block; margin-bottom:5px;">${c.type}</span>
                                <div class="remind-btn" onclick="toggleReminder(${c.id})" style="cursor:pointer; color:var(--text-secondary);">🔔 Remind Me</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        if (contests.length > 0) {
            startCountdown(contests[0].startTimeSeconds);
        }
    } catch (e) {
        console.error("Error fetching full contests", e);
    }
}

async function showContestSubview(type) {
    const container = document.getElementById('contests-subview-content');
    document.getElementById('btn-contests-list').classList.toggle('active', type === 'list');
    document.getElementById('btn-contests-status').classList.toggle('active', type === 'status');

    if (type === 'status') {
        container.innerHTML = "Loading standings...";
        const res = await fetch('/api/contests/1800/status');
        const rows = await res.json();
        container.innerHTML = `
            <h4>Contest Status (Example ID: 1800)</h4>
            <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                <thead>
                    <tr style="text-align:left; border-bottom:1px solid var(--accent-pink);">
                        <th style="padding:10px;">Rank</th>
                        <th style="padding:10px;">Handle</th>
                        <th style="padding:10px;">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.slice(0, 30).map(r => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                            <td style="padding:10px;">${r.rank}</td>
                            <td style="padding:10px;">${r.party.members[0].handle}</td>
                            <td style="padding:10px;">${r.points}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        fetchAllContests();
    }
}

let countdownTimer;
function startCountdown(startTimeSeconds) {
    if (countdownTimer) clearInterval(countdownTimer);

    const update = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = startTimeSeconds - now;

        if (diff <= 0) {
            document.getElementById('countdown-timer').innerText = "Contest Started!";
            clearInterval(countdownTimer);
            return;
        }

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;

        document.getElementById('countdown-timer').innerText = `Next Contest In: ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    update();
    countdownTimer = setInterval(update, 1000);
}

function toggleReminder(id) {
    showToast(`Reminder set for contest ${id}!`);
}

fetchUpcomingContests();
switchView('home');
