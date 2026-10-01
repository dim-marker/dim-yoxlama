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
let studentsKeys = [];
let currentIndex = 0;
let studentsData = {};
let teacherEvaluations = {};

const zoomState = {
    'criteria-img': { scale: 1, posX: 0, posY: 0 },
    'work-img': { scale: 1, posX: 0, posY: 0 }
};

// Simvol Sayğacı
document.getElementById('feedback-input').addEventListener('input', function() {
    document.getElementById('char-count').innerText = `${this.value.length} / 1000`;
});

// Giriş Yoxlanışı (İstifadəçi adı = FİN, Şifrə = FİN)
document.getElementById('btn-login').addEventListener('click', async function() {
    const username = document.getElementById('teacher-username').value.trim().toUpperCase();
    const password = document.getElementById('teacher-password').value.trim().toUpperCase();

    if (!username || !password) {
        alert("Lütfən istifadəçi adı və şifrəni daxil edin!");
        return;
    }

    if (username !== password) {
        alert("İstifadəçi adı və şifrə eyni olmalıdır (FİN koda uyğun)!");
        return;
    }

    try {
        const teacherRef = ref(db, `teachers/${username}`);
        const snapshot = await get(teacherRef);

        if (snapshot.exists()) {
            const teacherData = snapshot.val();
            currentTeacherFin = username;
            currentTeacherName = teacherData.name;

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

// Bazadan Məlumatları Oxumaq
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
            studentsData = snapshot.val();
            studentsKeys = Object.keys(studentsData);
            showStudent(currentIndex);
        } else {
            alert("Bazada şagird məlumatı tapılmadı!");
        }
    } catch (err) {
        alert("Baza ilə əlaqə xətası: " + err.message);
    }
}

// Cari Şagirdin İşini Ekrana Çıxarmaq
function showStudent(index) {
    if (index < 0 || index >= studentsKeys.length) return;

    currentIndex = index;
    const key = studentsKeys[currentIndex];
    const student = studentsData[key];
    const teacherEval = teacherEvaluations[key];

    document.getElementById('student-name').innerText = `Şagird: ${student.name} (${currentIndex + 1}/${studentsKeys.length})`;
    
    document.getElementById('criteria-img').src = student.criteria_url;
    document.getElementById('work-img').src = student.work_url;
    
    resetZoom('criteria-img');
    resetZoom('work-img');

    // Əvvəlcədən yazılmış bal və rəy varsa gətirir
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

// Yadda Saxla Düyməsi
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

        teacherEvaluations[currentKey] = {
            score: Number(score),
            feedback: feedback
        };

        alert("Məlumat yadda saxlanıldı!");
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