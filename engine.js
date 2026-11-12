// =========================================================================
// CẤU HÌNH GOOGLE SHEETS DUY NHẤT TẠI ĐÂY (Dán link Web App URL vào giữa dấu nháy)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzHHVpWBFOZdYUV7j-p3YjhiY1NAPBIVpVzBDB0aQuh3ByjI460FDPCQY8ub6qmvHbyuA/exec'; 
// =========================================================================

let currentMode = 'practice'; // 'practice' | 'exam'
let activeQuestions = [];
let userAnswers = {};
let isSubmitted = false;
let timerInterval = null;
let secondsLeft = 600; // 10 phút làm bài kiểm tra

document.addEventListener('DOMContentLoaded', () => {
  // Hiển thị tiêu đề bài học từ biến LESSON_DATA trong từng trang con
  document.title = LESSON_DATA.title + ' - KHTN 9 THCS Ninh Hòa';
  document.getElementById('lessonTitle').textContent = LESSON_DATA.title;
  document.getElementById('lessonTopic').textContent = LESSON_DATA.topic;
  document.getElementById('theoryContent').innerHTML = LESSON_DATA.theoryHTML;

  // Nạp thông tin học sinh đã nhập ở Trang chủ
  const profile = JSON.parse(localStorage.getItem('vl9_profile') || '{}');
  if (profile.name) document.getElementById('stuName').value = profile.name;
  if (profile.className) document.getElementById('stuClass').value = profile.className;

  document.getElementById('stuName').addEventListener('input', syncProfile);
  document.getElementById('stuClass').addEventListener('change', syncProfile);

  startQuiz('practice');
});

function syncProfile() {
  localStorage.setItem('vl9_profile', JSON.stringify({
    name: document.getElementById('stuName').value.trim(),
    className: document.getElementById('stuClass').value
  }));
}

function switchTab(tab) {
  const theoryBox = document.getElementById('tabTheory');
  const quizBox = document.getElementById('tabQuiz');
  const btnTheory = document.getElementById('btnTabTheory');
  const btnQuiz = document.getElementById('btnTabQuiz');

  if (tab === 'theory') {
    theoryBox.classList.remove('hidden');
    quizBox.classList.add('hidden');
    btnTheory.className = 'px-4 py-2 rounded-xl font-bold text-sm bg-blue-700 text-white shadow';
    btnQuiz.className = 'px-4 py-2 rounded-xl font-bold text-sm bg-white text-slate-600 border border-slate-200';
  } else {
    theoryBox.classList.add('hidden');
    quizBox.classList.remove('hidden');
    btnQuiz.className = 'px-4 py-2 rounded-xl font-bold text-sm bg-blue-700 text-white shadow';
    btnTheory.className = 'px-4 py-2 rounded-xl font-bold text-sm bg-white text-slate-600 border border-slate-200';
  }
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startQuiz(mode) {
  currentMode = mode;
  isSubmitted = false;
  userAnswers = {};
  clearInterval(timerInterval);

  // Cập nhật nút chế độ
  document.getElementById('btnModePractice').className = mode === 'practice'
    ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white'
    : 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600';
  document.getElementById('btnModeExam').className = mode === 'exam'
    ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white'
    : 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600';

  document.getElementById('resultBanner').classList.add('hidden');
  document.getElementById('submitBtn').classList.remove('hidden');

  // Xáo trộn câu hỏi và xáo trộn đáp án trắc nghiệm
  activeQuestions = shuffleArray(LESSON_DATA.questions).map((q, idx) => {
    if (q.type === 'mcq') {
      const indexedOpts = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
      const shuffled = shuffleArray(indexedOpts);
      return {
        ...q,
        renderIndex: idx,
        shuffledOptions: shuffled.map(o => o.text),
        correctIndex: shuffled.findIndex(o => o.isCorrect)
      };
    }
    return { ...q, renderIndex: idx };
  });

  // Bộ đếm giờ nếu là chế độ Kiểm tra
  const timerEl = document.getElementById('timerBox');
  if (mode === 'exam') {
    secondsLeft = (LESSON_DATA.examMinutes || 10) * 60;
    timerEl.classList.remove('hidden');
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerDisplay();
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        submitQuiz(true);
      }
    }, 1000);
  } else {
    timerEl.classList.add('hidden');
  }

  renderQuestions();
}

