// Complete Enhanced server.js with Chat + Form + All Features
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE SETUP =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Body parsing middleware - FIXED
app.use(express.urlencoded({ extended: true })); // For HTML forms
app.use(express.json({ limit: '10mb' })); // For JSON requests (CHAT FIX)
app.use(express.text()); // For plain text

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== HELPER FUNCTIONS =====

// Function to detect if input is actually about career interests
function isCareerRelated(input) {
    const careerKeywords = [
        // Career/job words
        'career', 'job', 'work', 'profession', 'occupation', 'employment',
        // Interest indicators  
        'interested in', 'love', 'enjoy', 'passionate about', 'good at', 'like to',
        // Skill/field words
        'programming', 'coding', 'design', 'marketing', 'business', 'healthcare', 
        'engineering', 'teaching', 'writing', 'art', 'music', 'science', 'finance',
        'technology', 'computer', 'creative', 'analytical', 'helping people',
        // Education/experience
        'studying', 'degree in', 'experience with', 'background in', 'skills in'
    ];

    const input_lower = input.toLowerCase();
    
    // Check if input contains career-related keywords
    const hasCareerKeywords = careerKeywords.some(keyword => 
        input_lower.includes(keyword.toLowerCase())
    );
    
    // Check if it's a greeting or casual question
    const casualPhrases = [
        'how are you', 'hello', 'hi', 'hey', 'what\'s up', 'how do you do',
        'good morning', 'good evening', 'whats up', 'sup', 'yo'
    ];
    
    const isCasual = casualPhrases.some(phrase => 
        input_lower.includes(phrase)
    );
    
    // Must have career keywords AND not be a casual greeting
    return hasCareerKeywords && !isCasual && input.length > 10;
}

