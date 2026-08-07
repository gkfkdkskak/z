// 스텔스 자동 클라우드 백업 기능
window.autoCloudBackup = function() {
    const fullData = {
        tasks: window.currentTasks,
        team: window.teamMembers,
        expenses: window.currentExpenses,
        notices: window.currentNotices,
        contacts: window.currentContacts,
        sites: window.currentSites,
        equipments: window.currentEquips,
        warehouse: window.currentWarehouseItems
    };
    const gasUrl = "https://script.google.com/macros/s/AKfycby-XSYg-1KKi9ofXkNMyDjGzUeYaN4gct6comMHGJU5ThsLwgVb31UpeF5gUa-NkPLPjA/exec"; 
    fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(fullData)
    }).then(res => console.log('자동 백업 완료')).catch(e => console.log('백업 에러'));
};

window.currentTasks = []; 
window.teamMembers = []; 
window.currentEquips = []; 
window.currentExpenses = []; 
window.expenseLimits = {}; 
window.expenseDefaultLimit = 0; 
window.expenseViewCycle = null;
window.expenseCutoffDate = 25; 
window.currentNotices = []; 
window.editExpenseId = null;
window.currentContacts = []; 
window.currentSites = []; 
window.currentOtherCos = [];
window.currentContactGroups = []; 
window.currentSiteGroups = []; 
window.currentOtherCoGroups = [];
window.currentWarehouseGroups = [];
window.currentWarehouseItems = [];  
window.editWarehouseId = null;
window.editingContactId = null; 
window.editingSiteId = null; 
window.editingOtherCoId = null;
window.currentDate = new Date(); 
window.hasShownAlert = false; 
window.hasShownBriefing = false; 
window.worklogEntryCount = 0; 
window.currentWorkerEntryId = null; 
window.showOldDoneTasks = false; 
window.worklogViewDate = '';

window.debounce = function(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, delay);
    };
};

window.debouncedUpdateUI = window.debounce(() => { window.updateUI(); }, 300);
window.debouncedRenderWarehouse = window.debounce(() => { window.renderWarehouse(); }, 300);

try {
    const firebaseConfig = { 
        apiKey: "AIzaSyDSERFM9_UmjfPt5x3HTsL0flekVb-p6HA", 
        authDomain: "project-5a01b.firebaseapp.com", 
        projectId: "project-5a01b" 
    };
    if (!firebase.apps.length) { 
        firebase.initializeApp(firebaseConfig); 
    }
    window.db = firebase.firestore();
    window.db.settings({ experimentalForceLongPolling: true, merge: true });
} catch (e) {
    console.error("Firebase Init Error:", e);
}

window.getLocalUser = function() { try { return localStorage.getItem('site_user') || ''; } catch(e) { return ''; } };
window.setLocalUser = function(val) { try { localStorage.setItem('site_user', val); } catch(e) {} };
window.removeLocalUser = function() { try { localStorage.removeItem('site_user'); } catch(e) {} };
window.loggedInUser = window.getLocalUser();

window.getLocalDateString = function(dateObj) { 
    if(!dateObj) dateObj = new Date(); 
    const y = dateObj.getFullYear(); 
    const m = String(dateObj.getMonth() + 1).padStart(2, '0'); 
    const d = String(dateObj.getDate()).padStart(2, '0'); 
    return y + '-' + m + '-' + d; 
};
window.worklogViewDate = window.getLocalDateString();

window.getFallbackDate = function(createdAt) { 
    if (!createdAt) return ''; 
    try { 
        const d = new Date(createdAt); 
        if (isNaN(d.getTime())) return ''; 
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); 
    } catch(e) { return ''; } 
};

window.getNextDateStr = function(dateStr, type) {
    if(!dateStr) return '';
    let d = new Date(dateStr);
    if(isNaN(d.getTime())) return '';
    if(type === 'daily') d.setDate(d.getDate() + 1);
    else if(type === 'weekly') d.setDate(d.getDate() + 7);
    else if(type === 'monthly') d.setMonth(d.getMonth() + 1);
    return window.getLocalDateString(d);
};

window.updateClock = function() { 
    const now = new Date(); 
    const clockEl = document.getElementById('clock-widget'); 
    if (clockEl) {
        clockEl.innerText = `⏰ ${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    } 
};

window.fetchWeather = async function() { 
    try { 
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=36.7836&longitude=127.0041&current_weather=true'); 
        const data = await res.json(); 
        const temp = data.current_weather.temperature; 
        const code = data.current_weather.weathercode; 
        let icon = '☀️'; 
        if ([1,2,3].includes(code)) icon = '⛅'; 
        else if ([45,48].includes(code)) icon = '🌫️'; 
        else if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) icon = '🌧️'; 
        else if ([71,73,75,77,85,86].includes(code)) icon = '❄️'; 
        else if ([95,96,99].includes(code)) icon = '⛈️'; 
        const wEl = document.getElementById('weather-widget'); 
        if(wEl) wEl.innerText = `${icon} 아산시 ${temp}℃`; 
    } catch(e) { 
        const wEl = document.getElementById('weather-widget'); 
        if(wEl) wEl.innerText = `☀️ 아산시 (날씨 확인불가)`; 
    } 
};

window.sendLineNotificationProxy = function(messageText) { 
    var gasUrl = "https://script.google.com/macros/s/AKfycbyXn99LNYF-MgSEylL3PmcIgt0UaapVhiHXeexHfJCLHIGl5jj4nNRwwoSw0v5u-OgnJA/exec"; 
    if (!gasUrl || gasUrl.includes("YOUR_GAS_WEB_APP_URL")) return; 
    fetch(gasUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ messages: [{ type: "text", text: messageText }] }) }).catch(function(e){}); 
};

window.resetDates = function() { 
    const today = window.getLocalDateString(); 
    const dateInputs = ['exp-date', 'todo-start', 'todo-due', 'inprogress-start', 'inprogress-due', 'done-start', 'done-due', 'mat-request-start', 'mat-request-due', 'mat-ordered-start', 'mat-ordered-due', 'mat-delivered-start', 'mat-delivered-due', 'worklog-start', 'worklog-view-date', 'eq-due']; 
    dateInputs.forEach(function(id) { 
        const el = document.getElementById(id); 
        if (el && !el.value) el.value = today; 
    }); 
    const viewDateEl = document.getElementById('worklog-view-date'); 
    if (viewDateEl && !viewDateEl.value) { 
        window.worklogViewDate = today; 
    } else if (viewDateEl) { 
        window.worklogViewDate = viewDateEl.value; 
    } 
};

window.changeWorklogViewDate = function(dateStr) {
    if (!dateStr) {
        window.worklogViewDate = window.getLocalDateString(); 
    } else {
        window.worklogViewDate = dateStr; 
    }
    window.updateUI(); 
};

window.downloadWarehouseTemplate = function() {
    if(typeof XLSX === 'undefined') return alert('엑셀 라이브러리를 로드하지 못했습니다.');
    const wb = XLSX.utils.book_new();
    const templateData = [{
        '위치/창고': 'A창고 (또는 그룹명)',
        '품명': '철근',
        '규격': '10mm',
        '단위': 'EA',
        '수량': 100,
        '비고': '추가 설명 작성 가능'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 25}];
    XLSX.utils.book_append_sheet(wb, ws, "창고자재_업로드양식");
    XLSX.writeFile(wb, `창고자재_업로드양식.xlsx`);
};

window.uploadWarehouseExcel = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if(json.length === 0) return alert("엑셀 데이터가 없습니다.");
            if(!confirm(`⚠️ 주의: 기존 창고 데이터가 모두 삭제되고 엑셀 데이터(${json.length}개)로 덮어쓰기 됩니다.\n계속 진행하시겠습니까?`)) {
                event.target.value = '';
                return;
            }

            alert("기존 데이터를 삭제하고 엑셀 업로드를 시작합니다.\n인터넷 환경에 따라 시간이 걸릴 수 있으니 창을 닫지 말고 잠시만 기다려주세요...");
            
            // ★ 변경: 네트워크 불안정 시 데이터 꼬임 방지를 위한 Batch(일괄 처리) 로직 적용
            let batches = [];
            let currentBatch = window.db.batch();
            let operationCount = 0;

            // 1단계: 기존 자재 데이터 전체 삭제 예약
            window.currentWarehouseItems.forEach(w => {
                currentBatch.delete(window.db.collection("warehouse").doc(w.id));
                operationCount++;
                if(operationCount === 490) { // Firebase Batch 한도(500) 방지
                    batches.push(currentBatch);
                    currentBatch = window.db.batch();
                    operationCount = 0;
                }
            });

            // 2단계: 엑셀 파일의 새 데이터 추가 예약
            let count = 0;
            json.forEach(row => {
                const loc = row['위치'] || row['창고'] || row['위치/창고'] || row['그룹'] || '미지정';
                const item = row['품명'] || row['이름'] || row['자재명'] || '';
                const spec = row['규격'] || row['스펙'] || '';
                const unit = row['단위'] || '';
                const qty = Number(row['수량']) || 0;
                const note = row['비고'] || row['설명'] || '';

                if(item) {
                    count++;
                    const newDocRef = window.db.collection("warehouse").doc();
                    currentBatch.set(newDocRef, {
                        location: loc, item: item, spec: spec, unit: unit, qty: qty, note: note, createdAt: Date.now()
                    });
                    operationCount++;
                    if(operationCount === 490) {
                        batches.push(currentBatch);
                        currentBatch = window.db.batch();
                        operationCount = 0;
                    }
                }
            });
            
            if (operationCount > 0) batches.push(currentBatch);

            // 3단계: 예약된 모든 작업을 순차적으로 서버에 전송 (모두 성공하거나, 모두 취소됨)
            for(let i=0; i<batches.length; i++) {
                await batches[i].commit();
            }

            alert(`✅ 총 ${count}개의 자재 데이터가 성공적으로 덮어쓰기 되었습니다!`);
            event.target.value = '';
        } catch(err) {
            console.error("Excel Upload Error:", err);
            alert("엑셀 업로드 중 오류가 발생했습니다. 엑셀 파일 양식을 다시 한번 확인해주세요.");
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

window.openWarehouseModal = function() { 
    const searchInput = document.getElementById('wh-search-input');
    if(searchInput) searchInput.value = '';
    try { window.renderWarehouse(); } catch(e){} 
    document.getElementById('warehouse-modal').style.display = 'block'; 
};

window.addWarehouseItem = async function() {
    const loc = document.getElementById('wh-location-select').value;
    const item = document.getElementById('wh-item').value.trim();
    const spec = document.getElementById('wh-spec').value.trim();
    const unit = document.getElementById('wh-unit').value.trim();
    const qty = document.getElementById('wh-qty').value.trim();
    const note = document.getElementById('wh-note').value.trim();

    if(!loc) return alert("창고(위치)를 선택해주세요.");
    if(!item) return alert("품명을 입력해주세요.");

    if (window.editWarehouseId) {
        await window.db.collection("warehouse").doc(window.editWarehouseId).update({
            location: loc, item: item, spec: spec, unit: unit, qty: Number(qty)||0, note: note
        });
        window.editWarehouseId = null;
        const btn = document.getElementById('wh-submit-btn');
        btn.innerText = "등록"; btn.style.background = "#2ecc71";
    } else {
        await window.db.collection("warehouse").add({
            location: loc, item: item, spec: spec, unit: unit, qty: Number(qty)||0, note: note, createdAt: Date.now()
        });
    }
    document.getElementById('wh-item').value = '';
    document.getElementById('wh-spec').value = '';
    document.getElementById('wh-unit').value = '';
    document.getElementById('wh-qty').value = '';
    document.getElementById('wh-note').value = '';
};

window.editWarehouseItem = function(id) {
    const w = window.currentWarehouseItems.find(x => x.id === id);
    if(!w) return;
    document.getElementById('wh-location-select').value = w.location || '';
    document.getElementById('wh-item').value = w.item || '';
    document.getElementById('wh-spec').value = w.spec || '';
    document.getElementById('wh-unit').value = w.unit || '';
    document.getElementById('wh-qty').value = w.qty || '';
    document.getElementById('wh-note').value = w.note || '';
    window.editWarehouseId = id;
    const btn = document.getElementById('wh-submit-btn');
    btn.innerText = "수정 저장"; btn.style.background = "#ff9f43";
};

window.deleteWarehouseItem = async function(id) {
    if(confirm("이 창고 자재 기록을 삭제하시겠습니까?")) {
        await window.db.collection("warehouse").doc(id).delete();
    }
};

window.deleteSelectedWarehouseItems = async function() {
    const checkboxes = document.querySelectorAll('.wh-delete-cb:checked');
    if (checkboxes.length === 0) return alert("삭제할 항목을 선택해주세요.");
    if (!confirm(`선택한 ${checkboxes.length}개의 창고 자재를 삭제하시겠습니까?`)) return;
    
    const promises = Array.from(checkboxes).map(cb => window.db.collection("warehouse").doc(cb.value).delete());
    await Promise.all(promises);
    alert("선택한 항목이 삭제되었습니다.");
};

window.deleteAllWarehouseItems = async function() {
    if(!window.currentWarehouseItems || window.currentWarehouseItems.length === 0) return alert("삭제할 창고 자재가 없습니다.");
    if (!confirm("⚠️ 정말로 모든 창고 자재 기록을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다!")) return;
    if (!confirm("다시 한 번 확인합니다. 모든 창고 자재를 완전히 삭제하시겠습니까?")) return;

    const promises = window.currentWarehouseItems.map(w => window.db.collection("warehouse").doc(w.id).delete());
    await Promise.all(promises);
    alert("모든 창고 자재가 삭제되었습니다.");
};

window.renderWarehouse = function() {
    const list = document.getElementById('warehouse-list');
    if(!list) return;

    const searchInput = document.getElementById('wh-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const groupFilter = document.getElementById('wh-group-filter') ? document.getElementById('wh-group-filter').value : '';

    if(!window.currentWarehouseItems || window.currentWarehouseItems.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:0.85rem;">등록된 창고 자재가 없습니다.</div>';
        return;
    }

    const filteredItems = window.currentWarehouseItems.filter(w => {
        if (searchTerm) {
            const textToSearch = `${w.location||''} ${w.item||''} ${w.spec||''} ${w.note||''}`.toLowerCase();
            if (!textToSearch.includes(searchTerm)) return false;
        }
        if (groupFilter && (w.location || '미지정') !== groupFilter) return false;
        return true;
    });

    if (filteredItems.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:0.85rem;">검색(필터) 결과가 없습니다.</div>';
        return;
    }

    const grouped = {};
    filteredItems.forEach(w => {
        const g = w.location || '미지정';
        if(!grouped[g]) grouped[g] = [];
        grouped[g].push(w);
    });

    let html = `<table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:center; background:#fff; table-layout:fixed;">
        <thead>
            <tr style="background:#f4f5f7; border-bottom:1px solid #ddd; color:#333; height:32px;">
                <th style="width:9%;">선택</th><th style="width:21%;">품명</th><th style="width:14%;">규격</th>
                <th style="width:17%;">수량(단위)</th><th style="width:21%;">비고</th><th style="width:18%;">관리</th>
            </tr>
        </thead><tbody>`;

    Object.keys(grouped).sort().forEach(g => {
        html += `<tr style="background:#e6effc; border-bottom:1px solid #c1d4f0;"><td colspan="6" style="text-align:left; padding:8px 10px; font-weight:bold; color:#0052cc; font-size:0.85rem;">🏢 ${g}</td></tr>`;
        grouped[g].forEach(w => {
            html += `
            <tr style="border-bottom:1px dashed #eee; transition: background 0.2s;" onmouseover="this.style.background='#f9f9fa'" onmouseout="this.style.background='#fff'">
                <td style="padding:6px 2px;"><input type="checkbox" class="wh-delete-cb" value="${w.id}" style="cursor:pointer; accent-color:#ff5630;" title="삭제 선택"></td>
                <td style="padding:6px 4px; font-weight:bold; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${w.item || '-'}">${w.item || '-'}</td>
                <td style="padding:6px 4px; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${w.spec || '-'}">${w.spec || '-'}</td>
                <td style="padding:6px 4px; color:#0052cc; font-weight:bold;">${w.qty || 0} <span style="font-size:0.65rem; color:#888; font-weight:normal;">${w.unit || ''}</span></td>
                <td style="padding:6px 4px; color:#888; font-size:0.7rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${w.note || '-'}">${w.note || '-'}</td>
                <td style="padding:6px 2px;">
                    <div style="display:flex; gap:2px; justify-content:center; flex-wrap:wrap;">
                        <button onclick="window.editWarehouseItem('${w.id}')" style="background:#e6effc; color:#0052cc; border:none; padding:4px 6px; border-radius:3px; font-size:0.7rem; cursor:pointer; font-weight:bold; white-space:nowrap;">수정</button>
                        <button onclick="window.deleteWarehouseItem('${w.id}')" style="background:#ffebe6; color:#bf2600; border:none; padding:4px 6px; border-radius:3px; font-size:0.7rem; cursor:pointer; font-weight:bold; white-space:nowrap;">삭제</button>
                    </div>
                </td>
            </tr>`;
        });
    });
    html += `</tbody></table>`;
    list.innerHTML = html;
};

window.openTrashModal = function() { try { window.renderTrash(); } catch(e){} document.getElementById('trash-modal').style.display = 'block'; };
window.openOtherCoModal = function() { try { window.renderOtherCos(); } catch(e){} document.getElementById('otherco-modal').style.display = 'block'; };
window.openContactModal = function() { try { window.renderContacts(); } catch(e){} document.getElementById('contact-modal').style.display = 'block'; };
window.openSiteModal = function() { try { window.renderSites(); } catch(e){} document.getElementById('site-modal').style.display = 'block'; };
window.openEquipModal = function() { try { window.renderEquips(); } catch(e){} document.getElementById('equip-modal').style.display = 'block'; };
window.openTeamModal = function() { try { window.renderTeam(); } catch(e){} document.getElementById('team-modal').style.display = 'block'; };
window.openNoticeModal = function() { try { window.renderNotices(); } catch(e){} document.getElementById('notice-modal').style.display = 'block'; };
window.openInitModal = function() { document.getElementById('init-modal').style.display = 'block'; };
window.openBackupModal = function() { document.getElementById('backup-modal').style.display = 'block'; };

window.openExpenseModal = function() {
    if(window.loggedInUser) {
        const spenderEl = document.getElementById('exp-spender');
        if(spenderEl) spenderEl.value = window.loggedInUser;
    }
    try { 
        let cutoffEl = document.getElementById('exp-cutoff-input');
        if(cutoffEl) cutoffEl.value = window.expenseCutoffDate;
        window.expenseViewCycle = window.getExpensePeriod(new Date()); 
        window.renderExpenses(); 
    } catch(e){}
    const modal = document.getElementById('expense-modal');
    if(modal) modal.style.display = 'block';
};

window.showMissingDatesModal = function(dates, month, year) {
    document.getElementById('missing-dates-title').innerText = `⚠️ ${year}년 ${month}월 미작성일`;
    const listEl = document.getElementById('missing-dates-list');
    listEl.innerHTML = dates.map(d => {
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return `<div onclick="window.selectMissingDate('${formattedDate}')" style="background:#fff0f3; border:1px solid #ffbdad; padding:6px 12px; border-radius:4px; font-size:0.9rem; color:#bf2600; font-weight:bold; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#ffd8d0'" onmouseout="this.style.background='#fff0f3'">${d}일</div>`;
    }).join('');
    document.getElementById('missing-dates-modal').style.display = 'block';
};

window.selectMissingDate = function(dateStr) {
    document.getElementById('missing-dates-modal').style.display = 'none';
    const viewInput = document.getElementById('worklog-view-date');
    if (viewInput) viewInput.value = dateStr;
    const startInput = document.getElementById('worklog-start');
    if (startInput) startInput.value = dateStr; 
    window.changeWorklogViewDate(dateStr);
};

window.showNonWorkersModal = function(taskId) {
    const task = window.currentTasks.find(t => t.id === taskId);
    if (!task) return;

    let allWorkers = [];
    if (Array.isArray(task.bundledTasks)) {
        task.bundledTasks.forEach(bt => {
            if (bt && Array.isArray(bt.workers)) allWorkers = allWorkers.concat(bt.workers);
        });
    } else if (Array.isArray(task.workers)) {
        allWorkers = allWorkers.concat(task.workers);
    }
    allWorkers = [...new Set(allWorkers)];

    let groupedNonWorkers = {};
    window.currentContacts.forEach(c => {
        if (!allWorkers.includes(c.name)) {
            let g = c.group || '미지정';
            if (!groupedNonWorkers[g]) groupedNonWorkers[g] = [];
            groupedNonWorkers[g].push(c.name);
        }
    });

    const listEl = document.getElementById('non-workers-list');
    if (Object.keys(groupedNonWorkers).length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">모든 인원이 투입되었습니다.</div>';
    } else {
        let html = '';
        Object.keys(groupedNonWorkers).sort().forEach(g => {
            html += `<div style="font-weight:bold; color:#0052cc; font-size:0.85rem; margin-top:10px; border-bottom:1px solid #eee; padding-bottom:3px;">📁 ${g} (${groupedNonWorkers[g].length}명)</div>`;
            html += `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; margin-bottom:10px;">`;
            groupedNonWorkers[g].forEach(name => {
                html += `<div style="background:#fff0f3; border:1px solid #ffbdad; padding:4px 8px; border-radius:4px; font-size:0.8rem; color:#bf2600; font-weight:bold;">${name}</div>`;
            });
            html += `</div>`;
        });
        listEl.innerHTML = html;
    }
    document.getElementById('non-workers-modal').style.display = 'block';
};

