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

let currentTeacherId = "";
let studentsKeys = [];
let currentIndex = 0;
let studentsData = {};
let teacherEvaluations = {};

const zoomState = {
    'criteria-img': { scale: 1, posX: 0, posY: 0 },
    'work-img': { scale: 1, posX: 0, posY: 0 }
};

// Giriş Düyməsi
document.getElementById('btn-login').addEventListener('click', function() {
    const teacherId = document.getElementById('teacher-id').value.trim();
    const pass = document.getElementById('passcode').value.trim();

    if (!teacherId) {
        alert("Lütfən Müəllim ID-sini daxil edin!");
        return;
    }

    if (pass === "dim2026") {
        currentTeacherId = teacherId;
        document.getElementById('user-display').innerText = `Müəllim: ${currentTeacherId}`;
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('app-box').style.display = 'flex';
        loadStudentsData();
    } else {
        alert("Daxil edilən şifrə yanlışdır!");
    }
});

// Məlumatları Yükləmək
async function loadStudentsData() {
    try {
        // Şagird işlərini oxuyuruq
        const studentsRef = ref(db, 'students');
        const snapshot = await get(studentsRef);

        // Cari müəllimin qiymətlərini oxuyuruq
        const evalRef = ref(db, `evaluations_by_teacher/${currentTeacherId}`);
        const evalSnapshot = await get(evalRef);

        if (evalSnapshot.exists()) {
            teacherEvaluations = evalSnapshot.val();
        }

        if (snapshot.exists()) {
            studentsData = snapshot.val();
            studentsKeys = Object.keys(studentsData);
            showStudent(currentIndex);
        } else {
            alert("Bazada heç bir şagird məlumatı tapılmadı!");
        }
    } catch (err) {
        console.error(err);
        alert("Baza ilə əlaqə xətası yarandı: " + err.message);
    }
}

// Şagird Məlumatlarını Göstərmək
function showStudent(index) {
    if (index >= studentsKeys.length) {
        alert("Təbrik edirik! Bütün şagirdlərin işləri yoxlanıldı.");
        return;
    }

    const key = studentsKeys[index];
    const student = studentsData[key];
    const teacherEval = teacherEvaluations[key];

    document.getElementById('student-name').innerText = `Şagird: ${student.name} (${index + 1}/${studentsKeys.length})`;
    
    document.getElementById('criteria-img').src = student.criteria_url;
    document.getElementById('work-img').src = student.work_url;
    
    resetZoom('criteria-img');
    resetZoom('work-img');

    // Əgər həmin müəllim bu şagirdə əvvəl qiymət yazıbsa ekrana çıxarır
    if (teacherEval && teacherEval.score !== undefined) {
        document.getElementById('score-select').value = teacherEval.score;
        document.getElementById('feedback-input').value = teacherEval.feedback || '';
        
        const statusTag = document.getElementById('status-tag');
        statusTag.innerText = "Yoxlanılıb";
        statusTag.classList.add('checked');
    } else {
        document.getElementById('score-select').value = '';
        document.getElementById('feedback-input').value = '';
        
        const statusTag = document.getElementById('status-tag');
        statusTag.innerText = "Yoxlanılmayıb";
        statusTag.classList.remove('checked');
    }
}

// Yadda Saxla düyməsi
document.getElementById('btn-save').addEventListener('click', async function() {
    const score = document.getElementById('score-select').value;
    const feedback = document.getElementById('feedback-input').value;

    if (score === "") {
        alert("Lütfən xal seçin!");
        return;
    }

    const currentKey = studentsKeys[currentIndex];

    try {
        // Məlumatı iki yerə paralel yazırıq:
        // 1. Müəllimlər üzrə: evaluations_by_teacher/MUELLIM_1/SHAGIRD_101
        await set(ref(db, `evaluations_by_teacher/${currentTeacherId}/${currentKey}`), {
            score: Number(score),
            feedback: feedback,
            timestamp: Date.now()
        });

        // 2. Şagirdlər üzrə: evaluations_by_student/SHAGIRD_101/MUELLIM_1
        await set(ref(db, `evaluations_by_student/${currentKey}/${currentTeacherId}`), {
            score: Number(score),
            feedback: feedback,
            timestamp: Date.now()
        });

        // Yerli yaddaşı yeniləyirik
        teacherEvaluations[currentKey] = {
            score: Number(score),
            feedback: feedback
        };

        currentIndex++;
        showStudent(currentIndex);
    } catch (err) {
        alert("Xal bazaya yazılarkən xəta baş verdi: " + err.message);
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
        
        if (e.deltaY < 0) {
            state.scale += 0.15;
        } else {
            state.scale -= 0.15;
        }

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