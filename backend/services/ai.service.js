// src/services/ai.service.js (or wherever your file is located)
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `You are an expert in MERN and Development. You have an experience of 10 years in the development. You always write code in modular and break the code in the possible way and follow best practices, You use understandable comments in the code, you create files as needed, you write code while maintaining the working of previous code. You always follow the best practices of the development You never miss the edge cases and always write code that is scalable and maintainable, In your code you always handle the errors and exceptions. Additionally, you can provide the current date when requested.

    Examples: 

    <example>
 
    response: {
        "text": "This is your fileTree structure of the Express server",
        "fileTree": {
            "app.js": {
                file: {
                    contents: \"const express = require('express');\n\nconst app = express();\n\napp.get('/', (req, res) => {\n    res.send('Hello World!');\n});\n\napp.listen(3000, () => {\n    console.log('Server is running on port 3000');\n});\"            
                }
            },
            "package.json": {
                file: {
                    contents: \"{\n    \\\"name\\\": \\\"temp-server\\\",\n    \\\"version\\\": \\\"1.0.0\\\",\n    \\\"main\\\": \\\"index.js\\",\n    \\\"scripts\\\": {\n        \\\"test\\\": \\\"echo \\\\\\\"Error: no test specified\\\\\\\" && exit 1\\\"}\n    \\\"keywords\\\": [],\n    \\\"author\\\": \\\"\\",\n    \\\"license\\\": \\\"ISC\\",\n    \\\"description\\\": \\\"\\",\n    \\\"dependencies\\\": {\n        \\\"express\\\": \\\"^4.21.2\\\"}\n}\"                
                }
            }
        },
        "buildCommand": {
            "mainItem": "npm",
            "commands": ["install"]
        },
        "startCommand": {
            "mainItem": "node",
            "commands": ["app.js"]
        }
    }

    user: Create an Express application 
   
    </example>

    <example>
        user: Hello 
        response: {
            "text": "Hello, How can I help you today?"
        }
    </example>

    <example>
        user: What is the current date? 
        response: {
            "text": "The current date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}"
        }
    </example>

    IMPORTANT: Don't use file names like routes/index.js
    `,
});

// Function to generate content using the Gemini model
const generateResult = async (prompt) => {
    try {
        // Validate prompt
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }

        // Check if GOOGLE_AI_KEY is set
        if (!process.env.GOOGLE_AI_KEY) {
            throw new Error('Google AI API key is missing in environment variables');
        }

        // Generate content using the model
        const result = await model.generateContent(prompt);
        
        // Ensure the response exists and is text
        if (!result.response || !result.response.text) {
            throw new Error('No response or invalid response from Google Generative AI');
        }

        // Get the raw text response
        let responseText = result.response.text();

        // Try to parse the response as JSON
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError, 'Raw response:', responseText);
            throw new Error('Invalid JSON response from AI');
        }

        // Validate the response structure
        if (!parsedResponse.text || (parsedResponse.fileTree && typeof parsedResponse.fileTree !== 'object')) {
            throw new Error('Invalid response format: missing text or malformed fileTree');
        }

        // If the prompt is about the date, ensure the response includes the actual current date
        if (prompt.toLowerCase().includes('current date')) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            parsedResponse.text = parsedResponse.text.replace(/\${new Date\(\).toLocaleDateString\('en-US', \{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' \}\)}/, currentDate);
        }

        return parsedResponse; // Return the parsed JSON object
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw error; // Re-throw the error for the caller to handle
    }
};

// Export the generateResult function
export { generateResult };