/* No credentials or direct spreadsheet access are exposed to visitors. */
'use strict';
const $ = id => document.getElementById(id);
const colors = ['#a9d85d', '#365b40', '#d2e6b4', '#7e9e68', '#c6bba0', '#a2bab6', '#d8d5b4', '#8b8f83', '#cbb8bf', '#a7b0d0'];
const state = { manifest: null, scope: 'domestic', platform: '전체', month: '', records: [], page: 1, loading: false, request: 0 };
const pageSize = 25;
const num = value => Number(value).toLocaleString('ko-KR');
function node(tag, text, className) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; }
function empty(tbody, columns, message) { const tr = node('tr'); const td = node('td', message, 'empty-cell'); td.colSpan = columns; tr.append(td); tbody.replaceChildren(tr); }
function entry() { return state.manifest?.months[state.scope].find(item => item.month === state.month); }
function message(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); }
function selectedRecords() { return state.records.filter(row => state.platform === '전체' || row.platform === state.platform); }
function platforms() {
  const options = ['전체', ...(state.scope === 'domestic' ? ['멜론', '지니', '벅스', 'FLO', 'VIBE'] : ['Spotify', 'Apple Music'])];
  $('platforms').replaceChildren(...options.map(platform => { const button = node('button', platform); button.type = 'button'; button.classList.toggle('active', platform === state.platform); button.setAttribute('aria-pressed', String(platform === state.platform)); button.addEventListener('click', () => { state.platform = platform; state.page = 1; platforms(); dates(); render(); }); return button; }));
}
function dates() {
  const previous = $('date').value;
  const days = [...new Set(selectedRecords().map(row => row.date))].sort().reverse();
  $('date').replaceChildren(new Option('전체 날짜', ''), ...days.map(day => new Option(day, day)));
  if (days.includes(previous)) $('date').value = previous;
}
function renderShares() {
  const summary = entry()?.stats?.[state.platform] || { total: 0, companies: [] };
  $('share-section').hidden = state.scope !== 'domestic';
  $('donut-total').textContent = num(summary.total);
  $('donut-caption').textContent = state.platform === '전체' ? '전체 플랫폼' : state.platform;
  $('period-chip').textContent = `${state.month.replace('-', '.')} ${state.month === new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul'}).format(new Date()).slice(0,7) ? '· 집계 중' : '· 월별 집계'}`;
  const segments = []; let position = 0;
  $('shares').replaceChildren(...summary.companies.map((company, index) => {
    const color = colors[index % colors.length]; const end = position + company.share;
    segments.push(`${color} ${position}% ${end}%`); position = end;
    const tr = node('tr'); const label = node('td'); const line = node('div', null, 'company-line');
    const swatch = node('span', null, 'swatch'); swatch.style.background = color; swatch.setAttribute('aria-hidden', 'true');
    line.append(swatch, node('span', company.name, 'company-name'));
    const track = node('div', null, 'bar-track'); const bar = node('div', null, 'bar-fill'); bar.style.width = `${company.share}%`; bar.style.background = color; track.append(bar); track.setAttribute('aria-hidden', 'true');
    label.append(line, track); tr.append(label, node('td', `${num(company.count)}건`), node('td', `${company.share.toFixed(1)}%`)); return tr;
  }));
  if (!summary.total) empty($('shares'), 3, '이 달에는 집계할 자료가 없습니다.');
  $('donut').style.background = segments.length ? `conic-gradient(${segments.join(',')})` : '#edf0eb';
  $('donut').setAttribute('aria-label', summary.total ? `${state.platform} 유통사별 점유율, 총 ${num(summary.total)}건. 상세 비율은 옆 표에 표시됩니다.` : '점유율 자료 없음');
  const represented = entry()?.platforms || [];
  $('coverage-note').textContent = state.platform === '전체' ? `수집 기록이 있는 플랫폼: ${represented.join(' · ') || '없음'} · 미확인 포함 · 플랫폼별 비율의 평균이 아닌 수집 건수 합산 기준` : `${state.platform} 수집 건수 기준 · 미확인 포함 · 검색·수집일 필터는 점유율에 영향을 주지 않습니다.`;
}
function renderRecords() {
  const query = $('search').value.trim().toLocaleLowerCase('ko-KR'); const date = $('date').value;
  const records = selectedRecords().filter(row => (!date || row.date === date) && (!query || [row.info, row.company, row.platform, row.country, row.section].join(' ').toLocaleLowerCase('ko-KR').includes(query)));
  const pages = Math.ceil(records.length / pageSize); state.page = Math.max(1, Math.min(state.page, pages || 1));
  $('filtered-count').textContent = num(records.length);
  const slice = records.slice((state.page - 1) * pageSize, state.page * pageSize);
  $('records').replaceChildren(...slice.map(row => {
    const tr = node('tr'); const dateCell = node('td', row.date); dateCell.append(node('span', row.time || '시각 기록 없음'));
    const platform = node('td'); platform.append(node('span', row.platform + (row.country ? ` · ${row.country}` : ''), 'platform-tag'));
    const info = node('td', row.info); if (row.section) info.append(node('span', row.section, 'record-section'));
    if (row.url && /^https?:\/\//i.test(row.url)) { const link = node('a', '↗', 'external-link'); link.href = row.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${row.info} 원본 보기`); info.append(link); }
    tr.append(dateCell, platform, node('td', row.position || '—'), info, node('td', row.company)); return tr;
  }));
  if (!slice.length) empty($('records'), 5, state.loading ? '수집 기록을 불러오는 중입니다.' : '조건에 맞는 수집 기록이 없습니다.');
  $('page-info').textContent = records.length ? `${num(records.length)}건 중 ${num((state.page-1)*pageSize+1)}–${num(Math.min(state.page*pageSize,records.length))}건` : '0건';
  $('page-number').textContent = `${pages ? state.page : 0} / ${num(pages)}`;
  $('prev').disabled = state.page <= 1 || state.loading; $('next').disabled = state.page >= pages || state.loading;
}
function render() {
  const rows = selectedRecords(); const stats = entry()?.stats?.[state.platform];
  $('record-count').textContent = state.loading ? '…' : num(rows.length);
  $('second-label').textContent = state.scope === 'domestic' ? '집계 유통사' : '조회 국가 / 지역';
  $('company-count').textContent = state.loading ? '…' : state.scope === 'domestic' ? num((stats?.companies || []).filter(c => c.name !== '미확인').length) : num(new Set(rows.filter(r=>r.country).map(r=>r.country)).size);
  $('company-foot').textContent = state.scope === 'domestic' ? `미확인 ${num(stats?.companies.find(c=>c.name === '미확인')?.count || 0)}건 포함` : 'Spotify는 국가 구분 없음';
  const latest = rows[0]; $('latest-date').textContent = latest?.date || '—'; $('latest-foot').textContent = latest?.time ? `${latest.time} · 한국 시간` : '선택한 월·플랫폼 기준';
  renderShares(); renderRecords();
}
async function loadMonth() {
  const request = ++state.request; state.records = []; state.page = 1; state.loading = true; $('date').value = ''; $('search').value = ''; dates(); render();
  const item = entry();
  if (!item) { state.loading = false; message('선택한 월의 수집 자료가 없습니다. 다른 월을 선택해 주세요.'); render(); return; }
  message('수집 기록을 불러오고 있습니다.');
  try {
    const response = await fetch(`./${item.path}?v=${encodeURIComponent(state.manifest.generated_at)}`, {cache:'no-cache'});
    if (!response.ok) throw new Error('자료 요청 실패'); const data = await response.json();
    if (!Array.isArray(data.records) || data.records.length !== item.count) throw new Error('자료 검증 실패');
    if (request !== state.request) return;
    state.records = data.records; state.loading = false; dates(); render(); message('');
  } catch (error) { if (request !== state.request) return; state.loading = false; render(); message('자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요. 월별 점유율은 마지막 생성 자료를 표시합니다.', true); }
}
function scopeChanged(scope) {
  state.scope = scope; state.platform = '전체'; const label = scope === 'domestic' ? '국내 플랫폼' : '해외 플랫폼';
  $('page-title').textContent = label; $('breadcrumb').textContent = label;
  $('page-description').textContent = scope === 'domestic' ? '최신 앨범의 흐름과 유통사별 노출 비중을 한눈에.' : 'Spotify와 Apple Music의 국가별 편성 기록을 살펴보세요.';
  document.querySelectorAll('[data-scope]').forEach(button => { const active = button.dataset.scope === scope; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  const months = state.manifest.months[scope];
  if (!months.some(item => item.month === state.month)) state.month = months[0]?.month || '';
  $('month').value = state.month; $('month').min = months.at(-1)?.month || ''; $('month').max = months[0]?.month || ''; platforms(); loadMonth();
}
async function init() {
  try {
    const response = await fetch('./data/manifest.json', {cache:'no-store'}); if (!response.ok) throw new Error('자료 준비 중');
    state.manifest = await response.json(); if (state.manifest.version !== 1) throw new Error('자료 형식 확인 필요');
    $('updated').textContent = state.manifest.generated_at.slice(0,16).replace('T',' '); $('updated').dateTime = state.manifest.generated_at;
    document.querySelectorAll('[data-scope]').forEach(button => button.addEventListener('click', () => scopeChanged(button.dataset.scope)));
    $('month').addEventListener('change', () => {state.month = $('month').value; loadMonth();});
    $('search').addEventListener('input', () => {state.page = 1; renderRecords();}); $('date').addEventListener('change', () => {state.page = 1; renderRecords();});
    $('prev').addEventListener('click', () => {state.page--;renderRecords();}); $('next').addEventListener('click', () => {state.page++;renderRecords();});
    scopeChanged('domestic');
  } catch (error) { message('공개 자료가 아직 준비되지 않았거나 연결에 실패했습니다. 잠시 후 새로고침해 주세요.', true); $('updated').textContent = '자료 연결 대기'; empty($('records'),5,'공개 자료 연결 대기 중'); empty($('shares'),3,'집계 자료 연결 대기 중'); }
}
init();
