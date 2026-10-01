import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let currentTeacherSubjN = null; // Fənn kodu (məsələn: 9 - Coğrafiya)

let studentsKeys = [];
let currentIndex = 0;
let studentsData = {};
let teacherEvaluations = {};

const zoomState = {
    'criteria-img': { scale: 1, posX: 0, posY: 0 },
    'work-img': { scale: 1, posX: 0, posY: 0 }
};

// Tab Keçid Eventləri
document.getElementById('tab-work-btn').addEventListener('click', function() {
    switchTab('work-tab', this);
});
document.getElementById('tab-criteria-btn').addEventListener('click', function() {
    switchTab('criteria-tab', this);
});

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

// Giriş Yoxlanışı
document.getElementById('btn-login').addEventListener('click', async function() {
    const username = document.getElementById('teacher-username').value.trim().toUpperCase();
    const password = document.getElementById('teacher-password').value.trim().toUpperCase();

    if (!username || !password) {
        alert("Lütfən istifadəçi adı və şifrəni daxil edin!");
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
            currentTeacherSubjN = Number(teacherData.subject_id); // Müəllimin fənn ID-si

            document.getElementById('user-display').innerText = `Müəllim: ${currentTeacherName} (${currentTeacherFin})`;
            document.getElementById('login-box').style.display = 'none';
            document.getElementById('app-box').style.display = 'flex';
            
            loadStudentsData();
        } else {
            alert("Bu FİN koda uyğun müəllim tapılmadı!");
        }
    } catch (err) {
        alert("Giriş xətası: " + err.message);
    }
});

// Şagird Məlumatlarını Fənn Kodu ilə Oxumaq
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
            
            // Müəllimin fənn koduna (SubjN) uyğun şagirdləri filtrləyirik
            studentsKeys = Object.keys(allStudents).filter(key => {
                return Number(allStudents[key].SubjN) === Number(currentTeacherSubjN);
            });

            studentsData = allStudents;

            if (studentsKeys.length > 0) {
                showStudent(currentIndex);
            } else {
                alert("Sizin fənninizə uygun heç bir tapşırıq tapılmadı!");
            }
        } else {
            alert("Bazada şagird məlumatı tapılmadı!");
        }
    } catch (err) {
        alert("Baza ilə əlaqə xətası: " + err.message);
    }
}

// Cari Şagirdin İşini Göstərmək
function showStudent(index) {
    if (index < 0 || index >= studentsKeys.length) return;

    currentIndex = index;
    const key = studentsKeys[currentIndex];
    const student = studentsData[key];
    const teacherEval = teacherEvaluations[key];

    document.getElementById('student-name').innerText = `Şagird: ${student.Pupilcode || key} (Sual №${student.Sual}) [${currentIndex + 1}/${studentsKeys.length}]`;
    
    // Şəkil linkləri
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

// İrəli / Geri Düymələri
document.getElementById('btn-prev').addEventListener('click', function() {
    if (currentIndex > 0) {
        showStudent(currentIndex - 1);
    } else {
        alert("İlk şagirdin işindəsiniz!");
    }
});

document.getElementById('btn-next').addEventListener('click', function() {
    if (currentIndex < studentsKeys.length - 1) {
        showStudent(currentIndex + 1);
    } else {
        alert("Sonuncu şagirdin işindəsiniz!");
    }
});

// Yadda Saxla və Növbətiyə Keç (Alertsiz)
document.getElementById('btn-save').addEventListener('click', async function() {
    const score = document.getElementById('score-select').value;
    const feedback = document.getElementById('feedback-input').value;

    if (score === "") {
        alert("Lütfən bal seçin!");
        return;
    }

    const currentKey = studentsKeys[currentIndex];

    try {
        // Məlumatı bazaya saxlayırıq
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

        teacherEvaluations[currentKey] = {
            score: Number(score),
            feedback: feedback
        };

        // Növbətiyə keçid
        if (currentIndex < studentsKeys.length - 1) {
            currentIndex++;
            showStudent(currentIndex);

            // Əgər tam 30 iş tamamlanıbsa hesabatı çıxarırıq
            if (Object.keys(teacherEvaluations).length === 30) {
                generateComparisonReport();
            }
        } else {
            generateComparisonReport();
        }
    } catch (err) {
        alert("Xal bazaya yazılarkən xəta baş verdi: " + err.message);
    }
});

// Etalon və Ekspert Qiymətlərini Müqayisə Edən Hesabat
function generateComparisonReport() {
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = "";
    
    let matchCount = 0;
    let totalCount = 0;

    studentsKeys.forEach((key, index) => {
        if (index >= 30) return; // Yalnız ilk 30 iş

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
}

document.getElementById('btn-close-modal').addEventListener('click', function() {
    document.getElementById('report-modal').style.display = 'none';
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
