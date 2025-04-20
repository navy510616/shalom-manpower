import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";

let currentDate = new Date();
let zoomLevel = 1;

export function initSummary() {
    console.log("✅ initSummary 실행됨");
    updateDateDisplay();
    setupControls();
    enableArrowNavigation();
    enableColorPicker();
    loadDataFromFirebase();  // 🔁 초기 로딩 시 데이터 가져오기
}

function updateDateDisplay() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const yearEl = document.getElementById('yearDisplay');
    const monthEl = document.getElementById('monthDisplay');

    if (yearEl && monthEl) {
        yearEl.textContent = year;
        monthEl.textContent = month;
    }

    const theadRow = document.querySelector('#summaryTable thead tr');
    if (!theadRow) return;

    while (theadRow.children.length > 3) {
        theadRow.removeChild(theadRow.children[2]);
    }

    const days = new Date(year, month, 0).getDate();
    const remarkTh = theadRow.lastElementChild;

    // ✅ 고정 너비 설정
    theadRow.children[0].className = 'checkbox-col'; // 체크박스 열
    theadRow.children[1].className = 'name-col'; // 이름 열
    remarkTh.className = 'remark-col'; // 비고 열

    for (let i = 1; i <= days; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        th.className = 'day-col';
        theadRow.insertBefore(th, remarkTh);
    }

    const rows = document.querySelectorAll('#summaryTable tbody tr');
    rows.forEach(row => {
        while (row.children.length > 3) {
            row.removeChild(row.children[2]);
        }

        row.children[0].className = 'checkbox-col';
        row.children[1].className = 'name-col';
        row.lastElementChild.className = 'remark-col';

        for (let i = 1; i <= days; i++) {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.className = 'day-col';
            row.insertBefore(td, row.lastElementChild);
        }
    });
}

function setupControls() {
    const qs = id => document.getElementById(id);

    qs('prevMonthBtn')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateDateDisplay();
        loadDataFromFirebase();
    });

    qs('nextMonthBtn')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateDateDisplay();
        loadDataFromFirebase();
    });

    qs('addNameBtn')?.addEventListener('click', addNameRow);
    qs('deleteRowBtn')?.addEventListener('click', deleteSelectedRows);
    qs('sortAscBtn')?.addEventListener('click', sortByNameAsc);
    qs('sortDescBtn')?.addEventListener('click', sortByNameDesc);
    qs('zoomInBtn')?.addEventListener('click', () => {
        zoomLevel += 0.1;
        qs('summaryTable').style.transform = `scale(${zoomLevel})`;
    });
    qs('zoomOutBtn')?.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.1);
        qs('summaryTable').style.transform = `scale(${zoomLevel})`;
    });

    qs('importBtn')?.addEventListener('click', () => {
        qs('importExcel').click();
    });
    qs('importExcel')?.addEventListener('change', handleFileUpload);
    qs('exportBtn')?.addEventListener('click', exportToExcel);
    qs('saveBtn')?.addEventListener('click', saveData);
    qs('highlightBtn')?.addEventListener('click', () => {
        const active = document.activeElement;
        if (active && active.tagName === 'TD' && active.isContentEditable) {
            active.classList.toggle('selected-cell');
        }
    });
}