// ===== ADVANCED PROMPT TEMPLATES =====
const PROMPT_TEMPLATES = {
    // 1. STRUCTURED OUTPUT - Forces consistent formatting
    structured: (interests, experience = "beginner", location = "global") => `
You are a senior career counselor with 15+ years of experience. Analyze the user's profile and provide structured career guidance.

USER PROFILE:
- Interests: "${interests}"
- Experience Level: ${experience}
- Location Preference: ${location}

OUTPUT FORMAT (follow exactly):
🎯 CAREER MATCH ANALYSIS
[Provide 2-3 sentences analyzing their interests]

💼 TOP 3 CAREER RECOMMENDATIONS

**1. [Career Title]**
- Description: [2-3 sentences about the role]
- Why it fits: [Explain connection to their interests]
- Key skills needed: [List 3-4 specific skills]
- Entry path: [How to get started]
- Salary range: [Provide realistic range]

**2. [Career Title]**
[Same format as above]

**3. [Career Title]**
[Same format as above]

🚀 IMMEDIATE NEXT STEPS
1. [Actionable step 1]
2. [Actionable step 2]
3. [Actionable step 3]

📚 LEARNING RESOURCES
- [Specific course/certification recommendation]
- [Relevant platform or website]
- [Professional community to join]

Keep responses practical, specific, and encouraging. Use real data when possible.`,

    // 2. ROLE-BASED WITH CONTEXT - AI assumes expert persona
    expert: (interests, careerStage = "entry") => `
Act as Dr. Sarah Mitchell, a renowned career strategist who has helped over 10,000 professionals find their ideal careers. You have PhDs in Psychology and Business, and you're known for data-driven, personalized advice.

CONTEXT: You're consulting with someone interested in: "${interests}"
CAREER STAGE: ${careerStage} level

Your approach:
- Ask insightful follow-up questions (mentally consider these)
- Provide industry-specific insights
- Reference current market trends
- Give practical, actionable advice
- Be encouraging but realistic

RESPONSE STYLE: Professional yet approachable, like talking to a trusted mentor.

Provide a comprehensive career analysis covering:
1. Market analysis for their interests
2. 3 specific career paths with growth potential
3. Skills gap analysis
4. Industry connections they should make
5. Timeline for career transition

Make it feel like a premium consultation worth $500.`,

    // 3. CHAIN OF THOUGHT - AI shows reasoning process
    analytical: (interests) => `
Let me analyze career options for someone interested in "${interests}" using a systematic approach:

STEP 1: Interest Breakdown
First, let me identify the core components of their interests:
- [Break down the interests into 3-4 key themes]
- [Identify underlying motivations]
- [Note any patterns or connections]

STEP 2: Industry Mapping
Now I'll map these interests to relevant industries:
- [List 4-5 industries that align]
- [Explain why each industry fits]
- [Note growth trends for each]

STEP 3: Role Identification
Based on this analysis, here are specific roles:
[For each role, show the logical connection]

STEP 4: Skill Requirements Analysis
[Analyze what skills are needed and why]

STEP 5: Market Reality Check
[Provide honest assessment of opportunities, challenges, competition]

FINAL RECOMMENDATIONS:
[Present 3 career paths with full reasoning shown]

This systematic approach ensures I'm giving you well-researched, logical career guidance rather than generic suggestions.`,

    // 4. INTERACTIVE/CONVERSATIONAL - More engaging
    conversational: (interests) => `
Hey there! 🌟 I'm really excited to help you explore career paths related to "${interests}" - that's such a fascinating area!

Let me put on my career detective hat and dig into what makes you tick...

🤔 **What I'm sensing about you:**
Based on your interests, I'm picking up that you're someone who [analyze personality traits from interests]. Am I on the right track?

💡 **Here's what's lighting up my radar:**

**Option 1: [Career Path]** - *The [Creative Nickname]*
This could be PERFECT for you because... [enthusiastic explanation]
Real talk though: [honest challenges they'll face]
Your roadmap: [specific steps]

**Option 2: [Career Path]** - *The [Different Nickname]*
Now THIS is interesting... [explain unique angle]
Plot twist: [mention unexpected opportunity or challenge]

**Option 3: [Career Path]** - *The [Third Nickname]*
Okay, hear me out on this one... [build suspense, then reveal]

🎯 **My hot take:** If I had to bet money on which path would make you happiest in 5 years, I'd choose [pick one and explain why].

**But here's the thing** - the best career isn't just about interests. It's about interests + your natural strengths + market demand + lifestyle goals.

What resonates with you most? Any of these making your brain go "ooh, tell me more"?`,

    // 5. DATA-DRIVEN WITH EXAMPLES
    datadriven: (interests) => `
Career Analysis Report: "${interests}"

📊 MARKET DATA ANALYSIS

Current Market Trends (2024-2025):
- [Include relevant industry statistics]
- [Job growth projections]
- [Salary trends]

🎯 CAREER RECOMMENDATIONS (Evidence-Based)

**CAREER PATH 1: [Title]**
📈 Job Growth: [X% over next 5 years]
💰 Salary Range: $[X] - $[Y] (based on [source])
🏢 Top Hiring Companies: [List 3-5 real companies]
📍 Job Locations: [Where these jobs are]
⭐ Success Example: [Brief real example or case study]

Skills in Demand:
- [Skill] - 87% of job postings require this
- [Skill] - Growing 23% year-over-year
- [Skill] - Pays 15% premium

**CAREER PATH 2: [Title]**
[Same detailed format]

**CAREER PATH 3: [Title]**
[Same detailed format]

🔮 FUTURE OUTLOOK
- AI Impact: [How AI will affect these careers]
- Remote Work Potential: [Percentage that can be done remotely]
- Industry Disruption Risk: [Low/Medium/High and why]

📋 ACTION PLAN
Based on data analysis, here's your optimal path:
Week 1-2: [Specific actions]
Month 1-3: [Specific actions]
Month 3-6: [Specific actions]

Sources: [List credible sources for data]`
};

// ===== ROUTES =====

// Main page
app.get('/', (req, res) => {
    res.render('index.ejs');
});

// Chat page
app.get('/chat', (req, res) => {
    res.render('chat.ejs');
});

