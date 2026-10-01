import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCqiyZq7ML-X0VmWjuk1S4IXWzBVe2-BVs",
    authDomain: "sagird-yoxlama-sistemi.firebaseapp.com",
    databaseURL: "https://sagird-yoxlama-sistemi-default-rtdb.firebaseio.com",
    projectId: "sagird-yoxlama-sistemi",
    storageBucket: "sagird-yoxlama-sistemi.firebasestorage.app",
    messagingSenderId: "954607993567",
    appId: "1:954607993567:web:8943cacde746ba7f8d1f6a",
    measurementId: "G-MXZ41N92YF"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentTeacherFin = "";
let currentTeacherName = "";
let currentTeacherSubjN = null;

let studentsKeys = [];
let currentIndex = 0;
let studentsData = {};
let teacherEvaluations = {};

let selectedAdminTeacherFin = null;

const zoomState = {
    'criteria-img': { scale: 1, posX: 0, posY: 0 },
    'work-img': { scale: 1, posX: 0, posY: 0 }
};

// Massivi təsadüfi qarışdırmaq funksiyası (Randomize)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Tab Keçidləri
document.getElementById('tab-work-btn').addEventListener('click', function() { switchTab('work-tab', this); });
document.getElementById('tab-criteria-btn').addEventListener('click', function() { switchTab('criteria-tab', this); });

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Simvol Sayğacı
document.getElementById('feedback-input').addEventListener('input', function() {
    document.getElementById('char-count').innerText = `${this.value.length} / 1000`;
});

// Giriş Logikası (Admin və Müəllim)
document.getElementById('btn-login').addEventListener('click', async function() {
    const username = document.getElementById('teacher-username').value.trim().toUpperCase();
    const password = document.getElementById('teacher-password').value.trim().toUpperCase();

    if (!username || !password) {
        alert("Lütfən məlumatları daxil edin!");
        return;
    }

    // Admin Girişi
    if (username === "ADMIN" && password === "ADMIN123") {
        document.getElementById('user-display').innerText = "Admin Paneli";
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('admin-box').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'inline-block';
        loadAdminDashboard();
        return;
    }

    if (username !== password) {
        alert("İstifadəçi adı və şifrə eyni olmalıdır (FİN)!");
        return;
    }

    try {
        const teacherRef = ref(db, `teachers/${username}`);
        const snapshot = await get(teacherRef);

        if (snapshot.exists()) {
            const teacherData = snapshot.val();
            currentTeacherFin = username;
            currentTeacherName = teacherData.name;
            currentTeacherSubjN = Number(teacherData.subject_id);

            document.getElementById('user-display').innerText = `Müəllim: ${currentTeacherName} (${currentTeacherFin})`;
            document.getElementById('login-box').style.display = 'none';
            document.getElementById('app-box').style.display = 'flex';
            document.getElementById('btn-logout').style.display = 'inline-block';
            
            loadStudentsData();
        } else {
            alert("Bu FİN koda uyğun müəllim tapılmadı!");
        }
    } catch (err) {
        alert("Giriş xətası: " + err.message);
    }
});

// Çıxış Düyməsi
document.getElementById('btn-logout').addEventListener('click', function() {
    if (confirm("Sistemdən çıxmaq istədiyinizdən əminsiniz?")) {
        location.reload();
    }
});

// Şagird Məlumatlarını Yükləmək
async function loadStudentsData() {
    try {
        const studentsRef = ref(db, 'students');
        const snapshot = await get(studentsRef);

        const evalRef = ref(db, `evaluations_by_teacher/${currentTeacherFin}`);
        const evalSnapshot = await get(evalRef);

        if (evalSnapshot.exists()) {
            teacherEvaluations = evalSnapshot.val();
        }

        if (snapshot.exists()) {
            const allStudents = snapshot.val();
            
            // Yalnız müəllimin fənninə uyğun şagirdlər filtrlənir
            let filteredKeys = Object.keys(allStudents).filter(key => {
                return Number(allStudents[key].SubjN) === Number(currentTeacherSubjN);
            });

            // Random növbə ilə veririk
            studentsKeys = shuffleArray(filteredKeys).slice(0, 30); // Yalnız 30 tapşırıq
            studentsData = allStudents;

            if (studentsKeys.length > 0) {
                showStudent(currentIndex);
                
                if (Object.keys(teacherEvaluations).length >= 30) {
                    generateComparisonReport();
                }
            } else {
                alert("Sizin fənninizə uyğun heç bir tapşırıq tapılmadı!");
            }
        } else {
            alert("Bazada şagird məlumatı tapılmadı!");
        }
    } catch (err) {
        alert("Baza ilə əlaqə xətası: " + err.message);
    }
}