function enableArrowNavigation() {
    document.addEventListener('keydown', e => {
        const active = document.activeElement;
        if (!active || active.tagName !== 'TD' || !active.isContentEditable) return;

        const cell = active;
        const row = cell.parentElement;
        const tbody = document.querySelector('#summaryTable tbody');

        const rowIndex = Array.from(tbody.rows).indexOf(row);
        const cellIndex = Array.from(row.children).indexOf(cell);

        let targetCell = null;

        switch (e.key) {
            case 'ArrowLeft':
                if (cell.previousElementSibling) {
                    targetCell = cell.previousElementSibling;
                }
                break;
            case 'ArrowRight':
                if (cell.nextElementSibling) {
                    targetCell = cell.nextElementSibling;
                }
                break;
            case 'ArrowUp':
                if (rowIndex > 0) {
                    const prevRow = tbody.rows[rowIndex - 1];
                    targetCell = prevRow.children[cellIndex];
                }
                break;
            case 'ArrowDown':
                if (rowIndex < tbody.rows.length - 1) {
                    const nextRow = tbody.rows[rowIndex + 1];
                    targetCell = nextRow.children[cellIndex];
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (rowIndex < tbody.rows.length - 1) {
                    const nextRow = tbody.rows[rowIndex + 1];
                    targetCell = nextRow.children[cellIndex];
                }
                break;
        }

        if (targetCell && targetCell.isContentEditable) {
            e.preventDefault();
            targetCell.focus();
        }
    });
}

function addNameRow() {
    const tbody = document.querySelector('#summaryTable tbody');
    const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const row = document.createElement('tr');
    row.innerHTML = `
    <td><input type="checkbox" /></td>
    <td contenteditable="true">이름</td>
    ${Array.from({ length: days }, () => '<td contenteditable="true" class="day-col"></td>').join('')}
    <td contenteditable="true"></td>
  `;
    tbody.appendChild(row);
}

function deleteSelectedRows() {
    document.querySelectorAll('#summaryTable tbody tr')
        .forEach(row => {
            if (row.querySelector('input[type="checkbox"]')?.checked) {
                row.remove();
            }
        });
}

function sortByNameAsc() {
    const tbody = document.querySelector('#summaryTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => (a.cells[1]?.textContent ?? '').localeCompare(b.cells[1]?.textContent ?? '', 'ko'));
    rows.forEach(row => tbody.appendChild(row));
}

function sortByNameDesc() {
    const tbody = document.querySelector('#summaryTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => (b.cells[1]?.textContent ?? '').localeCompare(a.cells[1]?.textContent ?? '', 'ko'));
    rows.forEach(row => tbody.appendChild(row));
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

        const tbody = document.querySelector('#summaryTable tbody');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const days = new Date(year, month, 0).getDate();

        tbody.innerHTML = '';

        rows.slice(1).forEach(row => {
            if (!row[0]) return; // 이름이 없으면 skip

            const tr = document.createElement('tr');
            const name = row[0];
            const dayData = row.slice(1, days + 1);
            const remark = row.length > days + 1 ? row[days + 1] : '';

            const dayCells = [];

            for (let i = 0; i < days; i++) {
                dayCells.push(`<td contenteditable="true">${dayData[i] ?? ''}</td>`);
            }

            tr.innerHTML = `
                <td><input type="checkbox" /></td>
                <td contenteditable="true">${name}</td>
                ${dayCells.join('')}
                <td contenteditable="true">${remark ?? ''}</td>
            `;

            tbody.appendChild(tr);
        });
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    const table = document.getElementById('summaryTable');
    const wb = XLSX.utils.book_new();
    const ws_data = [];

    // 헤더 수집
    const headerCells = Array.from(table.querySelectorAll('thead th')).slice(1); // ✅ 첫 칸 제외
    ws_data.push(headerCells.map(th => th.textContent));

    // 데이터 수집
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
        const tds = Array.from(tr.children).slice(1); // ✅ 첫 번째 칸 제외 (checkbox)
        const rowData = tds.map(td => td.textContent.trim());
        ws_data.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, '월말정리');
    XLSX.writeFile(wb, 'summary.xlsx');
}

async function saveData() {
    await saveDataToFirebase();
}

// ✅ 셀 색상 선택 기능 및 팝업 UI 포함 (16색 확장 + z-index 보정)
export function enableColorPicker() {
    const table = document.getElementById('summaryTable');
    const highlightBtn = document.getElementById('highlightBtn');

    if (!table || !highlightBtn) {
        console.warn('❌ 표 또는 highlightBtn 요소가 존재하지 않습니다.');
        return;
    }

    let selectedCells = new Set();
    let isMouseDown = false;
    let startCell = null;

    table.addEventListener('mousedown', e => {
        if (e.target.tagName === 'TD' && e.target.isContentEditable) {
            isMouseDown = true;
            startCell = e.target;
            clearSelection();
            toggleCellSelection(e.target);
        }
    });

    table.addEventListener('mouseover', e => {
        if (isMouseDown && startCell && e.target.tagName === 'TD' && e.target.isContentEditable) {
            clearSelection();
            selectCellRange(startCell, e.target);
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        startCell = null;
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            clearSelection();
            popup.style.display = 'none';
        }

        // ✅ Delete 키로 선택 셀 내용 삭제
        if (e.key === 'Delete') {
            selectedCells.forEach(cell => {
                cell.textContent = '';
            });
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('#summaryTable') && !e.target.closest('.color-picker-popup') && !e.target.closest('#highlightBtn')) {
            popup.style.display = 'none';
            clearSelection();
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'TD' && e.target.isContentEditable) {
            const td = e.target;
            // Shift 선택이 아니면 모두 해제
            if (!e.shiftKey) {
                document.querySelectorAll('.cell-selected').forEach(el => el.classList.remove('cell-selected'));
            }
            td.classList.toggle('cell-selected');
        }
    });

    function toggleCellSelection(cell) {
        if (!selectedCells.has(cell)) {
            cell.classList.add('selected');
            selectedCells.add(cell);
        }
    }

    function clearSelection() {
        selectedCells.forEach(cell => cell.classList.remove('selected'));
        selectedCells.clear();
    }

    function selectCellRange(start, end) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.rows);

        const startRow = rows.indexOf(start.parentElement);
        const endRow = rows.indexOf(end.parentElement);
        const startCol = Array.from(start.parentElement.cells).indexOf(start);
        const endCol = Array.from(end.parentElement.cells).indexOf(end);

        const rowMin = Math.min(startRow, endRow);
        const rowMax = Math.max(startRow, endRow);
        const colMin = Math.min(startCol, endCol);
        const colMax = Math.max(startCol, endCol);

        for (let i = rowMin; i <= rowMax; i++) {
            const row = rows[i];
            for (let j = colMin; j <= colMax; j++) {
                const cell = row.cells[j];
                if (cell && cell.isContentEditable) {
                    cell.classList.add('selected');
                    selectedCells.add(cell);
                }
            }
        }
    }

    // 색상 선택 팝업 생성 (16색 + 초기화 버튼)
    const popup = document.createElement('div');
    popup.className = 'color-picker-popup';
    popup.style.display = 'none';
    popup.style.flexWrap = 'wrap';
    popup.style.width = '180px';
    popup.style.padding = '6px';
    popup.style.background = '#fff';
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '6px';
    popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    popup.style.position = 'absolute';
    popup.style.zIndex = '9999';

    const colors = [
        '#ffffff', '#f8f9fa', '#ffeeba', '#d4edda', '#bee5eb', '#f5c6cb', '#d6d8db', '#c3e6cb',
        '#b8daff', '#f5b7b1', '#f0e68c', '#d1ecf1', '#e2e3e5', '#f9f7f7', '#fdfd96', '#ffb3ba',
        '#ffcccb', '#ccffcc', '#ccffff', '#ccccff', '#ffccff', '#f0fff0', '#e6e6fa', '#ffe4e1',
        '#fafad2', '#f0f8ff', '#f5fffa', '#d3d3d3', '#fdf5e6', '#f0ffff', '#ffe4b5', '#e0ffff'
    ];

    colors.forEach(hex => {
        const swatch = document.createElement('div');
        swatch.style.backgroundColor = hex;
        swatch.style.width = '24px';
        swatch.style.height = '24px';
        swatch.style.border = '1px solid #ccc';
        swatch.style.borderRadius = '4px';
        swatch.style.margin = '4px';
        swatch.style.cursor = 'pointer';

        swatch.addEventListener('click', () => {
            selectedCells.forEach(cell => {
                cell.style.backgroundColor = hex;
            });
            popup.style.display = 'none';
        });
        popup.appendChild(swatch);
    });

    // ✅ 초기화 버튼
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '채우기 없음';
    clearBtn.style.marginTop = '4px';
    clearBtn.style.padding = '4px 8px';
    clearBtn.style.fontSize = '12px';
    clearBtn.style.border = '1px solid #ccc';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.background = '#f8f9fa';
    clearBtn.style.cursor = 'pointer';
    clearBtn.addEventListener('click', () => {
        selectedCells.forEach(cell => {
            cell.style.backgroundColor = '#f9f9f9';
        });
        popup.style.display = 'none';
    });
    popup.appendChild(clearBtn);

    document.body.appendChild(popup);

    // 이모지 버튼 클릭 시 팝업 표시 (적절한 위치 계산)
    highlightBtn.addEventListener('click', e => {
        const rect = highlightBtn.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        popup.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 200)}px`;
        popup.style.display = 'flex';
        popup.style.visibility = 'visible';
        popup.focus();
    });
}

import {
    getFirestore, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const db = getFirestore(); // 이미 monthly.js에서 초기화됨

async function saveDataToFirebase() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const table = document.querySelector('#summaryTable');
    const rows = table.querySelectorAll('tbody tr');

    const summaryData = [];

    rows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        const name = cells[1]?.textContent.trim() || '';
        const row = [];

        for (let i = 2; i < cells.length; i++) {
            row.push({
                value: cells[i].textContent.trim(),
                color: cells[i].style.backgroundColor || ''
            });
        }

        summaryData.push({ name, data: row });
    });

    try {
        await setDoc(doc(db, 'summary', `${year}-${month}`), {
            year,
            month,
            rows: summaryData,
        });
        toast('✅ 저장 완료');
    } catch (err) {
        console.error('❌ 저장 실패:', err);
    }
}

document.getElementById('saveBtn')?.addEventListener('click', saveDataToFirebase);

async function loadDataFromFirebase() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const key = `${year}-${month}`;
    const docRef = doc(db, 'summary', key);

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.warn('❗ 불러올 데이터가 없습니다.');
            return;
        }

        const { rows } = docSnap.data();
        const tbody = document.querySelector('#summaryTable tbody');
        const days = new Date(year, month, 0).getDate();

        tbody.innerHTML = '';

        rows.forEach(({ name, data }) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" /></td>
                <td contenteditable="true">${name}</td>
                ${data.slice(0, days).map(cell => `
                <td contenteditable="true" class="day-col" style="background-color: ${cell.color || ''}">
                    ${cell.value || ''}
                </td>`).join('')}
                <td contenteditable="true"></td> <!-- 비고 -->
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ Firebase에서 데이터 불러오기 완료');
    } catch (err) {
        console.error('❌ 데이터 불러오기 실패:', err);
    }
}

function toast(msg) {
    const d = document.createElement('div');
    Object.assign(d.style, {
        position: 'fixed',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        background: '#333',
        color: '#fff',
        borderRadius: '4px',
        zIndex: 9999,
        opacity: 0,
        transition: 'opacity .3s',
    });
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.style.opacity = 1, 10);
    setTimeout(() => {
        d.style.opacity = 0;
        setTimeout(() => d.remove(), 300);
    }, 1000);
}

export function reset() {
    console.log("🔄 summary 모듈 초기화됨");
}

//셀 병합 기능
// function mergeSelectedCellsHorizontally() {
//     const selected = Array.from(document.querySelectorAll('.cell-selected'));
//     console.log('선택된 셀:', selected);

//     if (selected.length < 2) {
//         alert('2개 이상의 셀을 선택해주세요.');
//         return;
//     }

//     // 같은 행인지 확인
//     const row = selected[0].parentElement;
//     if (!selected.every(td => td.parentElement === row)) {
//         alert('같은 행의 셀만 병합할 수 있습니다.');
//         return;
//     }

//     const first = selected[0];
//     const colspan = selected.length;
//     // 기존 셀 텍스트 결합
//     const mergedText = selected.map(td => td.textContent.trim()).join(' ');

//     // 첫 셀에 colspan 지정하고 내용 설정
//     first.setAttribute('colspan', colspan);
//     first.textContent = mergedText;
//     first.classList.remove('cell-selected');

//     // 나머지 셀 제거
//     for (let i = 1; i < selected.length; i++) {
//         selected[i].remove();
//     }
// }

// document.getElementById('mergeHorizontalBtn')?.addEventListener('click', mergeSelectedCellsHorizontally);