// Form-based advice route with input validation
app.post('/advice', async (req, res) => {
    try {
        const { 
            interests, 
            experience = 'beginner', 
            location = 'global',
            promptStyle = 'structured' 
        } = req.body;
        
        // Check if input is empty
        if (!interests || interests.trim().length === 0) {
            return res.render('result', { 
                advice: '🤔 Please tell me about your interests, skills, or what kind of work excites you so I can provide career guidance!',
                promptStyle: 'error'
            });
        }
        
        // Check if input is too short
        if (interests.trim().length < 5) {
            return res.render('result', {
                advice: '💭 Could you share more details about your interests or career goals? The more you tell me, the better advice I can give!',
                promptStyle: 'error'
            });
        }
        
        // Check if it's actually career-related
        if (!isCareerRelated(interests)) {
            return res.render('result', {
                advice: `👋 Hi there! I'm an AI career advisor, so I'm here to help with career guidance. 

If you're looking for career advice, try telling me about:
- Your interests (e.g., "I love technology and helping people")  
- Skills you have (e.g., "I'm good at writing and creative problem solving")
- Fields you're curious about (e.g., "I'm interested in healthcare and business")

What career topics would you like to explore?`,
                promptStyle: 'error'
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Select prompt based on style
        let prompt;
        switch(promptStyle) {
            case 'expert':
                prompt = PROMPT_TEMPLATES.expert(interests, experience);
                break;
            case 'analytical':
                prompt = PROMPT_TEMPLATES.analytical(interests);
                break;
            case 'conversational':
                prompt = PROMPT_TEMPLATES.conversational(interests);
                break;
            case 'datadriven':
                prompt = PROMPT_TEMPLATES.datadriven(interests);
                break;
            default:
                prompt = PROMPT_TEMPLATES.structured(interests, experience, location);
        }

        // Advanced configuration for better responses
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7, // Balance creativity and consistency
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
                stopSequences: ["END_OF_RESPONSE"]
            }
        });

        const aiResponse = result.response.text();
        res.render('result', { advice: aiResponse, promptStyle });

    } catch (error) {
        console.error('Form API Error:', error);
        
        // Better error handling
        if (error.status === 429) {
            res.render('result', { 
                advice: '⏰ Too many requests right now. Please wait a moment and try again!',
                promptStyle: 'error'
            });
        } else if (error.status === 400) {
            res.render('result', { 
                advice: 'There was an issue with your request. Please try rephrasing your interests.',
                promptStyle: 'error'
            });
        } else if (error.status === 403) {
            res.render('result', { 
                advice: 'API access issue. Please check your API key configuration.',
                promptStyle: 'error'
            });
        } else {
            res.render('result', { 
                advice: '😅 Our career advisor is taking a quick break. Please try again in a moment!',
                promptStyle: 'error'
            });
        }
    }
});


// Learning Path API endpoint - ADD THIS TO YOUR server.js
app.post('/api/learning-path', async (req, res) => {
    try {
        const { targetCareer, currentSkills, timeline, learningStyle, budget } = req.body;
        
        if (!targetCareer || targetCareer.trim().length === 0) {
            return res.json({ 
                response: 'Please specify what career you\'re interested in!',
                error: true 
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Create specialized prompt for learning paths
        const learningPathPrompt = `
You are a professional learning path architect. Create a detailed, actionable 5-step learning roadmap.

TARGET CAREER: "${targetCareer}"
CURRENT SKILLS: "${currentSkills || 'Starting from basics'}"
TIME COMMITMENT: ${timeline}
LEARNING STYLE: ${learningStyle}
BUDGET: ${budget}

Create a structured learning path with these sections:

🎯 LEARNING PATH OVERVIEW
- Total estimated time to job-ready
- Difficulty level (Beginner/Intermediate/Advanced)
- Key skills you'll gain

📚 5-STEP ROADMAP

**Step 1: Foundation (Week 1-2)**
- Learning focus: [What to learn]
- Key concepts: [List 3-4 main concepts]
- Resources: [Specific platforms, courses, or materials]
- Deliverable: [What you should complete]

**Step 2: Core Skills (Week 3-6)** 
- Learning focus: [What to learn]
- Key concepts: [List 3-4 main concepts]
- Resources: [Specific platforms, courses, or materials]
- Deliverable: [What you should complete]

**Step 3: Practical Application (Week 7-10)**
- Learning focus: [What to learn]
- Key concepts: [List 3-4 main concepts]  
- Resources: [Specific platforms, courses, or materials]
- Deliverable: [What you should complete]

**Step 4: Advanced Topics (Week 11-14)**
- Learning focus: [What to learn]
- Key concepts: [List 3-4 main concepts]
- Resources: [Specific platforms, courses, or materials]
- Deliverable: [What you should complete]

**Step 5: Career Preparation (Week 15-16)**
- Learning focus: [What to learn]
- Key concepts: [List 3-4 main concepts]
- Resources: [Specific platforms, courses, or materials]
- Deliverable: [What you should complete]

💡 SUCCESS TIPS
- Daily/weekly study schedule recommendation
- How to track progress
- Common pitfalls to avoid
- Networking opportunities

🔗 RECOMMENDED RESOURCES
Based on budget: ${budget}
- Free resources
- Paid courses (if applicable)
- Books and documentation
- Communities and forums

Make it specific, actionable, and tailored to their learning style and time commitment.`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: learningPathPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                maxOutputTokens: 2048
            }
        });

        const aiResponse = result.response.text();
        
        res.json({ 
            learningPath: aiResponse,
            error: false 
        });

    } catch (error) {
        console.error('Learning Path API Error:', error);
        
        let errorMessage = "Sorry, I couldn't generate your learning path right now. Please try again!";
        
        if (error.status === 429) {
            errorMessage = "Too many requests. Please wait a moment and try again!";
        }
        
        res.json({ 
            response: errorMessage,
            error: true 
        });
    }
});



