const express = require('express');
const { authenticateToken } = require('./auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use the same PostgreSQL configuration as auth.js
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'learningpal_user',
    password: process.env.DB_PASSWORD || 'learningpal_password',
    database: process.env.DB_NAME || 'learningpal',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000
};

// Create connection pool
const pool = new Pool(dbConfig);

// Initialize learning sessions table
async function initializeLearningTable() {
    try {
        const client = await pool.connect();
        
        // Create learning_sessions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS learning_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                topic VARCHAR(500) NOT NULL,
                goal TEXT NOT NULL,
                level VARCHAR(100) NOT NULL,
                learning_style VARCHAR(100) NOT NULL,
                source_document TEXT,
                content JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_learning_sessions_created_at ON learning_sessions(created_at)
        `);
        
        client.release();
        console.log('Learning sessions table initialized successfully');
        
    } catch (error) {
        console.error('Learning table initialization error:', error);
        throw error;
    }
}

// Initialize table on startup
initializeLearningTable().catch(console.error);

// InputHandler class
class InputHandler {
    constructor() {
        this.systemPrompt = `You are a personal learning assistant that helps users learn the topics that they want. 
There will be 5 input boxes that you will learn from:
Input box 1: what topic user wants to learn about
Input box 2: what is their desired goal
Input box 3: what is User's current level of understanding on the topic
Input box 4: optional input of source document
Input box 5: learning style

The valid learning styles are:
- "Flashcards" or "flashcards"
- "Practice Quizzes" or "Practice Quizes" or "quiz" or "quizzes"
- "Study Guide" or "study guide" or "guide"
- "Practice Assignments" or "assignments" or "practice"

Use the inputs from these boxes to help the user learn.

IMPORTANT: Always respond with valid JSON in this exact format:
{
    "type": "learning_material",
    "content": {
        "flashcards": [{"question": "...", "answer": "..."}],
        "quiz": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A"}],
        "studyGuide": "...",
        "assignment": "..."
    }
}

Based on the learning style requested:
- If Flashcards/flashcards: Create 8-10 clear question-answer pairs that help memorize key concepts
- If Practice Quizzes/quiz: Create 5-8 test questions that assess knowledge on the topic  
- If Study Guide/guide: Create a comprehensive but clear study guide that presents the information
- If Practice Assignments/assignments: Create assignments with practice problems to learn by doing

Always prioritize the source document content when provided, then supplement with your knowledge of the topic.
Always generate content for ALL four types (flashcards, quiz, studyGuide, assignment) regardless of the requested style, but focus primarily on the requested style.`;
    }

    formatPrompt(userInputs) {
        let prompt = this.systemPrompt + "\n\nUser Inputs:\n";
        
        prompt += `Topic: ${userInputs.topic}\n`;
        prompt += `Goal: ${userInputs.goal}\n`;
        prompt += `Current Level: ${userInputs.level}\n`;
        prompt += `Learning Style: ${userInputs.learningStyle}\n`;
        
        // Debug logging
        console.log('🔍 Learning style received:', userInputs.learningStyle);
        console.log('🔍 Learning style type:', typeof userInputs.learningStyle);
        
        if (userInputs.sourceDocument && userInputs.sourceDocument.trim()) {
            prompt += `Source Document: ${userInputs.sourceDocument}\n`;
            prompt += "\nPlease base your learning material primarily on the provided source document, supplemented with additional relevant information as needed.\n";
        }
        
        prompt += `\nGenerate content focused on the "${userInputs.learningStyle}" learning style. Return valid JSON only.`;
        
        console.log('📝 Full prompt being sent to Gemini:', prompt);
        
        return prompt;
    }

    async generateLearningMaterial(userInputs, userId) {
        try {
            const prompt = this.formatPrompt(userInputs);
            
            // Call Gemini service
            const llmResponse = await this.callLLMService(prompt);
            
            // Generate unique session ID
            const sessionId = this.generateSessionId();
            
            // Store in database
            const learningSession = {
                sessionId: sessionId,
                userId: userId,
                inputs: userInputs,
                content: llmResponse,
                createdAt: new Date(),
                learningStyle: userInputs.learningStyle
            };
            
            await this.storeLearningSession(learningSession);
            
            return {
                sessionId: sessionId,
                content: llmResponse,
                success: true
            };
            
        } catch (error) {
            console.error('Error generating learning material:', error);
            throw error;
        }
    }

    async callLLMService(prompt) {
        try {
            // Get the Gemini model (updated model name)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // Generate content
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('🤖 Raw Gemini response:', text.substring(0, 500) + '...');
            
            // Parse the JSON response
            let parsedResponse;
            try {
                // Clean the response in case there are markdown code blocks
                const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsedResponse = JSON.parse(cleanText);
                console.log('✅ Successfully parsed JSON response');
                console.log('📊 Response structure:', Object.keys(parsedResponse));
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Raw response:', text);
                
                // Fallback: create a basic structure
                parsedResponse = {
                    type: 'learning_material',
                    content: {
                        flashcards: [],
                        quiz: [],
                        studyGuide: text,
                        assignment: text
                    }
                };
            }
            
            // Add timestamp
            parsedResponse.timestamp = new Date();
            
            return parsedResponse;
            
        } catch (error) {
            console.error('Gemini API error:', error);
            
            // Return fallback response
            return {
                type: 'learning_material',
                content: {
                    flashcards: [
                        {
                            question: "Error generating content",
                            answer: "Please try again or contact support"
                        }
                    ],
                    quiz: [
                        {
                            question: "Error generating content?",
                            options: ["A) Please try again", "B) Contact support", "C) Check connection", "D) All of the above"],
                            correct: "D"
                        }
                    ],
                    studyGuide: "Error generating content. Please try again.",
                    assignment: "Error generating content. Please try again."
                },
                timestamp: new Date(),
                error: true
            };
        }
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async storeLearningSession(session) {
        const client = await pool.connect();
        try {
            console.log('Storing learning session:', session.sessionId);
            
            const query = `
                INSERT INTO learning_sessions (session_id, user_id, topic, goal, level, learning_style, source_document, content, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const values = [
                session.sessionId,
                session.userId,
                session.inputs.topic,
                session.inputs.goal,
                session.inputs.level,
                session.inputs.learningStyle,
                session.inputs.sourceDocument || null,
                JSON.stringify(session.content),
                session.createdAt
            ];
            
            await client.query(query, values);
            console.log('✅ Learning session stored successfully');
            
        } catch (error) {
            console.error('❌ Error storing learning session:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getLearningSession(sessionId, userId) {
        const client = await pool.connect();
        try {
            console.log('Retrieving session:', sessionId, 'for user:', userId);
            
            const query = `
                SELECT * FROM learning_sessions 
                WHERE session_id = $1 AND user_id = $2
            `;
            const result = await client.query(query, [sessionId, userId]);
            
            if (result.rows.length === 0) {
                console.log('Session not found:', sessionId);
                return null;
            }
            
            const row = result.rows[0];
            return {
                sessionId: row.session_id,
                userId: row.user_id,
                inputs: {
                    topic: row.topic,
                    goal: row.goal,
                    level: row.level,
                    learningStyle: row.learning_style,
                    sourceDocument: row.source_document
                },
                content: row.content, // Already parsed as JSONB
                createdAt: row.created_at,
                learningStyle: row.learning_style
            };
            
        } catch (error) {
            console.error('❌ Error retrieving learning session:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getUserSessions(userId) {
        const client = await pool.connect();
        try {
            console.log('Getting all sessions for user:', userId);
            
            const query = `
                SELECT session_id, topic, learning_style, created_at 
                FROM learning_sessions 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `;
            const result = await client.query(query, [userId]);
            
            return result.rows.map(row => ({
                sessionId: row.session_id,
                topic: row.topic,
                learningStyle: row.learning_style,
                createdAt: row.created_at
            }));
            
        } catch (error) {
            console.error('❌ Error getting user sessions:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteLearningSession(sessionId, userId) {
        const client = await pool.connect();
        try {
            console.log('Deleting session:', sessionId, 'for user:', userId);
            
            const query = `
                DELETE FROM learning_sessions 
                WHERE session_id = $1 AND user_id = $2
                RETURNING session_id
            `;
            const result = await client.query(query, [sessionId, userId]);
            
            if (result.rows.length === 0) {
                console.log('Session not found or access denied:', sessionId);
                return false;
            }
            
            console.log('✅ Session deleted successfully:', sessionId);
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting learning session:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

// Create InputHandler instance
const inputHandler = new InputHandler();

// Generate learning material endpoint
router.post('/generate-learning-material', authenticateToken, async (req, res) => {
    try {
        const { topic, goal, level, sourceDocument, learningStyle } = req.body;
        
        // Validate required fields
        if (!topic || !goal || !level || !learningStyle) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const userInputs = {
            topic,
            goal,
            level,
            sourceDocument: sourceDocument || '',
            learningStyle
        };
        
        const result = await inputHandler.generateLearningMaterial(userInputs, req.user.id);
        
        res.json(result);
        
    } catch (error) {
        console.error('Generate learning material error:', error);
        res.status(500).json({ message: 'Failed to generate learning material' });
    }
});

// Get learning session
router.get('/learning-session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await inputHandler.getLearningSession(sessionId, req.user.id);
        
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        
        res.json(session);
        
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ message: 'Failed to retrieve session' });
    }
});

// Get user's all sessions
router.get('/user-sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await inputHandler.getUserSessions(req.user.id);
        res.json(sessions);
        
    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions' });
    }
});

// Delete learning session
router.delete('/learning-session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const deleted = await inputHandler.deleteLearningSession(sessionId, req.user.id);
        
        if (!deleted) {
            return res.status(404).json({ message: 'Session not found or access denied' });
        }
        
        res.json({ message: 'Session deleted successfully' });
        
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ message: 'Failed to delete session' });
    }
});

module.exports = router;