window.renderTeam = function() {
    const list = document.getElementById('team-list');
    if(!list) return;
    if(!window.teamMembers || window.teamMembers.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:0.8rem; text-align:center; padding:10px;">등록된 팀원이 없습니다.</div>';
        return;
    }
    let html = '';
    window.teamMembers.forEach(function(m) {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:1px solid #ddd; border-radius:4px; background:#fff;">
            <span style="font-weight:bold; font-size:0.9rem; color:#172b4d;">${m.name}</span>
            <div style="display:flex; gap:4px;">
                <button onclick="window.editTeamMember('${m.id}', '${m.name}')" style="background:#e6effc; color:#0052cc; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold;">수정</button>
                <button onclick="window.deleteTeamMember('${m.id}')" style="background:#ffebe6; color:#bf2600; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold;">삭제</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
};

window.addTeamMember = async function() {
    const nameInput = document.getElementById('new-member-name');
    const name = nameInput.value.trim();
    if(!name) return alert('추가할 팀원 이름을 입력해주세요.');
    if(window.teamMembers.some(m => m.name === name)) return alert('이미 등록된 이름입니다.');
    await window.db.collection("team").add({ name: name, createdAt: Date.now() });
    nameInput.value = '';
};

window.editTeamMember = async function(id, currentName) {
    const newName = prompt('수정할 이름을 입력하세요:', currentName);
    if(!newName || newName.trim() === '' || newName.trim() === currentName) return;
    if(window.teamMembers.some(m => m.name === newName.trim())) return alert('이미 존재하는 이름입니다.');
    await window.db.collection("team").doc(id).update({ name: newName.trim() });
    
    if(currentName === window.loggedInUser) {
        window.setLocalUser(newName.trim());
        window.loggedInUser = newName.trim();
        document.getElementById('header-user-name').innerText = window.loggedInUser + ' 님';
    }
};

window.deleteTeamMember = async function(id) {
    if(confirm('해당 팀원을 삭제하시겠습니까?\n(기존에 등록된 작업 내역의 이름은 그대로 유지됩니다)')) {
        await window.db.collection("team").doc(id).delete();
    }
};

window.loginUser = function() { 
    var select = document.getElementById('login-user-select'); 
    if (select && select.value) { 
        window.setLocalUser(select.value); 
        window.loggedInUser = select.value; 
        document.getElementById('login-overlay').style.display = 'none'; 
        document.getElementById('header-user-name').innerText = window.loggedInUser + ' 님'; 
        window.updateUI(); 
        window.showDailyBriefing();
        window.hasShownBriefing = true;
        window.autoCloudBackup();
    } else { 
        alert("접속할 이름을 선택해주세요."); 
    } 
};

window.registerAndLogin = async function() { 
    var newName = document.getElementById('login-new-user').value.trim(); 
    if (!newName) return alert("본인 이름을 입력해주세요."); 
    await window.db.collection("team").add({ name: newName, createdAt: Date.now() }); 
    window.setLocalUser(newName); 
    window.loggedInUser = newName; 
    document.getElementById('login-overlay').style.display = 'none'; 
    document.getElementById('header-user-name').innerText = window.loggedInUser + ' 님'; 
    window.updateUI(); 
    window.showDailyBriefing();
    window.hasShownBriefing = true;
};

window.logoutUser = function() { 
    window.removeLocalUser(); 
    window.loggedInUser = ''; 
    window.hasShownBriefing = false;
    document.getElementById('login-user-select').value = ''; 
    document.getElementById('login-overlay').style.display = 'flex'; 
};

window.sendNotice = async function() {
    const text = document.getElementById('notice-text').value.trim();
    if(!text) return alert("공지 내용을 입력하세요.");
    await window.db.collection("notices").add({ text: text, author: window.loggedInUser, createdAt: Date.now() });
    document.getElementById('notice-text').value = '';
};

window.renderNotices = function() {
    const list = document.getElementById('notice-list');
    if(!list) return;
    if(!window.currentNotices || window.currentNotices.length === 0) {
        list.innerHTML = '<div style="color:#aaa; font-size:0.8rem; text-align:center;">등록된 공지가 없습니다.</div>';
        return;
    }
    let html = '';
    window.currentNotices.forEach(function(n) {
        html += `
        <div style="background:#fff3cd; border:1px solid #ffe066; padding:10px; border-radius:6px; margin-bottom:5px;">
            <div style="font-size:0.85rem; font-weight:bold; color:#d9480f; margin-bottom:4px;">${n.author || '미상'} <span style="color:#888; font-size:0.7rem; font-weight:normal;">(${window.getFallbackDate(n.createdAt)})</span></div>
            <div style="font-size:0.9rem; color:#333; white-space:pre-wrap;">${n.text}</div>
            <div style="text-align:right; margin-top:5px;">
                <button onclick="window.deleteNotice('${n.id}')" style="background:none; border:none; color:#bf2600; cursor:pointer; font-size:0.7rem; font-weight:bold;">삭제</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
};

window.deleteNotice = async function(id) {
    if(confirm("이 공지를 삭제하시겠습니까?")) await window.db.collection("notices").doc(id).delete();
};

window.getExpensePeriod = function(dateObj) {
    let cutoff = window.expenseCutoffDate || 25;
    let y = dateObj.getFullYear(); 
    let m = dateObj.getMonth(); 
    let d = dateObj.getDate();
    if (cutoff > 1 && d >= cutoff) m++; 
    let cycleDate = new Date(y, m, 1);
    return { year: cycleDate.getFullYear(), month: cycleDate.getMonth() + 1 };
};

window.changeExpenseMonth = function(offset) {
    let y = window.expenseViewCycle.year; 
    let m = window.expenseViewCycle.month - 1 + offset;
    let d = new Date(y, m, 1); 
    window.expenseViewCycle = { year: d.getFullYear(), month: d.getMonth() + 1 }; 
    window.renderExpenses();
};

window.renderExpenses = function() {
    if(!window.expenseViewCycle) return;
    let cutoff = window.expenseCutoffDate || 25;
    let y = window.expenseViewCycle.year; 
    let m = window.expenseViewCycle.month; 
    
    let startDate, endDate;
    if (cutoff === 1) {
        startDate = new Date(y, m - 1, 1);
        endDate = new Date(y, m, 0); 
    } else {
        startDate = new Date(y, m - 2, cutoff);
        endDate = new Date(y, m - 1, cutoff - 1);
    }
    
    let startStr = window.getLocalDateString(startDate);
    let endStr = window.getLocalDateString(endDate);
    document.getElementById('exp-month-label').innerText = `${y}년 ${m}월 (${startDate.getMonth()+1}.${startDate.getDate()} ~ ${endDate.getMonth()+1}.${endDate.getDate()})`;
    
    let filtered = window.currentExpenses.filter(function(e) { 
        return e.date >= startStr && e.date <= endStr; 
    });
    filtered.sort(function(a,b) { return a.date > b.date ? -1 : 1; });
    
    let total = 0; 
    let listHtml = '';
    filtered.forEach(function(e) {
        total += Number(e.amount || 0);
        listHtml += `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; background:#fff; border-radius:6px;">
            <div>
                <div style="font-size:0.75rem; color:#888; margin-bottom:4px;">${e.date} <span style="color:#ddd;">|</span> ${e.spender}</div>
                <div style="font-size:0.9rem; font-weight:bold; color:#333;">${e.desc}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="font-size:1rem; font-weight:bold; color:#e91e63; margin-right:5px;">${Number(e.amount).toLocaleString()}원</div>
                <button onclick="window.editExpense('${e.id}')" style="background:#e6effc; border:1px solid #0052cc; color:#0052cc; border-radius:4px; padding:3px 6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">수정</button>
                <button onclick="window.deleteExpense('${e.id}')" style="background:#ffebe6; border:1px solid #ff5630; color:#ff5630; border-radius:4px; padding:3px 6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">✕</button>
            </div>
        </div>`;
    });
    document.getElementById('expense-list').innerHTML = listHtml || '<div style="text-align:center; padding:20px; color:#999; font-size:0.85rem;">해당 기간의 지출 내역이 없습니다.</div>';
    document.getElementById('exp-total-used').innerText = total.toLocaleString();
    
    let cycleKey = `${y}-${String(m).padStart(2,'0')}`; 
    let limit = window.expenseLimits[cycleKey];
    if (limit === undefined) limit = window.expenseDefaultLimit || 0;
    
    document.getElementById('exp-limit-input').value = limit || '';
    const defaultLimitEl = document.getElementById('exp-default-limit-input');
    if(defaultLimitEl) defaultLimitEl.value = window.expenseDefaultLimit || '';

    let balance = limit - total; 
    let balanceEl = document.getElementById('exp-balance');
    balanceEl.innerText = balance.toLocaleString(); 
    balanceEl.style.color = balance < 0 ? '#bf2600' : '#00875a';
};

window.saveDefaultExpenseLimit = async function() {
    let val = Number(document.getElementById('exp-default-limit-input').value) || 0;
    await window.db.collection("settings").doc("expense").set({ defaultLimit: val }, { merge: true });
};

window.saveExpenseLimit = async function() {
    if(!window.expenseViewCycle) return;
    let cycleKey = `${window.expenseViewCycle.year}-${String(window.expenseViewCycle.month).padStart(2,'0')}`;
    let val = Number(document.getElementById('exp-limit-input').value) || 0;
    await window.db.collection("expense_limits").doc(cycleKey).set({ limit: val });
    window.expenseLimits[cycleKey] = val; 
    window.renderExpenses(); 
};

window.adjustExpenseLimit = async function() {
    if(!window.expenseViewCycle) return;
    let adjustVal = Number(document.getElementById('exp-adjust-input').value);
    if(!adjustVal && adjustVal !== 0) return alert('증감할 금액(숫자)을 입력하세요. (감액은 앞에 - 붙임)');
    
    let cycleKey = `${window.expenseViewCycle.year}-${String(window.expenseViewCycle.month).padStart(2,'0')}`;
    let currentLimit = window.expenseLimits[cycleKey];
    if (currentLimit === undefined) currentLimit = window.expenseDefaultLimit || 0;
    let newLimit = currentLimit + adjustVal;
    
    await window.db.collection("expense_limits").doc(cycleKey).set({ limit: newLimit });
    window.expenseLimits[cycleKey] = newLimit; 
    document.getElementById('exp-adjust-input').value = '';
    window.renderExpenses(); 
};

window.saveExpenseCutoff = async function() {
    let val = Number(document.getElementById('exp-cutoff-input').value);
    if(!val || val < 1 || val > 31) return alert("1~31 사이의 올바른 날짜를 입력해주세요.");
    await window.db.collection("settings").doc("expense").set({ cutoffDate: val }, { merge: true });
};

window.editExpense = function(id) {
    const e = window.currentExpenses.find(function(x) { return x.id === id; }); 
    if(!e) return;
    document.getElementById('exp-date').value = e.date; 
    document.getElementById('exp-spender').value = e.spender; 
    document.getElementById('exp-desc').value = e.desc; 
    document.getElementById('exp-amount').value = e.amount;
    window.editExpenseId = id; 
    const btn = document.getElementById('exp-submit-btn'); 
    btn.innerText = "수정 저장"; btn.style.background = "#ff9f43";
};

window.addExpense = async function() {
    const date = document.getElementById('exp-date').value; 
    const spender = document.getElementById('exp-spender').value; 
    const desc = document.getElementById('exp-desc').value; 
    const amount = document.getElementById('exp-amount').value;
    if(!date || !spender || !desc || !amount) return alert('모든 항목을 입력해주세요.');
    
    if (window.editExpenseId) {
        await window.db.collection("expenses").doc(window.editExpenseId).update({ 
            date: date, spender: spender, desc: desc, amount: Number(amount) 
        }); 
        window.editExpenseId = null;
        const btn = document.getElementById('exp-submit-btn'); 
        btn.innerText = "등록"; btn.style.background = "#e91e63";
    } else {
        await window.db.collection("expenses").add({ 
            date: date, spender: spender, desc: desc, amount: Number(amount), createdAt: Date.now() 
        });
    }
    document.getElementById('exp-desc').value = ''; 
    document.getElementById('exp-amount').value = '';
};

window.deleteExpense = async function(id) { 
    if(confirm("지출 내역을 삭제하시겠습니까?")) {
        await window.db.collection("expenses").doc(id).delete(); 
    }
};

window.addWorklogEntry = function(loc = '', cont = '', workers = []) { 
    if(typeof loc !== 'string') loc = ''; 
    if(typeof cont !== 'string') cont = ''; 
    if(!Array.isArray(workers)) workers = [];

    window.worklogEntryCount++; 
    const id = window.worklogEntryCount; 
    const container = document.getElementById('worklog-entries'); 
    if(!container) return; 

    const div = document.createElement('div'); 
    div.className = 'worklog-entry'; 
    div.style.display = 'flex'; 
    div.style.background = '#fff'; 
    div.style.padding = '8px 10px'; 
    div.style.border = '1px solid #c1c7d0'; 
    div.style.borderRadius = '6px'; 
    div.style.marginBottom = '8px'; 
    div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; 

    const workersStr = workers.join(',');
    const workersDisp = workers.length > 0 ? `투입 ${workers.length}명 : <strong style="color:#0052cc;">${workers.join(', ')}</strong>` : '<span style="color:#aaa;">선택없음</span>';

    // ★ 추가: 우측 끝에 [❌ 삭제] 버튼 삽입
    div.innerHTML = `
        <div style="width:100%; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <div style="font-size:0.8rem; font-weight:bold; color:var(--primary-color); white-space:nowrap; flex-shrink:0;">#${id}</div>
            <input type="text" class="wl-location" placeholder="작업 위치" value="${loc}" style="flex:1; min-width:100px; box-sizing:border-box; padding:8px; border:1px solid #dfe1e6; border-radius:4px; font-size:0.85rem;">
            <input type="text" class="wl-content" placeholder="작업 내용을 적어주세요." value="${cont}" style="flex:3; min-width:200px; box-sizing:border-box; padding:8px; border:1px solid #dfe1e6; border-radius:4px; font-size:0.85rem;">
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                <button type="button" onclick="window.openWorkerModal('${id}')" style="background:#f0f4f8; border:1px solid #dcdfe4; padding:6px 10px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer; color:#0052cc; white-space:nowrap;">🙋‍♂️ 인원 선택</button>
                <div id="wl-workers-display-${id}" style="font-size:0.7rem; color:#333; line-height:1.2; min-width:80px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${workersDisp}</div>
                <input type="hidden" class="wl-workers-hidden" id="wl-workers-hidden-${id}" value="${workersStr}">
                <button type="button" onclick="this.closest('.worklog-entry').remove()" style="background:#ffebe6; color:#bf2600; border:none; padding:6px 10px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer; white-space:nowrap;">❌ 삭제</button>
            </div>
        </div>
    `; 
    container.appendChild(div); 
};


window.openWorklogEditModal = function(task) { 
    document.getElementById('edit-wl-id').value = task.id; 
    const container = document.getElementById('edit-wl-container'); 
    if (Array.isArray(task.bundledTasks) && task.bundledTasks.length > 0) { 
        container.innerHTML = task.bundledTasks.map(function(bt, i) { 
            if(!bt) return ''; 
            const workersStr = Array.isArray(bt.workers) ? bt.workers.join(',') : ''; 
            const workersDisp = Array.isArray(bt.workers) && bt.workers.length > 0 ? `투입 ${bt.workers.length}명 : <strong style="color:#0052cc;">${bt.workers.join(', ')}</strong>` : '<span style="color:#aaa;">선택없음</span>'; 
            
            let locInput = '';
            let contentInput = '';
            if(bt.location !== undefined || bt.content !== undefined) {
                locInput = `<input type="text" id="edit-wl-loc-${i}" value="${bt.location||''}" placeholder="작업 위치" style="flex:1; min-width:100px; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.85rem;">`;
                contentInput = `<input type="text" id="edit-wl-content-${i}" value="${bt.content || bt.detail || ''}" placeholder="작업 내용" style="flex:2.5; min-width:150px; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.85rem;">`;
            } else {
                locInput = `<input type="hidden" id="edit-wl-loc-${i}" value="">`;
                contentInput = `<textarea id="edit-wl-content-${i}" style="width:100%; box-sizing:border-box; height:45px; border:1px solid #ccc; border-radius:4px; padding:6px; font-size:0.85rem; resize:vertical;">${bt.detail||''}</textarea>`;
            }

            return `<div style="border:1px solid #ddd; padding:10px; border-radius:6px; background:#fafbfc; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <div style="font-size:0.8rem; font-weight:bold; color:#673ab7; flex-shrink:0;">[${i+1}]</div>
                ${locInput}
                ${contentInput}
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; padding-left:8px; border-left:1px solid #eee;">
                    <button type="button" onclick="window.openWorkerModal('edit-${i}')" style="background:#e6effc; border:1px solid #0052cc; color:#0052cc; padding:6px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; white-space:nowrap;">🙋‍♂️ 인원수정</button>
                    <span id="wl-workers-display-edit-${i}" style="font-size:0.7rem; color:#333; text-align:left; white-space:nowrap; min-width:80px;">${workersDisp}</span>
                    <input type="hidden" id="wl-workers-hidden-edit-${i}" value="${workersStr}">
                </div>
            </div>`; 
        }).join(''); 
    } else { 
        container.innerHTML = `<textarea id="edit-wl-detail-0" style="width:100%; height:60px; padding:10px;">${task.workDetails || ''}</textarea><input type="hidden" id="wl-workers-hidden-edit-0" value="${(task.workers||[]).join(',')}">`; 
    } 
    document.getElementById('edit-worklog-modal').style.display = 'block'; 
};

window.loadPreviousWorklog = function() {
    const baseDate = document.getElementById('worklog-start').value || window.getLocalDateString();
    
    const pastWorklogs = window.currentTasks.filter(t => 
        t.status === 'worklog' && t.status !== 'deleted' && 
        (t.startDate || window.getFallbackDate(t.createdAt)) < baseDate
    );

    if(pastWorklogs.length === 0) return alert("이전 작업일보 기록이 없습니다.");

    pastWorklogs.sort((a, b) => {
        const dateA = a.startDate || window.getFallbackDate(a.createdAt);
        const dateB = b.startDate || window.getFallbackDate(b.createdAt);
        return dateB.localeCompare(dateA); 
    });

    const lastLog = pastWorklogs[0];
    const logDateStr = lastLog.startDate || window.getFallbackDate(lastLog.createdAt);

    if(!lastLog.bundledTasks || lastLog.bundledTasks.length === 0) {
        return alert(`최근 기록(${logDateStr})에 상세 내용이 없습니다.`);
    }

    if(confirm(`가장 최근 기록(${logDateStr})을 불러오시겠습니까?\n현재 입력창이 최신 기록으로 교체됩니다.`)) {
        const container = document.getElementById('worklog-entries'); 
        container.innerHTML = ''; 
        window.worklogEntryCount = 0; 
        
        lastLog.bundledTasks.forEach(bt => {
            const loc = bt.location || '';
            const content = bt.content || bt.detail || '';
            const workers = Array.isArray(bt.workers) ? bt.workers : [];
            window.addWorklogEntry(loc, content, workers);
        });
    }
};

window.openWorkerModal = function(id) { 
    window.currentWorkerEntryId = id; 
    const hiddenInput = document.getElementById(`wl-workers-hidden-${id}`);
    const selected = hiddenInput && hiddenInput.value ? hiddenInput.value.split(',') : []; 
    const listEl = document.getElementById('worker-modal-list'); 
    if(!window.currentContacts || window.currentContacts.length === 0) { 
        listEl.innerHTML = '<div style="color:#999; font-size:0.8rem; text-align:center;">상단의 [📞 연락처] 메뉴에서<br>먼저 작업자를 등록해주세요.</div>'; 
    } else { 
        const groupedContacts = {}; 
        window.currentContacts.forEach(function(c){ const g = c.group || '미지정'; if(!groupedContacts[g]) groupedContacts[g] = []; groupedContacts[g].push(c.name); }); 
        const sortedGroups = Object.keys(groupedContacts).sort(); let html = ''; 
        sortedGroups.forEach(function(g){ 
            html += `<div style="font-weight:bold; color:#009688; font-size:0.75rem; margin-top:10px; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px; cursor:pointer; display:flex; justify-content:space-between;" onclick="const content = this.nextElementSibling; const ic = this.querySelector('span'); if(content.style.display==='none'){content.style.display='grid'; ic.innerText='▼';}else{content.style.display='none'; ic.innerText='▶';}"><span>📁 ${g}</span> <span>▼</span></div><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px;">`; 
            const uniqueNames = [...new Set(groupedContacts[g])].sort(); 
            uniqueNames.forEach(function(name){ 
                const isChecked = selected.includes(name) ? 'checked' : ''; 
                html += `<label style="cursor:pointer; display:flex; align-items:center; background:#fff; padding:8px; border:1px solid #ddd; border-radius:4px; font-weight:bold; font-size:0.85rem;"><input type="checkbox" value="${name}" ${isChecked} style="margin-right:6px; transform:scale(1.2);"> ${name}</label>`; 
            }); 
            html += `</div>`; 
        }); 
        listEl.innerHTML = html; 
    } 
    document.getElementById('worker-modal').style.display = 'block'; 
};

window.saveWorkerSelection = function() { 
    if(!window.currentWorkerEntryId) return; 
    const id = window.currentWorkerEntryId; 
    const checkboxes = document.querySelectorAll('#worker-modal-list input[type="checkbox"]:checked'); 
    const selected = Array.from(checkboxes).map(function(cb){ return cb.value; }); 
    const targetHidden = document.getElementById(`wl-workers-hidden-${id}`); 
    if (targetHidden) targetHidden.value = selected.join(','); 
    const displayEl = document.getElementById(`wl-workers-display-${id}`); 
    if(displayEl) { 
        if(selected.length > 0) { displayEl.innerHTML = `투입 ${selected.length}명 : <strong style="color:#0052cc;">${selected.join(', ')}</strong>`; } 
        else { displayEl.innerHTML = '<span style="color:#aaa;">선택없음</span>'; } 
    } 
    document.getElementById('worker-modal').style.display = 'none'; 
};

window.renderCalendar = function() { 
    const grid = document.getElementById('calendar-grid'); 
    const title = document.getElementById('calendar-title'); 
    if(!grid || !title) return; 
    
    const y = window.currentDate.getFullYear(); 
    const m = window.currentDate.getMonth(); 
    title.innerText = `${y}년 ${m + 1}월`; 
    
    let html = ['일','월','화','수','목','금','토'].map(function(d) { return `<div style="font-weight:bold; padding:4px 0; background:#f0f2f5; border:1px solid #eee;">${d}</div>`; }).join(''); 
    const firstDay = new Date(y, m, 1).getDay(); 
    const lastDate = new Date(y, m + 1, 0).getDate(); 
    
    for(let i=0; i<firstDay; i++) { html += `<div style="border:1px solid #eee; background:#fafafa;"></div>`; }
    
    for(let d=1; d<=lastDate; d++) { 
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; 
        const tasksToday = window.currentTasks.filter(function(t) { 
            return t.status !== 'deleted' && ((t.startDate || window.getFallbackDate(t.createdAt)) === dateStr || (t.dueDate || window.getFallbackDate(t.createdAt)) === dateStr) && !(t.status || '').startsWith('mat-') && t.status !== 'worklog'; 
        }); 
        const badgeHtml = tasksToday.length > 0 ? `<div class="calendar-num-badge">${tasksToday.length}</div>` : ''; 
        const hasWorklog = window.currentTasks.some(function(t) { 
            return t.status === 'worklog' && (t.startDate || window.getFallbackDate(t.createdAt)) === dateStr && t.status !== 'deleted'; 
        }); 
        const isToday = d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear(); 
        const bgStyle = hasWorklog ? 'background: #ede7f6; border: 1px solid #d1c4e9;' : ''; 
        
        html += `<div class="calendar-day-cell" style="${bgStyle}" onclick="window.showTaskModal('calendar-click', '${dateStr}', '')">
            <span style="${isToday ? 'background:var(--warning-color);color:white;border-radius:50%;width:18px;height:18px;line-height:18px;display:inline-block;' : ''}">${d}</span>
            ${badgeHtml}
        </div>`; 
    } 
    grid.innerHTML = html; 
};

window.openEditModal = function(id) {
    const task = window.currentTasks.find(t => t.id === id);
    if(!task) return;
    
    if(task.status === 'worklog') {
        window.openWorklogEditModal(task);
        return;
    }

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-text').value = task.text || task.workDetails || '';
    document.getElementById('edit-start-date').value = task.startDate || '';
    document.getElementById('edit-due-date').value = task.dueDate || '';
    
    const repWrap = document.getElementById('edit-repeat-wrap');
    const repSelect = document.getElementById('edit-repeat');
    if(repWrap && repSelect) {
        if(['todo', 'inprogress', 'done'].includes(task.status)) {
            repWrap.style.display = 'block';
            repSelect.value = task.repeat || 'none';
        } else {
            repWrap.style.display = 'none';
            repSelect.value = 'none';
        }
    }

    document.getElementById('edit-modal').style.display = 'block';
};

window.renderCard = function(t, s, currentMonthStr) { 
    const isMat = String(s || '').startsWith('mat-'); 
    let dropdownHtml = ''; let content = ''; let nonWorkersHtml = ''; 
    
    if (s === 'worklog') { 
        content = `<div style="border-left:3px solid #673ab7; padding-left:8px; display:flex; flex-direction:column; gap:6px;">`; 
        let allWorkers = []; 
        if (Array.isArray(t.bundledTasks)) {
            t.bundledTasks.forEach(function(bt, i) { 
                if(!bt) return; 
                const wCount = Array.isArray(bt.workers) ? bt.workers.length : 0; 
                const wNames = wCount > 0 ? bt.workers.join(', ') : '없음'; 
                if(wCount > 0) allWorkers = allWorkers.concat(bt.workers);
                let displayDetail = (bt.location !== undefined || bt.content !== undefined) ? `${bt.location ? `<span style="color:#d35400;">[${bt.location}]</span> ` : ''}${bt.content || ''}` : bt.detail || '내용없음';
                content += `<div style="margin-bottom:2px;"><span style="font-weight:bold; color:#673ab7;">[작업 ${i+1}]</span> <strong style="font-size:0.9rem;">${displayDetail}</strong><div style="font-size:0.75rem; color:#444; margin-top:4px; background:#f4f5f7; padding:4px 6px; border-radius:4px; display:inline-block;">🙋‍♂️ 투입 ${wCount}명 : <strong style="color:#0052cc;">${wNames}</strong></div></div>`; 
            }); 
        } else if (Array.isArray(t.workers)) {
            allWorkers = allWorkers.concat(t.workers);
        }
        content += `</div>`; 

        allWorkers = [...new Set(allWorkers)];
        let nonWorkerGroups = {}; let totalNonWorkers = 0;
        window.currentContacts.forEach(function(c) {
            if (!allWorkers.includes(c.name)) {
                let g = c.group || '미지정';
                if (!nonWorkerGroups[g]) nonWorkerGroups[g] = [];
                nonWorkerGroups[g].push(c.name);
                totalNonWorkers++;
            }
        });

        let summaryParts = [];
        Object.keys(nonWorkerGroups).sort().forEach(function(g) {
            summaryParts.push(`<a class="clickable" style="margin-right:6px;" onclick="window.showNonWorkersModal('${t.id}')">${g} ${nonWorkerGroups[g].length}명</a>`);
        });
        
        nonWorkersHtml = totalNonWorkers > 0 ? `<span style="color:#ddd; margin:0 6px;">|</span> <span style="font-size:0.75rem; color:#e91e63; font-weight:bold;">미투입: </span><span style="font-size:0.75rem;">${summaryParts.join('')}</span>` : `<span style="color:#ddd; margin:0 6px;">|</span> <span style="font-size:0.75rem; color:#00875a; font-weight:bold;">전원 투입 완료</span>`;
    } else { 
        content = t.workDetails ? `<strong style="color:var(--primary-color); white-space:pre-wrap;">${t.workDetails}</strong>` : `<strong>${t.text||'내용없음'}</strong>`; 
    } 

    if (!isMat && s !== 'worklog') { 
        const cardDropdownOptions = window.teamMembers.map(function(m){ return `<option value="${m.name}" ${t.assignee === m.name ? 'selected' : ''}>${m.name}</option>`; }).join(''); 
        let selectHtml = `<select onchange="window.changeField('${t.id}', 'assignee', this.value)" style="font-size:0.75rem; padding:3px; border:1px solid #ddd; border-radius:4px; max-width:100px; font-weight:bold; color:#172b4d;"><option value="">담당자 미지정</option>${cardDropdownOptions}</select>`; 
        
        let inprogressText = (s !== 'todo' && t.inProgressTime) ? `<span style="color:#ddd; margin:0 3px;">|</span> <span>진행: <strong>${t.inProgressUser||'-'} <span style="font-size:0.65rem; color:#0052cc; font-weight:normal;">(${t.inProgressTime})</span></strong></span>` : '';
        let doneText = (s === 'done' && t.doneTime) ? `<span style="color:#ddd; margin:0 3px;">|</span> <span>완료: <strong>${t.doneUser||'-'} <span style="font-size:0.65rem; color:#00875a; font-weight:normal;">(${t.doneTime})</span></strong></span>` : '';
        dropdownHtml = `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">${selectHtml} <div style="font-size:0.75rem; color:#555; display:flex; align-items:center; flex-wrap:wrap;">${inprogressText}${doneText}</div></div>`;
    } else if (isMat) { 
        let ordererText = t.orderer || '-'; 
        if (s !== 'mat-request' && t.orderTime) ordererText += ` <span style="font-size:0.65rem; color:#00875a; font-weight:normal;">(${t.orderTime})</span>`; 
        let delivererText = (s === 'mat-delivered' && t.deliverTime) ? ` <span style="color:#ddd;">|</span> <span>반입: <strong>${t.deliverer||'-'} <span style="font-size:0.65rem; color:#0052cc; font-weight:normal;">(${t.deliverTime})</span></strong></span>` : ''; 
        dropdownHtml = `<div style="font-size:0.75rem; color:#555; display:flex; gap:5px; align-items:center; flex-wrap:wrap;"><span>요청: <strong>${t.requester||'-'}</strong></span> <span style="color:#ddd;">|</span> <span>발주: <strong>${ordererText}</strong></span>${delivererText}</div>`; 
    } else if (s === 'worklog') { 
        dropdownHtml = `<div style="display:flex; align-items:center; flex-wrap:wrap;"><span style="font-size:0.75rem; color:#555;">등록자: <strong>${t.assignee||'-'}</strong></span>${nonWorkersHtml}</div>`; 
    } else {
        dropdownHtml = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;"><span style="font-size:0.75rem; color:#555;">등록자: <strong>${t.assignee||'-'}</strong></span></div>`; 
    }

    let ackDisplayHtml = ''; let hasIHaveAcked = false; 
    if(t.acks && typeof t.acks === 'object' && !Array.isArray(t.acks)) { 
        const keys = Object.keys(t.acks); 
        if(keys.length > 0) { 
            ackDisplayHtml = `<div class="ack-box">`; 
            keys.forEach(function(name){ 
                if(name === window.loggedInUser) hasIHaveAcked = true; 
                ackDisplayHtml += `<div>✓ 확인: ${name} (${t.acks[name]})</div>`; 
            }); 
            ackDisplayHtml += `</div>`; 
        } 
    } 

    let actionButtonsHtml = ''; 
    const ackBtn = `<button class="${hasIHaveAcked ? 'btn-unack' : 'btn-ack'}" onclick="window.toggleAckRecord('${t.id}')">${hasIHaveAcked ? '확인취소' : '확인'}</button>`;

    if (isMat) { 
        actionButtonsHtml = `<button class="btn-edit" onclick="window.openEditModal('${t.id}')">수정</button>` + ackBtn;
        if (s === 'mat-request') actionButtonsHtml += `<button class="btn-move" style="background:#e0e0e0; color:#333;" onclick="window.orderMaterial('${t.id}')">발주</button>`;
        else if (s === 'mat-ordered') actionButtonsHtml += `<button class="btn-unack" style="background:#ffebe6; color:#bf2600;" onclick="window.cancelOrderMaterial('${t.id}')">발주취소</button><button class="btn-move" style="background:#e0e0e0; color:#333;" onclick="window.deliverMaterial('${t.id}')">반입</button>`;
        else if (s === 'mat-delivered') actionButtonsHtml += `<button class="btn-move" style="background:#ffebe6; color:#bf2600;" onclick="window.moveTask('${t.id}', 'mat-ordered')">반입취소</button>`;
    } else if (s === 'todo' || s === 'inprogress' || s === 'done') { 
        const btn1 = `<button class="btn-edit" onclick="window.openEditModal('${t.id}')">수정</button>`; 
        let btn3 = `<button class="btn-move" onclick="window.moveTask('${t.id}', '${s === 'todo' ? 'inprogress' : 'todo'}')">${s === 'todo' ? '진행' : '할일'}</button>`; 
        let btn4 = `<button class="btn-move" onclick="window.moveTask('${t.id}', '${s === 'done' ? 'inprogress' : 'done'}')">${s === 'done' ? '진행' : '완료'}</button>`; 
        actionButtonsHtml = btn1 + ackBtn + btn3 + btn4; 
    } else { 
        actionButtonsHtml = `<button class="btn-edit" onclick="window.openEditModal('${t.id}')">수정</button>`; 
    } 

    let checkBoxHtml = `<input type="checkbox" class="bulk-delete-cb" value="${t.id}" style="width:16px; height:16px; cursor:pointer; accent-color:#ff5630;" title="일괄 삭제 선택">`; 
    const fallback = window.getFallbackDate(t.createdAt); 

    let repeatBadge = '';
    if(t.repeat && t.repeat !== 'none') {
        const rMap = { 'daily':'매일', 'weekly':'매주', 'monthly':'매월' };
        repeatBadge = `<span style="background:#e6effc; color:#0052cc; padding:2px 4px; border-radius:3px; font-size:0.65rem; margin-right:4px;">🔁 ${rMap[t.repeat]||''}</span>`;
    }

    let regTimeStr = '';
    if (t.createdAt) {
        let d = new Date(t.createdAt);
        if (!isNaN(d.getTime())) regTimeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    let regTimeHtml = regTimeStr ? `<div style="font-size:0.65rem; color:#a0aabf; font-weight:500; display:flex; align-items:center;">⏱️ ${regTimeStr}</div>` : `<div></div>`;

    return `<div class="card">
        <div style="font-size:0.85rem; color:#333; line-height:1.4;">${content}</div>
        ${ackDisplayHtml}
        <div style="font-size:0.75rem; color:#666; margin-top:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
            ${dropdownHtml}
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.77rem; color:#888;">${repeatBadge}${t.startDate || fallback} ~ ${t.dueDate || fallback}</span>
                ${checkBoxHtml}
            </div>
        </div>
        <div class="card-actions" style="justify-content: space-between;">
            ${regTimeHtml}
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                ${actionButtonsHtml}<button class="btn-del" onclick="window.deleteTask('${t.id}')">삭제</button>
            </div>
        </div>
    </div>`; 
};

window.cachedHTML = window.cachedHTML || {};
function setHTML(id, html) {
    if (window.cachedHTML[id] !== html) {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = html; window.cachedHTML[id] = html; }
    }
}
function setTableHTML(tableId, html) {
    const cacheId = tableId + '-tbody';
    if (window.cachedHTML[cacheId] !== html) {
        const table = document.getElementById(tableId);
        if (table) { 
            const tbody = table.querySelector('tbody');
            if (tbody) { tbody.innerHTML = html; window.cachedHTML[cacheId] = html; }
        }
    }
}

window.updateUI = function() { 
    try { 
        const statuses = ['worklog', 'todo', 'inprogress', 'done', 'mat-request', 'mat-ordered', 'mat-delivered']; 
        const lists = {}; statuses.forEach(function(s){ lists[s] = []; }); 
        
        const assignees = {}; const taskDates = {}; const overdueTasks = []; const startDelayedTasks = []; 
        const mats = {}; const matDates = {}; const delayedMats = []; const deliveryDelayedMats = [];  
        const worklogDates = []; 

        const todayDate = new Date(); todayDate.setHours(0,0,0,0); 
        const nextWeek = new Date(todayDate); nextWeek.setDate(todayDate.getDate() + 7); 
        const todayStr = window.getLocalDateString(); 
        const currentMonthStr = todayStr.substring(0, 7); 
        const nextWeekStr = window.getLocalDateString(nextWeek); 
        const wlViewYm = (window.worklogViewDate || todayStr).substring(0, 7); 
        
        const baseOptions = window.teamMembers.map(function(m){ return `<option value="${m.name}">${m.name}</option>`; }).join(''); 
        
        try { 
            ['todo', 'inprogress', 'done'].forEach(function(s){ const el = document.getElementById(`${s}-assignee`); if(el && el.options.length <= 1) el.innerHTML = '<option value="">담당자</option>' + baseOptions; }); 
            ['mat-request', 'mat-ordered', 'mat-delivered'].forEach(function(s){ const r = document.getElementById(`${s}-requester`); if(r && r.options.length <= 1) r.innerHTML = '<option value="">요청자</option>' + baseOptions; const o = document.getElementById(`${s}-orderer`); if(o && o.options.length <= 1) o.innerHTML = '<option value="">발주자</option>' + baseOptions; }); 
            const expSpender = document.getElementById('exp-spender'); if(expSpender && expSpender.options.length <= 1) { expSpender.innerHTML = '<option value="">지출자</option>' + baseOptions; } 
        } catch(e) { console.error(e); } 

        const searchEl = document.getElementById('main-search-input'); 
        const search = searchEl ? searchEl.value.toLowerCase() : ''; 

        window.currentTasks.forEach(function(t){ 
            if (t.status === 'deleted') return; 
            
            const statusStr = String(t.status || ''); 
            const isMat = statusStr.startsWith('mat-'); 
            const isDone = ['done', 'worklog'].includes(t.status); 
            const isDelivered = t.status === 'mat-delivered'; 
            const fallback = window.getFallbackDate(t.createdAt); 
            const dateToCheck = String(t.dueDate || t.startDate || fallback); 
            const isCurrentMonth = dateToCheck.startsWith(currentMonthStr); 
            const sDate = String(t.startDate || fallback);
            
            const isOldDone = (isDone || isDelivered) && !isCurrentMonth && !window.showOldDoneTasks;

            let bundledText = ''; 
            if(Array.isArray(t.bundledTasks)) { 
                bundledText = t.bundledTasks.map(function(bt){ 
                    return (bt.location ? `[${bt.location}] ` : '') + (bt.content || bt.detail || '') + (Array.isArray(bt?.workers) ? bt.workers.join('') : ''); 
                }).join(' '); 
            } 
            const fullText = String(t.text || '') + ' ' + String(t.workDetails || '') + ' ' + String(t.assignee || '') + ' ' + String(t.requester || '') + ' ' + String(t.orderer || '') + ' ' + bundledText; 
            const matchesSearch = !(search && !fullText.toLowerCase().includes(search));

            if (!isOldDone && matchesSearch) {
                if (t.status === 'worklog') {
                    if (sDate && sDate.startsWith(wlViewYm)) { 
                        const dNum = parseInt(sDate.split('-')[2]); 
                        if (!isNaN(dNum) && !worklogDates.includes(dNum)) worklogDates.push(dNum); 
                    } 
                    if (sDate === window.worklogViewDate) {
                        if (lists[t.status]) lists[t.status].push(t);
                    }
                } else {
                    if (lists[t.status]) lists[t.status].push(t);
                }
            }

            if (!isOldDone) {
                if (!isMat) { 
                    if (t.assignee) { 
                        if(!assignees[t.assignee]) assignees[t.assignee] = {todo:0, inprogress:0, done:0}; 
                        if(t.status === 'todo') assignees[t.assignee].todo++; 
                        else if(t.status === 'inprogress') assignees[t.assignee].inprogress++; 
                        else if(isDone) assignees[t.assignee].done++; 
                    } 
                    const dueDateOnly = String(t.dueDate || ''); 
                    if (dueDateOnly && dueDateOnly !== 'undefined' && t.status !== 'worklog') { 
                        if(dueDateOnly >= todayStr && dueDateOnly <= nextWeekStr) { 
                            if(!taskDates[dueDateOnly]) taskDates[dueDateOnly] = {wait:0, done:0}; 
                            if(t.status === 'done') taskDates[dueDateOnly].done++; 
                            else taskDates[dueDateOnly].wait++; 
                        } 
                        if (dueDateOnly < todayStr && t.status !== 'done') { 
                            overdueTasks.push({ id: t.id, name: t.text || t.workDetails || '제목없음', date: dueDateOnly }); 
                        } 
                    }
                    const startDateOnly = String(t.startDate || '');
                    if (t.status === 'todo' && startDateOnly && startDateOnly !== 'undefined' && startDateOnly < todayStr) {
                        if (!startDelayedTasks.find(x => x.id === t.id)) {
                            startDelayedTasks.push({ id: t.id, name: t.text || t.workDetails || '제목없음', date: startDateOnly });
                        }
                    }
                } else { 
                    if (t.requester) { 
                        if(!mats[t.requester]) mats[t.requester] = {req:0, ord:0, del:0}; 
                        if(t.status === 'mat-request') mats[t.requester].req++; 
                        else if(t.status === 'mat-ordered') mats[t.requester].ord++; 
                        else if(isDelivered) mats[t.requester].del++; 
                    } 
                    const matDueDateOnly = String(t.dueDate || ''); 
                    if (matDueDateOnly && matDueDateOnly !== 'undefined') { 
                        if(matDueDateOnly >= todayStr && matDueDateOnly <= nextWeekStr) { 
                            if(!matDates[matDueDateOnly]) matDates[matDueDateOnly] = {wait:0, done:0}; 
                            if(t.status === 'mat-delivered') matDates[matDueDateOnly].done++; 
                            else matDates[matDueDateOnly].wait++; 
                        } 
                    } 
                    const matStartDateOnly = String(t.startDate || ''); 
                    if (t.status === 'mat-request' && matStartDateOnly && matStartDateOnly !== 'undefined' && matStartDateOnly < todayStr) { 
                        delayedMats.push({ id: t.id, name: t.text || '제목없음', date: matStartDateOnly }); 
                    }
                    if (t.status === 'mat-ordered' && matDueDateOnly && matDueDateOnly !== 'undefined' && matDueDateOnly < todayStr) {
                        if (!deliveryDelayedMats.find(x => x.id === t.id)) {
                            deliveryDelayedMats.push({ id: t.id, name: t.text || '품명없음', date: matDueDateOnly });
                        }
                    }
                }
            }
        }); 

        try { 
            worklogDates.sort(function(a,b){ return a - b; }); 
            const wlDatesEl = document.getElementById('worklog-recorded-dates'); 
            if (wlDatesEl) { 
                const missingDates = [];
                const viewYear = parseInt(wlViewYm.split('-')[0]);
                const viewMonth = parseInt(wlViewYm.split('-')[1]);
                const todayNow = new Date();
                const currentYmStr = todayNow.getFullYear() + '-' + String(todayNow.getMonth() + 1).padStart(2, '0');
                
                let maxDay = 0;
                if (wlViewYm < currentYmStr) {
                    maxDay = new Date(viewYear, viewMonth, 0).getDate();
                } else if (wlViewYm === currentYmStr) {
                    maxDay = todayNow.getDate();
                }
                
                for (let d = 1; d <= maxDay; d++) {
                    const checkDate = new Date(viewYear, viewMonth - 1, d);
                    if (checkDate.getDay() === 0) continue; 
                    if (!worklogDates.includes(d)) missingDates.push(d);
                }
                
                let wlHtml = '';
                if (maxDay === 0) {
                    wlHtml = '<span style="color:#666;">미래의 날짜입니다</span>';
                } else if (missingDates.length > 0) { 
                    wlHtml = `<span style="text-decoration:underline; cursor:pointer; color:#bf2600;" onclick="window.showMissingDatesModal([${missingDates.join(',')}], ${viewMonth}, ${viewYear});">⚠️ ${viewMonth}월 미작성일 보기 (${missingDates.length}일)</span>`; 
                } else { 
                    wlHtml = `<span style="color:#00875a;">✨ ${viewMonth}월 모두 작성됨 (일요일 제외)</span>`; 
                } 
                setHTML('worklog-recorded-dates', wlHtml);
            } 
        } catch(e) { console.error(e); } 

        const todayDateObj = new Date(todayStr.split('-')[0], todayStr.split('-')[1]-1, todayStr.split('-')[2]); 

        statuses.forEach(function(s){ 
            const countEl = document.getElementById(`${s}-count`); 
            if(countEl) countEl.innerText = lists[s].length; 
            
            if (lists[s].length === 0) { setHTML(`${s}-list`, ''); return; } 

            if (s === 'worklog') { 
                setHTML('worklog-list', lists[s].map(function(t){ return window.renderCard(t, s, currentMonthStr); }).join('')); 
            } else { 
                const grouped = {}; 
                lists[s].forEach(function(t){ 
                    const fallback = window.getFallbackDate(t.createdAt); 
                    let refDate = String(t.dueDate || t.startDate || fallback); 
                    let yyyy_mm = refDate && refDate !== 'undefined' ? refDate.substring(0, 7) : '미지정'; 
                    let groupKey = yyyy_mm; 
                    if (yyyy_mm === currentMonthStr && refDate && (t.status === 'done' || t.status === 'mat-delivered')) { 
                        let rDateObj = new Date(refDate.split('-')[0], refDate.split('-')[1]-1, refDate.split('-')[2]); 
                        let diffDays = Math.round((todayDateObj - rDateObj) / (1000 * 60 * 60 * 24));
                        if (diffDays >= 7) groupKey = yyyy_mm + '-old'; 
                    } 
                    if(!grouped[groupKey]) grouped[groupKey] = []; 
                    grouped[groupKey].push(t); 
                }); 
                const sortedMonths = Object.keys(grouped).sort(function(a,b){ 
                    const aBase = a.replace('-old', ''); 
                    const bBase = b.replace('-old', ''); 
                    if (aBase !== bBase) return bBase.localeCompare(aBase); 
                    if (a.includes('-old') && !b.includes('-old')) return 1; 
                    if (!a.includes('-old') && b.includes('-old')) return -1; 
                    return 0; 
                }); 
                let finalHtml = ''; 
                sortedMonths.forEach(function(month){ 
                    const isActiveStatus = ['todo', 'inprogress', 'mat-request', 'mat-ordered'].includes(s); 
                    const isCurrent = (month === currentMonthStr || month === '미지정') || window.showOldDoneTasks || isActiveStatus; 
                    const displayStyle = isCurrent ? 'flex' : 'none'; 
                    const icon = isCurrent ? '▼' : '▶'; 
                    let label = '일자 미지정'; 
                    if(month !== '미지정') { 
                        const parts = month.replace('-old','').split('-'); 
                        label = `${parts[0]}년 ${parseInt(parts[1])}월`; 
                        if(month.includes('-old')) label += ' (7일 경과)'; 
                    } 
                    finalHtml += `<div style="background:#d9e2ec; padding:6px 10px; margin-top:5px; margin-bottom:5px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer; display:flex; justify-content:space-between; align-items:center; color:#172b4d;" onclick="const content = this.nextElementSibling; const ic = this.querySelector('.fold-icon'); if(content.style.display==='none'){content.style.display='flex'; ic.innerText='▼';}else{content.style.display='none'; ic.innerText='▶';}">${label} <span class="fold-icon" style="font-size:0.7rem; color:#6b778c;">${icon}</span></div><div style="display:${displayStyle}; flex-direction:column; gap:5px; margin-bottom:10px;">${grouped[month].map(function(t){ return window.renderCard(t, s, currentMonthStr); }).join('')}</div>`; 
                }); 
                setHTML(`${s}-list`, finalHtml); 
            } 
        }); 

        setTableHTML('assignee-table', Object.keys(assignees).map(function(k){ return `<tr><td>${k}</td><td><a class="clickable" onclick="window.showTaskModal('assignee','${k}','todo')">${assignees[k].todo}</a></td><td><a class="clickable" onclick="window.showTaskModal('assignee','${k}','inprogress')">${assignees[k].inprogress}</a></td><td><a class="clickable" onclick="window.showTaskModal('assignee','${k}','done')">${assignees[k].done}</a></td></tr>`; }).join('')); 
        const sortedTaskDates = Object.keys(taskDates).sort(); 
        setTableHTML('task-date-table', sortedTaskDates.map(function(k){ return `<tr><td>${k.substring(5)}</td><td><a class="clickable" onclick="window.showTaskModal('dueDate','${k}','wait')">${taskDates[k].wait}</a></td><td><a class="clickable" onclick="window.showTaskModal('dueDate','${k}','done')">${taskDates[k].done}</a></td></tr>`; }).join('')); 
        setTableHTML('overdue-table', overdueTasks.map(function(t){ return `<tr><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;" title="${t.name}"><a class="clickable" onclick="window.showTaskModal('single','${t.id}','')">${t.name}</a></td><td>${t.date.substring(5)}</td></tr>`; }).join('')); 
        setTableHTML('start-delayed-table', startDelayedTasks.map(function(t){ return `<tr><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;" title="${t.name}"><a class="clickable" onclick="window.showTaskModal('single','${t.id}','')">${t.name}</a></td><td>${t.date.substring(5)}</td></tr>`; }).join(''));

        setTableHTML('material-table', Object.keys(mats).map(function(k){ return `<tr><td>${k}</td><td><a class="clickable" onclick="window.showTaskModal('requester','${k}','req')">${mats[k].req}</a></td><td><a class="clickable" onclick="window.showTaskModal('requester','${k}','ord')">${mats[k].ord}</a></td><td><a class="clickable" onclick="window.showTaskModal('requester','${k}','del')">${mats[k].del}</a></td></tr>`; }).join('')); 
        const sortedMatDates = Object.keys(matDates).sort(); 
        setTableHTML('mat-date-table', sortedMatDates.map(function(k){ return `<tr><td>${k.substring(5)}</td><td><a class="clickable" onclick="window.showTaskModal('dueDate-mat','${k}','wait')">${matDates[k].wait}</a></td><td><a class="clickable" onclick="window.showTaskModal('dueDate-mat','${k}','done')">${matDates[k].done}</a></td></tr>`; }).join('')); 
        setTableHTML('un-ordered-table', delayedMats.map(function(t){ return `<tr><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;" title="${t.name}"><a class="clickable" onclick="window.showTaskModal('single','${t.id}','')">${t.name}</a></td><td>${t.date.substring(5)}</td></tr>`; }).join('')); 
        setTableHTML('delivery-delayed-table', deliveryDelayedMats.map(function(t){ return `<tr><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;" title="${t.name}"><a class="clickable" onclick="window.showTaskModal('single','${t.id}','')">${t.name}</a></td><td>${t.date.substring(5)}</td></tr>`; }).join(''));

        const eqStats = {}; 
        window.currentEquips.forEach(function(eq){ 
            const b = eq.borrower || '미상'; 
            const isReturned = eq.status === '반납완료'; 
            const fallback = window.getFallbackDate(eq.createdAt); 
            const refDate = String(eq.returnDate || eq.borrowDate || fallback); 
            const isCurrentMonth = refDate.startsWith(currentMonthStr); 
            if (isReturned && !isCurrentMonth && !window.showOldDoneTasks) return; 
            if(!eqStats[b]) eqStats[b] = { renting: 0, returned: 0 }; 
            if(!isReturned) eqStats[b].renting++; else eqStats[b].returned++; 
        }); 
        setTableHTML('equip-table', Object.keys(eqStats).map(function(k){ return `<tr><td>${k}</td><td><a class="clickable" style="color:var(--warning-color);" onclick="window.showTaskModal('equip','${k}','대여중')">${eqStats[k].renting}</a></td><td><a class="clickable" onclick="window.showTaskModal('equip','${k}','반납완료')">${eqStats[k].returned}</a></td></tr>`; }).join('')); 

        window.renderCalendar(); 
    } catch (globalUIError) { 
        console.error("Update UI Error:", globalUIError); 
    } 
};

window.renderSidePanels = function() { 
    try { 
        const contactList = document.getElementById('side-contact-list'); 
        if(contactList) { 
            if(!window.currentContacts || window.currentContacts.length === 0) { 
                contactList.innerHTML = '<div style="color:#999; font-size:0.8rem; text-align:center;">등록된 연락처가 없습니다.</div>'; 
            } else { 
                const grouped = {}; 
                window.currentContacts.forEach(function(c){ const g = c.group || '미지정'; if(!grouped[g]) grouped[g] = []; grouped[g].push(c); }); 
                let html = ''; 
                Object.keys(grouped).sort().forEach(function(g){ 
                    html += `<div style="font-size:0.75rem; font-weight:bold; color:#009688; margin-top:10px; border-bottom:1px solid #eee; padding-bottom:3px; cursor:pointer; display:flex; justify-content:space-between;" onclick="const content = this.nextElementSibling; const ic = this.querySelector('span'); if(content.style.display==='none'){content.style.display='block'; ic.innerText='▼';}else{content.style.display='none'; ic.innerText='▶';}"><span>📁 ${g}</span> <span>▼</span></div><div style="display:block; padding-top:5px;">`; 
                    grouped[g].forEach(function(c){ html += `<div style="padding:6px 0; border-bottom:1px dashed #eee;"><div style="font-size:0.85rem; font-weight:bold; color:#333;">${c.name} <span style="font-size:0.7rem; color:#888; font-weight:normal;">${c.note ? `(${c.note})` : ''}</span></div><div style="font-size:0.8rem; margin-top:2px;"><a href="tel:${c.phone}" style="text-decoration:none; color:#0052cc;">📞 ${c.phone}</a></div></div>`; }); 
                    html += `</div>`; 
                }); 
                contactList.innerHTML = html; 
            } 
        } 

        const siteList = document.getElementById('side-site-list'); 
        if(siteList) { 
            if(!window.currentSites || window.currentSites.length === 0) { 
                siteList.innerHTML = '<div style="color:#999; font-size:0.8rem; text-align:center;">등록된 사이트가 없습니다.</div>'; 
            } else { 
                const grouped = {}; 
                window.currentSites.forEach(function(s){ const g = s.group || '미지정'; if(!grouped[g]) grouped[g] = []; grouped[g].push(s); }); 
                let html = ''; 
                Object.keys(grouped).sort().forEach(function(g){ 
                    html += `<div style="font-size:0.75rem; font-weight:bold; color:#607d8b; margin-top:10px; border-bottom:1px solid #eee; padding-bottom:3px; cursor:pointer; display:flex; justify-content:space-between;" onclick="const content = this.nextElementSibling; const ic = this.querySelector('span'); if(content.style.display==='none'){content.style.display='block'; ic.innerText='▼';}else{content.style.display='none'; ic.innerText='▶';}"><span>📁 ${g}</span> <span>▼</span></div><div style="display:block; padding-top:5px;">`; 
                    grouped[g].forEach(function(s){ html += `<div style="padding:6px 0; border-bottom:1px dashed #eee;"><div style="font-size:0.85rem; font-weight:bold; color:#333;">${s.name}</div><div style="font-size:0.75rem; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><a href="${s.url}" target="_blank" style="color:#0052cc;">${s.url}</a></div></div>`; }); 
                    html += `</div>`; 
                }); 
                siteList.innerHTML = html; 
            } 
        } 

        const otherCoList = document.getElementById('side-otherco-list'); 
        if(otherCoList) { 
            if(!window.currentOtherCos || window.currentOtherCos.length === 0) { 
                otherCoList.innerHTML = '<div style="color:#999; font-size:0.8rem; text-align:center;">등록된 타업체가 없습니다.</div>'; 
            } else { 
                const grouped = {}; 
                window.currentOtherCos.forEach(function(c){ const g = c.group || '미지정'; if(!grouped[g]) grouped[g] = []; grouped[g].push(c); }); 
                let html = ''; 
                Object.keys(grouped).sort().forEach(function(g){ 
                    html += `<div style="font-size:0.75rem; font-weight:bold; color:#d35400; margin-top:10px; border-bottom:1px solid #eee; padding-bottom:3px; cursor:pointer; display:flex; justify-content:space-between;" onclick="const content = this.nextElementSibling; const ic = this.querySelector('span'); if(content.style.display==='none'){content.style.display='block'; ic.innerText='▼';}else{content.style.display='none'; ic.innerText='▶';}"><span>📁 ${g}</span> <span>▼</span></div><div style="display:block; padding-top:5px;">`; 
                    grouped[g].forEach(function(c){ html += `<div style="padding:6px 0; border-bottom:1px dashed #eee;"><div style="font-size:0.85rem; font-weight:bold; color:#333;">${c.name}</div><div style="font-size:0.8rem; margin-top:2px;"><a href="tel:${c.phone}" style="text-decoration:none; color:#0052cc;">📞 ${c.phone}</a></div>${c.note ? `<div style="font-size:0.7rem; color:#888; margin-top:2px;">${c.note}</div>` : ''}</div>`; }); 
                    html += `</div>`; 
                }); 
                otherCoList.innerHTML = html; 
            } 
        } 
    } catch(e) { console.error("SidePanel Render Error:", e); } 
};

window.showTaskModal = function(type, key, subType) { 
    try { 
        const list = document.getElementById('modal-list'); 
        const title = document.getElementById('modal-title'); 
        let filtered = []; 
        const currentMonthStr = window.getLocalDateString().substring(0, 7); 
        
        if (type === 'assignee') { 
            title.innerText = `👤 ${key} 님의 일정 (${subType === 'todo' ? '할일' : subType === 'inprogress' ? '진행중' : '완료'})`; 
            filtered = window.currentTasks.filter(function(t){ return t.assignee === key && t.status !== 'deleted'; }); 
            if(subType === 'todo') filtered = filtered.filter(function(t){ return t.status === 'todo'; }); 
            if(subType === 'inprogress') filtered = filtered.filter(function(t){ return t.status === 'inprogress'; }); 
            if(subType === 'done') filtered = filtered.filter(function(t){ return (t.status === 'done' || t.status === 'worklog') && String(t.dueDate || t.startDate || window.getFallbackDate(t.createdAt)).startsWith(currentMonthStr); }); 
        } else if (type === 'dueDate') { 
            title.innerText = `📅 일정 마감일: ${key}`; 
            filtered = window.currentTasks.filter(function(t){ return String(t.dueDate || '') === key && !String(t.status || '').startsWith('mat-') && t.status !== 'worklog' && t.status !== 'deleted'; }); 
            if(subType === 'done') filtered = filtered.filter(function(t){ return t.status === 'done'; }); else filtered = filtered.filter(function(t){ return t.status !== 'done'; }); 
        } else if (type === 'overdue') { 
            title.innerText = `⚠️ 기한 지연 일정`; 
            filtered = window.currentTasks.filter(function(t){ return String(t.dueDate || '') < key && String(t.dueDate || '') !== '' && !String(t.status || '').startsWith('mat-') && t.status !== 'done' && t.status !== 'worklog' && t.status !== 'deleted'; }); 
        } else if (type === 'requester') { 
            title.innerText = `📦 ${key} 님의 자재 현황`; 
            filtered = window.currentTasks.filter(function(t){ return t.requester === key && String(t.status || '').startsWith('mat-') && t.status !== 'deleted'; }); 
            if(subType === 'req') filtered = filtered.filter(function(t){ return t.status === 'mat-request'; }); 
            if(subType === 'ord') filtered = filtered.filter(function(t){ return t.status === 'mat-ordered'; }); 
            if(subType === 'del') filtered = filtered.filter(function(t){ return t.status === 'mat-delivered' && String(t.dueDate || t.startDate || window.getFallbackDate(t.createdAt)).startsWith(currentMonthStr); }); 
        } else if (type === 'dueDate-mat') { 
            title.innerText = `🚚 자재 반입일: ${key}`; 
            filtered = window.currentTasks.filter(function(t){ return String(t.dueDate || '') === key && String(t.status || '').startsWith('mat-') && t.status !== 'deleted'; }); 
            if(subType === 'done') filtered = filtered.filter(function(t){ return t.status === 'mat-delivered'; }); else filtered = filtered.filter(function(t){ return t.status !== 'mat-delivered'; }); 
        } else if (type === 'unordered-mat') { 
            title.innerText = `⚠️ 발주 지연 자재`; 
            filtered = window.currentTasks.filter(function(t){ return t.status === 'mat-request' && String(t.startDate || '') !== '' && String(t.startDate || '') < key && t.status !== 'deleted'; }); 
        } else if (type === 'single') { 
            title.innerText = `상세 보기`; 
            filtered = window.currentTasks.filter(function(t){ return t.id === key && t.status !== 'deleted'; }); 
        } else if (type === 'calendar-click') { 
            title.innerText = `📅 ${key} 등록 일정 목록`; 
            filtered = window.currentTasks.filter(function(t){ return (String(t.startDate || window.getFallbackDate(t.createdAt)) === key || String(t.dueDate || window.getFallbackDate(t.createdAt)) === key) && !String(t.status || '').startsWith('mat-') && t.status !== 'worklog' && t.status !== 'deleted'; }); 
        } 
        
        if (type === 'equip') { 
            title.innerText = `🧰 ${key} 님의 장비 내역`; 
            let eqs = window.currentEquips.filter(function(e){ return e.borrower === key; }); 
            if(subType === '대여중') eqs = eqs.filter(function(e){ return e.status === '대여중'; }); 
            if(subType === '반납완료') eqs = eqs.filter(function(e){ return e.status === '반납완료' && String(e.returnDate || e.borrowDate || window.getFallbackDate(e.createdAt)).startsWith(currentMonthStr); }); 
            list.innerHTML = eqs.map(function(e){ return `<div style="padding:10px; border-bottom:1px solid #eee;"><strong>${e.name}</strong><br><span style="font-size:0.8rem;color:#666;">대여일: ${e.borrowDate}</span></div>`; }).join(''); 
        } else { 
            list.innerHTML = filtered.map(function(t){ return window.renderCard(t, t.status, currentMonthStr); }).join(''); 
        } 
        
        if(list.innerHTML === '') {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#999; font-size:0.9rem;">등록된 내역이 없습니다.</div>'; 
        }
        document.getElementById('task-modal').style.display = 'block'; 
    } catch(e) { console.error("상세 팝업 오류", e); } 
};

window.showDailyBriefing = function() { 
    try { 
        const today = new Date(); 
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); 
        const todayStr = window.getLocalDateString(today);
        const tomorrowStr = window.getLocalDateString(tomorrow); 
        
        const tomorrowTasks = window.currentTasks.filter(function(t) { return t && t.status !== 'deleted' && ((t.startDate || window.getFallbackDate(t.createdAt)) === tomorrowStr || (t.dueDate || window.getFallbackDate(t.createdAt)) === tomorrowStr) && !(t.status || '').startsWith('mat-') && t.status !== 'worklog'; }); 
        const matRequests = window.currentTasks.filter(function(t) { return t && t.status === 'mat-request'; }); 
        const matOrdereds = window.currentTasks.filter(function(t) { return t && t.status === 'mat-ordered'; }); 
        const inprogressTasks = window.currentTasks.filter(function(t) { return t && t.status === 'inprogress'; }); 
        
        const todayStartTasks = window.currentTasks.filter(function(t) { return t && t.status === 'todo' && t.startDate === todayStr; });
        const startDelayedTasks = window.currentTasks.filter(function(t) { return t && t.status === 'todo' && t.startDate < todayStr && t.startDate !== ''; });
        const deliveryDelayedMats = window.currentTasks.filter(function(t) { return t && t.status === 'mat-ordered' && t.dueDate < todayStr && t.dueDate !== ''; });

        const unackedContainer = document.getElementById('brief-unacked-list');
        const inprogressContainer = document.getElementById('brief-inprogress-list');
        const todayStartContainer = document.getElementById('brief-today-start-list');
        const todoContainer = document.getElementById('brief-todo-list'); 
        const startDelayedContainer = document.getElementById('brief-start-delayed-list');
        const reqContainer = document.getElementById('brief-mat-request-list'); 
        const ordContainer = document.getElementById('brief-mat-ordered-list'); 
        const deliveryDelayedContainer = document.getElementById('brief-delivery-delayed-list');
        
        if (unackedContainer) {
            let unackedHtml = '';
            if (window.teamMembers && window.teamMembers.length > 0) {
                window.teamMembers.forEach(function(m) {
                    const memberName = m.name;
                    const unackedTasks = window.currentTasks.filter(function(t) {
                        if (!t || t.status === 'deleted' || t.status === 'done' || t.status === 'mat-delivered' || t.status === 'worklog') return false;
                        const isRelevant = (t.assignee === memberName) || (t.requester === memberName) || (t.orderer === memberName);
                        const hasAcked = t.acks && t.acks[memberName];
                        return isRelevant && !hasAcked;
                    });

                    if (unackedTasks.length > 0) {
                        unackedHtml += `<div style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #eee;">`;
                        unackedHtml += `<div style="font-weight:bold; color:#e91e63; font-size:0.85rem; margin-bottom:4px;">👤 ${memberName} <span style="font-size:0.75rem; color:#666; font-weight:normal;">(미확인 ${unackedTasks.length}건)</span></div>`;
                        unackedTasks.forEach(function(t) {
                            const statusMap = { 'todo':'할일', 'inprogress':'진행중', 'mat-request':'발주요청', 'mat-ordered':'발주완료' };
                            const sName = statusMap[t.status] || t.status;
                            unackedHtml += `<div style="font-size:0.8rem; color:#333; margin-left:5px; border-left:3px solid #ffbdad; padding-left:6px; margin-top:3px; line-height:1.3;">
                                <strong style="color:#bf2600; font-size:0.7rem;">[${sName}]</strong> ${t.text || '제목없음'}
                            </div>`;
                        });
                        unackedHtml += `</div>`;
                    }
                });
            }
            
            if (unackedHtml === '') {
                unackedContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">모든 인원이 담당 항목을 확인했습니다. 🎉</div>';
            } else {
                unackedContainer.innerHTML = unackedHtml;
            }
        }

        if(!todoContainer || !reqContainer || !ordContainer || !inprogressContainer) return; 

        if(inprogressTasks.length > 0) {
            inprogressContainer.innerHTML = inprogressTasks.map(function(t) { return `<div class="brief-item"><strong>${t.text || '제목없음'}</strong><div class="brief-meta">담당자: ${t.assignee || '미지정'} | 기간: ${t.startDate || '-'} ~ ${t.dueDate || '-'}</div></div>`; }).join(''); 
        } else {
            inprogressContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">현재 진행 중인 항목이 없습니다.</div>'; 
        }

        if(todayStartContainer) {
            if(todayStartTasks.length > 0) {
                todayStartContainer.innerHTML = todayStartTasks.map(function(t) { return `<div class="brief-item"><strong>${t.text || '제목없음'}</strong><div class="brief-meta">담당자: ${t.assignee || '미지정'} | 시작일: ${t.startDate || '-'}</div></div>`; }).join('');
            } else {
                todayStartContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">오늘 시작할 항목이 없습니다.</div>';
            }
        }
        
        if(tomorrowTasks.length > 0) {
            todoContainer.innerHTML = tomorrowTasks.map(function(t) { return `<div class="brief-item"><strong>${t.text || '제목없음'}</strong><div class="brief-meta">담당자: ${t.assignee || '미지정'} | 기간: ${t.startDate || '-'} ~ ${t.dueDate || '-'}</div></div>`; }).join(''); 
        } else {
            todoContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">내일 예정된 항목이 없습니다.</div>'; 
        }

        if(startDelayedContainer) {
            if(startDelayedTasks.length > 0) {
                startDelayedContainer.innerHTML = startDelayedTasks.map(function(t) { return `<div class="brief-item"><strong style="color:#bf2600;">${t.text || '제목없음'}</strong><div class="brief-meta">담당자: ${t.assignee || '미지정'} | 시작예정일: ${t.startDate || '-'}</div></div>`; }).join('');
            } else {
                startDelayedContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">시작이 지연된 항목이 없습니다.</div>';
            }
        }
        
        if(matRequests.length > 0) {
            reqContainer.innerHTML = matRequests.map(function(t){ return `<div class="brief-item"><strong>${t.text || '품명없음'}</strong><div class="brief-meta">요청일: ${t.startDate || '-'} | 요청자: ${t.requester || '-'}</div></div>`; }).join(''); 
        } else {
            reqContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">발주 대기 중인 자재가 없습니다.</div>'; 
        }
        
        if(matOrdereds.length > 0) {
            ordContainer.innerHTML = matOrdereds.map(function(t){ return `<div class="brief-item"><strong>${t.text || '품명없음'}</strong><div class="brief-meta">반입예정: ${t.dueDate || '-'} | 발주자: ${t.orderer || '-'}</div></div>`; }).join(''); 
        } else {
            ordContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">반입 대기 중인 자재가 없습니다.</div>'; 
        }

        if(deliveryDelayedContainer) {
            if(deliveryDelayedMats.length > 0) {
                deliveryDelayedContainer.innerHTML = deliveryDelayedMats.map(function(t){ return `<div class="brief-item"><strong style="color:#bf2600;">${t.text || '품명없음'}</strong><div class="brief-meta">반입예정: ${t.dueDate || '-'} | 발주자: ${t.orderer || '-'}</div></div>`; }).join('');
            } else {
                deliveryDelayedContainer.innerHTML = '<div style="color:#aaa; text-align:center; padding:5px 0;">반입이 지연된 자재가 없습니다.</div>';
            }
        }
        
        document.getElementById('briefing-modal').style.display = 'block'; 
    } catch (err) { alert("브리핑을 불러오는 중 오류가 발생했습니다."); } 
};