// Şagirdin İşini Göstərmək (Maksimum 30 iş çərçivəsində)
function showStudent(index) {
    if (index < 0 || index >= 30 || index >= studentsKeys.length) return;

    currentIndex = index;
    const key = studentsKeys[currentIndex];
    const student = studentsData[key];
    const teacherEval = teacherEvaluations[key];

    document.getElementById('student-name').innerText = `Şagird: ${student.Pupilcode || key} (Sual №${student.Sual}) [${currentIndex + 1}/30]`;
    
    document.getElementById('criteria-img').src = `assets/criteria_${student.Sual}.jpg`;
    document.getElementById('work-img').src = `assets/works/${student.Pupilcode}.jpg`;
    
    resetZoom('criteria-img');
    resetZoom('work-img');

    if (teacherEval && teacherEval.score !== undefined) {
        document.getElementById('score-select').value = teacherEval.score;
        document.getElementById('feedback-input').value = teacherEval.feedback || '';
        document.getElementById('char-count').innerText = `${(teacherEval.feedback || '').length} / 1000`;
        
        const statusTag = document.getElementById('status-tag');
        statusTag.innerText = "Yoxlanılıb";
        statusTag.classList.add('checked');
    } else {
        document.getElementById('score-select').value = '';
        document.getElementById('feedback-input').value = '';
        document.getElementById('char-count').innerText = "0 / 1000";
        
        const statusTag = document.getElementById('status-tag');
        statusTag.innerText = "Yoxlanılmayıb";
        statusTag.classList.remove('checked');
    }
}

// Naviqasiya (Maksimum 30 iş çərçivəsində)
document.getElementById('btn-prev').addEventListener('click', function() {
    if (currentIndex > 0) {
        showStudent(currentIndex - 1);
    } else {
        alert("İlk tapşırıqdasınız!");
    }
});

document.getElementById('btn-next').addEventListener('click', function() {
    if (currentIndex < 29 && currentIndex < studentsKeys.length - 1) {
        showStudent(currentIndex + 1);
    } else {
        alert("30 tapşırıqlıq limitdəsiniz!");
    }
});

// Yadda Saxla və Növbəti
document.getElementById('btn-save').addEventListener('click', async function() {
    const score = document.getElementById('score-select').value;
    const feedback = document.getElementById('feedback-input').value;

    if (score === "") {
        alert("Lütfən bal seçin!");
        return;
    }

    const currentKey = studentsKeys[currentIndex];

    try {
        await set(ref(db, `evaluations_by_teacher/${currentTeacherFin}/${currentKey}`), {
            teacher_name: currentTeacherName,
            score: Number(score),
            feedback: feedback,
            timestamp: Date.now()
        });

        await set(ref(db, `evaluations_by_student/${currentKey}/${currentTeacherFin}`), {
            teacher_name: currentTeacherName,
            score: Number(score),
            feedback: feedback,
            timestamp: Date.now()
        });

        teacherEvaluations[currentKey] = { score: Number(score), feedback: feedback };

        if (Object.keys(teacherEvaluations).length >= 30) {
            generateComparisonReport();
            return;
        }

        if (currentIndex < 29 && currentIndex < studentsKeys.length - 1) {
            currentIndex++;
            showStudent(currentIndex);
        }
    } catch (err) {
        alert("Xal bazaya yazılarkən xəta baş verdi: " + err.message);
    }
});

function disableEvaluationPanel() {
    document.getElementById('score-select').disabled = true;
    document.getElementById('feedback-input').disabled = true;
    document.getElementById('btn-save').disabled = true;
    document.getElementById('btn-prev').disabled = true;
    document.getElementById('btn-next').disabled = true;
    
    const saveBtn = document.getElementById('btn-save');
    saveBtn.innerText = "Yoxlama Yekunlaşdı (Kilitləndi)";
    saveBtn.style.backgroundColor = "#7f8c8d";
}

