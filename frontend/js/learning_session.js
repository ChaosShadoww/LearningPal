// Get session ID from URL
const urlPath = window.location.pathname;
const sessionId = urlPath.split('/').pop();

let currentSession = null;
let currentCardIndex = 0;
let currentQuestionIndex = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/auth';
        return;
    }

    // Load session data
    await loadLearningSession();
});

// Load learning session data
async function loadLearningSession() {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/learning-session/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load session');
        }

        currentSession = await response.json();
        console.log('📄 Session loaded:', currentSession); // Debug log
        displayContent();
        
    } catch (error) {
        console.error('Error loading session:', error);
        showError('Failed to load learning session. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display content based on learning style
function displayContent() {
    const { content, inputs } = currentSession;
    const learningStyle = inputs.learningStyle;

    console.log('🎯 Learning style:', learningStyle); // Debug log
    console.log('📊 Content structure:', content); // Debug log

    // Update session header
    document.getElementById('session-title').textContent = `Learning: ${inputs.topic}`;
    document.getElementById('learning-style-badge').textContent = learningStyle;
    document.getElementById('session-date').textContent = new Date(currentSession.createdAt).toLocaleDateString();

    // Hide all content containers
    document.querySelectorAll('.content-display').forEach(container => {
        container.style.display = 'none';
    });

    // Show appropriate content based on learning style (fixed case matching)
    switch (learningStyle) {
        case 'Flashcards':
            displayFlashcards(content.content.flashcards);
            break;
        case 'Practice Quizzes':
            displayQuiz(content.content.quiz);
            break;
        case 'Study Guide':
            displayStudyGuide(content.content.studyGuide);
            break;
        case 'Practice Assignments':
            displayAssignment(content.content.assignment);
            break;
        default:
            console.error('❌ Unknown learning style:', learningStyle);
            showError(`Unknown learning style: "${learningStyle}". Available styles: Flashcards, Practice Quizzes, Study Guide, Practice Assignments`);
    }

    document.getElementById('content-container').style.display = 'block';
}

// Display flashcards
function displayFlashcards(flashcards) {
    if (!flashcards || flashcards.length === 0) {
        showError('No flashcards available');
        return;
    }

    document.getElementById('flashcards-container').style.display = 'block';
    
    // Update counter
    document.getElementById('card-counter').textContent = `${currentCardIndex + 1} / ${flashcards.length}`;
    
    // Display current flashcard
    const currentCard = flashcards[currentCardIndex];
    document.getElementById('flashcard-question').textContent = currentCard.question;
    document.getElementById('flashcard-answer').textContent = currentCard.answer;
    
    // Reset card to front
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.remove('flipped');
    
    // Event listeners
    document.getElementById('flip-card').onclick = () => {
        document.querySelector('.flashcard').classList.add('flipped');
    };
    
    document.getElementById('flip-back').onclick = () => {
        document.querySelector('.flashcard').classList.remove('flipped');
    };
    
    document.getElementById('prev-card').onclick = () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            displayFlashcards(flashcards);
        }
    };
    
    document.getElementById('next-card').onclick = () => {
        if (currentCardIndex < flashcards.length - 1) {
            currentCardIndex++;
            displayFlashcards(flashcards);
        }
    };
}

// Display quiz
function displayQuiz(quizQuestions) {
    if (!quizQuestions || quizQuestions.length === 0) {
        showError('No quiz questions available');
        return;
    }

    document.getElementById('quiz-container').style.display = 'block';
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    
    // Update question
    document.getElementById('quiz-question').textContent = currentQuestion.question;
    document.getElementById('quiz-counter').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    
    // Create options
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    currentQuestion.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'quiz-option';
        optionDiv.innerHTML = `
            <input type="radio" name="quiz-answer" value="${index}" id="option-${index}">
            <label for="option-${index}">${option}</label>
        `;
        optionsContainer.appendChild(optionDiv);
    });
    
    // Enable submit button when option is selected
    document.querySelectorAll('input[name="quiz-answer"]').forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById('submit-answer').disabled = false;
        });
    });
    
    // Submit answer handler
    document.getElementById('submit-answer').onclick = () => {
        const selectedOption = document.querySelector('input[name="quiz-answer"]:checked');
        if (selectedOption) {
            checkAnswer(selectedOption.value, currentQuestion.correct, quizQuestions);
        }
    };
}

// Check quiz answer
function checkAnswer(selectedValue, correctAnswer, quizQuestions) {
    const feedback = document.getElementById('quiz-feedback');
    const isCorrect = selectedValue === correctAnswer;
    
    feedback.innerHTML = isCorrect 
        ? '<p class="correct">✅ Correct!</p>'
        : `<p class="incorrect">❌ Incorrect. The correct answer is ${correctAnswer}</p>`;
    
    feedback.style.display = 'block';
    
    // Disable submit, enable next
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'block';
    
    // Next question handler
    document.getElementById('next-question').onclick = () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            currentQuestionIndex++;
            displayQuiz(quizQuestions);
            
            // Reset buttons
            document.getElementById('submit-answer').style.display = 'block';
            document.getElementById('submit-answer').disabled = true;
            document.getElementById('next-question').style.display = 'none';
            feedback.style.display = 'none';
        } else {
            feedback.innerHTML = '<p class="quiz-complete">🎉 Quiz completed!</p>';
            document.getElementById('next-question').style.display = 'none';
        }
    };
}

// Display study guide
function displayStudyGuide(studyGuideContent) {
    document.getElementById('study-guide-container').style.display = 'block';
    
    // Convert markdown-like content to HTML
    const formattedContent = studyGuideContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    document.getElementById('study-guide-content').innerHTML = `<p>${formattedContent}</p>`;
}

// Display assignment
function displayAssignment(assignmentContent) {
    document.getElementById('assignment-container').style.display = 'block';
    
    // Convert markdown-like content to HTML
    const formattedContent = assignmentContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    document.getElementById('assignment-content').innerHTML = `<p>${formattedContent}</p>`;
}

// Utility functions
function showLoading(show = true) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-container').style.display = 'block';
    document.getElementById('content-container').style.display = 'none';
}

// Event listeners
document.getElementById('back-home-btn').addEventListener('click', () => {
    window.location.href = '/home';
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = '/auth';
});

document.getElementById('retry-load').addEventListener('click', () => {
    document.getElementById('error-container').style.display = 'none';
    loadLearningSession();
});

document.getElementById('save-session').addEventListener('click', () => {
    // Sessions are automatically saved, so just show confirmation
    alert('Session is already saved! You can find it in "My Sessions" on the home page.');
});

document.getElementById('regenerate-content').addEventListener('click', async () => {
    if (confirm('Are you sure you want to regenerate this content? This will create a new session.')) {
        try {
            // Redirect back to home with the same inputs to regenerate
            const inputs = currentSession.inputs;
            const params = new URLSearchParams({
                topic: inputs.topic,
                goal: inputs.goal,
                level: inputs.level,
                learningStyle: inputs.learningStyle,
                sourceDocument: inputs.sourceDocument || ''
            });
            window.location.href = `/home?${params.toString()}`;
        } catch (error) {
            alert('Error preparing regeneration. Please go to home page and try again.');
        }
    }
});

document.getElementById('share-session').addEventListener('click', () => {
    try {
        navigator.clipboard.writeText(window.location.href);
        alert('Session link copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Session link copied to clipboard!');
    }
});