window.openReportModal = function() { 
    try { 
        const today = window.getLocalDateString(); 
        const doneTasks = window.currentTasks.filter(function(t) { return t && t.status === 'worklog' && (t.startDate || window.getFallbackDate(t.createdAt)) === today && t.status !== 'deleted'; }); 
        const deliveredMats = window.currentTasks.filter(function(t) { return t && t.status === 'mat-delivered' && (t.dueDate === today || t.startDate === today) && t.status !== 'deleted'; }); 
        
        let report = `📋 [일일 작업일보 - ${today}]\n작성자: ${window.loggedInUser || '미상'}\n`; 
        const wEl = document.getElementById('weather-widget'); 
        report += `날씨: ${wEl ? wEl.innerText : '정보 없음'}\n\n[✅ 금일 작업 내용]\n`; 
        
        if(doneTasks.length > 0) { 
            doneTasks.forEach(function(t){ 
                if (Array.isArray(t.bundledTasks) && t.bundledTasks.length > 0) { 
                    t.bundledTasks.forEach(function(bt) { 
                        if(!bt) return; 
                        const wNames = (Array.isArray(bt.workers) && bt.workers.length > 0) ? ` (투입: ${bt.workers.join(', ')})` : ''; 
                        let detailText = '';
                        if(bt.location !== undefined || bt.content !== undefined) {
                            const locText = bt.location ? `[${bt.location}] ` : '';
                            detailText = `${locText}${bt.content || ''}`;
                        } else {
                            detailText = bt.detail || '';
                        }
                        report += `- ${detailText}${wNames}\n`; 
                    }); 
                } else { 
                    const mainText = t.workDetails || '내용없음'; 
                    const workerText = (Array.isArray(t.workers) && t.workers.length > 0) ? ` (투입: ${t.workers.join(', ')})` : ''; 
                    report += `- ${mainText}${workerText}\n`; 
                } 
            }); 
        } else { 
            report += '- 내역 없음\n'; 
        } 
        
        report += '\n[📦 금일 반입된 자재]\n'; 
        if(deliveredMats.length > 0) { 
            deliveredMats.forEach(function(t){ report += `- ${t.text} (발주: ${t.orderer||'미지정'})\n`; }); 
        } else { 
            report += '- 내역 없음\n'; 
        } 
        
        document.getElementById('report-text').value = report; 
        document.getElementById('report-modal').style.display = 'block'; 
    } catch (err) { alert("일보를 생성하는 중 오류가 발생했습니다."); } 
};

