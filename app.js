// ── Supabase setup ────────────────────────────────────────────
const SUPABASE_URL = 'https://azrhgapbszhsxrwbkfsa.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tbG5zdJ0gbUekqZBuMEFzw__C93qidi'
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ── State ─────────────────────────────────────────────────────
let poll = null        // loaded from DB after publish or on page load
let pollId = null      // the current poll's ID

// ── Utilities ─────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.querySelector(`[onclick="showTab('${name}')"]`).classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
  if (name === 'vote')    renderVote()
  if (name === 'results') renderResults()
}

function setType(t) {
  document.getElementById('btn-multi').classList.toggle('active', t === 'multi')
  document.getElementById('btn-single').classList.toggle('active', t === 'single')
}

function getSelectedType() {
  return document.getElementById('btn-single').classList.contains('active') ? 'single' : 'multi'
}

function showError(msg) {
  alert('Error: ' + msg)
}

// ── URL-based poll loading ─────────────────────────────────────
// If the URL contains ?poll=abc123, load that poll automatically

async function checkUrlForPoll() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('poll')
  if (!id) return

  const { data, error } = await db.from('polls').select('*').eq('id', id).single()
  if (error || !data) return

  poll   = data
  pollId = data.id
  showTab('vote')
}

// ── Creator ───────────────────────────────────────────────────

function renderOptionInputs() {
  const defaults = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const container = document.getElementById('options-list')
  if (container.children.length === 0) {
    defaults.forEach(d => {
      const row = document.createElement('div')
      row.className = 'option-row'
      row.innerHTML = `<input type="text" value="${d}">
                       <button class="small-remove" onclick="removeOption(this)">✕</button>`
      container.appendChild(row)
    })
  }
}

function addOption() {
  const container = document.getElementById('options-list')
  const row = document.createElement('div')
  row.className = 'option-row'
  row.innerHTML = `<input type="text" placeholder="New option">
                   <button class="small-remove" onclick="removeOption(this)">✕</button>`
  container.appendChild(row)
  row.querySelector('input').focus()
}

function removeOption(btn) {
  const rows = document.querySelectorAll('#options-list .option-row')
  if (rows.length <= 2) return alert('Need at least 2 options.')
  btn.closest('.option-row').remove()
}

async function publishPoll() {
  const title = document.getElementById('poll-title').value.trim()
  if (!title) return alert('Enter a question.')

  const options = Array.from(document.querySelectorAll('#options-list input'))
    .map(i => i.value.trim()).filter(Boolean)
  if (options.length < 2) return alert('Add at least 2 options.')

  const btn = document.querySelector('#tab-create .primary')
  btn.textContent = 'Saving…'
  btn.disabled = true

  const newPoll = {
    id:          generateId(),
    title:       title,
    description: document.getElementById('poll-desc').value.trim(),
    type:        getSelectedType(),
    options:     options
  }

  const { data, error } = await db.from('polls').insert(newPoll).select().single()

  btn.textContent = 'Publish poll →'
  btn.disabled = false

  if (error) return showError(error.message)

  poll   = data
  pollId = data.id

  // Update the browser URL so the poll link is shareable
  const newUrl = window.location.origin + window.location.pathname + '?poll=' + pollId
  window.history.pushState({}, '', newUrl)

  showTab('vote')
}

// ── Voter ─────────────────────────────────────────────────────

async function renderVote() {
  if (!poll) return

  document.getElementById('vote-title').textContent = poll.title

  const descEl = document.getElementById('vote-desc')
  descEl.textContent = poll.description || ''
  descEl.style.display = poll.description ? '' : 'none'

  document.getElementById('vote-hint').textContent =
    poll.type === 'multi' ? 'Select all that apply.' : 'Select one option.'

  document.getElementById('share-url').textContent = window.location.href

  // Pre-load existing vote if name is already entered
  const name = document.getElementById('voter-name').value.trim()
  let existing = []
  if (name) {
    const { data } = await db.from('responses')
      .select('selected_options')
      .eq('poll_id', pollId)
      .eq('voter_name', name)
      .maybeSingle()
    if (data) {
      existing = data.selected_options
      document.getElementById('edit-hint').style.display = ''
    } else {
      document.getElementById('edit-hint').style.display = 'none'
    }
  }

  document.getElementById('vote-options').innerHTML = poll.options.map((o, i) => {
    const sel    = existing.includes(i)
    const isRadio = poll.type === 'single'
    return `<div class="choice-option${sel ? ' selected' : ''}" onclick="toggleOpt(this,${i})" data-idx="${i}">
      <div class="check${isRadio ? ' radio' : ''}${sel ? ' filled' : ''}" id="chk${i}"></div>
      <span class="choice-label">${o}</span>
    </div>`
  }).join('')
}

