let poll = {
  title: 'Which day works for the meeting?',
  desc: '',
  type: 'multi',
  options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
};

let votes = {};

// ── helpers ──────────────────────────────────────

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${name}')"]`).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'vote')    renderVote();
  if (name === 'results') renderResults();
}

function setType(t) {
  poll.type = t;
  document.getElementById('btn-multi').classList.toggle('active', t === 'multi');
  document.getElementById('btn-single').classList.toggle('active', t === 'single');
}

// ── creator ──────────────────────────────────────

function renderOptionInputs() {
  document.getElementById('options-list').innerHTML = poll.options.map((o, i) => `
    <div class="option-row">
      <input type="text" value="${o}" oninput="poll.options[${i}]=this.value" placeholder="Option ${i+1}">
      <button class="small-remove" onclick="removeOption(${i})">✕</button>
    </div>`).join('');
}

function addOption() {
  poll.options.push('');
  renderOptionInputs();
  document.querySelectorAll('#options-list input')[poll.options.length - 1].focus();
}

function removeOption(i) {
  if (poll.options.length <= 2) return alert('Need at least 2 options.');
  poll.options.splice(i, 1);
  renderOptionInputs();
}

function publishPoll() {
  poll.title = document.getElementById('poll-title').value.trim() || poll.title;
  poll.desc  = document.getElementById('poll-desc').value.trim();
  poll.options = Array.from(document.querySelectorAll('#options-list input'))
    .map(i => i.value.trim()).filter(Boolean);
  if (poll.options.length < 2) return alert('Add at least 2 options.');
  showTab('vote');
}

// ── voter ────────────────────────────────────────

function renderVote() {
  document.getElementById('vote-title').textContent = poll.title;
  const descEl = document.getElementById('vote-desc');
  descEl.textContent = poll.desc;
  descEl.style.display = poll.desc ? '' : 'none';
  document.getElementById('vote-hint').textContent =
    poll.type === 'multi' ? 'Select all that apply.' : 'Select one option.';

  const name     = document.getElementById('voter-name').value.trim();
  const existing = votes[name] || [];
  document.getElementById('edit-hint').style.display = (name && votes[name]) ? '' : 'none';

  document.getElementById('vote-options').innerHTML = poll.options.map((o, i) => {
    const sel   = existing.includes(i);
    const isRad = poll.type === 'single';
    return `<div class="choice-option${sel ? ' selected' : ''}" onclick="toggleOpt(this,${i})" data-idx="${i}">
      <div class="check${isRad ? ' radio' : ''}${sel ? ' filled' : ''}" id="chk${i}"></div>
      <span class="choice-label">${o}</span>
    </div>`;
  }).join('');
}

function toggleOpt(el, idx) {
  if (poll.type === 'single') {
    document.querySelectorAll('#vote-options .choice-option').forEach(o => {
      o.classList.remove('selected');
      o.querySelector('.check').classList.remove('filled');
    });
  }
  el.classList.toggle('selected');
  el.querySelector('.check').classList.toggle('filled');
}

function onNameInput() {
  renderVote();
}

function submitVote() {
  const name = document.getElementById('voter-name').value.trim();
  if (!name) return alert('Enter your name first.');
  const selected = Array.from(document.querySelectorAll('#vote-options .choice-option.selected'))
    .map(el => parseInt(el.dataset.idx));
  if (!selected.length) return alert('Pick at least one option.');
  const isEdit = !!votes[name];
  votes[name] = selected;
  document.getElementById('edit-hint').style.display = '';
  const btn = document.querySelector('.name-row .primary');
  btn.textContent = isEdit ? 'Updated ✓' : 'Submitted ✓';
  setTimeout(() => btn.textContent = 'Submit', 1800);
}

// ── results ──────────────────────────────────────

function renderResults() {
  const voters = Object.keys(votes);
  document.getElementById('results-title').textContent = poll.title;
  document.getElementById('results-count').textContent =
    voters.length ? `${voters.length} voter${voters.length > 1 ? 's' : ''}` : 'No votes yet';

  const counts = poll.options.map((_, i) => voters.filter(v => votes[v].includes(i)).length);
  const max    = Math.max(...counts, 1);

  document.getElementById('results-bars').innerHTML = poll.options.map((o, i) => {
    const c      = counts[i];
    const pct    = voters.length ? Math.round(c / voters.length * 100) : 0;
    const isTop  = c === max && c > 0;
    const names  = voters.filter(v => votes[v].includes(i));
    const tags   = names.map(n => `<span class="vtag">${n}</span>`).join('');
    return `<div class="result-item">
      <div class="result-meta">
        <span>${o}${isTop ? '<span class="winner-badge">top choice</span>' : ''}</span>
        <span>${c} vote${c !== 1 ? 's' : ''} · ${pct}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill${isTop ? ' winner' : ''}" style="width:${Math.round(c/max*100)}%"></div></div>
      ${tags ? `<div class="voter-tags">${tags}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('responses-list').innerHTML = voters.length
    ? voters.map(n => `<div class="response-row">
        <span><strong>${n}</strong></span>
        <span>${votes[n].map(i => poll.options[i]).join(', ')}</span>
      </div>`).join('')
    : '<p class="hint">No votes yet.</p>';
}

function clearVotes() {
  if (confirm('Reset all votes?')) { votes = {}; renderResults(); }
}

// ── init ─────────────────────────────────────────
renderOptionInputs();