window.saveWorklogEdit = async function() { 
    const id = document.getElementById('edit-wl-id').value; 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    if (!task) return; 
    
    if (task.bundledTasks) { 
        let newBundled = []; 
        task.bundledTasks.forEach(function(bt, i){ 
            const contentEl = document.getElementById(`edit-wl-content-${i}`); 
            const locEl = document.getElementById(`edit-wl-loc-${i}`);
            if(!contentEl) return; 
            
            const content = contentEl.value.trim(); 
            const loc = locEl ? locEl.value.trim() : '';

            const workersStr = document.getElementById(`wl-workers-hidden-edit-${i}`).value; 
            const workers = workersStr ? workersStr.split(',') : []; 
            
            if (content || loc) {
                let detailText = loc ? `[${loc}] ${content}` : content;
                if(bt.location !== undefined || bt.content !== undefined) {
                    newBundled.push({ location: loc, content: content, detail: detailText, workers: workers }); 
                } else {
                    newBundled.push({ detail: content, workers: workers });
                }
            } 
        }); 
        window.sendLineNotificationProxy(`✏️ [당일 작업 일보 수정]\n수정자: ${window.loggedInUser}\n기존 내역이 수정되었습니다.`); 
        await window.db.collection("tasks").doc(id).update({ bundledTasks: newBundled }); 
    } else { 
        const detail = document.getElementById(`edit-wl-detail-0`).value.trim(); 
        await window.db.collection("tasks").doc(id).update({ workDetails: detail }); 
    } 
    document.getElementById('edit-worklog-modal').style.display = 'none'; 
};

