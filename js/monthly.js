/* js/monthly.js  ────────────────────────────────────────────── */
import { initializeApp, getApps }
    from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc }
    from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

/* ---------- Firebase ---------- */
const firebaseConfig = {
    apiKey: 'AIzaSyBzkoyKiSBrhC-leS0FeVCnHQzAUBtOYBw',
    authDomain: 'shalom-manpower.firebaseapp.com',
    projectId: 'shalom-manpower',
    storageBucket: 'shalom-manpower.appspot.com',
    messagingSenderId: '554580073535',
    appId: '1:554580073535:web:49899724ce3dd926c22c8a',
    measurementId: 'G-NT2CFFLQLR'
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- 모듈 상태 ---------- */
let initialized = false;
let year, month, table, tbody;

/* ▲ main.js 에서 다른 페이지로 이동할 때 꼭 reset() 호출 */
export function reset() { initialized = false; }

/* ▼ main.js 에서 월별 페이지 로드 직후 호출 */
export function initMonthly() {
    if (initialized) return;                   // 중복 방지
    if (!document.getElementById('scheduleTable')) {
        requestAnimationFrame(initMonthly); return;   // HTML 삽입 대기
    }
    initialized = true;

    year = new Date().getFullYear();
    month = new Date().getMonth() + 1;
    table = document.getElementById('scheduleTable');
    tbody = table.querySelector('tbody');

    bindStaticButtons();      // 이모지 버튼 등
    exposeGlobals();          // prevMonth() 등을 window 로 노출
    updateDateDisplay();      // 첫 화면 그리기
}

/* ───────── 버튼 바인딩 ───────── */
function bindStaticButtons() {
    btn('저장')?.addEventListener('click', saveData);
    btn('이름 추가')?.addEventListener('click', addNameRow);
    btn('이름 삭제')?.addEventListener('click', deleteRows);
    btn('오름차순')?.addEventListener('click', () => sortRows(1));
    btn('내림차순')?.addEventListener('click', () => sortRows(-1));
    btn('화면 확대')?.addEventListener('click', zoomIn);
    btn('화면 축소')?.addEventListener('click', zoomOut);
    btn('⬇️')?.addEventListener('click', exportToExcel);

    document.getElementById('importExcel')
        ?.addEventListener('change', handleFileUpload);
}

/* ───────── 헤더 생성 ───────── */
function makeHeader(y, m) {
    const tr = table.querySelector('thead tr');
    tr.innerHTML =
        '<th><input type="checkbox" id="selectAll"></th><th>이름</th>';

    const days = new Date(y, m, 0).getDate();
    for (let d = 1; d <= days; d++)
        tr.insertAdjacentHTML('beforeend', `<th>${d}</th>`);
    tr.insertAdjacentHTML('beforeend', '<th>합계</th><th>비고</th>');

    tr.querySelector('#selectAll').onchange = e =>
        tbody.querySelectorAll('.row-select')
            .forEach(cb => cb.checked = e.target.checked);
}

/* ───────── 날짜 표시 & 데이터 로드 ───────── */
function updateDateDisplay() {
    qs('#yearDisplay').textContent = year;
    qs('#monthDisplay').textContent = month;
    makeHeader(year, month);
    loadData();
    setupAutoSave();
}

/* ───────── Firestore 키 ───────── */
const docKey = () => `${year}-${String(month).padStart(2, '0')}`;

/* ───────── 저장 / 불러오기 ───────── */
async function saveData() {
    const rows = [...tbody.querySelectorAll('tr')];

    const data = rows.map(tr => ({
        name: qs(tr, '.name-input')?.value.trim() || '',
        amounts: [...tr.querySelectorAll('.amount-input')]
            .map(i => i.value.replace(/,/g, '') || '0'),
        sum: qs(tr, '.sum-input')?.value || '0',
        remark: qs(tr, '.remark-input input')?.value || ''
    }));
    await setDoc(doc(db, 'monthlyData', docKey()), { data });
    toast('✅ 저장 완료');
}

async function loadData() {
    const snap = await getDoc(doc(db, 'monthlyData', docKey()));
    if (!snap.exists()) return;

    tbody.innerHTML = '';
    snap.data().data.forEach(r => {
        addNameRow(r.name);
        const tr = tbody.lastElementChild;
        [...tr.querySelectorAll('.amount-input')]
            .forEach((inp, i) => { inp.value = r.amounts[i] || ''; fmt(inp); });
        qsIn(tr, '.sum-input').value = r.sum;
        qsIn(tr, '.remark-input input').value = r.remark;
    });
}

/* ───────── 행 추가 ───────── */
function addNameRow(name = '') {
    const days = new Date(year, month, 0).getDate();
    const tr = document.createElement('tr');

    tr.innerHTML =
        `<td><input type="checkbox" class="row-select"></td>
    <td><input type="text" class="name-input" value="${name}"></td>`;

    for (let d = 1; d <= days; d++)
        tr.insertAdjacentHTML('beforeend',
            `<td><input type="text" class="amount-input"></td>`);

    tr.insertAdjacentHTML('beforeend',
        `<td><input type="text" class="sum-input" readonly value="0"></td>
    <td class="remark-input"><input type="text"></td>`);

    /* 숫자 입력 이벤트 */
    tr.querySelectorAll('.amount-input').forEach(inp => {
        inp.oninput = () => { fmt(inp); updateSum(tr); };
        inp.onkeydown = navKey;
    });
    tr.querySelector('.name-input').onkeydown = navKey;
    tr.querySelector('.remark-input input').onkeydown = navKey;

    tbody.appendChild(tr);
}

/* ───────── 합계 / 포맷 ───────── */
function updateSum(target) {
    const row = target instanceof HTMLInputElement ? target.closest('tr') : target;
    if (!row) return;

    const inputs = [...row.querySelectorAll('.amount-input')];
    const sum = inputs.reduce((a, i) => a + (+i.value.replace(/,/g, '') || 0), 0);

    const sumCell = row.querySelector('.sum-input');
    if (sumCell) {                                    // ← 방어 코드
        sumCell.value = sum.toLocaleString('ko-KR');
    } else {
        /* 개발 중 경고 로그만 남김 (배포 시 제거해도 무방) */
        console.warn('sum-input not found in row →', row);
    }
}

function fmt(inp) {
    inp.value = inp.value.replace(/\D/g, '')
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ───────── 키보드 이동 ───────── */
function navKey(e) {
    const td = e.target.closest('td'), tr = td.parentElement;
    const rows = [...tbody.children], r = rows.indexOf(tr);
    const cells = [...tr.children], c = cells.indexOf(td);
    const go = (R, C) => rows[R]?.children[C]?.querySelector('input');
    let t;
    switch (e.key) {
        case 'ArrowRight': t = go(r, c + 1); break;
        case 'ArrowLeft': t = go(r, c - 1); break;
        case 'ArrowUp': t = go(r - 1, c); break;
        case 'ArrowDown':
        case 'Enter': t = go(r + 1, c); break;
    }
    if (t) { e.preventDefault(); t.focus(); t.select?.(); }
}

/* ───────── 기타 유틸 ───────── */
function deleteRows() {
    tbody.querySelectorAll('.row-select:checked')
        .forEach(cb => cb.closest('tr').remove());
}
function sortRows(dir) {
    [...tbody.querySelectorAll('tr')]
        .sort((a, b) => a.querySelector('.name-input').value
            .localeCompare(b.querySelector('.name-input').value, 'ko-KR') * dir)
        .forEach(r => tbody.appendChild(r));
}
let zoom = 1;
function zoomIn() { zoom = Math.min(zoom + 0.1, 2); setZoom(); }
function zoomOut() { zoom = Math.max(zoom - 0.1, 0.5); setZoom(); }
function setZoom() { document.documentElement.style.setProperty('--zoom', zoom); }

/* ───────── 월 이동 (전역으로 노출) ───────── */
function prevMonth() { month--; if (month < 1) { month = 12; year--; } updateDateDisplay(); }
function nextMonth() { month++; if (month > 12) { month = 1; year++; } updateDateDisplay(); }

function exposeGlobals() {
    Object.assign(window, {
        prevMonth, nextMonth, saveData, addNameRow,
        deleteSelectedRows: deleteRows,
        sortByNameAsc: () => sortRows(1),
        sortByNameDesc: () => sortRows(-1),
        increaseZoom: zoomIn,
        decreaseZoom: zoomOut,
        exportToExcel,
        handleFileUpload
    });
}

/* ───────── 엑셀 / 파일업로드 (기존 코드 그대로) ───────── */
function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const rows = [];

    /* 헤더 */
    const header = ['이름'];
    for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) header.push(String(d));
    header.push('합계', '비고');
    rows.push(header);

    /* 바디 */
    tbody.querySelectorAll('tr').forEach(tr => {
        const r = [];
        r.push(qsIn(tr, '.name-input').value);
        tr.querySelectorAll('.amount-input')
            .forEach(i => r.push(i.value.replace(/,/g, '') || '0'));
        r.push(qsIn(tr, '.sum-input').value);
        r.push(qsIn(tr, '.remark-input input').value);
        rows.push(r);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '월별 스케줄');
    XLSX.writeFile(wb, `${year}-${String(month).padStart(2, '0')}_schedule.xlsx`);
}

/* ---------- 엑셀 업로드 ---------- */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const days = new Date(year, month, 0).getDate();   // 이번 달 일 수
        tbody.innerHTML = '';

        rows.slice(1).forEach(row => {
            if (!row[0]) return; // 이름 없으면 skip
            const name = row[0];
            const remark  = row.length > days + 2    // ★ 오로지 한 번만!
                          ? row[days + 2] : "";

            addNameRow(name);
            const tr = tbody.lastElementChild;
            const inputs = [...tr.querySelectorAll('.amount-input')];

            // 일자 수 만큼 값 입력
            for (let i = 0; i < days; i++){
                const v = row[i + 1] ?? "";        // 존재하지 않으면 ''
                inputs[i].value = v;
                fmt(inputs[i]);
            }

            // 비고 입력
            qs(tr, '.remark-input input').value = remark;

            // 합계 계산
            updateSum(inputs[0]); 
            //if (inputs[0]) updateSum(inputs[0]);
        });

        toast('✅ 엑셀 데이터 불러오기 완료');
    };
    reader.readAsArrayBuffer(file);
}