function updateTimerDisplay() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const s = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById('timerText').textContent = `${m}:${s}`;
}

function renderQuestions() {
  const container = document.getElementById('questionList');
  container.innerHTML = '';

  activeQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.id = `q-card-${idx}`;
    card.className = 'bg-white rounded-2xl p-5 border border-slate-200 shadow-sm';

    let typeBadge = q.type === 'mcq' ? 'Trắc nghiệm 4 lựa chọn' : (q.type === 'tf' ? 'Đúng / Sai' : 'Trả lời ngắn');
    let inputHTML = '';

    if (q.type === 'mcq') {
      const labels = ['A', 'B', 'C', 'D'];
      inputHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">` +
        q.shuffledOptions.map((opt, optIdx) => `
          <button type="button" onclick="selectMCQ(${idx}, ${optIdx})" id="opt-${idx}-${optIdx}"
            class="opt-btn-${idx} text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition text-sm flex items-start gap-2.5">
            <span class="font-bold text-blue-700 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">${labels[optIdx]}</span>
            <span>${opt}</span>
          </button>
        `).join('') + `</div>`;
    } else if (q.type === 'tf') {
      inputHTML = `<div class="flex gap-3 mt-3">
        <button type="button" onclick="selectTF(${idx}, true)" id="tf-${idx}-true"
          class="tf-btn-${idx} px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-sm hover:bg-blue-50">✅ Đúng</button>
        <button type="button" onclick="selectTF(${idx}, false)" id="tf-${idx}-false"
          class="tf-btn-${idx} px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-sm hover:bg-blue-50">❌ Sai</button>
      </div>`;
    } else if (q.type === 'short') {
      inputHTML = `<div class="mt-3 flex items-center gap-2">
        <input type="text" id="short-${idx}" oninput="inputShort(${idx}, this.value)"
          placeholder="Nhập kết quả bằng số (ví dụ: 12,5 hoặc 12.5)..."
          class="border border-slate-300 rounded-xl px-3.5 py-2 text-sm w-full sm:w-72 focus:ring-2 focus:ring-blue-500 outline-none">
        ${q.unit ? `<span class="text-sm font-semibold text-slate-600">${q.unit}</span>` : ''}
      </div>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">Câu ${idx + 1} • ${typeBadge}</span>
        <span id="status-${idx}" class="text-xs font-bold"></span>
      </div>
      <div class="text-slate-800 font-semibold text-base leading-relaxed">${q.question}</div>
      ${inputHTML}
      <div id="explain-${idx}" class="hidden mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-slate-700"></div>
    `;
    container.appendChild(card);
  });
}

function selectMCQ(qIdx, optIdx) {
  if (isSubmitted) return;
  userAnswers[qIdx] = optIdx;
  document.querySelectorAll(`.opt-btn-${qIdx}`).forEach(b => {
    b.classList.remove('border-blue-600', 'bg-blue-50', 'ring-2', 'ring-blue-500');
  });
  document.getElementById(`opt-${qIdx}-${optIdx}`).classList.add('border-blue-600', 'bg-blue-50', 'ring-2', 'ring-blue-500');
  if (currentMode === 'practice') checkSingleQuestion(qIdx);
}

function selectTF(qIdx, val) {
  if (isSubmitted) return;
  userAnswers[qIdx] = val;
  document.querySelectorAll(`.tf-btn-${qIdx}`).forEach(b => {
    b.classList.remove('border-blue-600', 'bg-blue-50', 'ring-2', 'ring-blue-500');
  });
  document.getElementById(`tf-${qIdx}-${val}`).classList.add('border-blue-600', 'bg-blue-50', 'ring-2', 'ring-blue-500');
  if (currentMode === 'practice') checkSingleQuestion(qIdx);
}

function inputShort(qIdx, val) {
  if (isSubmitted) return;
  userAnswers[qIdx] = val.trim();
}