function toggleOpt(el, idx) {
  if (poll.type === 'single') {
    document.querySelectorAll('#vote-options .choice-option').forEach(o => {
      o.classList.remove('selected')
      o.querySelector('.check').classList.remove('filled')
    })
  }
  el.classList.toggle('selected')
  el.querySelector('.check').classList.toggle('filled')
}

async function onNameInput() {
  const name = document.getElementById('voter-name').value.trim()
  if (!name || !pollId) return

  const { data } = await db.from('responses')
    .select('selected_options')
    .eq('poll_id', pollId)
    .eq('voter_name', name)
    .maybeSingle()

  const existing = data ? data.selected_options : []
  document.getElementById('edit-hint').style.display = data ? '' : 'none'

  // Re-render options with pre-filled selections
  document.getElementById('vote-options').innerHTML = poll.options.map((o, i) => {
    const sel    = existing.includes(i)
    const isRadio = poll.type === 'single'
    return `<div class="choice-option${sel ? ' selected' : ''}" onclick="toggleOpt(this,${i})" data-idx="${i}">
      <div class="check${isRadio ? ' radio' : ''}${sel ? ' filled' : ''}" id="chk${i}"></div>
      <span class="choice-label">${o}</span>
    </div>`
  }).join('')
}

async function submitVote() {
  const name = document.getElementById('voter-name').value.trim()
  if (!name) return alert('Enter your name first.')

  const selected = Array.from(document.querySelectorAll('#vote-options .choice-option.selected'))
    .map(el => parseInt(el.dataset.idx))
  if (!selected.length) return alert('Pick at least one option.')

  const btn = document.querySelector('.name-row .primary')
  btn.textContent = 'Saving…'
  btn.disabled = true

  // upsert: insert if new name, update if name already exists for this poll
  const { error } = await db.from('responses').upsert(
    { poll_id: pollId, voter_name: name, selected_options: selected, updated_at: new Date() },
    { onConflict: 'poll_id,voter_name' }
  )

  btn.disabled = false

  if (error) { btn.textContent = 'Submit'; return showError(error.message) }

  const isEdit = document.getElementById('edit-hint').style.display !== 'none'
  btn.textContent = isEdit ? 'Updated ✓' : 'Submitted ✓'
  document.getElementById('edit-hint').style.display = ''
  setTimeout(() => btn.textContent = 'Submit', 1800)
}

// ── Results ───────────────────────────────────────────────────

async function renderResults() {
  if (!poll) return

  document.getElementById('results-title').textContent = poll.title

  const { data: allResponses, error } = await db.from('responses')
    .select('voter_name, selected_options')
    .eq('poll_id', pollId)

  if (error) return showError(error.message)

  const voterCount = allResponses.length
  document.getElementById('results-count').textContent =
    voterCount ? `${voterCount} voter${voterCount > 1 ? 's' : ''}` : 'No votes yet'

  const counts = poll.options.map((_, i) =>
    allResponses.filter(r => r.selected_options.includes(i)).length
  )
  const max = Math.max(...counts, 1)

  document.getElementById('results-bars').innerHTML = poll.options.map((o, i) => {
    const c     = counts[i]
    const pct   = voterCount ? Math.round(c / voterCount * 100) : 0
    const isTop = c === max && c > 0
    const names = allResponses.filter(r => r.selected_options.includes(i)).map(r => r.voter_name)
    const tags  = names.map(n => `<span class="vtag">${n}</span>`).join('')
    return `<div class="result-item">
      <div class="result-meta">
        <span>${o}${isTop ? ' <span class="winner-badge">top choice</span>' : ''}</span>
        <span>${c} vote${c !== 1 ? 's' : ''} · ${pct}%</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill${isTop ? ' winner' : ''}" style="width:${Math.round(c/max*100)}%"></div>
      </div>
      ${tags ? `<div class="voter-tags">${tags}</div>` : ''}
    </div>`
  }).join('')

  document.getElementById('responses-list').innerHTML = allResponses.length
    ? allResponses.map(r => `<div class="response-row">
        <strong>${r.voter_name}</strong>
        <span>${r.selected_options.map(i => poll.options[i]).join(', ')}</span>
      </div>`).join('')
    : '<p class="hint">No votes yet.</p>'
}

async function clearVotes() {
  if (!confirm('Reset all votes?')) return
  await db.from('responses').delete().eq('poll_id', pollId)
  renderResults()
}

// ── Init ──────────────────────────────────────────────────────
renderOptionInputs()
checkUrlForPoll()