/* ───────── 자동 저장 ───────── */
function setupAutoSave() {
    let last = Date.now();                     // 마지막 입력 시간
    tbody.addEventListener('input', () => last = Date.now());

    /* 5초마다 체크 → 1 분(60 000 ms) 동안 편집이 없으면 저장 */
    // setInterval(() => {
    //     if (Date.now() - last > 300_000) {        // 1 분 경과
    //         saveData.silent = true;                // 토스트 메시지 숨김
    //         saveData();                            // Firestore로 저장
    //         saveData.silent = false;
    //         last = Date.now();                     // 타이머 초기화
    //     }
    // }, 30_000);                                // 체크 주기: 5 초
}

/* ───────── 헬퍼 ───────── */
const qsIn = (root, sel) => root.querySelector(sel);
const qs = (a, b = document) =>    // ← 두번째 인수가 없으면 document
    (typeof a === 'string')
        ? b.querySelector(a)
        : a.querySelector(b);
const qsEmoji = title => document
    .querySelector(`.emoji[title="${title}"]`)?.closest('button');
const btn = qsEmoji;

function toast(msg) {
    const d = document.createElement('div');
    Object.assign(d.style, {
        position: 'fixed', top: '30px', left: '50%',
        transform: 'translateX(-50%)', padding: '8px 16px', background: '#333', color: '#fff',
        borderRadius: '4px', zIndex: 9999, opacity: 0, transition: 'opacity .3s'
    });
    d.textContent = msg; document.body.appendChild(d);
    setTimeout(() => d.style.opacity = 1, 10);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 300); }, 1000);
}