window.saveAllWorklogs = async function() {
    if(!window.loggedInUser) return alert("로그인 후 이용해주세요.");
    const baseDate = document.getElementById('worklog-start').value;
    if(!baseDate) return alert("기준일을 선택해주세요.");
    
    const entries = document.querySelectorAll('.worklog-entry');
    let newBundledTasks = [];
    
    entries.forEach(function(entry) {
        const locEl = entry.querySelector('.wl-location');
        const contentEl = entry.querySelector('.wl-content');
        const workersEl = entry.querySelector('.wl-workers-hidden');
        
        if(locEl && contentEl) {
            const loc = locEl.value.trim();
            const content = contentEl.value.trim();
            const workersStr = workersEl ? workersEl.value : '';
            const workers = workersStr ? workersStr.split(',') : [];
            
            if(loc || content) {
                newBundledTasks.push({ location: loc, content: content, detail: `[${loc}] ${content}`, workers: workers });
            }
        }
    });

    if(newBundledTasks.length === 0) return alert("작업 내용을 하나 이상 입력해주세요.");

    const existingLog = window.currentTasks.find(t => t.status === 'worklog' && t.startDate === baseDate && t.status !== 'deleted');

    if (existingLog) {
        const isMerge = confirm(`해당 날짜(${baseDate})에 이미 작성된 일보가 있습니다.\n기존 일보 내용 아래에 이어서 추가(병합)하시겠습니까?\n\n※ [확인]: 기존 기록에 합치기\n※ [취소]: 별개의 기록으로 만들기 선택`);
        
        if (isMerge) {
            const mergedTasks = [...(existingLog.bundledTasks || []), ...newBundledTasks];
            await window.db.collection("tasks").doc(existingLog.id).update({
                bundledTasks: mergedTasks
            });
            window.sendLineNotificationProxy(`📝 [당일 작업 일보 추가]\n작성자: ${window.loggedInUser}\n기준일: ${baseDate}\n기존 기록에 ${newBundledTasks.length}건 추가됨.`);
        } else {
            const isNew = confirm(`기존 일보와 합치지 않고, 별도의 새로운 카드로 추가하시겠습니까?\n\n※ [확인]: 별도의 새 일보로 저장\n※ [취소]: 저장 취소`);
            if (isNew) {
                await window.db.collection("tasks").add({
                    status: "worklog",
                    startDate: baseDate,
                    dueDate: baseDate,
                    assignee: window.loggedInUser,
                    bundledTasks: newBundledTasks,
                    acks: {},
                    createdAt: Date.now()
                });
                window.sendLineNotificationProxy(`📝 [당일 작업 일보 신규 추가]\n작성자: ${window.loggedInUser}\n기준일: ${baseDate}\n별도 기록으로 ${newBundledTasks.length}건 등록 완료.`);
            } else {
                return; 
            }
        }
    } else {
        await window.db.collection("tasks").add({
            status: "worklog",
            startDate: baseDate,
            dueDate: baseDate,
            assignee: window.loggedInUser,
            bundledTasks: newBundledTasks,
            acks: {},
            createdAt: Date.now()
        });
        window.sendLineNotificationProxy(`📝 [당일 작업 일보 저장]\n작성자: ${window.loggedInUser}\n기준일: ${baseDate}\n총 ${newBundledTasks.length}건 등록 완료.`);
    }

    const container = document.getElementById('worklog-entries');
    if (container) container.innerHTML = '';
    window.worklogEntryCount = 0;
    for(let i=0; i<3; i++) window.addWorklogEntry();
    
    alert("일보가 성공적으로 저장/추가되었습니다.");
};