function generateComparisonReport() {
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = "";
    
    let matchCount = 0;
    let totalCount = 0;

    studentsKeys.slice(0, 30).forEach((key, index) => {
        const student = studentsData[key];
        const teacherEval = teacherEvaluations[key];

        const etalonScore = student.Result !== undefined ? Number(student.Result) : "-";
        const expertScore = teacherEval ? Number(teacherEval.score) : "-";

        const isMatch = etalonScore === expertScore;
        if (isMatch) matchCount++;
        totalCount++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.Pupilcode || key}</td>
            <td>${student.Sual || '-'}</td>
            <td>${etalonScore}</td>
            <td>${expertScore}</td>
            <td class="${isMatch ? 'match-true' : 'match-false'}">${isMatch ? 'Düzgün' : 'Fərqli'}</td>
        `;
        reportBody.appendChild(row);
    });

    const rate = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;
    document.getElementById('accuracy-rate').innerText = `Uyğunluq Faizi: ${rate}% (${matchCount}/${totalCount} dəqiq üst-üstə düşmə)`;
    document.getElementById('report-modal').style.display = 'flex';

    disableEvaluationPanel();
}

document.getElementById('btn-close-modal').addEventListener('click', function() {
    document.getElementById('report-modal').style.display = 'none';
});

// --- ADMIN PANELİ LOGİKASI ---
async function loadAdminDashboard() {
    try {
        const teachersRef = ref(db, 'teachers');
        const snapshot = await get(teachersRef);

        const listEl = document.getElementById('teachers-list');
        listEl.innerHTML = "";

        if (snapshot.exists()) {
            const teachers = snapshot.val();
            Object.keys(teachers).forEach(fin => {
                const li = document.createElement('li');
                li.innerText = `${teachers[fin].name} (${fin})`;
                li.addEventListener('click', () => selectTeacherForAdmin(fin, teachers[fin]));
                listEl.appendChild(li);
            });
        }
    } catch (err) {
        alert("Admin panel yüklənərkən xəta: " + err.message);
    }
}

async function selectTeacherForAdmin(fin, teacherObj) {
    selectedAdminTeacherFin = fin;
    document.getElementById('expert-header').querySelector('h3').innerText = `Ekspert: ${teacherObj.name} (${fin})`;
    document.getElementById('btn-reset-evals').style.display = 'inline-block';

    try {
        const evalRef = ref(db, `evaluations_by_teacher/${fin}`);
        const evalSnapshot = await get(evalRef);

        const studentsRef = ref(db, 'students');
        const studentsSnapshot = await get(studentsRef);

        const tbody = document.getElementById('admin-eval-body');
        tbody.innerHTML = "";

        if (evalSnapshot.exists() && studentsSnapshot.exists()) {
            const evals = evalSnapshot.val();
            const allStudents = studentsSnapshot.val();

            let matchCount = 0;
            let totalCount = 0;

            Object.keys(evals).forEach((studentKey, idx) => {
                const student = allStudents[studentKey] || {};
                const etalonScore = student.Result !== undefined ? Number(student.Result) : "-";
                const expertScore = Number(evals[studentKey].score);

                const isMatch = etalonScore === expertScore;
                if (isMatch) matchCount++;
                totalCount++;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${idx + 1}</td>
                    <td>${student.Pupilcode || studentKey}</td>
                    <td>${student.Sual || '-'}</td>
                    <td>${etalonScore}</td>
                    <td>${expertScore}</td>
                    <td style="text-align:left; max-width:200px;">${evals[studentKey].feedback || '-'}</td>
                    <td class="${isMatch ? 'match-true' : 'match-false'}">${isMatch ? 'Düzgün' : 'Fərqli'}</td>
                `;
                tbody.appendChild(row);
            });

            const rate = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;
            document.getElementById('expert-stats').innerHTML = `
                <div class="stat-card"><b>Yoxlanılan İş:</b> ${totalCount} / 30</div>
                <div class="stat-card"><b>Uyğunluq Faizi:</b> ${rate}%</div>
            `;
        } else {
            document.getElementById('expert-stats').innerHTML = `<div class="stat-card">Bu ekspert hələ heç bir iş yoxlamayıb.</div>`;
        }
    } catch (err) {
        alert("Məlumat oxunarkən xəta: " + err.message);
    }
}

// Nəticələri Sıfırla (Yenidən Yoxlanış Üçün)
document.getElementById('btn-reset-evals').addEventListener('click', async function() {
    if (!selectedAdminTeacherFin) return;

    if (confirm("Bu ekspertin bütün yoxlama nəticələrini sıfırlamaq istədiyinizdən əminsiniz?")) {
        try {
            await remove(ref(db, `evaluations_by_teacher/${selectedAdminTeacherFin}`));
            alert("Nəticələr sıfırlandı. Ekspert yenidən yoxlama apara bilər.");
            location.reload();
        } catch (err) {
            alert("Sıfırlama xətası: " + err.message);
        }
    }
});

// Zoom / Pan Logikası
function resetZoom(imgId) {
    const img = document.getElementById(imgId);
    if (!img) return;
    zoomState[imgId] = { scale: 1, posX: 0, posY: 0 };
    img.style.transform = `translate(0px, 0px) scale(1)`;
}

function initZoomPan(containerId, imgId) {
    const container = document.getElementById(containerId);
    const img = document.getElementById(imgId);
    if (!container || !img) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function applyTransform() {
        const state = zoomState[imgId];
        img.style.transform = `translate(${state.posX}px, ${state.posY}px) scale(${state.scale})`;
    }

    container.addEventListener('wheel', function(e) {
        e.preventDefault();
        const state = zoomState[imgId];
        if (e.deltaY < 0) state.scale += 0.15;
        else state.scale -= 0.15;

        state.scale = Math.min(Math.max(0.8, state.scale), 6);
        applyTransform();
    }, { passive: false });

    container.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isDragging = true;
        const state = zoomState[imgId];
        startX = e.clientX - state.posX;
        startY = e.clientY - state.posY;
    });

    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const state = zoomState[imgId];
        state.posX = e.clientX - startX;
        state.posY = e.clientY - startY;
        applyTransform();
    });

    window.addEventListener('mouseup', function() {
        isDragging = false;
    });
}

initZoomPan('box-criteria', 'criteria-img');
initZoomPan('box-work', 'work-img');