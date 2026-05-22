(function () {
  'use strict';

  // ─── CONFIG ──────────────────────────────────────────────────────────────────
  // Edit this block to update selectors, scoring, behavior, and integrations.
  // The quiz question count is fully flexible — add or remove questions here.

  var DW_QUIZ_CONFIG = {
    selectors: {
      root: 'form#email-form',
      panes: '.quiz_pane',
      answer: '.quiz_radio',
      answerInput: 'input[type="radio"]',
      answerLabel: '.w-form-label',
      back: '.quiz_back',
      buttons: '.global-button.w-button',
      progressLine: '.quiz_timeline-line',
      success: '.w-form-done',
      fail: '.w-form-fail',
      contactGate: '[data-quiz-contact-gate]',
      results: '[data-quiz-results]',
      quizWrapper: null,             // unused — .quiz_start hiding is handled by startQuiz()
      formPane: '#quiz-form-pane',  // Webflow pane shown as the contact gate
      formTarget: '#form-target'    // element inside formPane where Marketo form is injected
    },
    scoring: {
      // Knowledge quiz: 1 point per correct answer, 0 for wrong or skipped.
      correctAnswerScore: 1,
      incorrectAnswerScore: 0,
      skippedScore: 0,
      // Tiers use percentage of correct answers so the count can change freely.
      tiers: [
        {
          id: 'expert',
          minPercent: 80,
          label: 'Ahead of the curve',
          message: 'You already recognize the digital challenges your students face and are actively seeking solutions that build skills, not restrictions. The Second Step® Digital Well-Being unit can help you formalize and scale that momentum.'
        },
        {
          id: 'developing',
          minPercent: 50,
          label: 'Growing digital awareness',
          message: 'You’re seeing the rapid shifts in student technology use and exploring options. The Digital Well-Being specialized unit can help bring consistency and clarity across grades and classrooms.'
        },
        {
          id: 'emerging',
          minPercent: 0,
          label: 'Room to grow',
          message: 'Your school may benefit from a structured, developmentally aligned framework to help students navigate digital spaces with confidence, empathy, and responsibility.'
        }
      ]
    },
    behavior: {
      requireAnswerForNext: true,
      allowSkip: false,
      scrollToTopOnPaneChange: true,
      persistInSessionStorage: false, // set true to resume mid-quiz on reload
      showCorrectAnswersInResults: true  // flip to false to hide which answers were right
    },
    integrations: {
      marketo: {
        enabled: true,
        serverUrl: '//go.secondstep.org',
        munchkinId: '763-WVZ-393',
        formId: 2039,
        talkToExpertUrl: '/purchase/request-a-demo',
        hiddenFieldMap: {
          score: 'digitalWellbeingQuizScore',
          scorePercent: 'digitalWellbeingQuizPercent',
          tier: 'digitalWellbeingQuizTier',
          correctCount: 'digitalWellbeingQuizCorrectCount',
          totalQuestions: 'digitalWellbeingQuizTotalQuestions',
          answersJson: 'digitalWellbeingQuizAnswersJson',
          talkToExpertRequested: 'digitalWellbeingTalkToExpertRequested'
        }
      },
      fallbackEndpoint: null   // set to POST endpoint URL if Marketo is unavailable
    },

    // ── Questions ─────────────────────────────────────────────────────────────
    // Each entry: { text, answers: [], correctAnswer: 'A'|'B'|'C'|'D'|'E' }
    // Questions with 5 options automatically support A–E answer labels.
    questions: [
      {
        text: 'At what age are most children going online today?',
        answers: [
          'Around eighth grade',
          'Between second and sixth grade',
          'Only in high school',
          'It varies too much to know'
        ],
        correctAnswer: 'B'
      },
      {
        text: 'What is the biggest shift schools are seeing when it comes to student technology use?',
        answers: [
          'Students need more device training skills',
          'Online experiences are increasingly shaping emotions, identity, and belonging',
          'Students only need guidance on privacy settings',
          'Schools mostly struggle with app updates'
        ],
        correctAnswer: 'B'
      },
      {
        text: 'How much time do children ages 8 and younger spend each day with screen media?',
        answers: [
          'About 30 minutes',
          'About 1 hour',
          'About 2.5 hours',
          'Over 5 hours'
        ],
        correctAnswer: 'C'
      },
      {
        text: 'What percentage of high school students used ChatGPT for schoolwork in May 2025?',
        answers: [
          '10%',
          '25%',
          '69%',
          'Nearly all students (95%+)'
        ],
        correctAnswer: 'C'
      },
      {
        text: 'Which of the following concerns do students report about GenAI tools?',
        answers: [
          'Inaccurate information',
          'Bias or discrimination',
          'Data leakage and scams',
          'Loss of important human skills',
          'All of the above'
        ],
        correctAnswer: 'E'
      },
      {
        text: 'Why isn’t traditional digital education enough anymore?',
        answers: [
          'It focuses mainly on rules and safety, missing skills like digital balance, ethical AI use, and well-being',
          'It’s too new to be effective',
          'Students don’t use technology in school',
          'Schools already cover everything needed'
        ],
        correctAnswer: 'A'
      },
      {
        text: 'What makes the Digital Well-Being specialized unit different from typical digital citizenship programs?',
        answers: [
          'It teaches step-by-step rules for every platform',
          'It focuses on human development, skills, and student agency',
          'It discourages technology use',
          'It’s only for older students'
        ],
        correctAnswer: 'B'
      },
      {
        text: 'Which of the following human skills does digital well-being reinforce?',
        answers: [
          'Self-awareness and emotion regulation',
          'Empathy and perspective-taking',
          'Critical thinking and responsible decision-making',
          'Ethical leadership',
          'All of the above'
        ],
        correctAnswer: 'E'
      },
      {
        text: 'What outcomes should schools expect after implementing the unit for one year?',
        answers: [
          'Improved understanding of how digital behaviors affect emotions',
          'Greater ability for students to reflect before reacting online',
          'Increased educator confidence in discussing digital challenges',
          'Consistent digital well-being language across grade levels',
          'All of the above'
        ],
        correctAnswer: 'E'
      },
      {
        text: 'Why is now the right moment for structured digital well-being instruction?',
        answers: [
          'Students are growing up within digital spaces, not just accessing them',
          'Schools are being asked to respond to complex tech issues without clear guidance',
          'AI tools are changing how students learn and create',
          'Digital experiences shape identity and belonging',
          'All of the above'
        ],
        correctAnswer: 'E'
      }
    ]
  };

  var ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var SESSION_KEY = 'dwQuizState';

  // ─── STATE ───────────────────────────────────────────────────────────────────

  function createInitialState() {
    return {
      currentIndex: 0,
      totalQuestions: DW_QUIZ_CONFIG.questions.length,
      startedAt: null,
      completedAt: null,
      answers: [],
      contact: {},
      result: null,
      quizCompleted: false,
      contactSubmitted: false
    };
  }

  var state = createInitialState();

  // ─── DOM CACHE ───────────────────────────────────────────────────────────────

  var dom = {
    root: null,
    panes: [],
    back: null,
    quizWrapper: null,
    formPane: null,
    contactGate: null,
    results: null,
    successEl: null,
    failEl: null
  };

  // Set of .w-radio-input elements that OUR code has intentionally checked.
  // The observer allows w--redirected-checked only when the element is in this set,
  // making it immune to Webflow adding .is-selected or any other class interference.
  var _approvedRadioInputs = new Set();

  var _radioObserver = (typeof MutationObserver !== 'undefined')
    ? new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (!m.target.classList) return;
          if (m.target.classList.contains('w-radio-input') &&
              m.target.classList.contains('w--redirected-checked') &&
              !_approvedRadioInputs.has(m.target)) {
            console.log('[DWQuiz] observer: blocked auto-check on', m.target);
            m.target.classList.remove('w--redirected-checked');
          }
        });
      })
    : null;

  // Start immediately — catches Webflow radio init regardless of script order
  if (_radioObserver) {
    _radioObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────

  function init() {
    var panes = document.querySelectorAll(DW_QUIZ_CONFIG.selectors.panes);

    if (!panes.length) {
      console.warn('[DWQuiz] No .quiz_pane elements found. Script will not run.');
      return;
    }

    var qCount = DW_QUIZ_CONFIG.questions.length;
    if (panes.length !== qCount) {
      console.warn('[DWQuiz] Config has ' + qCount + ' questions but found ' + panes.length + ' panes. Continuing with DOM count.');
    }

    console.log('[DWQuiz] init: found ' + panes.length + ' panes');

    normalizeMarkup(panes);
    cacheDom();
    injectSupportElements();

    var wasRestored = restoreState();
    console.log('[DWQuiz] init: sessionStorage restored =', wasRestored,
      '| startedAt =', state.startedAt,
      '| contactSubmitted =', state.contactSubmitted);

    bindEvents();

    if (wasRestored && state.startedAt && !state.contactSubmitted) {
      console.log('[DWQuiz] init: resuming at question', state.currentIndex);
      goToQuestion(state.currentIndex);
    } else if (wasRestored && state.contactSubmitted && state.result) {
      console.log('[DWQuiz] init: restoring completed results');
      _setScreen('results');
      showResults();
    } else {
      console.log('[DWQuiz] init: fresh start → intro screen');
      _setScreen('intro');
    }
  }

  // ─── NORMALIZE MARKUP ────────────────────────────────────────────────────────
  // Adds data-quiz-question to panes and data-quiz-answer to labels.
  // If radios still use the old duplicate name/value pattern (pre-v2), patches
  // them to unique values. V2 markup (name="Q1", value="1-5") is left as-is.

  function normalizeMarkup(panes) {
    panes.forEach(function (pane, qIdx) {
      pane.setAttribute('data-quiz-question', String(qIdx));
      pane.setAttribute('aria-hidden', 'true');

      var answers = pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.answer);
      answers.forEach(function (label, aIdx) {
        var letter = ANSWER_LETTERS[aIdx] || String(aIdx);
        label.setAttribute('data-quiz-answer', letter);

        // Clear any pre-checked visual state Webflow may have applied
        var radioInput = label.querySelector('.w-radio-input');
        if (radioInput) radioInput.classList.remove('w--redirected-checked');

        var input = label.querySelector(DW_QUIZ_CONFIG.selectors.answerInput);
        if (input) {
          input.checked = false;
          input.removeAttribute('checked'); // strip HTML attribute Webflow may have set
          // Detect legacy markup where all radios share name="radio"
          var alreadyUnique = /^Q\d+$/i.test(input.name || '') ||
                              (input.name && input.name !== 'radio' && input.name !== '');
          if (!alreadyUnique) {
            // Patch legacy markup to make it functional
            var uid = 'quiz_q' + qIdx + '_' + letter;
            input.name = 'quiz_q' + qIdx;
            input.value = letter;
            input.id = uid;
            var lbl = label.querySelector(DW_QUIZ_CONFIG.selectors.answerLabel);
            if (lbl) lbl.setAttribute('for', uid);
          }
        }
      });
    });
  }

  // ─── CACHE DOM ───────────────────────────────────────────────────────────────

  function cacheDom() {
    var cfg = DW_QUIZ_CONFIG.selectors;
    dom.root = document.querySelector(cfg.root);
    dom.panes = Array.from(document.querySelectorAll(cfg.panes));
    dom.back = document.querySelector(cfg.back);
    dom.quizWrapper = document.querySelector(cfg.quizWrapper);
    dom.formPane = cfg.formPane ? document.querySelector(cfg.formPane) : null;
    dom.contactGate = document.querySelector(cfg.contactGate);
    dom.results = document.querySelector(cfg.results);
    dom.successEl = document.querySelector(cfg.success);
    dom.failEl = document.querySelector(cfg.fail);
  }

  // ─── INJECT SUPPORT ELEMENTS ─────────────────────────────────────────────────

  function injectSupportElements() {
    // Validation error placeholder inside each pane's button area
    dom.panes.forEach(function (pane) {
      if (pane.querySelector('.dw-error')) return;
      var firstBtn = pane.querySelector(DW_QUIZ_CONFIG.selectors.buttons);
      if (!firstBtn) return;
      var err = document.createElement('div');
      err.className = 'dw-error';
      err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'polite');
      err.style.cssText = 'color:#c00;font-size:.875rem;margin:.5rem 0;min-height:1.25em;';
      firstBtn.parentNode.insertBefore(err, firstBtn);
    });

    // Inject quiz-specific styles once
    if (!document.getElementById('dw-quiz-styles')) {
      var style = document.createElement('style');
      style.id = 'dw-quiz-styles';
      style.textContent =
        '[data-quiz-results]{background:#1a3e66;color:#fff;}' +
        '.dw-review-row{color:#555;}';
      document.head.appendChild(style);
    }

    // Contact gate and results containers — inserted after the quiz form so they
    // appear in the same visual slot when the form is hidden.
    var insertAnchor = dom.root || document.body;

    // Only create a JS contact gate div if the page has no Webflow form pane
    if (!dom.formPane && !dom.contactGate) {
      var gate = document.createElement('div');
      gate.setAttribute('data-quiz-contact-gate', '');
      gate.style.cssText = 'display:none;padding:5rem 0;background-color:#e9eeff;min-height:100vh;';
      insertAnchor.parentNode.insertBefore(gate, insertAnchor.nextSibling);
      dom.contactGate = gate;
    }

    if (!dom.results) {
      var res = document.createElement('div');
      res.setAttribute('data-quiz-results', '');
      res.style.cssText = 'display:none;padding:5rem 0;';
      var resultAnchor = dom.formPane || dom.contactGate || insertAnchor;
      resultAnchor.parentNode.insertBefore(res, resultAnchor.nextSibling);
      dom.results = res;
    }
  }

  // ─── BIND EVENTS ─────────────────────────────────────────────────────────────

  function bindEvents() {
    // Intro CTA — prefers [data-quiz-start]; falls back to button text matching
    var introCtas = document.querySelectorAll('[data-quiz-start]');
    if (introCtas.length) {
      introCtas.forEach(function (el) {
        el.addEventListener('click', handleIntroCtaClick);
      });
    } else {
      document.querySelectorAll(DW_QUIZ_CONFIG.selectors.buttons).forEach(function (btn) {
        var t = btn.textContent.trim().toLowerCase();
        if (t.indexOf('begin') !== -1 || t.indexOf('take the quiz') !== -1 || t.indexOf('start') !== -1) {
          btn.addEventListener('click', handleIntroCtaClick);
        }
      });
    }

    // Per-pane: answers, next/submit, skip
    dom.panes.forEach(function (pane, qIdx) {
      pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.answer).forEach(function (label, aIdx) {
        label.addEventListener('click', function (e) {
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          selectAnswer(qIdx, aIdx);
        });
        var input = label.querySelector(DW_QUIZ_CONFIG.selectors.answerInput);
        if (input) {
          input.addEventListener('change', function () {
            selectAnswer(qIdx, aIdx);
          });
        }
      });

      pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.buttons).forEach(function (btn) {
        var t = btn.textContent.trim().toLowerCase();
        if (t.indexOf('next') !== -1 || t.indexOf('submit') !== -1) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            handleNextClick();
          });
        }
      });

      // Skip — leaf nodes only to avoid matching parent wrappers
      pane.querySelectorAll('a, span, div').forEach(function (el) {
        if (el.children.length === 0 &&
            el.textContent.trim().toLowerCase().indexOf('skip') !== -1) {
          if (!DW_QUIZ_CONFIG.behavior.allowSkip) {
            el.style.display = 'none';
            return;
          }
          el.style.cursor = 'pointer';
          el.addEventListener('click', function (e) {
            e.preventDefault();
            skipQuestion(state.currentIndex);
          });
        }
      });
    });

    // Back control
    if (dom.back) {
      dom.back.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[DWQuiz] back clicked at Q' + (state.currentIndex + 1));
        if (state.currentIndex > 0) goToQuestion(state.currentIndex - 1);
      });
    }

    // Talk to expert — delegated so it works after results are injected
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-quiz-talk-to-expert]');
      if (el) handleTalkToExpertClick(e);
    });
  }

  // ─── INTRO CTA ───────────────────────────────────────────────────────────────

  function handleIntroCtaClick(e) {
    e.preventDefault();
    console.log('[DWQuiz] begin button clicked');
    startQuiz();
  }

  function startQuiz() {
    console.log('[DWQuiz] startQuiz');
    state.startedAt = new Date().toISOString();
    pushEvent('dw_quiz_started');
    goToQuestion(0);
  }

  // ─── SCREEN MANAGEMENT ───────────────────────────────────────────────────────
  // Single entry point for all visibility changes. Hides every region first,
  // then shows exactly one. Pass a number for a question pane index.

  function _setScreen(screen) {
    console.log('[DWQuiz] _setScreen:', typeof screen === 'number' ? 'question ' + screen : screen);
    // Hide cover slide(s)
    document.querySelectorAll('.quiz_start').forEach(function (el) {
      el.style.display = 'none';
    });
    // Hide quiz form and all panes
    if (dom.root) dom.root.style.display = 'none';
    dom.panes.forEach(function (pane) {
      pane.classList.remove('is-active');
      pane.setAttribute('aria-hidden', 'true');
      pane.style.display = 'none';
    });
    // Hide post-quiz regions
    if (dom.formPane) {
      dom.formPane.style.display = 'none';
      dom.formPane.classList.remove('is-active');
    }
    if (dom.contactGate) {
      dom.contactGate.style.display = 'none';
      dom.contactGate.classList.remove('is-active');
    }
    if (dom.results) {
      dom.results.style.display = 'none';
      dom.results.classList.remove('is-active');
    }
    setBackVisible(false);

    // Show only the requested region
    if (screen === 'intro') {
      document.querySelectorAll('.quiz_start').forEach(function (el) {
        el.style.display = '';
      });
    } else if (typeof screen === 'number') {
      if (dom.root) dom.root.style.display = '';
      var pane = dom.panes[screen];
      if (pane) {
        pane.classList.add('is-active');
        pane.setAttribute('aria-hidden', 'false');
        pane.style.display = 'block';
      }
    } else if (screen === 'contact') {
      if (dom.formPane) {
        dom.formPane.style.display = '';
        dom.formPane.classList.add('is-active');
      } else if (dom.contactGate) {
        dom.contactGate.style.display = '';
        dom.contactGate.classList.add('is-active');
      }
    } else if (screen === 'results') {
      if (dom.results) {
        dom.results.style.display = '';
        dom.results.classList.add('is-active');
      }
    }
  }

  // ─── NAVIGATION ──────────────────────────────────────────────────────────────

  function goToQuestion(index) {
    if (index < 0 || index >= dom.panes.length) {
      console.warn('[DWQuiz] goToQuestion: invalid index', index);
      return;
    }
    console.log('[DWQuiz] goToQuestion:', index, '(Q' + (index + 1) + ' of ' + dom.panes.length + ')');

    _setScreen(index);

    var pane = dom.panes[index];
    state.currentIndex = index;

    // Restore or clear visual selection
    var existing = state.answers[index];
    pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.answer).forEach(function (label, aIdx) {
      var isSelected = existing && !existing.skipped && existing.answerIndex === aIdx;
      label.classList.toggle('dw-is-selected', isSelected);
      var input = label.querySelector(DW_QUIZ_CONFIG.selectors.answerInput);
      if (input) input.checked = isSelected;
      var radioInput = label.querySelector('.w-radio-input');
      if (radioInput) {
        if (isSelected) _approvedRadioInputs.add(radioInput);
        else _approvedRadioInputs.delete(radioInput);
        radioInput.classList.toggle('w--redirected-checked', isSelected);
      }
    });

    setBackVisible(index > 0);
    updatePrimaryButton(pane, index);
    clearPaneError(pane);
    updateProgressLine(index);

    if (DW_QUIZ_CONFIG.behavior.scrollToTopOnPaneChange) {
      pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var h2 = pane.querySelector('h2');
    if (h2) {
      if (!h2.getAttribute('tabindex')) h2.setAttribute('tabindex', '-1');
      h2.focus();
    }

    saveState();
  }

  function updatePrimaryButton(pane, index) {
    var isLast = index === dom.panes.length - 1;
    pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.buttons).forEach(function (btn) {
      var t = btn.textContent.trim().toLowerCase();
      if (t.indexOf('next') !== -1 || t.indexOf('submit') !== -1) {
        btn.textContent = isLast ? 'Submit Answers' : 'Next Question';
      }
    });
  }

  function setBackVisible(visible) {
    if (!dom.back) return;
    dom.back.style.display = visible ? '' : 'none';
    dom.back.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function updateProgressLine(index) {
    var line = document.querySelector(DW_QUIZ_CONFIG.selectors.progressLine);
    if (!line) return;
    var pct = Math.round(((index + 1) / dom.panes.length) * 100);
    line.style.width = pct + '%';
  }

  // ─── ANSWER SELECTION ────────────────────────────────────────────────────────

  function selectAnswer(questionIndex, answerIndex) {
    var pane = dom.panes[questionIndex];
    if (!pane) return;
    console.log('[DWQuiz] selectAnswer: Q' + (questionIndex + 1) + ' → ' + (ANSWER_LETTERS[answerIndex] || answerIndex));

    var answers = pane.querySelectorAll(DW_QUIZ_CONFIG.selectors.answer);
    answers.forEach(function (label, i) {
      var sel = i === answerIndex;
      label.classList.toggle('dw-is-selected', sel);
      var input = label.querySelector(DW_QUIZ_CONFIG.selectors.answerInput);
      if (input) input.checked = sel;
      var radioInput = label.querySelector('.w-radio-input');
      if (radioInput) {
        if (sel) _approvedRadioInputs.add(radioInput);
        else _approvedRadioInputs.delete(radioInput);
        radioInput.classList.toggle('w--redirected-checked', sel);
      }
    });

    var letter = ANSWER_LETTERS[answerIndex] || String(answerIndex);
    var qData = DW_QUIZ_CONFIG.questions[questionIndex] || {};
    var correctAnswer = qData.correctAnswer || null;
    var isCorrect = correctAnswer !== null && letter === correctAnswer;
    var score = isCorrect
      ? DW_QUIZ_CONFIG.scoring.correctAnswerScore
      : DW_QUIZ_CONFIG.scoring.incorrectAnswerScore;

    var chosen = answers[answerIndex];
    var labelEl = chosen ? chosen.querySelector(DW_QUIZ_CONFIG.selectors.answerLabel) : null;

    state.answers[questionIndex] = {
      questionIndex: questionIndex,
      questionNumber: questionIndex + 1,
      questionText: qData.text || '',
      correctAnswer: correctAnswer,
      answerLetter: letter,
      answerIndex: answerIndex,
      answerText: labelEl ? labelEl.textContent.trim() : '',
      isCorrect: isCorrect,
      score: score,
      skipped: false
    };

    clearPaneError(pane);
    pushEvent('dw_quiz_question_answered', {
      questionNumber: questionIndex + 1,
      answerLetter: letter,
      isCorrect: isCorrect
    });
    saveState();
  }

  // ─── SKIP ────────────────────────────────────────────────────────────────────

  function skipQuestion(questionIndex) {
    console.log('[DWQuiz] skipQuestion: Q' + (questionIndex + 1));
    var qData = DW_QUIZ_CONFIG.questions[questionIndex] || {};
    state.answers[questionIndex] = {
      questionIndex: questionIndex,
      questionNumber: questionIndex + 1,
      questionText: qData.text || '',
      correctAnswer: qData.correctAnswer || null,
      answerLetter: null,
      answerIndex: null,
      answerText: null,
      isCorrect: false,
      score: DW_QUIZ_CONFIG.scoring.skippedScore,
      skipped: true
    };

    pushEvent('dw_quiz_question_skipped', { questionNumber: questionIndex + 1 });
    saveState();

    if (questionIndex >= dom.panes.length - 1) {
      submitQuiz();
    } else {
      goToQuestion(questionIndex + 1);
    }
  }

  // ─── NEXT HANDLER ────────────────────────────────────────────────────────────

  function handleNextClick() {
    var idx = state.currentIndex;
    console.log('[DWQuiz] next clicked at Q' + (idx + 1));

    if (DW_QUIZ_CONFIG.behavior.requireAnswerForNext) {
      var ans = state.answers[idx];
      if (!ans || ans.skipped || !ans.answerLetter) {
        console.log('[DWQuiz] next blocked — no answer selected');
        showPaneError(
          dom.panes[idx],
          'Please select an answer to continue.'
        );
        return;
      }
    }

    if (idx === dom.panes.length - 1) {
      console.log('[DWQuiz] last question — submitting quiz');
      submitQuiz();
    } else {
      goToQuestion(idx + 1);
    }
  }

  // ─── ERROR DISPLAY ───────────────────────────────────────────────────────────

  function showPaneError(pane, msg) {
    var err = pane && pane.querySelector('.dw-error');
    if (err) err.textContent = msg;
  }

  function clearPaneError(pane) {
    var err = pane && pane.querySelector('.dw-error');
    if (err) err.textContent = '';
  }

  // ─── SUBMIT QUIZ ─────────────────────────────────────────────────────────────

  function submitQuiz() {
    calculateResults();
    state.quizCompleted = true;
    showContactGate();
  }

  // ─── SCORING ─────────────────────────────────────────────────────────────────

  function calculateResults() {
    var correctCount = 0;
    var answeredCount = 0;
    var skippedCount = 0;
    var countsByAnswer = { A: 0, B: 0, C: 0, D: 0, E: 0, skipped: 0 };
    var totalQuestions = dom.panes.length;

    state.answers.forEach(function (ans) {
      if (!ans || ans.skipped) { skippedCount++; countsByAnswer.skipped++; return; }
      answeredCount++;
      if (ans.answerLetter && countsByAnswer[ans.answerLetter] !== undefined) {
        countsByAnswer[ans.answerLetter]++;
      }
      if (ans.isCorrect) correctCount++;
    });

    // Account for any questions the user never reached
    var missedCount = totalQuestions - state.answers.length;
    skippedCount += missedCount;
    countsByAnswer.skipped += missedCount;

    var maxScore = totalQuestions;
    var scorePercent = maxScore > 0 ? Math.round((correctCount / maxScore) * 100) : 0;
    var tier = resolveTier(scorePercent);
    var answerPatternResult = resolveAnswerPattern(countsByAnswer);

    state.result = {
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      maxScore: maxScore,
      scorePercent: scorePercent,
      tier: tier ? tier.id : 'emerging',
      tierLabel: tier ? tier.label : '',
      tierMessage: tier ? tier.message : '',
      answeredCount: answeredCount,
      skippedCount: skippedCount,
      countsByAnswer: countsByAnswer,
      answerPatternResult: answerPatternResult
    };

    pushEvent('dw_quiz_completed', {
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      scorePercent: scorePercent,
      tier: state.result.tier,
      answeredCount: answeredCount,
      skippedCount: skippedCount
    });
  }

  function resolveTier(scorePercent) {
    var tiers = DW_QUIZ_CONFIG.scoring.tiers;
    for (var i = 0; i < tiers.length; i++) {
      if (scorePercent >= tiers[i].minPercent) return tiers[i];
    }
    return tiers[tiers.length - 1];
  }

  function resolveAnswerPattern(counts) {
    var ab = (counts.A || 0) + (counts.B || 0);
    var cd = (counts.C || 0) + (counts.D || 0) + (counts.E || 0);
    var total = ab + cd;
    if (total === 0) return 'mixed';
    if (ab / total >= 0.6) return 'mostly-ab';
    if (cd / total >= 0.6) return 'mostly-cd';
    return 'mixed';
  }

  // ─── CONTACT GATE ────────────────────────────────────────────────────────────

  function showContactGate() {
    _setScreen('contact'); // hides quiz_start, form, all panes; shows gate

    var mkto = DW_QUIZ_CONFIG.integrations.marketo;
    if (mkto.enabled && mkto.formId) {
      initMarketo();
    } else {
      renderFallbackForm();
    }
  }

  // Watches the Webflow form pane for its .w-form-done success block becoming
  // visible (Webflow shows it after a successful AJAX form submission), then
  // triggers showResults().
  function watchWebflowFormSuccess() {
    var successEl = dom.formPane.querySelector('.w-form-done');
    if (!successEl) {
      console.warn('[DWQuiz] No .w-form-done found in #quiz-form-pane. Falling back to submit event.');
      var formEl = dom.formPane.querySelector('form');
      if (formEl) {
        formEl.addEventListener('submit', function () {
          setTimeout(showResults, 1500);
        }, { once: true });
      }
      return;
    }

    console.log('[DWQuiz] Watching #quiz-form-pane for Webflow form submission success');
    var done = false;
    var observer = new MutationObserver(function () {
      if (done) return;
      if (window.getComputedStyle(successEl).display !== 'none') {
        done = true;
        observer.disconnect();
        console.log('[DWQuiz] Webflow form success detected — showing results');
        showResults();
      }
    });

    observer.observe(successEl, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  // ─── MARKETO INTEGRATION ─────────────────────────────────────────────────────

  function initMarketo() {
    var mkto = DW_QUIZ_CONFIG.integrations.marketo;
    var cfg = DW_QUIZ_CONFIG.selectors;

    // Inject <form id="mktoForm_XXXX"> into #form-target (inside formPane) or contactGate
    var formElId = 'mktoForm_' + mkto.formId;
    if (!document.getElementById(formElId)) {
      var target = (dom.formPane && cfg.formTarget)
        ? dom.formPane.querySelector(cfg.formTarget)
        : dom.contactGate;
      if (target) {
        var formEl = document.createElement('form');
        formEl.id = formElId;
        target.appendChild(formEl);
      }
    }

    function doLoad() {
      MktoForms2.loadForm(mkto.serverUrl, mkto.munchkinId, mkto.formId, function (form) {
        form.addHiddenFields(buildMarketoPayload());
        form.onSuccess(function (values) {
          state.contact = values || {};
          showResults();
          return false; // prevent Marketo's default redirect
        });
      });
    }

    if (window.MktoForms2) {
      doLoad();
    } else {
      var script = document.createElement('script');
      script.src = mkto.serverUrl + '/js/forms2/js/forms2.min.js';
      script.onload = doLoad;
      document.head.appendChild(script);
    }
  }

  function buildMarketoPayload() {
    var r = state.result || {};
    var fm = DW_QUIZ_CONFIG.integrations.marketo.hiddenFieldMap;
    var payload = {};
    payload[fm.score]          = String(r.correctCount || 0);
    payload[fm.scorePercent]   = String(r.scorePercent || 0);
    payload[fm.tier]           = r.tier || '';
    payload[fm.correctCount]   = String(r.correctCount || 0);
    payload[fm.totalQuestions] = String(r.totalQuestions || 0);
    payload[fm.answersJson]    = JSON.stringify(state.answers);
    payload[fm.talkToExpertRequested] = 'false';
    return payload;
  }

  // ─── FALLBACK CONTACT FORM ───────────────────────────────────────────────────

  function renderFallbackForm() {
    if (!dom.contactGate) return;
    dom.contactGate.innerHTML =
      '<div class="dw-contact-form" style="max-width:520px;margin:0 auto;">' +
        '<h2>Get Your Results</h2>' +
        '<p>Enter your information below to see your personalized results.</p>' +
        '<form id="dw-fallback-form" novalidate>' +
          buildField('text',  'dw_firstName',    'First Name',           true)  +
          buildField('text',  'dw_lastName',     'Last Name',            true)  +
          buildField('email', 'dw_email',        'Work Email',           true)  +
          buildField('text',  'dw_title',        'Title / Role',         false) +
          buildField('text',  'dw_organization', 'School / Organization', true)  +
          buildField('text',  'dw_district',     'District',             false) +
          buildField('text',  'dw_state',        'State',                false) +
          buildField('tel',   'dw_phone',        'Phone',                false) +
          '<div id="dw-fb-error" role="alert" aria-live="polite" ' +
            'style="color:#c00;font-size:.875rem;margin:.5rem 0;min-height:1.25em;"></div>' +
          '<button type="submit" class="global-button w-button" ' +
            'style="margin-top:1rem;">Get My Results</button>' +
        '</form>' +
      '</div>';

    var form = document.getElementById('dw-fallback-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitFallbackForm(form);
      });
    }
  }

  function buildField(type, id, label, required) {
    return '<div class="dw-field" style="margin-bottom:.75rem;">' +
      '<label for="' + id + '" style="display:block;margin-bottom:.25rem;font-weight:600;">' +
        escHtml(label) + (required ? ' <span aria-hidden="true">*</span>' : '') +
      '</label>' +
      '<input type="' + type + '" id="' + id + '" name="' + id + '"' +
        (required ? ' required aria-required="true"' : '') +
        ' style="width:100%;padding:.5rem .75rem;border:1px solid #ccc;border-radius:4px;font-size:1rem;">' +
      '</div>';
  }

  function submitFallbackForm(form) {
    var errEl = document.getElementById('dw-fb-error');
    var g = function (id) { var el = form.querySelector('#' + id); return el ? el.value.trim() : ''; };

    var contact = {
      firstName:      g('dw_firstName'),
      lastName:       g('dw_lastName'),
      email:          g('dw_email'),
      phone:          g('dw_phone'),
      title:          g('dw_title'),
      organization:   g('dw_organization'),
      schoolDistrict: g('dw_district'),
      state:          g('dw_state')
    };

    var err = validateContact(contact);
    if (err) { if (errEl) errEl.textContent = err; return; }
    if (errEl) errEl.textContent = '';

    state.contact = contact;

    var endpoint = DW_QUIZ_CONFIG.integrations.fallbackEndpoint;
    if (!endpoint) {
      console.warn('[DWQuiz] No fallbackEndpoint configured. Showing results without remote submission.');
      showResults();
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSubmissionPayload(contact))
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      showResults();
    }).catch(function (fetchErr) {
      console.error('[DWQuiz] Fallback submission failed:', fetchErr);
      if (errEl) errEl.textContent = 'Submission failed. Please try again.';
      if (dom.failEl) dom.failEl.style.display = '';
    });
  }

  function validateContact(data) {
    if (!data.firstName)    return 'Please enter your first name.';
    if (!data.lastName)     return 'Please enter your last name.';
    if (!data.email)        return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Please enter a valid email address.';
    if (!data.organization) return 'Please enter your school or organization.';
    return null;
  }

  function buildSubmissionPayload(contact) {
    var r = state.result || {};
    return {
      source: 'Digital Well-Being Quiz LP',
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      contact: contact,
      quiz: {
        correctCount: r.correctCount || 0,
        totalQuestions: r.totalQuestions || 0,
        maxScore: r.maxScore || 0,
        scorePercent: r.scorePercent || 0,
        tier: r.tier || '',
        answeredCount: r.answeredCount || 0,
        skippedCount: r.skippedCount || 0,
        countsByAnswer: r.countsByAnswer || {},
        answers: state.answers
      }
    };
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────────

  function showResults() {
    state.completedAt = new Date().toISOString();
    state.contactSubmitted = true;

    _setScreen('results');

    var r = state.result || {};
    var ctaUrl = DW_QUIZ_CONFIG.integrations.marketo.talkToExpertUrl || '/purchase/request-a-demo';

    // Build question review rows
    var reviewRows = DW_QUIZ_CONFIG.questions.map(function (q, i) {
      var ans = state.answers[i];
      var skipped = !ans || ans.skipped;
      var correct = ans && ans.isCorrect;
      var icon = skipped ? '—' : (correct ? '✅' : '❌');
      var chosen = ans && ans.answerLetter
        ? ans.answerLetter + '. ' + escHtml(ans.answerText || '')
        : 'Skipped';
      var correctText = q.correctAnswer + '. ' +
        escHtml(q.answers[ANSWER_LETTERS.indexOf(q.correctAnswer)] || '');

      return '<div class="dw-review-row" style="margin-bottom:1rem;padding:.75rem;' +
        'background:' + (correct ? '#f0faf0' : (skipped ? '#fafafa' : '#fff5f5')) + ';' +
        'border-left:3px solid ' + (correct ? '#2e7d32' : (skipped ? '#999' : '#c62828')) + ';' +
        'border-radius:0 4px 4px 0;">' +
        '<p style="font-weight:600;margin:0 0 .25rem;">' + icon + ' Q' + (i + 1) + ': ' + escHtml(q.text) + '</p>' +
        '<p style="margin:0 0 .1rem;font-size:.875rem;">Your answer: ' + chosen + '</p>' +
        (!correct && !skipped
          ? '<p style="margin:0;font-size:.875rem;color:#2e7d32;">Correct answer: ' + correctText + '</p>'
          : '') +
        '</div>';
    }).join('');

    var html =
      '<div class="dw-results-inner" style="max-width:680px;margin:0 auto;padding:4rem 2rem;">' +

        // Eyebrow
        '<p style="text-transform:uppercase;letter-spacing:.08em;color:#e07b00;' +
          'font-weight:700;font-size:.875rem;margin:0 0 1rem;">Your Results</p>' +

        // Main headline
        '<h2 style="margin:0 0 1.5rem;">Your Results Point to an Opportunity</h2>' +

        // Marketing copy
        '<p style="margin:0 0 1rem;">The quiz shows what many educators are seeing: students need guidance to navigate ' +
          'digital spaces safely, responsibly, and with confidence.</p>' +
        '<p style="margin:0 0 1.5rem;">The Second Step® Digital Well-Being specialized unit helps make that possible.</p>' +

        '<p style="font-weight:700;margin:0 0 .5rem;">Support students’ digital choices—on purpose</p>' +
        '<p style="margin:0 0 .75rem;">This research-informed specialized unit helps students:</p>' +
        '<ul style="margin:0 0 1.5rem 1.25rem;padding:0;line-height:1.7;">' +
          '<li>Build healthy, responsible relationships with technology and AI</li>' +
          '<li>Recognize what supports (or harms) their digital well-being</li>' +
          '<li>Make smart, ethical decisions online—at school and beyond</li>' +
        '</ul>' +
        '<p style="margin:0 0 1.5rem;">Designed to integrate smoothly into instruction, it gives educators practical tools ' +
          'to address today’s digital challenges with confidence.</p>' +

        '<p style="font-weight:700;margin:0 0 .5rem;">Let’s talk about what’s right for your school</p>' +
        '<p style="margin:0 0 2rem;">Connect with a Second Step expert to explore how the Digital Well-Being specialized unit ' +
          'can support your students and goals.</p>' +

        // CTA
        '<a href="' + escHtml(ctaUrl) + '" class="global-button w-button" data-quiz-talk-to-expert ' +
          'style="display:inline-block;">Talk to an expert</a>' +

        // Divider
        '<hr style="margin:3rem 0;border:none;border-top:1px solid rgba(255,255,255,.2);">' +

        // Question review
        '<div class="dw-review">' +
          '<h3 style="margin:0 0 .5rem;">Question Review</h3>' +
          '<p style="margin:0 0 1.5rem;">Score: <strong>' +
            (r.correctCount || 0) + ' / ' + (r.totalQuestions || 0) +
            ' correct</strong> (' + (r.scorePercent || 0) + '%)' +
          '</p>' +
          reviewRows +
        '</div>' +

      '</div>';

    if (dom.results) {
      dom.results.innerHTML = html;
      dom.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    pushEvent('dw_quiz_completed', {
      correctCount: r.correctCount,
      totalQuestions: r.totalQuestions,
      scorePercent: r.scorePercent,
      tier: r.tier
    });

    clearSessionState();
    saveState();
  }

  // ─── TALK TO EXPERT ──────────────────────────────────────────────────────────

  function handleTalkToExpertClick(e) {
    e.preventDefault();
    var r = state.result || {};

    pushEvent('dw_quiz_talk_to_expert_clicked', {
      scorePercent: r.scorePercent,
      tier: r.tier
    });

    if (window.MktoForms2 && state.contactSubmitted) {
      try {
        MktoForms2.whenReady(function (form) {
          var update = {};
          var fm = DW_QUIZ_CONFIG.integrations.marketo.hiddenFieldMap;
          update[fm.talkToExpertRequested] = 'true';
          form.addHiddenFields(update);
        });
      } catch (err) { /* non-critical */ }
    }

    var url = DW_QUIZ_CONFIG.integrations.marketo.talkToExpertUrl;
    if (url) window.location.href = url;
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────────────

  function pushEvent(name, data) {
    if (!window.dataLayer) return;
    var payload = { event: name };
    if (data) Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
    window.dataLayer.push(payload);
  }

  // ─── SESSION STORAGE ─────────────────────────────────────────────────────────

  function saveState() {
    if (!DW_QUIZ_CONFIG.behavior.persistInSessionStorage) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        savedAt: Date.now(),
        currentIndex:     state.currentIndex,
        startedAt:        state.startedAt,
        completedAt:      state.completedAt,
        answers:          state.answers,
        contact:          state.contact,
        result:           state.result,
        quizCompleted:    state.quizCompleted,
        contactSubmitted: state.contactSubmitted
      }));
    } catch (e) { /* storage unavailable */ }
  }

  function restoreState() {
    if (!DW_QUIZ_CONFIG.behavior.persistInSessionStorage) return false;
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !saved.savedAt) return false;
      if (Date.now() - saved.savedAt > 86400000) { clearSessionState(); return false; }
      state.currentIndex    = saved.currentIndex    || 0;
      state.startedAt       = saved.startedAt       || null;
      state.completedAt     = saved.completedAt     || null;
      state.answers         = saved.answers         || [];
      state.contact         = saved.contact         || {};
      state.result          = saved.result          || null;
      state.quizCompleted   = saved.quizCompleted   || false;
      state.contactSubmitted = saved.contactSubmitted || false;
      return true;
    } catch (e) { return false; }
  }

  function clearSessionState() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  // ─── UTILITIES ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── DEBUG API ───────────────────────────────────────────────────────────────

  window.DWQuiz = {
    getState:     function () { return state; },
    reset:        function () { clearSessionState(); window.location.reload(); },
    goToQuestion: function (i) { goToQuestion(i); },
    config:       DW_QUIZ_CONFIG
  };

  // ─── BOOT ────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