function evaluateQuestion(q, ans) {
  if (ans === undefined || ans === '') return false;
  if (q.type === 'mcq') return ans === q.correctIndex;
  if (q.type === 'tf') return ans === q.answer;
  if (q.type === 'short') {
    const numUser = parseFloat(String(ans).replace(',', '.'));
    const numAns = parseFloat(String(q.answer).replace(',', '.'));
    if (!isNaN(numUser) && !isNaN(numAns)) {
      return Math.abs(numUser - numAns) <= (q.tolerance || 0.05);
    }
    return String(ans).toLowerCase() === String(q.answer).toLowerCase();
  }
  return false;
}

function checkSingleQuestion(qIdx) {
  const q = activeQuestions[qIdx];
  const isRight = evaluateQuestion(q, userAnswers[qIdx]);
  const statusEl = document.getElementById(`status-${qIdx}`);
  const explainEl = document.getElementById(`explain-${qIdx}`);

  statusEl.textContent = isRight ? '✅ Chính xác!' : '❌ Chưa đúng';
  statusEl.className = isRight ? 'text-xs font-bold text-emerald-600' : 'text-xs font-bold text-rose-600';

  explainEl.innerHTML = `<strong>💡 Giải thích:</strong> ${q.explanation || 'Xem lại phần tóm tắt lý thuyết.'}`;
  explainEl.classList.remove('hidden');
}

function submitQuiz(autoTimeUp = false) {
  if (isSubmitted) return;
  const name = document.getElementById('stuName').value.trim();
  const className = document.getElementById('stuClass').value;

  if (!autoTimeUp && (!name || !className)) {
    alert('Em vui lòng nhập đầy đủ Họ tên và chọn Lớp ở phía trên trước khi nộp bài!');
    document.getElementById('stuName').focus();
    return;
  }

  isSubmitted = true;
  clearInterval(timerInterval);
  document.getElementById('submitBtn').classList.add('hidden');

  let correctCount = 0;
  activeQuestions.forEach((q, idx) => {
    const isRight = evaluateQuestion(q, userAnswers[idx]);
    if (isRight) correctCount++;
    checkSingleQuestion(idx);

    const card = document.getElementById(`q-card-${idx}`);
    card.classList.remove('border-slate-200');
    card.classList.add(isRight ? 'border-emerald-400' : 'border-rose-300');
  });

  const total = activeQuestions.length;
  const score = ((correctCount / total) * 10).toFixed(1);

  const banner = document.getElementById('resultBanner');
  banner.classList.remove('hidden');
  document.getElementById('scoreDisplay').textContent = `${score} / 10 điểm`;
  document.getElementById('detailDisplay').textContent = `Đúng ${correctCount}/${total} câu • Chế độ: ${currentMode === 'exam' ? 'Kiểm tra' : 'Luyện tập'}`;

  // Lưu vào localStorage để Trang chủ hiển thị điểm cao nhất
  const record = {
    lessonId: LESSON_DATA.id,
    lesson: LESSON_DATA.title,
    name: name || 'Học sinh ẩn danh',
    className: className || 'Chưa chọn lớp',
    mode: currentMode === 'exam' ? 'Kiểm tra' : 'Luyện tập',
    score: score,
    correct: correctCount,
    total: total,
    time: new Date().toLocaleString('vi-VN')
  };

  const history = JSON.parse(localStorage.getItem('vl9_scores') || '[]');
  history.push(record);
  localStorage.setItem('vl9_scores', JSON.stringify(history));

  // Tự động gửi điểm về Google Sheets nếu thầy đã dán link
  if (GOOGLE_SHEET_URL) {
    const syncStatus = document.getElementById('syncStatus');
    syncStatus.textContent = '⏳ Đang gửi điểm về bảng điểm của thầy...';
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).then(() => {
      syncStatus.textContent = '✅ Đã gửi điểm thành công lên Google Sheets của giáo viên!';
    }).catch(() => {
      syncStatus.textContent = '⚠️ Đã lưu điểm trên máy (Kiểm tra lại kết nối mạng).';
    });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
