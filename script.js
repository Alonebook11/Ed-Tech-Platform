// Responsive navigation menu toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Hero overlay functionality
const heroOverlay = document.getElementById('heroOverlay');
if (heroOverlay) {
  heroOverlay.addEventListener('click', () => {
    heroOverlay.classList.add('hidden');
    // Store in localStorage so overlay doesn't show again in this session
    localStorage.setItem('overlayShown', 'true');
  });
}

// Check if overlay should be shown (only show once per session)
if (localStorage.getItem('overlayShown') === 'true') {
  if (heroOverlay) {
    heroOverlay.classList.add('hidden');
  }
}

// Quiz functionality
function startQuiz(quizType) {
  // Create quiz modal
  const quizModal = document.createElement('div');
  quizModal.className = 'quiz-modal';
  quizModal.innerHTML = `
    <div class="quiz-modal-content">
      <div class="quiz-modal-header">
        <h3>${getQuizTitle(quizType)}</h3>
        <button class="close-quiz" onclick="closeQuiz()">&times;</button>
      </div>
      <div class="quiz-body">
        <div class="quiz-instructions">
          <p>📝 Read each question carefully</p>
          <p>⏱️ You have ${getQuizTime(quizType)} minutes to complete</p>
          <p>✅ Select the best answer for each question</p>
        </div>
        <div class="quiz-questions" id="quizQuestions">
          ${generateQuizQuestions(quizType)}
        </div>
        <div class="quiz-actions">
          <button class="quiz-submit-btn" onclick="submitQuiz('${quizType}')">Submit Quiz</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(quizModal);
  
  // Add modal styles
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    .quiz-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }
    
    .quiz-modal-content {
      background: white;
      border-radius: 20px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    
    .quiz-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      border-bottom: 1px solid #e1e8ed;
    }
    
    .quiz-modal-header h3 {
      color: #2d6cdf;
      margin: 0;
      font-size: 1.5rem;
    }
    
    .close-quiz {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .close-quiz:hover {
      background: #f0f0f0;
      color: #333;
    }
    
    .quiz-body {
      padding: 2rem;
    }
    
    .quiz-instructions {
      background: rgba(45, 108, 223, 0.1);
      padding: 1.5rem;
      border-radius: 15px;
      margin-bottom: 2rem;
    }
    
    .quiz-instructions p {
      margin: 0.5rem 0;
      color: #2d6cdf;
      font-weight: 500;
    }
    
    .quiz-question {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 15px;
      margin-bottom: 1.5rem;
      border-left: 4px solid #2d6cdf;
    }
    
    .quiz-question h4 {
      color: #333;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }
    
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    
    .quiz-option {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 1rem;
      background: white;
      border: 2px solid #e1e8ed;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .quiz-option:hover {
      border-color: #2d6cdf;
      background: rgba(45, 108, 223, 0.05);
    }
    
    .quiz-option.selected {
      border-color: #2d6cdf;
      background: rgba(45, 108, 223, 0.1);
    }
    
    .quiz-actions {
      text-align: center;
      margin-top: 2rem;
    }
    
    .quiz-submit-btn {
      background: linear-gradient(45deg, #2d6cdf, #764ba2);
      color: white;
      border: none;
      padding: 1rem 3rem;
      border-radius: 25px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 25px rgba(45, 108, 223, 0.3);
    }
    
    .quiz-submit-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(45, 108, 223, 0.4);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @media (max-width: 768px) {
      .quiz-modal-content {
        width: 95%;
        margin: 1rem;
      }
      
      .quiz-modal-header,
      .quiz-body {
        padding: 1.5rem;
      }
    }
  `;
  
  document.head.appendChild(modalStyles);
  
  // Add click handlers for quiz options
  setTimeout(() => {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(option => {
      option.addEventListener('click', function() {
        // Remove selected class from siblings
        const question = this.closest('.quiz-question');
        question.querySelectorAll('.quiz-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        // Add selected class to clicked option
        this.classList.add('selected');
      });
    });
  }, 100);
}

function closeQuiz() {
  const modal = document.querySelector('.quiz-modal');
  if (modal) {
    modal.remove();
  }
}

function getQuizTitle(quizType) {
  const titles = {
    'web-dev': 'Web Development Basics',
    'data-science': 'Data Science Fundamentals',
    'ai-ml': 'AI & Machine Learning',
    'dsa': 'DSA Practice'
  };
  return titles[quizType] || 'Quiz';
}

function getQuizTime(quizType) {
  const times = {
    'web-dev': 20,
    'data-science': 30,
    'ai-ml': 45,
    'dsa': 60
  };
  return times[quizType] || 30;
}

function generateQuizQuestions(quizType) {
  const questions = getQuizQuestions(quizType);
  return questions.map((q, index) => `
    <div class="quiz-question">
      <h4>Question ${index + 1}: ${q.question}</h4>
      <div class="quiz-options">
        ${q.options.map((option, optIndex) => `
          <div class="quiz-option" data-correct="${optIndex === q.correct}">
            <input type="radio" name="q${index}" value="${optIndex}" style="display: none;">
            <span>${String.fromCharCode(65 + optIndex)}.</span>
            <span>${option}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function getQuizQuestions(quizType) {
  const questionSets = {
    'web-dev': [
      {
        question: "What does HTML stand for?",
        options: ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"],
        correct: 0
      },
      {
        question: "Which CSS property controls the text size?",
        options: ["text-size", "font-size", "text-style", "font-style"],
        correct: 1
      },
      {
        question: "How do you declare a JavaScript variable?",
        options: ["variable carName;", "v carName;", "var carName;", "let carName;"],
        correct: 2
      }
    ],
    'data-science': [
      {
        question: "What is the primary purpose of NumPy in Python?",
        options: ["Web development", "Numerical computing", "Database management", "Game development"],
        correct: 1
      },
      {
        question: "Which library is commonly used for data visualization in Python?",
        options: ["NumPy", "Pandas", "Matplotlib", "Scikit-learn"],
        correct: 2
      },
      {
        question: "What does 'NaN' stand for in data analysis?",
        options: ["Not a Number", "New and Null", "Number and Null", "Not Available Now"],
        correct: 0
      }
    ],
    'ai-ml': [
      {
        question: "What is supervised learning?",
        options: ["Learning without labeled data", "Learning with labeled training data", "Learning through trial and error", "Learning from environment"],
        correct: 1
      },
      {
        question: "Which algorithm is used for classification problems?",
        options: ["Linear Regression", "Logistic Regression", "K-Means Clustering", "Principal Component Analysis"],
        correct: 1
      },
      {
        question: "What is overfitting in machine learning?",
        options: ["Model performs well on training data but poorly on new data", "Model performs poorly on all data", "Model is too simple", "Model takes too long to train"],
        correct: 0
      }
    ],
    'dsa': [
      {
        question: "What is the time complexity of binary search?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        correct: 1
      },
      {
        question: "Which data structure follows LIFO principle?",
        options: ["Queue", "Stack", "Tree", "Graph"],
        correct: 1
      },
      {
        question: "What is the worst-case time complexity of bubble sort?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        correct: 2
      }
    ]
  };
  
  return questionSets[quizType] || questionSets['web-dev'];
}

function submitQuiz(quizType) {
  const questions = document.querySelectorAll('.quiz-question');
  let score = 0;
  let total = questions.length;
  
  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('.quiz-option.selected');
    if (selectedOption) {
      const isCorrect = selectedOption.getAttribute('data-correct') === 'true';
      if (isCorrect) score++;
    }
  });
  
  const percentage = Math.round((score / total) * 100);
  
  // Show results
  const quizBody = document.querySelector('.quiz-body');
  quizBody.innerHTML = `
    <div class="quiz-results">
      <h3>Quiz Results</h3>
      <div class="result-score">
        <span class="score-number">${score}/${total}</span>
        <span class="score-percentage">${percentage}%</span>
      </div>
      <div class="result-message">
        ${getResultMessage(percentage)}
      </div>
      <button class="quiz-submit-btn" onclick="closeQuiz()">Close</button>
    </div>
  `;
  
  // Add result styles
  const resultStyles = document.createElement('style');
  resultStyles.textContent = `
    .quiz-results {
      text-align: center;
      padding: 2rem;
    }
    
    .result-score {
      margin: 2rem 0;
    }
    
    .score-number {
      font-size: 3rem;
      font-weight: bold;
      color: #2d6cdf;
      display: block;
    }
    
    .score-percentage {
      font-size: 1.5rem;
      color: #666;
    }
    
    .result-message {
      background: rgba(45, 108, 223, 0.1);
      padding: 1.5rem;
      border-radius: 15px;
      margin: 2rem 0;
      color: #2d6cdf;
      font-weight: 500;
    }
  `;
  
  document.head.appendChild(resultStyles);
}

function getResultMessage(percentage) {
  if (percentage >= 90) return "🎉 Excellent! You have a strong understanding of this topic!";
  if (percentage >= 70) return "👍 Good job! You're on the right track!";
  if (percentage >= 50) return "📚 Not bad! Keep studying to improve your knowledge.";
  return "📖 Keep learning! Review the material and try again.";
}

// Optional: Prevent form submission (demo only)
document.querySelector('.contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Thank you for reaching out! We will get back to you soon.');
  this.reset();
}); 