// Chat API endpoint - FIXED
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat request received:', req.body); // Debug log
        
        const { message, conversationHistory = [] } = req.body || {};
        
        if (!message || message.trim().length === 0) {
            return res.json({ 
                response: '🤔 Please share something about your career interests or ask me anything!',
                error: false 
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build conversation context
        let conversationContext = "You are a friendly AI career advisor. Have natural conversations about careers, provide advice, answer questions, and help users explore their interests. Be conversational, helpful, and engaging.\n\n";
        
        // Add previous messages for context
        if (conversationHistory.length > 0) {
            conversationContext += "Previous conversation:\n";
            conversationHistory.slice(-6).forEach(msg => { // Keep last 6 messages for context
                conversationContext += `${msg.role}: ${msg.content}\n`;
            });
            conversationContext += "\n";
        }

        conversationContext += `User: ${message}\nAssistant:`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: conversationContext }] }],
            generationConfig: {
                temperature: 0.8, // More conversational
                topP: 0.9,
                maxOutputTokens: 1024
            }
        });

        const aiResponse = result.response.text();
        
        res.json({ 
            response: aiResponse,
            error: false 
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        
        let errorMessage = "Sorry, I'm having trouble right now. Please try again!";
        
        if (error.status === 429) {
            errorMessage = "I'm getting too many messages right now. Please wait a moment and try again!";
        }
        
        res.json({ 
            response: errorMessage,
            error: true 
        });
    }
});

// Feedback endpoint (optional)
app.post('/api/feedback', (req, res) => {
    try {
        const { rating, page } = req.body || {};
        console.log(`Feedback received: ${rating} on ${page} page`);
        // You could save this to a database here
        res.json({ success: true, message: 'Thank you for your feedback!' });
    } catch (error) {
        console.error('Feedback error:', error);
        res.json({ success: false, message: 'Error saving feedback' });
    }
});

// Test endpoint for different prompt styles
app.post('/test-prompts', async (req, res) => {
    const interests = req.body.interests || "web development and design";
    const styles = ['structured', 'expert', 'conversational'];
    
    const results = {};
    
    for (const style of styles) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = PROMPT_TEMPLATES[style](interests);
            const result = await model.generateContent(prompt);
            results[style] = result.response.text();
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            results[style] = `Error: ${error.message}`;
        }
    }
    
    res.json(results);
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        promptStyles: Object.keys(PROMPT_TEMPLATES),
        features: ['chat', 'forms', 'multiple-prompts', 'validation']
    });
});

// 404 handler - FIXED
app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'Page not found!', 
        message: 'Try visiting / for the main page or /chat for chat mode',
        availableRoutes: ['/', '/chat', '/health']
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({ 
        error: 'Something went wrong!', 
        message: 'Please try again later.' 
    });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Enhanced AI Career Advisor running on http://localhost:${PORT}`);
    console.log(`📱 Chat available at http://localhost:${PORT}/chat`);
    console.log(`📋 Form available at http://localhost:${PORT}/`);
    console.log(`🔧 Health check at http://localhost:${PORT}/health`);
});