window.sendReportLine = function() {
    const text = document.getElementById('report-text').value;
    if(!text.trim()) return alert("보고할 내용이 없습니다.");
    window.sendLineNotificationProxy(text);
    alert("라인으로 보고 내용을 전송 요청했습니다.");
    document.getElementById('report-modal').style.display = 'none';
};

window.addCard = async function(col) {  
    const startDate = document.getElementById(`${col}-start`).value; 
    const dueDate = document.getElementById(`${col}-due`).value; 
    let text = ''; let req='', ord='', asg='', repeat='none'; 
    
    if (col.startsWith('mat-')) { 
        const item = document.getElementById(`${col}-item`).value; 
        const spec = document.getElementById(`${col}-spec`).value; 
        const qty = document.getElementById(`${col}-qty`).value; 
        if (!item) { alert("품명을 입력해주세요."); return; } 
        text = `품명: ${item} | 규격: ${spec} | 수량: ${qty}`; 
        req = document.getElementById(`${col}-requester`).value || window.loggedInUser; 
        ord = document.getElementById(`${col}-orderer`).value; 
        document.getElementById(`${col}-item`).value = ''; 
        document.getElementById(`${col}-spec`).value = ''; 
        document.getElementById(`${col}-qty`).value = ''; 
    } else { 
        const input = document.getElementById(`${col}-input`); 
        text = input.value; 
        if(!text) return; 
        input.value = ''; 
        asg = document.getElementById(`${col}-assignee`).value || window.loggedInUser;  
        
        const repEl = document.getElementById(`${col}-repeat`);
        if(repEl) repeat = repEl.value;
    } 
    const typeStr = col.startsWith('mat-') ? '자재' : '일정'; 
    window.sendLineNotificationProxy(`🔔 [신규 등록 - ${typeStr}]\n등록자: ${window.loggedInUser}\n내용: ${text}\n일자: ${startDate} ~ ${dueDate}`); 
    const now = new Date();
const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

// 2. 작성자 본인을 자동으로 확인 명단에 추가
let autoAck = {};
if (window.loggedInUser) {
    autoAck[window.loggedInUser] = timeStr;
}

// 3. 빈 객체(acks: {}) 대신 위에서 만든 autoAck를 넣어서 저장
await window.db.collection("tasks").add({ text: text, status: col, startDate: startDate, dueDate: dueDate, assignee: asg, requester: req, orderer: ord, repeat: repeat, acks: autoAck, createdAt: Date.now() });  
};

window.moveTask = async function(id, newStatus) {  
    if(!window.loggedInUser) return alert("로그인 후 사용해주세요."); 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    const sMap = { 'todo':'할 일', 'inprogress':'진행 중', 'done':'완료', 'mat-request':'발주요청', 'mat-ordered':'발주완료', 'mat-delivered':'반입완료' }; 
    
    const now = new Date(); 
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; 
    
    if(task) window.sendLineNotificationProxy(`🔄 [상태 변경]\n처리자: ${window.loggedInUser}\n내용: ${task.text || task.workDetails || '내용없음'}\n상태: ${sMap[task.status]||task.status} ➡️ ${sMap[newStatus]||newStatus}`); 
    
    let updateData = { status: newStatus };
    if (newStatus === 'inprogress') {
        updateData.inProgressUser = window.loggedInUser;
        updateData.inProgressTime = timeStr;
    } else if (newStatus === 'done') {
        updateData.doneUser = window.loggedInUser;
        updateData.doneTime = timeStr;
    }

    if (newStatus === 'done' && task.repeat && task.repeat !== 'none') {
        const nextStart = window.getNextDateStr(task.startDate, task.repeat);
        const nextDue = window.getNextDateStr(task.dueDate, task.repeat);
        
        await window.db.collection("tasks").add({ 
            text: task.text, status: 'todo', startDate: nextStart, dueDate: nextDue, 
            assignee: task.assignee || '', requester: task.requester || '', orderer: task.orderer || '', 
            repeat: task.repeat, acks: {}, createdAt: Date.now() 
        });
        
        updateData.repeat = 'none';
    }
    
    await window.db.collection("tasks").doc(id).update(updateData);  
};

window.orderMaterial = async function(id) { 
    if(!window.loggedInUser) return alert("로그인 후 사용해주세요."); 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    const now = new Date(); 
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; 
    if(task) window.sendLineNotificationProxy(`📦 [발주 완료 처리]\n품목: ${task.text || '품명없음'}\n발주자: ${window.loggedInUser}\n처리시간: ${timeStr}`); 
    await window.db.collection("tasks").doc(id).update({ status: 'mat-ordered', orderer: window.loggedInUser, orderTime: timeStr }); 
};

window.deliverMaterial = async function(id) { 
    if(!window.loggedInUser) return alert("로그인 후 사용해주세요."); 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    const now = new Date(); 
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; 
    if(task) window.sendLineNotificationProxy(`📦 [반입 완료 처리]\n품목: ${task.text || '품명없음'}\n반입확인자: ${window.loggedInUser}\n처리시간: ${timeStr}`); 
    await window.db.collection("tasks").doc(id).update({ status: 'mat-delivered', deliverer: window.loggedInUser, deliverTime: timeStr }); 
};

