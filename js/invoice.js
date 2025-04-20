// 🔽 Firebase App과 Firestore 연결
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔽 Firebase 설정
const firebaseConfig = {
    apiKey: 'AIzaSyBzkoyKiSBrhC-leS0FeVCnHQzAUBtOYBw',
    authDomain: 'shalom-manpower.firebaseapp.com',
    projectId: 'shalom-manpower',
    storageBucket: 'shalom-manpower.appspot.com',
    messagingSenderId: '554580073535',
    appId: '1:554580073535:web:49899724ce3dd926c22c8a',
    measurementId: 'G-NT2CFFLQLR'
};

// 🔽 Firebase 앱 초기화 및 Firestore 참조
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let invoiceInitialized = false;

async function loadInvoiceData() {
    const docSnap = await getDoc(doc(db, "invoices", "2024-04"));
    if (!docSnap.exists()) return;

    const data = docSnap.data()?.files || [];
    data.forEach(entry => addRow(entry.name, entry.image));
}

export async function initInvoice() {
    if (invoiceInitialized) return;
    invoiceInitialized = true;

    console.log("✅ 거래명세서 init");

    const addBtn = document.getElementById("addBtn");
    const delBtn = document.getElementById("delBtn");
    const table = document.getElementById("invoiceTable");
    const viewer = document.getElementById("imageViewer");
    const saveBtn = document.getElementById("saveBtn");
    
    await loadInvoiceData(); // ✅ 이곳으로 이동

    saveBtn?.addEventListener("click", async () => {
        const rows = table.querySelectorAll("tbody tr");
        const data = [];
    
        rows.forEach(tr => {
            const name = tr.querySelector(".file-name")?.value;
            const img = tr.querySelector(".download-link")?.href;  // base64
            if (name && img) {
                data.push({ name, image: img });
            }
        });
    
        try {
            await setDoc(doc(db, "invoices", "2024-04"), { files: data });
            alert("✅ 저장 완료");
        } catch (err) {
            console.error("❌ 저장 실패:", err);
            alert("❌ 저장 중 오류 발생");
        }
    });
    
    // ➕ 행 추가
    addBtn?.addEventListener("click", () => {
        const tbody = table.querySelector("tbody");
        const tr = document.createElement("tr");

        tr.innerHTML = `
        <td><input type="checkbox" class="row-check"></td>
        <td><input type="text" class="file-name" placeholder="파일 이름"></td>
        <td>
          <input type="file" class="file-input" accept="image/*" style="display:none" />
          <button class="upload-btn">파일 선택</button>
          <span class="file-label">선택된 파일 없음</span>
        </td>
        <td><button class="preview-btn">📄</button></td>
      `;

        tbody.appendChild(tr);

        const fileInput = tr.querySelector(".file-input");
        const uploadBtn = tr.querySelector(".upload-btn");
        const label = tr.querySelector(".file-label");
        const previewBtn = tr.querySelector(".preview-btn");

        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;

                // ✅ 새로운 구조 재생성
                const parentTd = uploadBtn.closest("td");
                parentTd.innerHTML = "";  // 기존 제거

                const wrapper = document.createElement("div");
                wrapper.className = "upload-wrapper";

                const newUploadBtn = document.createElement("button");
                newUploadBtn.className = "upload-btn";
                newUploadBtn.textContent = "파일 선택";

                const newLabel = document.createElement("span");
                newLabel.className = "file-label";
                newLabel.textContent = "업로드 완료";

                wrapper.appendChild(downloadLink);
                parentTd.appendChild(wrapper);

                newUploadBtn.onclick = () => fileInput.click();

                wrapper.appendChild(newUploadBtn);
                wrapper.appendChild(newLabel);

                // ✅ 다운로드 버튼
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrl;
                downloadLink.download = file.name;
                downloadLink.textContent = "⬇️ 다운로드";
                downloadLink.className = "download-link";


                
            };
            reader.readAsDataURL(file); // 꼭 필요함!
        };  
        previewBtn.onclick = () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                viewer.innerHTML = `<img src="${e.target.result}" />`;
            };
            reader.readAsDataURL(file);
        };
    });

    // ➖ 행 삭제
    delBtn?.addEventListener("click", () => {
        const checks = table.querySelectorAll(".row-check:checked");
        checks.forEach(chk => chk.closest("tr")?.remove());
    });
}

export function reset() {
    console.log("♻️ 거래명세서 모듈 초기화");
    invoiceInitialized = false;
}

function addRow(name = "", base64 = "") {
    const table = document.getElementById("invoiceTable");
    const tbody = table.querySelector("tbody");
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="row-check"></td>
      <td><input type="text" class="file-name" placeholder="파일 이름" value="${name}"></td>
      <td>
        <div class="upload-wrapper">
            <input type="file" class="file-input" accept="image/*" style="display:none" />
            <button class="upload-btn">파일 선택</button>
            <span class="file-label">${base64 ? "업로드 완료" : "선택된 파일 없음"}</span>
        </div>    
            ${base64 ? `<a href="${base64}" download="${name}" class="download-link">⬇️ 다운로드</a>` : ""}
      </td>
      <td><button class="preview-btn">📄</button></td>
    `;

    tbody.appendChild(tr);

    const fileInput = tr.querySelector(".file-input");
    const uploadBtn = tr.querySelector(".upload-btn");
    const label = tr.querySelector(".file-label");
    const previewBtn = tr.querySelector(".preview-btn");
    const viewer = document.getElementById("imageViewer");

    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            label.textContent = "업로드 완료";

            const oldDownload = tr.querySelector(".download-link");
            if (oldDownload) oldDownload.remove();

            const downloadLink = document.createElement("a");
            downloadLink.href = base64;
            downloadLink.download = file.name;
            downloadLink.className = "download-link";
            downloadLink.textContent = "⬇️ 다운로드";
            tr.querySelector("td:nth-child(3)").appendChild(downloadLink);
        };
        reader.readAsDataURL(file);
    };

    previewBtn.onclick = () => {
        const base64 = tr.querySelector(".download-link")?.href;
        if (base64) viewer.innerHTML = `<img src="${base64}" />`;
    };
}
