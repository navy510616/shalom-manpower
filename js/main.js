// ✅ 전역 등록
let monthlyMod = null;
let invoiceMod = null;
let summaryMod = null;

window.navigate = async function (page) {
    const container = document.getElementById("page-container");

    if (page === "monthly") {
        container.innerHTML = await (await fetch("./pages/monthly.html")).text();

        // ▶ ➋ 이미 로드했으면 import 건너뜀
        if (!monthlyMod) monthlyMod = await import('./monthly.js');
        else if (monthlyMod.reset) monthlyMod.reset();   // 상태·리스너 초기화        
        monthlyMod.initMonthly();

    } else if (page === "invoice") {
        monthlyMod?.reset();
        summaryMod?.reset();
        
        container.innerHTML = await (await fetch("./pages/invoice.html")).text();

        // ▶ ➋ 이미 로드했으면 import 건너뜀
        if (!invoiceMod) invoiceMod = await import('./invoice.js');
        else if (invoiceMod.reset) invoiceMod.reset();
        invoiceMod.initInvoice();

    } else if (page === "summary") {
        monthlyMod?.reset();  // 다른 모듈 초기화
        invoiceMod?.reset();
        container.innerHTML = await (await fetch("./pages/summary.html")).text();

        if (!summaryMod) summaryMod = await import('./summary.js');
        else if (summaryMod.reset) summaryMod.reset();    
        // ✅ DOM이 100% 렌더링된 다음 실행
        requestAnimationFrame(() => {
            setTimeout(() => summaryMod.initSummary(), 0);  // 완벽한 렌더링 타이밍 확보
        });
    } else {
        container.innerHTML = `<h2>📄 ${page} 페이지 준비 중...</h2>`;
    }
};

// ✅ 초기 진입 시 페이지 설정
document.addEventListener('DOMContentLoaded', () => {
    /* 사이드바 메뉴 클릭 */
    document.querySelectorAll('.sidebar a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const t = e.currentTarget.textContent;
            navigate(
                t.includes('월별') ? 'monthly' :
                    t.includes('월말') ? 'summary' :
                        t.includes('거래') ? 'invoice' : 'monthly'
            );
        });
    });

    /* 첫 화면을 월별관리로 */
    navigate('monthly');
});

const sidebar = document.querySelector(".sidebar");
//const resizer = document.querySelector('.resizer');
const mainContent = document.querySelector(".main-content");

//let isResizing = false;

// resizer.addEventListener('mousedown', function (e) {
//   isResizing = true;
//   document.body.style.cursor = 'col-resize';
//   e.preventDefault();
// });

// document.addEventListener('mousemove', function (e) {
//   if (!isResizing) return;

//   const sidebarLeft = sidebar.getBoundingClientRect().left;
//   let newWidth = e.clientX - sidebarLeft;

//   const minWidth = 160;
//   const maxWidth = 400;
//   newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

//   // ✅ 사이드바 너비 직접 반영
//   sidebar.style.width = `${newWidth}px`;

//   // ✅ main-content에 직접 margin 설정하지 말고 CSS 변수로 처리
//   document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
// });

// document.addEventListener('mouseup', function () {
//   if (isResizing) {
//     isResizing = false;
//     document.body.style.cursor = 'default';
//   }
// });
