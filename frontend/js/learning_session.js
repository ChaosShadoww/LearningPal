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


//Display flashcards
// Enhanced flashcard display function
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
    
    // Reset card to front (remove flipped class)
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.remove('flipped');
    
    // Update navigation button states
    updateNavigationButtons(flashcards.length);
    
    // Set up event listeners (remove old ones first to prevent duplicates)
    setupFlashcardEventListeners(flashcards);
}

function updateNavigationButtons(totalCards) {
    const prevBtn = document.getElementById('prev-card');
    const nextBtn = document.getElementById('next-card');
    
    // Enable/disable buttons based on current position
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === totalCards - 1;
    
    // Update button text to show progress
    prevBtn.textContent = currentCardIndex === 0 ? '← First Card' : '← Previous';
    nextBtn.textContent = currentCardIndex === totalCards - 1 ? 'Last Card →' : 'Next →';
}

function setupFlashcardEventListeners(flashcards) {
    // Remove existing event listeners to prevent duplicates
    const oldFlipCard = document.getElementById('flip-card');
    const oldFlipBack = document.getElementById('flip-back');
    const oldPrevCard = document.getElementById('prev-card');
    const oldNextCard = document.getElementById('next-card');
    const oldFlashcard = document.querySelector('.flashcard');
    
    // Clone nodes to remove all event listeners
    if (oldFlipCard) {
        const newFlipCard = oldFlipCard.cloneNode(true);
        oldFlipCard.parentNode.replaceChild(newFlipCard, oldFlipCard);
    }
    
    if (oldFlipBack) {
        const newFlipBack = oldFlipBack.cloneNode(true);
        oldFlipBack.parentNode.replaceChild(newFlipBack, oldFlipBack);
    }
    
    if (oldPrevCard) {
        const newPrevCard = oldPrevCard.cloneNode(true);
        oldPrevCard.parentNode.replaceChild(newPrevCard, oldPrevCard);
    }
    
    if (oldNextCard) {
        const newNextCard = oldNextCard.cloneNode(true);
        oldNextCard.parentNode.replaceChild(newNextCard, oldNextCard);
    }
    
    // Add new event listeners
    
    // Flip to back (show answer)
    document.getElementById('flip-card').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click event
        flipCard(true);
    });
    
    // Flip to front (show question)
    document.getElementById('flip-back').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click event
        flipCard(false);
    });
    
    // Click anywhere on card to flip
    document.querySelector('.flashcard').addEventListener('click', () => {
        const flashcard = document.querySelector('.flashcard');
        const isFlipped = flashcard.classList.contains('flipped');
        flipCard(!isFlipped);
    });
    
    // Keyboard support for accessibility
    document.querySelector('.flashcard').addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            const flashcard = document.querySelector('.flashcard');
            const isFlipped = flashcard.classList.contains('flipped');
            flipCard(!isFlipped);
        }
    });
    
    // Navigation buttons
    document.getElementById('prev-card').addEventListener('click', () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            displayFlashcards(flashcards);
        }
    });
    
    document.getElementById('next-card').addEventListener('click', () => {
        if (currentCardIndex < flashcards.length - 1) {
            currentCardIndex++;
            displayFlashcards(flashcards);
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function flipCard(showAnswer) {
    const flashcard = document.querySelector('.flashcard');
    
    if (showAnswer) {
        flashcard.classList.add('flipped');
        // Focus on the back button for accessibility
        setTimeout(() => {
            document.getElementById('flip-back').focus();
        }, 300); // Wait for flip animation
    } else {
        flashcard.classList.remove('flipped');
        // Focus on the front button for accessibility
        setTimeout(() => {
            document.getElementById('flip-card').focus();
        }, 300); // Wait for flip animation
    }
}

function handleKeyboardNavigation(e) {
    // Only handle keyboard nav when flashcards are visible
    const flashcardsContainer = document.getElementById('flashcards-container');
    if (flashcardsContainer.style.display === 'none') {
        return;
    }
    
    const flashcard = document.querySelector('.flashcard');
    const isFlipped = flashcard.classList.contains('flipped');
    
    switch (e.code) {
        case 'ArrowLeft':
            e.preventDefault();
            document.getElementById('prev-card').click();
            break;
        case 'ArrowRight':
            e.preventDefault();
            document.getElementById('next-card').click();
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            e.preventDefault();
            flipCard(!isFlipped);
            break;
        case 'Space':
            e.preventDefault();
            flipCard(!isFlipped);
            break;
    }
}

// Auto-flip feature (optional)
function enableAutoFlip(intervalMs = 5000) {
    let autoFlipInterval;
    
    function startAutoFlip() {
        autoFlipInterval = setInterval(() => {
            const flashcard = document.querySelector('.flashcard');
            const isFlipped = flashcard.classList.contains('flipped');
            
            if (!isFlipped) {
                flipCard(true);
            } else {
                // Move to next card or flip back to question
                const totalCards = parseInt(document.getElementById('card-counter').textContent.split(' / ')[1]);
                if (currentCardIndex < totalCards - 1) {
                    document.getElementById('next-card').click();
                } else {
                    flipCard(false);
                }
            }
        }, intervalMs);
    }
    
    function stopAutoFlip() {
        if (autoFlipInterval) {
            clearInterval(autoFlipInterval);
            autoFlipInterval = null;
        }
    }
    
    // Add auto-flip controls
    const flashcardsContainer = document.getElementById('flashcards-container');
    if (!document.getElementById('auto-flip-toggle')) {
        const autoFlipButton = document.createElement('button');
        autoFlipButton.id = 'auto-flip-toggle';
        autoFlipButton.textContent = 'Start Auto-Flip';
        autoFlipButton.style.marginTop = '1rem';
        autoFlipButton.className = 'btn btn-secondary';
        
        autoFlipButton.addEventListener('click', () => {
            if (autoFlipInterval) {
                stopAutoFlip();
                autoFlipButton.textContent = 'Start Auto-Flip';
            } else {
                startAutoFlip();
                autoFlipButton.textContent = 'Stop Auto-Flip';
            }
        });
        
        flashcardsContainer.appendChild(autoFlipButton);
    }
    
    // Stop auto-flip when user interacts
    document.addEventListener('click', (e) => {
        if (e.target.closest('.flashcard') || e.target.closest('.flashcard-controls')) {
            stopAutoFlip();
            const toggleBtn = document.getElementById('auto-flip-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = 'Start Auto-Flip';
            }
        }
    });
}

// Enhanced display function that handles the content properly
function displayContent() {
    const { content, inputs } = currentSession;
    const learningStyle = inputs.learningStyle;

    console.log('🎯 Learning style:', learningStyle);
    console.log('📊 Content structure:', content);

    // Update session header
    document.getElementById('session-title').textContent = `Learning: ${inputs.topic}`;
    document.getElementById('learning-style-badge').textContent = learningStyle;
    document.getElementById('session-date').textContent = new Date(currentSession.createdAt).toLocaleDateString();

    // Hide all content containers
    document.querySelectorAll('.content-display').forEach(container => {
        container.style.display = 'none';
    });

    // Show appropriate content based on learning style
    switch (learningStyle) {
        case 'Flashcards':
            displayFlashcards(content.content.flashcards);
            // Optional: Enable auto-flip feature
            // enableAutoFlip(8000); // Auto-flip every 8 seconds
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

// Clean up event listeners when leaving the page
window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', handleKeyboardNavigation);
});

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