window.cancelOrderMaterial = async function(id) { 
    if(!window.loggedInUser) return alert("로그인 후 사용해주세요."); 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    if(!confirm("발주를 취소하고 다시 요청 상태로 되돌리시겠습니까?")) return;
    const now = new Date(); 
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; 
    if(task) window.sendLineNotificationProxy(`📦 [발주 취소]\n품목: ${task.text || '품명없음'}\n취소자: ${window.loggedInUser}\n처리시간: ${timeStr}`); 
    await window.db.collection("tasks").doc(id).update({ status: 'mat-request', orderer: '', orderTime: '' }); 
};

window.toggleAckRecord = async function(id) { 
    if(!window.loggedInUser) return alert("로그인 후 사용해주세요."); 
    const taskSnap = await window.db.collection("tasks").doc(id).get(); 
    if(!taskSnap.exists) return; 
    const task = taskSnap.data(); 
    let acks = task.acks || {}; 
    if(acks[window.loggedInUser]) {
        delete acks[window.loggedInUser]; 
    } else { 
        const now = new Date(); 
        const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; 
        acks[window.loggedInUser] = timeStr; 
    } 
    await window.db.collection("tasks").doc(id).update({ acks: acks }); 
};

window.deleteSelectedTasks = async function() { 
    if(!window.loggedInUser) return alert("로그인 후 시도해주세요."); 
    const checkboxes = document.querySelectorAll('.bulk-delete-cb:checked'); 
    if (checkboxes.length === 0) return alert("일괄 삭제할 항목을 선택해주세요."); 
    if (!confirm(`선택한 ${checkboxes.length}개의 항목을 휴지통으로 이동하시겠습니까?`)) return; 
    
    const idsToDelete = Array.from(checkboxes).map(function(cb){ return cb.value; }); 
    let deletedDetails = []; 
    
    for (let i=0; i<idsToDelete.length; i++) { 
        const id = idsToDelete[i]; 
        const task = window.currentTasks.find(function(t){ return t.id === id; }); 
        if (task) { 
            let text = task.text || task.workDetails || '내용없음'; 
            if (task.status === 'worklog' && Array.isArray(task.bundledTasks) && task.bundledTasks.length > 0) {
                let locInfo = task.bundledTasks[0].location ? `[${task.bundledTasks[0].location}] ` : '';
                text = `[작업일보] ${locInfo}${task.bundledTasks[0].content || task.bundledTasks[0].detail || ''} 등 ${task.bundledTasks.length}건`; 
            }
            deletedDetails.push("- " + text); 
        } 
    } 
    for (let i=0; i<idsToDelete.length; i++) { 
        const id = idsToDelete[i]; 
        const task = window.currentTasks.find(function(t){ return t.id === id; }); 
        if(task) { 
            await window.db.collection("tasks").doc(id).update({ status: 'deleted', prevStatus: task.status, deletedAt: window.getLocalDateString() }); 
        } 
    } 
    if (deletedDetails.length > 0) { 
        let msg = `🗑️ [항목 일괄 삭제(휴지통)]\n처리자: ${window.loggedInUser}\n총 ${deletedDetails.length}건 삭제됨\n\n`; 
        if (deletedDetails.length > 10) msg += deletedDetails.slice(0, 10).join("\n") + `\n...외 ${deletedDetails.length - 10}건`; else msg += deletedDetails.join("\n"); 
        window.sendLineNotificationProxy(msg); 
    } 
    alert(`${checkboxes.length}개의 항목이 휴지통으로 이동되었습니다.`); 
};

window.deleteTask = async function(id) {  
    if(confirm("휴지통으로 이동하시겠습니까?")) { 
        const task = window.currentTasks.find(function(t){ return t.id === id; }); 
        if(task) { 
            await window.db.collection("tasks").doc(id).update({ status: 'deleted', prevStatus: task.status, deletedAt: window.getLocalDateString() }); 
            window.sendLineNotificationProxy(`🗑️ [휴지통 이동]\n이동자: ${window.loggedInUser}\n내용: ${task.text || task.workDetails || '내용없음'}`); 
        } 
    } 
};

window.changeField = async function(id, fieldName, newValue) { 
    await window.db.collection("tasks").doc(id).update({ [fieldName]: newValue }); 
};

window.saveEdit = async function() { 
    const id = document.getElementById('edit-id').value; 
    const text = document.getElementById('edit-text').value.trim(); 
    const startDate = document.getElementById('edit-start-date').value; 
    const dueDate = document.getElementById('edit-due-date').value; 
    if(!text) return alert("내용을 입력해 주세요."); 
    const task = window.currentTasks.find(function(t){ return t.id === id; }); 
    if(task) window.sendLineNotificationProxy(`✏️ [항목 수정]\n수정자: ${window.loggedInUser}\n기존 내용: ${task.text || task.workDetails || '없음'}\n변경 내용: ${text}`); 
    
    if(task && task.status === 'worklog') { 
        await window.db.collection("tasks").doc(id).update({ workDetails: text }); 
    } else { 
        let updateObj = { text: text, startDate: startDate, dueDate: dueDate };
        
        const repWrap = document.getElementById('edit-repeat-wrap');
        if(repWrap && repWrap.style.display === 'block') {
            updateObj.repeat = document.getElementById('edit-repeat').value;
        }
        
        await window.db.collection("tasks").doc(id).update(updateObj); 
    } 
    document.getElementById('edit-modal').style.display = 'none'; 
};

window.addContact = async function() { 
    const group = document.getElementById('contact-group-select').value; 
    const name = document.getElementById('contact-name').value.trim(); 
    const phone = document.getElementById('contact-phone').value.trim(); 
    const note = document.getElementById('contact-note').value.trim(); 
    if(!name || !phone) return alert("이름/업체명과 연락처를 모두 입력하세요."); 
    if (window.editingContactId) { 
        await window.db.collection("contacts").doc(window.editingContactId).update({ group: group, name: name, phone: phone, note: note }); 
        window.editingContactId = null; 
        const btn = document.getElementById('contact-submit-btn'); btn.innerText = "등록"; btn.style.background = "#009688"; 
    } else { 
        await window.db.collection("contacts").add({ group: group, name: name, phone: phone, note: note, createdAt: Date.now() }); 
    } 
    document.getElementById('contact-name').value = ''; document.getElementById('contact-phone').value = ''; document.getElementById('contact-note').value = ''; 
};

window.deleteContact = async function(id) { 
    if(confirm('이 연락처를 삭제하시겠습니까?')) await window.db.collection("contacts").doc(id).delete(); 
};

window.editSite = function(id) { 
    const s = window.currentSites.find(function(x) { return x.id === id; }); if(!s) return; 
    document.getElementById('site-group-select').value = s.group || ''; document.getElementById('site-name').value = s.name || ''; document.getElementById('site-url').value = s.url || ''; 
    window.editingSiteId = id; const btn = document.getElementById('site-submit-btn'); btn.innerText = "수정 저장"; btn.style.background = "#ff9f43"; 
};

