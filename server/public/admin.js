const $ = (id) => document.getElementById(id);
const KEY = 'honeymaybe-admin-token';
let token = sessionStorage.getItem(KEY) || '';
let editingId = null;

const api = async (path, opts = {}) => {
  const res = await fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); throw new Error('wrong or expired token'); }
  if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.status === 204 ? null : res.json();
};

function show(loggedIn) { $('login').hidden = loggedIn; $('app').hidden = !loggedIn; }
function logout() { token = ''; sessionStorage.removeItem(KEY); show(false); }

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  token = $('token').value;
  try {
    // Auth-only probe: unauthenticated PUT to a nonexistent id returns 401 vs 404.
    const r = await fetch('/api/art/__probe__', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) throw new Error('wrong token');
    sessionStorage.setItem(KEY, token); $('login-err').textContent = '';
    show(true); load();
  } catch (err) { $('login-err').textContent = err.message; }
});
$('logout').onclick = logout;

$('image').addEventListener('change', () => {
  const f = $('image').files[0];
  $('preview').hidden = !f;
  if (f) $('preview').src = URL.createObjectURL(f);
});

function resetForm() {
  editingId = null; $('art-form').reset(); $('preview').hidden = true;
  $('form-title').textContent = 'upload new art'; $('submit').textContent = 'upload'; $('cancel').hidden = true;
}
$('cancel').onclick = resetForm;

$('art-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.set('title', $('title').value); fd.set('date', $('date').value); fd.set('medium', $('medium').value);
  fd.set('tags', $('tags').value); fd.set('description', $('description').value);
  fd.set('featured', $('featured').checked);
  if ($('image').files[0]) fd.set('image', $('image').files[0]);
  $('submit').disabled = true; $('msg').textContent = 'saving…';
  try {
    await api(editingId ? `/api/art/${editingId}` : '/api/art', { method: editingId ? 'PUT' : 'POST', body: fd });
    $('msg').textContent = editingId ? 'saved ✓' : 'uploaded ✓ (rebuild the site to publish it)';
    resetForm(); load();
  } catch (err) { $('msg').textContent = err.message; }
  $('submit').disabled = false;
});

function startEdit(a) {
  editingId = a.id;
  $('title').value = a.title; $('date').value = a.date; $('medium').value = a.medium;
  $('tags').value = a.tags.join(', '); $('description').value = a.description || '';
  $('featured').checked = a.featured;
  $('form-title').textContent = `editing “${a.title}” (choose an image only to replace it)`;
  $('submit').textContent = 'save changes'; $('cancel').hidden = false;
  scrollTo({ top: 0, behavior: 'smooth' });
}

async function load() {
  const rows = await (await fetch('/api/art')).json();
  $('count').textContent = `(${rows.length})`;
  const ul = $('list'); ul.replaceChildren();
  for (const a of rows) {
    const li = document.createElement('li');
    const thumb = a.image ? Object.assign(document.createElement('img'), { src: a.image, alt: '' }) : Object.assign(document.createElement('div'), { className: 'noimg' });
    const meta = document.createElement('div'); meta.className = 'meta';
    const strong = document.createElement('strong'); strong.textContent = a.title + (a.featured ? ' ★' : '');
    const small = document.createElement('small'); small.textContent = `${a.medium} · ${a.date}`;
    meta.append(strong, small);
    const actions = document.createElement('div'); actions.className = 'actions';
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; b.className = cls; b.onclick = fn; return b; };
    actions.append(
      btn('edit', 'ghost', () => startEdit(a)),
      btn(a.featured ? 'unfeature' : 'feature', 'ghost', async () => {
        const fd = new FormData(); fd.set('featured', !a.featured);
        await api(`/api/art/${a.id}`, { method: 'PUT', body: fd }); load();
      }),
      btn('delete', 'danger', async () => {
        if (!confirm(`Delete “${a.title}” and its image?`)) return;
        await api(`/api/art/${a.id}`, { method: 'DELETE' }); load();
      }),
    );
    li.append(thumb, meta, actions); ul.append(li);
  }
}

if (token) { show(true); load().catch(() => {}); } else show(false);
