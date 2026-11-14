// =========================================================================
// CẤU HÌNH GOOGLE SHEETS DUY NHẤT TẠI ĐÂY
const GOOGLE_SHEET_URL = ''; 
// =========================================================================

let currentMode = 'practice';
let activeQuestions = [];
let userAnswers = {};
let isSubmitted = false;
let timerInterval = null;
let elapsedSeconds = 0; // Đếm tăng thời gian làm bài từ 00:00

document.addEventListener('DOMContentLoaded', () => {
  document.title = LESSON_DATA.title + ' - KHTN 9 THCS Ninh Hòa';
  document.getElementById('lessonTitle').textContent = LESSON_DATA.title;
  document.getElementById('lessonTopic').textContent = LESSON_DATA.topic;
  document.getElementById('theoryContent').innerHTML = LESSON_DATA.theoryHTML;

  // Nạp Họ tên & Lớp đã lưu trên máy học sinh
  const profile = JSON.parse(localStorage.getItem('vl9_profile') || '{}');
  if (profile.name) document.getElementById('stuName').value = profile.name;
  if (profile.className) document.getElementById('stuClass').value = profile.className;

  document.getElementById('stuName').addEventListener('input', syncProfile);
  document.getElementById('stuClass').addEventListener('input', syncProfile);

  startQuiz('practice');
});