window.addSite = async function() { 
    const group = document.getElementById('site-group-select').value; const name = document.getElementById('site-name').value.trim(); const url = document.getElementById('site-url').value.trim(); 
    if(!name || !url) return alert("사이트명과 URL 주소를 모두 입력하세요."); 
    let finalUrl = url; if(!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl; 
    if (window.editingSiteId) { 
        await window.db.collection("sites").doc(window.editingSiteId).update({ group: group, name: name, url: finalUrl }); 
        window.editingSiteId = null; const btn = document.getElementById('site-submit-btn'); btn.innerText = "등록"; btn.style.background = "#607d8b"; 
    } else { await window.db.collection("sites").add({ group: group, name: name, url: finalUrl, createdAt: Date.now() }); } 
    document.getElementById('site-name').value = ''; document.getElementById('site-url').value = ''; 
};

window.deleteSite = async function(id) { 
    if(confirm('이 사이트 링크를 삭제하시겠습니까?')) await window.db.collection("sites").doc(id).delete(); 
};

window.addOtherCoGroup = async function() { 
    const name = document.getElementById('new-otherco-group').value.trim(); if(!name) return; 
    if(window.currentOtherCoGroups.find(function(g){ return g.name === name; })) return alert('이미 존재하는 그룹입니다.'); 
    await window.db.collection("otherCompanyGroups").add({ name: name, createdAt: Date.now() }); document.getElementById('new-otherco-group').value = ''; 
};

window.deleteOtherCoGroup = async function(id) { 
    if(confirm('이 그룹을 삭제하시겠습니까?')) await window.db.collection("otherCompanyGroups").doc(id).delete(); 
};

window.editOtherCo = function(id) { 
    const c = window.currentOtherCos.find(function(x){ return x.id === id; }); if(!c) return; 
    document.getElementById('otherco-group-select').value = c.group || ''; document.getElementById('otherco-name').value = c.name || ''; document.getElementById('otherco-phone').value = c.phone || ''; document.getElementById('otherco-note').value = c.note || ''; 
    window.editingOtherCoId = id; const btn = document.getElementById('otherco-submit-btn'); btn.innerText = "수정 저장"; btn.style.background = "#ff9f43"; 
};

window.addOtherCo = async function() { 
    const group = document.getElementById('otherco-group-select').value; const name = document.getElementById('otherco-name').value.trim(); const phone = document.getElementById('otherco-phone').value.trim(); const note = document.getElementById('otherco-note').value.trim(); 
    if(!name || !phone) return alert("업체명과 연락처/담당자를 입력하세요."); 
    if (window.editingOtherCoId) { 
        await window.db.collection("otherCompanies").doc(window.editingOtherCoId).update({ group: group, name: name, phone: phone, note: note }); 
        window.editingOtherCoId = null; const btn = document.getElementById('otherco-submit-btn'); btn.innerText = "등록"; btn.style.background = "#d35400"; 
    } else { await window.db.collection("otherCompanies").add({ group: group, name: name, phone: phone, note: note, createdAt: Date.now() }); } 
    document.getElementById('otherco-name').value = ''; document.getElementById('otherco-phone').value = ''; document.getElementById('otherco-note').value = ''; 
};

window.deleteOtherCo = async function(id) { 
    if(confirm('이 타업체를 삭제하시겠습니까?')) await window.db.collection("otherCompanies").doc(id).delete(); 
};

window.addEquip = async function() { 
    const name = document.getElementById('eq-name').value; const borrower = document.getElementById('eq-borrower').value; const due = document.getElementById('eq-due').value; 
    if(!name || !borrower) return alert("장비/공구명과 빌려간 사람을 입력하세요."); 
    await window.db.collection("equipments").add({ name: name, borrower: borrower, due: due, status: '대여중', borrowDate: window.getLocalDateString(), createdAt: Date.now() }); 
    document.getElementById('eq-name').value = ''; document.getElementById('eq-borrower').value = ''; 
};

window.returnEquip = async function(id) { await window.db.collection("equipments").doc(id).update({ status: '반납완료', returnDate: window.getLocalDateString() }); };
window.deleteEquip = async function(id) { if(confirm('이 장비 기록을 삭제하시겠습니까?')) await window.db.collection("equipments").doc(id).delete(); };

window.restoreTask = async function(id, prevStatus) { 
    await window.db.collection("tasks").doc(id).update({ status: prevStatus }); 
    alert("원래 상태로 복구되었습니다."); 
    if(document.getElementById('trash-modal').style.display === 'block') window.renderTrash(); 
};

window.permanentDelete = async function(id) { 
    if(confirm("영구 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.")) { 
        await window.db.collection("tasks").doc(id).delete(); 
        if(document.getElementById('trash-modal').style.display === 'block') window.renderTrash(); 
    } 
};

window.emptyTrash = async function() { 
    const trashItems = window.currentTasks.filter(function(t){ return t.status === 'deleted'; }); 
    if(trashItems.length === 0) return alert("휴지통이 비어있습니다."); 
    if(confirm(`휴지통에 있는 ${trashItems.length}개의 항목을 모두 영구 삭제하시겠습니까?`)) { 
        for(let i=0; i<trashItems.length; i++) { await window.db.collection("tasks").doc(trashItems[i].id).delete(); } 
        alert("휴지통이 비워졌습니다."); if(document.getElementById('trash-modal').style.display === 'block') window.renderTrash(); 
    } 
};

window.renderTrash = function() {
    const list = document.getElementById('trash-list');
    if (!list) return;

    const trashItems = window.currentTasks.filter(t => t.status === 'deleted');
    
    if (trashItems.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:0.9rem;">휴지통이 비어있습니다.</div>';
        return;
    }

    let html = '';
    trashItems.forEach(t => {
        let contentText = t.text || t.workDetails || '내용없음';
        if (t.prevStatus === 'worklog' && Array.isArray(t.bundledTasks) && t.bundledTasks.length > 0) {
            let locInfo = t.bundledTasks[0].location ? `[${t.bundledTasks[0].location}] ` : '';
            contentText = `[작업일보] ${locInfo}${t.bundledTasks[0].content || t.bundledTasks[0].detail || ''} 등 ${t.bundledTasks.length}건`;
        }
        
        const delDate = t.deletedAt || '알수없음';
        const sMap = { 'todo':'할일', 'inprogress':'진행중', 'done':'완료', 'mat-request':'발주요청', 'mat-ordered':'발주완료', 'mat-delivered':'반입완료', 'worklog':'작업일보' };
        const prevStatusName = sMap[t.prevStatus] || t.prevStatus || '알수없음';

        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; background:#fff; border-radius:4px; margin-bottom:4px; border-left:3px solid #6b778c;">
            <div style="flex:1; overflow:hidden; padding-right:10px;">
                <div style="font-size:0.75rem; color:#888; margin-bottom:3px;">
                    <span style="background:#eee; padding:2px 4px; border-radius:3px; color:#333;">${prevStatusName}</span> 
                    | 삭제일: ${delDate}
                </div>
                <div style="font-size:0.9rem; color:#333; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${contentText}
                </div>
            </div>
            <div style="display:flex; gap:5px; flex-shrink:0;">
                <button onclick="window.restoreTask('${t.id}', '${t.prevStatus}')" style="background:#e3fcef; color:#00875a; border:1px solid #00875a; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold;">복구</button>
                <button onclick="window.permanentDelete('${t.id}')" style="background:#ffebe6; color:#bf2600; border:1px solid #ff5630; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold;">영구삭제</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
};

window.toggleMainSection = function(wrapId, headerEl) {
    const wrap = document.getElementById(wrapId);
    const icon = headerEl.querySelector('.section-icon');
    if (wrap.style.display === 'none') {
        wrap.style.display = 'block';
        if(icon) icon.innerText = '▼';
    } else {
        wrap.style.display = 'none';
        if(icon) icon.innerText = '▶';
    }
};

window.toggleColumn = function(colPrefix) {
    const form = document.querySelector(`#col-${colPrefix} .add-card-form`);
    const list = document.querySelector(`#col-${colPrefix} #${colPrefix}-list`);
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'flex' : 'none';
    if(list) list.style.display = isHidden ? 'block' : 'none';
};

window.changeMonth = function(offset) {
    window.currentDate.setMonth(window.currentDate.getMonth() + offset);
    window.renderCalendar();
};

window.toggleOldTasks = function() {
    window.showOldDoneTasks = !window.showOldDoneTasks;
    const btn = document.getElementById('toggle-old-btn');
    if(btn) btn.innerText = window.showOldDoneTasks ? '🕒 과거 완료내역 숨기기' : '🕒 과거 완료내역 모두 보기';
    window.updateUI();
};

window.syncDueDate = function(prefix) {
    const start = document.getElementById(`${prefix}-start`).value;
    const dueEl = document.getElementById(`${prefix}-due`);
    if (start && (!dueEl.value || dueEl.value < start)) {
        dueEl.value = start;
    }
};

window.downloadExcel = function() {
    if(typeof XLSX === 'undefined') return alert('엑셀 라이브러리를 로드하지 못했습니다.');
    
    const wb = XLSX.utils.book_new();
    const sMap = { 'todo':'할일', 'inprogress':'진행중', 'done':'완료', 'mat-request':'자재_발주요청', 'mat-ordered':'자재_발주완료', 'mat-delivered':'자재_반입완료', 'worklog':'작업일보' }; 

    const taskCategories = ['worklog', 'todo', 'inprogress', 'done', 'mat-request', 'mat-ordered', 'mat-delivered'];

    taskCategories.forEach(statusKey => {
        const filteredTasks = window.currentTasks.filter(t => t.status === statusKey);
        if (filteredTasks.length > 0) {
            const sheetData = filteredTasks.map(t => {
                let contentText = t.text || t.workDetails || '';
                
                if (t.status === 'worklog' && Array.isArray(t.bundledTasks) && t.bundledTasks.length > 0) {
                    contentText = t.bundledTasks.map((bt, i) => {
                        let wNames = (Array.isArray(bt.workers) && bt.workers.length > 0) ? ` (투입: ${bt.workers.join(', ')})` : '';
                        let detailText = (bt.location !== undefined || bt.content !== undefined) ? `[${bt.location||'위치미상'}] ${bt.content||''}` : (bt.detail || '');
                        return `[작업 ${i+1}] ${detailText}${wNames}`;
                    }).join('\n');
                }

                return {
                    '상태': sMap[t.status] || t.status,
                    '내용': contentText || '내용없음',
                    '시작일/요청일': t.startDate || '',
                    '마감일/반입일': t.dueDate || '',
                    '담당자/요청자': t.assignee || t.requester || '',
                    '발주자/반입자': t.orderer || t.deliverer || '',
                    '등록일시': window.getFallbackDate(t.createdAt)
                };
            });
            const ws = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, sMap[statusKey]);
        }
    });

    if (window.currentWarehouseItems && window.currentWarehouseItems.length > 0) {
        const whData = window.currentWarehouseItems.map(w => ({
            '위치/창고': w.location || '',
            '품명': w.item || '',
            '규격': w.spec || '',
            '단위': w.unit || '',
            '수량': w.qty || 0,
            '비고': w.note || ''
        }));
        const wsWh = XLSX.utils.json_to_sheet(whData);
        XLSX.utils.book_append_sheet(wb, wsWh, "창고자재");
    }

    const expenseData = window.currentExpenses.map(e => ({
        '지출일자': e.date,
        '지출자': e.spender,
        '지출내용': e.desc,
        '지출금액': e.amount
    }));
    if(expenseData.length > 0) {
        const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(wb, wsExpenses, "지출내역");
    }

    if (window.currentContacts && window.currentContacts.length > 0) {
        const contactData = window.currentContacts.map(c => ({
            '그룹': c.group || '미지정',
            '이름/업체명': c.name || '',
            '연락처': c.phone || '',
            '비고': c.note || ''
        }));
        const wsContacts = XLSX.utils.json_to_sheet(contactData);
        XLSX.utils.book_append_sheet(wb, wsContacts, "비상연락망");
    }

    if (window.currentOtherCos && window.currentOtherCos.length > 0) {
        const otherCoData = window.currentOtherCos.map(o => ({
            '그룹': o.group || '미지정',
            '업체명': o.name || '',
            '연락처/담당자': o.phone || '',
            '비고': o.note || ''
        }));
        const wsOtherCos = XLSX.utils.json_to_sheet(otherCoData);
        XLSX.utils.book_append_sheet(wb, wsOtherCos, "타업체관리");
    }

    if (window.currentEquips && window.currentEquips.length > 0) {
        const equipData = window.currentEquips.map(eq => ({
            '상태': eq.status || '',
            '장비/공구명': eq.name || '',
            '대여자': eq.borrower || '',
            '대여일자': eq.borrowDate || '',
            '반납예정일': eq.due || '',
            '반납확인일': eq.returnDate || ''
        }));
        const wsEquips = XLSX.utils.json_to_sheet(equipData);
        XLSX.utils.book_append_sheet(wb, wsEquips, "장비대여");
    }

    XLSX.writeFile(wb, `현장관리보드_전체추출_${window.getLocalDateString()}.xlsx`);
};

window.backupData = function() {
    const fullData = {
        tasks: window.currentTasks,
        team: window.teamMembers,
        expenses: window.currentExpenses,
        notices: window.currentNotices,
        contacts: window.currentContacts,
        sites: window.currentSites,
        equipments: window.currentEquips,
        warehouse: window.currentWarehouseItems
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `현장데이터_백업_${window.getLocalDateString()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
};

window.restoreData = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(!confirm("⚠️ 경고: 현재 데이터 베이스에 복구 데이터를 덮어씌웁니다.\n진행하시겠습니까?")) return;
            
            alert("데이터를 복구 중입니다...");
            const collections = ['tasks', 'team', 'expenses', 'notices', 'contacts', 'sites', 'equipments', 'otherCompanies', 'warehouse'];
            const promises = [];
            collections.forEach(col => {
                if(data[col] && Array.isArray(data[col])) {
                    data[col].forEach(item => {
                        const id = item.id;
                        delete item.id;
                        if(id) promises.push(window.db.collection(col).doc(id).set(item));
                        else promises.push(window.db.collection(col).add(item));
                    });
                }
            });
            await Promise.all(promises);
            alert("데이터 복구가 완료되었습니다.");
            location.reload();
        } catch(err) {
            console.error(err);
            alert("복구 중 오류가 발생했습니다.");
        }
    };
    reader.readAsText(file);
};

window.executeInit = async function() {
    const text = document.getElementById('init-confirm-text').value.trim();
    if (text !== '초기화 승인') return alert("안전을 위해 정확히 '초기화 승인'이라고 입력해주세요.");
    
    if(confirm("정말로 모든 데이터를 삭제하시겠습니까?")) {
        alert("데이터 삭제 중...");
        const promises = window.currentTasks.map(t => window.db.collection('tasks').doc(t.id).delete());
        await Promise.all(promises);
        alert("초기화되었습니다.");
        document.getElementById('init-confirm-text').value = '';
        document.getElementById('init-modal').style.display = 'none';
    }
};

const createGroupRenderer = (collectionName, arrName, listId, selectIds) => {
    return function() {
        const list = document.getElementById(listId);
        const groups = window[arrName] || [];
        if(list) {
            list.innerHTML = groups.map(g => `
                <div style="display:flex; justify-content:space-between; padding:6px; border-bottom:1px solid #eee; font-size:0.85rem;">
                    <strong>${g.name}</strong>
                    <button onclick="window.deleteGroup('${collectionName}', '${g.id}')" style="background:none; border:none; color:#bf2600; cursor:pointer; font-weight:bold;">✕</button>
                </div>
            `).join('');
        }
        selectIds.forEach(selectId => {
            const sel = document.getElementById(selectId);
            if(sel) {
                const currentVal = sel.value;
                sel.innerHTML = '<option value="">📁 전체보기 / 미지정</option>' + groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
                sel.value = currentVal;
            }
        });
    }
};

window.deleteGroup = async function(col, id) {
    if(confirm("이 그룹을 삭제하시겠습니까? (하위 내용은 미지정으로 변경됩니다)")) {
        await window.db.collection(col).doc(id).delete();
    }
};

window.renderContactGroups = createGroupRenderer('contactGroups', 'currentContactGroups', 'contact-group-list', ['contact-group-select', 'contact-group-filter']);
window.renderSiteGroups = createGroupRenderer('siteGroups', 'currentSiteGroups', 'site-group-list', ['site-group-select', 'site-group-filter']);
window.renderOtherCoGroups = createGroupRenderer('otherCompanyGroups', 'currentOtherCoGroups', 'otherco-group-list', ['otherco-group-select', 'otherco-group-filter']);
window.renderWarehouseGroups = createGroupRenderer('warehouseGroups', 'currentWarehouseGroups', 'warehouse-group-list', ['wh-location-select', 'wh-group-filter']);

window.addContactGroup = async function() {
    const name = document.getElementById('new-contact-group').value.trim();
    if(name) { await window.db.collection('contactGroups').add({name: name, createdAt: Date.now()}); document.getElementById('new-contact-group').value=''; }
};
window.addSiteGroup = async function() {
    const name = document.getElementById('new-site-group').value.trim();
    if(name) { await window.db.collection('siteGroups').add({name: name, createdAt: Date.now()}); document.getElementById('new-site-group').value=''; }
};
window.addOtherCoGroup = async function() { 
    const name = document.getElementById('new-otherco-group').value.trim(); 
    if(name) { await window.db.collection("otherCompanyGroups").add({ name: name, createdAt: Date.now() }); document.getElementById('new-otherco-group').value = ''; }
};
window.addWarehouseGroup = async function() {
    const name = document.getElementById('new-warehouse-group').value.trim();
    if(name) { await window.db.collection('warehouseGroups').add({name: name, createdAt: Date.now()}); document.getElementById('new-warehouse-group').value=''; }
};

const renderSimpleList = (arrName, filterId, listId, htmlMapper) => {
    return function() {
        const list = document.getElementById(listId);
        const filterVal = document.getElementById(filterId) ? document.getElementById(filterId).value : '';
        if(!list) return;
        const arr = window[arrName] || [];
        const filtered = filterVal ? arr.filter(x => (x.group || '') === filterVal) : arr;
        
        if(filtered.length === 0) list.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-size:0.85rem;">항목이 없습니다.</div>';
        else list.innerHTML = filtered.map(htmlMapper).join('');
    }
};

window.renderContacts = renderSimpleList('currentContacts', 'contact-group-filter', 'contact-list', c => `
    <div style="border:1px solid #ddd; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
        <div>
            <div style="font-size:0.75rem; color:#009688; font-weight:bold;">${c.group || '미지정'}</div>
            <div style="font-size:0.9rem; font-weight:bold;">${c.name}</div>
            <div style="font-size:0.8rem; color:#555; margin:3px 0;">
                <a href="tel:${c.phone}" style="color:#0052cc; text-decoration:none; font-weight:bold;">📞 ${c.phone}</a>
            </div>
            <div style="font-size:0.75rem; color:#888;">${c.note || ''}</div>
        </div>
        <div>
            <button onclick="window.deleteContact('${c.id}')" style="background:#ffebe6; color:#bf2600; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">삭제</button>
        </div>
    </div>
`);

window.renderSites = renderSimpleList('currentSites', 'site-group-filter', 'site-list', s => `
    <div style="border:1px solid #ddd; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
        <div style="overflow:hidden;">
            <div style="font-size:0.75rem; color:#607d8b; font-weight:bold;">${s.group || '미지정'}</div>
            <div style="font-size:0.9rem; font-weight:bold;">${s.name}</div>
            <div style="font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><a href="${s.url}" target="_blank" style="color:#0052cc;">${s.url}</a></div>
        </div>
        <div>
            <button onclick="window.editSite('${s.id}')" style="background:#e6effc; color:#0052cc; border:none; padding:4px; border-radius:4px; cursor:pointer; font-size:0.75rem; margin-right:3px;">수정</button>
            <button onclick="window.deleteSite('${s.id}')" style="background:#ffebe6; color:#bf2600; border:none; padding:4px; border-radius:4px; cursor:pointer; font-size:0.75rem;">삭제</button>
        </div>
    </div>
`);

window.renderOtherCos = renderSimpleList('currentOtherCos', 'otherco-group-filter', 'otherco-list', o => `
    <div style="border:1px solid #ddd; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
        <div>
            <div style="font-size:0.75rem; color:#d35400; font-weight:bold;">${o.group || '미지정'}</div>
            <div style="font-size:0.9rem; font-weight:bold;">${o.name}</div>
            <div style="font-size:0.8rem; color:#555; margin:3px 0;">
                <a href="tel:${o.phone}" style="color:#0052cc; text-decoration:none; font-weight:bold;">📞 ${o.phone}</a>
            </div>
            <div style="font-size:0.75rem; color:#888;">${o.note || ''}</div>
        </div>
        <div>
            <button onclick="window.editOtherCo('${o.id}')" style="background:#e6effc; color:#0052cc; border:none; padding:4px; border-radius:4px; cursor:pointer; font-size:0.75rem; margin-right:3px;">수정</button>
            <button onclick="window.deleteOtherCo('${o.id}')" style="background:#ffebe6; color:#bf2600; border:none; padding:4px; border-radius:4px; cursor:pointer; font-size:0.75rem;">삭제</button>
        </div>
    </div>
`);

window.renderEquips = renderSimpleList('currentEquips', null, 'equip-list', e => `
    <div style="border:1px solid #ddd; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
        <div>
            <div style="font-size:0.9rem; font-weight:bold; color:${e.status === '대여중' ? 'var(--warning-color)' : '#00875a'}">[${e.status}] ${e.name}</div>
            <div style="font-size:0.8rem; color:#333;">대여: ${e.borrower}</div>
            <div style="font-size:0.75rem; color:#888;">반납예정: ${e.due || '미정'} | 대여일: ${e.borrowDate}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
            ${e.status === '대여중' ? `<button onclick="window.returnEquip('${e.id}')" style="background:#e3fcef; color:#00875a; border:1px solid #00875a; border-radius:3px; padding:3px; font-size:0.75rem; cursor:pointer; font-weight:bold;">반납확인</button>` : ''}
            <button onclick="window.deleteEquip('${e.id}')" style="background:none; color:#bf2600; border:none; padding:3px; font-size:0.75rem; cursor:pointer; text-decoration:underline;">기록삭제</button>
        </div>
    </div>
`);

window.initFirebaseListeners = function() {
    try {
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

        window.db.collection("team").onSnapshot(function(s) { 
            window.teamMembers = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }); 
            window.teamMembers.sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); }); 
            const loginSelect = document.getElementById('login-user-select'); 
            if(loginSelect) { loginSelect.innerHTML = '<option value="">이름 선택 (팀원이 없다면 직접 등록하세요)</option>' + window.teamMembers.map(function(m){ return `<option value="${m.name}">${m.name}</option>`; }).join(''); } 
            
            // ★ 변경: 퇴사자(유령 계정) 확인 및 강제 로그아웃 방어 로직
            if(window.loggedInUser) {
                const isUserValid = window.teamMembers.find(function(m){ return m.name === window.loggedInUser; });
                if(isUserValid) { 
                    const overlay = document.getElementById('login-overlay');
                    if (overlay.style.display !== 'none') {
                        overlay.style.display = 'none'; 
                        document.getElementById('header-user-name').innerText = window.loggedInUser + ' 님'; 
                        if (!window.hasShownBriefing) {
                            window.showDailyBriefing();
                            window.hasShownBriefing = true;
                        }
                    }
                } else {
                    // 팀원 명단에서 삭제된 경우 접속 차단
                    alert("⚠️ 관리자에 의해 팀원 목록에서 삭제되었습니다.\n다시 로그인해주세요.");
                    window.logoutUser();
                }
            } 
            window.renderTeam(); window.updateUI(); 
            if(document.getElementById('briefing-modal').style.display === 'block') window.showDailyBriefing();
        });

        window.db.collection("tasks").where("createdAt", ">=", oneYearAgo).onSnapshot(function(s) { 
            window.currentTasks = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }); 
            window.currentTasks.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); }); 
            window.updateUI(); 
            if(document.getElementById('trash-modal').style.display === 'block') window.renderTrash(); 
            if(document.getElementById('briefing-modal').style.display === 'block') window.showDailyBriefing();
        });

        window.db.collection("expenses").where("createdAt", ">=", oneYearAgo).onSnapshot(function(s) { 
            window.currentExpenses = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }); 
            window.currentExpenses.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); }); 
            if(document.getElementById('expense-modal').style.display === 'block') window.renderExpenses(); 
        });

        window.db.collection("expense_limits").onSnapshot(function(s) {
            s.docs.forEach(function(d) {
                window.expenseLimits[d.id] = d.data().limit || 0;
            });
            if (document.getElementById('expense-modal').style.display === 'block') window.renderExpenses();
        });

        window.db.collection("notices").onSnapshot(function(s) {
            window.currentNotices = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentNotices.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
            if(document.getElementById('notice-modal').style.display === 'block') window.renderNotices();
        });

        window.db.collection("equipments").onSnapshot(function(s) {
            window.currentEquips = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentEquips.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
            if(document.getElementById('equip-modal').style.display === 'block') window.renderEquips();
            window.updateUI();
        });

        window.db.collection("contacts").onSnapshot(function(s) {
            window.currentContacts = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentContacts.sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); });
            if(document.getElementById('contact-modal').style.display === 'block') window.renderContacts();
            window.renderSidePanels();
        });

        window.db.collection("sites").onSnapshot(function(s) {
            window.currentSites = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentSites.sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); });
            if(document.getElementById('site-modal').style.display === 'block') window.renderSites();
            window.renderSidePanels();
        });

        window.db.collection("otherCompanies").onSnapshot(function(s) {
            window.currentOtherCos = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentOtherCos.sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); });
            if(document.getElementById('otherco-modal').style.display === 'block') window.renderOtherCos();
            window.renderSidePanels();
        });

        window.db.collection("warehouse").onSnapshot(function(s) {
            window.currentWarehouseItems = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.currentWarehouseItems.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
            if(document.getElementById('warehouse-modal').style.display === 'block') window.renderWarehouse();
        });

        window.db.collection("contactGroups").onSnapshot(function(s) {
            window.currentContactGroups = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.renderContactGroups();
        });
        window.db.collection("siteGroups").onSnapshot(function(s) {
            window.currentSiteGroups = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.renderSiteGroups();
        });
        window.db.collection("otherCompanyGroups").onSnapshot(function(s) {
            window.currentOtherCoGroups = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.renderOtherCoGroups();
        });
        window.db.collection("warehouseGroups").onSnapshot(function(s) {
            window.currentWarehouseGroups = s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
            window.renderWarehouseGroups();
        });

        window.db.collection("settings").doc("expense").onSnapshot(function(doc) {
            if(doc.exists) {
                window.expenseCutoffDate = doc.data().cutoffDate || 25;
                window.expenseDefaultLimit = doc.data().defaultLimit || 0;
                if(document.getElementById('expense-modal').style.display === 'block') window.renderExpenses();
            }
        });

    } catch (e) {
        console.error("Firebase Listener Init Error:", e);
    }
};

window.onload = function() {
    window.resetDates();
    window.fetchWeather();
    
    window.updateClock();
    setInterval(window.updateClock, 1000);
    
    for(let i = 0; i < 3; i++) {
        window.addWorklogEntry();
    }

    const isMobile = window.innerWidth <= 767;
    const sections = ['worklog-wrap', 'schedule-wrap', 'material-wrap'];
    
    sections.forEach(id => {
        const wrap = document.getElementById(id);
        if (wrap) {
            const header = wrap.previousElementSibling;
            const icon = header ? header.querySelector('.section-icon') : null;
            if (isMobile) {
                wrap.style.display = 'none';
                if (icon) icon.innerText = '▶';
            } else {
                wrap.style.display = 'block';
                if (icon) icon.innerText = '▼';
            }
        }
    });

    if (window.db) {
        window.initFirebaseListeners();
    } else {
        console.warn("데이터베이스 연결에 실패했습니다. Firebase 설정을 확인해주세요.");
    }
};