function syncProfile() {
  const clsInput = document.getElementById('stuClass');
  clsInput.value = clsInput.value.toUpperCase();
  localStorage.setItem('vl9_profile', JSON.stringify({
    name: document.getElementById('stuName').value.trim(),
    className: clsInput.value.trim()
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

function formatDuration(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startQuiz(mode) {
  currentMode = mode;
  isSubmitted = false;
  userAnswers = {};
  clearInterval(timerInterval);

  document.getElementById('btnModePractice').className = mode === 'practice'
    ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm'
    : 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200';
  document.getElementById('btnModeExam').className = mode === 'exam'
    ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-sm'
    : 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200';

  document.getElementById('resultBanner').classList.add('hidden');
  document.getElementById('submitBtn').classList.remove('hidden');

  if (mode === 'practice') {
    // CHẾ ĐỘ LUYỆN TẬP: Xếp tuần tự theo từng đề mục SGK (Mục I -> Mục II -> Mục III)
    const orderedBySection = [];
    const seenSections = [];

    LESSON_DATA.questions.forEach(q => {
      const sec = q.section || 'Kiến thức chung';
      if (!seenSections.includes(sec)) seenSections.push(sec);
    });

    seenSections.forEach(sec => {
      const group = LESSON_DATA.questions.filter(q => (q.section || 'Kiến thức chung') === sec);
      group.forEach(q => {
        if (q.type === 'mcq') {
          orderedBySection.push({
            ...q,
            shuffledOptions: [...q.options],
            correctIndex: q.answer
          });
        } else {
          orderedBySection.push({ ...q });
        }
      });
    });

    activeQuestions = orderedBySection;
  } else {
    // CHẾ ĐỘ KIỂM TRA: Xáo trộn ngẫu nhiên câu hỏi và xáo vị trí 4 phương án A, B, C, D
    const mcqs = shuffleArray(LESSON_DATA.questions.filter(q => q.type === 'mcq')).map(q => {
      const indexedOpts = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
      const shuffled = shuffleArray(indexedOpts);
      return {
        ...q,
        shuffledOptions: shuffled.map(o => o.text),
        correctIndex: shuffled.findIndex(o => o.isCorrect)
      };
    });
    const tfGroups = shuffleArray(LESSON_DATA.questions.filter(q => q.type === 'tf_group' || q.type === 'tf'));
    const shorts = shuffleArray(LESSON_DATA.questions.filter(q => q.type === 'short'));

    activeQuestions = [...mcqs, ...tfGroups, ...shorts];
  }

  // Đếm tăng thời gian từ 00:00 (hiện rõ khi ở chế độ Kiểm tra, đồng thời vẫn ngầm đo cả ở Luyện tập)
  elapsedSeconds = 0;
  const timerEl = document.getElementById('timerBox');
  if (mode === 'exam') {
    timerEl.classList.remove('hidden');
    timerEl.innerHTML = `⏱️ Thời gian làm bài: <span id="timerText">00:00</span>`;
  } else {
    timerEl.classList.add('hidden');
  }

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const timerText = document.getElementById('timerText');
    if (timerText) timerText.textContent = formatDuration(elapsedSeconds);
  }, 1000);

  renderQuestions();
  if (window.MathJax) MathJax.typesetPromise();
}

function renderQuestions() {
  const container = document.getElementById('questionList');
  container.innerHTML = '';
  let lastRenderedSection = '';

  activeQuestions.forEach((q, idx) => {
    if (currentMode === 'practice' && q.section && q.section !== lastRenderedSection) {
      lastRenderedSection = q.section;
      const secHeader = document.createElement('div');
      secHeader.className = 'bg-blue-50 border-l-4 border-blue-700 px-4 py-2.5 rounded-r-xl font-extrabold text-blue-900 text-sm sm:text-base mt-6 first:mt-0 shadow-xs';
      secHeader.textContent = `📌 ${q.section}`;
      container.appendChild(secHeader);
    }

    const card = document.createElement('div');
    card.id = `q-card-${idx}`;
    card.className = 'bg-white rounded-2xl p-5 border border-slate-200 shadow-sm';

    let typeBadge = q.type === 'mcq' ? 'Trắc nghiệm 1 lựa chọn' : (q.type === 'tf_group' ? 'Trắc nghiệm Đúng / Sai (4 ý)' : 'Trả lời ngắn (4 kí tự)');
    let sectionTag = (currentMode === 'exam' && q.section) ? `<span class="text-xs text-slate-500 font-medium">${q.section}</span>` : '';
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
    } else if (q.type === 'tf_group') {
      inputHTML = `<div class="mt-3 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">` +
        q.items.map((item, iIdx) => `
          <div class="p-3 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="text-sm text-slate-800 flex-1">${item.text}</div>
            <div class="flex gap-2 shrink-0">
              <button type="button" id="tfg-${idx}-${iIdx}-true" onclick="selectTFGroup(${idx}, ${iIdx}, true)"
                class="px-3.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-blue-50">Đúng</button>
              <button type="button" id="tfg-${idx}-${iIdx}-false" onclick="selectTFGroup(${idx}, ${iIdx}, false)"
                class="px-3.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-blue-50">Sai</button>
            </div>
          </div>
        `).join('') + `</div>`;
    } else if (q.type === 'short') {
      inputHTML = `<div class="mt-3 flex flex-wrap items-center gap-2.5">
        <input type="text" maxlength="4" id="short-${idx}" oninput="inputShort(${idx}, this.value)"
          placeholder="4 kí tự..."
          class="border-2 border-slate-300 rounded-xl px-3.5 py-2 text-base font-bold tracking-widest text-center w-36 focus:border-blue-600 outline-none">
        ${q.unit ? `<span class="text-sm font-semibold text-slate-600">${q.unit}</span>` : ''}
        <span class="text-xs text-slate-400">(Nhập đúng 4 kí tự, vd: 1,52)</span>
      </div>`;
    }

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">Câu ${idx + 1} • ${typeBadge}</span>
          ${sectionTag}
        </div>
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

function selectTFGroup(qIdx, itemIdx, val) {
  if (isSubmitted) return;
  if (!userAnswers[qIdx]) userAnswers[qIdx] = {};
  userAnswers[qIdx][itemIdx] = val;

  ['true', 'false'].forEach(v => {
    const btn = document.getElementById(`tfg-${qIdx}-${itemIdx}-${v}`);
    btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
    btn.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
  });
  const activeBtn = document.getElementById(`tfg-${qIdx}-${itemIdx}-${val}`);
  activeBtn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
  activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');

  if (currentMode === 'practice' && Object.keys(userAnswers[qIdx]).length === activeQuestions[qIdx].items.length) {
    checkSingleQuestion(qIdx);
  }
}

function inputShort(qIdx, val) {
  if (isSubmitted) return;
  userAnswers[qIdx] = val.trim();
}

function scoreQuestionRatio(q, ans) {
  if (ans === undefined || ans === '') return 0;
  if (q.type === 'mcq') return ans === q.correctIndex ? 1 : 0;
  if (q.type === 'tf_group') {
    let rightItems = 0;
    q.items.forEach((it, i) => {
      if (ans[i] === it.answer) rightItems++;
    });
    if (rightItems === 4) return 1.0;
    if (rightItems === 3) return 0.5;
    if (rightItems === 2) return 0.25;
    if (rightItems === 1) return 0.1;
    return 0;
  }
  if (q.type === 'short') {
    const normUser = String(ans).replace('.', ',').trim();
    const normAns = String(q.answer).replace('.', ',').trim();
    return normUser === normAns ? 1 : 0;
  }
  return 0;
}

function checkSingleQuestion(qIdx) {
  const q = activeQuestions[qIdx];
  const ratio = scoreQuestionRatio(q, userAnswers[qIdx]);
  const statusEl = document.getElementById(`status-${qIdx}`);
  const explainEl = document.getElementById(`explain-${qIdx}`);

  if (ratio === 1) {
    statusEl.textContent = '✅ Chính xác hoàn toàn!';
    statusEl.className = 'text-xs font-bold text-emerald-600';
  } else if (ratio > 0) {
    statusEl.textContent = `⚠️ Đạt ${Math.round(ratio * 100)}% điểm câu này`;
    statusEl.className = 'text-xs font-bold text-amber-600';
  } else {
    statusEl.textContent = '❌ Chưa đúng';
    statusEl.className = 'text-xs font-bold text-rose-600';
  }

  let ansNote = '';
  if (q.type === 'short') ansNote = `<div class="mb-1 text-emerald-800 font-bold">Đáp án chuẩn (4 kí tự): ${q.answer}</div>`;
  explainEl.innerHTML = `${ansNote}<strong>💡 Giải thích:</strong> ${q.explanation || ''}`;
  explainEl.classList.remove('hidden');
}

function submitQuiz() {
  if (isSubmitted) return;
  const name = document.getElementById('stuName').value.trim();
  const className = document.getElementById('stuClass').value.trim();

  if (!name || !className) {
    alert('Em vui lòng nhập đầy đủ Họ tên và Lớp (ví dụ: 9A1, 9D3...) ở phía trên trước khi nộp bài!');
    document.getElementById('stuName').focus();
    return;
  }

  isSubmitted = true;
  clearInterval(timerInterval);
  document.getElementById('submitBtn').classList.add('hidden');

  const durationText = `${Math.floor(elapsedSeconds / 60)} phút ${elapsedSeconds % 60} giây`;

  let earnedPoints = 0;
  let fullCorrectCount = 0;
  activeQuestions.forEach((q, idx) => {
    const r = scoreQuestionRatio(q, userAnswers[idx]);
    earnedPoints += r;
    if (r === 1) fullCorrectCount++;
    checkSingleQuestion(idx);

    const card = document.getElementById(`q-card-${idx}`);
    card.classList.remove('border-slate-200');
    card.classList.add(r === 1 ? 'border-emerald-400' : (r > 0 ? 'border-amber-400' : 'border-rose-300'));
  });

  const total = activeQuestions.length;
  const score10 = ((earnedPoints / total) * 10).toFixed(2);

  const banner = document.getElementById('resultBanner');
  banner.classList.remove('hidden');
  document.getElementById('scoreDisplay').textContent = `${score10} / 10 điểm`;
  document.getElementById('detailDisplay').textContent = `Hoàn thành trọn vẹn ${fullCorrectCount}/${total} câu • Thời gian làm: ${durationText} • Chế độ: ${currentMode === 'exam' ? 'Kiểm tra' : 'Luyện tập'}`;

  const record = {
    lessonId: LESSON_DATA.id,
    lesson: LESSON_DATA.title,
    name: name,
    className: className,
    mode: currentMode === 'exam' ? 'Kiểm tra' : 'Luyện tập',
    score: score10,
    correct: fullCorrectCount,
    total: total,
    duration: durationText,
    time: new Date().toLocaleString('vi-VN')
  };

  const history = JSON.parse(localStorage.getItem('vl9_scores') || '[]');
  history.push(record);
  localStorage.setItem('vl9_scores', JSON.stringify(history));

  if (GOOGLE_SHEET_URL) {
    const syncStatus = document.getElementById('syncStatus');
    syncStatus.textContent = '⏳ Đang gửi điểm về bảng điểm của thầy...';
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).then(() => {
      syncStatus.textContent = '✅ Đã gửi điểm & thời gian làm bài lên Google Sheets!';
    }).catch(() => {
      syncStatus.textContent = '⚠️ Đã lưu điểm trên máy (Kiểm tra lại kết nối mạng).';
    });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}