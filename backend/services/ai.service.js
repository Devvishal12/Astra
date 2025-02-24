// src/services/ai.service.js (or wherever your file is located)
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `You are an expert in MERN, Java, C, Python, and other programming languages. You have 10 years of experience in development. You always write code in a modular way, break it into manageable parts, and follow best practices. You use understandable comments in the code, create files as needed, and write code while maintaining the working of previous code. You always follow best practices in development, never miss edge cases, and ensure code is scalable and maintainable. In your code, you always handle errors and exceptions. Additionally, you can provide the current date when requested and run code for Java, C, Python, and other languages by generating appropriate file structures and commands.

    Examples: 

    <example>
        response: {
            "text": "This is your fileTree structure for an Express server",
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

    <example>
        response: {
            "text": "This is your fileTree structure for a Java program",
            "fileTree": {
                "Main.java": {
                    file: {
                        contents: \"public class Main {\n    public static void main(String[] args) {\n        System.out.println(\\\"Hello, World!\\\");\n    }\n}\"            
                    }
                }
            },
            "buildCommand": {
                "mainItem": "javac",
                "commands": ["Main.java"]
            },
            "startCommand": {
                "mainItem": "java",
                "commands": ["Main"]
            }
        }

        user: Write a Java program that prints 'Hello, World!'
    </example>

    <example>
        response: {
            "text": "This is your fileTree structure for a C program",
            "fileTree": {
                "main.c": {
                    file: {
                        contents: \"#include <stdio.h>\n\nint main() {\n    printf(\\\"Hello, World!\\n\\\");\n    return 0;\n}\"            
                    }
                }
            },
            "buildCommand": {
                "mainItem": "gcc",
                "commands": ["main.c", "-o", "main"]
            },
            "startCommand": {
                "mainItem": "./",
                "commands": ["main"]
            }
        }

        user: Write a C program that prints 'Hello, World!'
    </example>

    <example>
        response: {
            "text": "This is your fileTree structure for a Python script",
            "fileTree": {
                "script.py": {
                    file: {
                        contents: \"print('Hello, World!')\"            
                    }
                }
            },
            "buildCommand": null, // No build step needed for Python
            "startCommand": {
                "mainItem": "python3",
                "commands": ["script.py"]
            }
        }

        user: Write a Python script that prints 'Hello, World!'
    </example>

    IMPORTANT: Don't use file names like routes/index.js
    `,
});

const generateResult = async (prompt) => {
    try {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }

        if (!process.env.GOOGLE_AI_KEY) {
            throw new Error('Google AI API key is missing in environment variables');
        }

        const result = await model.generateContent(prompt);
        
        if (!result.response || !result.response.text) {
            throw new Error('No response or invalid response from Google Generative AI');
        }

        let responseText = result.response.text();

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError, 'Raw response:', responseText);
            throw new Error('Invalid JSON response from AI');
        }

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

        return parsedResponse;
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw error;
    }
};

// Language detection and code running functions
const detectLanguage = (fileTree) => {
    const files = Object.keys(fileTree);
    if (files.some(file => file.endsWith('.java'))) return 'java';
    if (files.some(file => file.endsWith('.c'))) return 'c';
    if (files.some(file => file.endsWith('.py'))) return 'python';
    if (files.some(file => file.endsWith('.js'))) return 'nodejs'; // For MERN/Express
    return 'unknown';
};

const runCodeForLanguage = async (language, webContainer) => {
    try {
        switch (language) {
            case 'java':
                await runCode(
                    { mainItem: 'javac', commands: Object.keys(fileTree).filter(f => f.endsWith('.java')) },
                    { mainItem: 'java', commands: [Object.keys(fileTree).filter(f => f.endsWith('.java'))[0].replace('.java', '')] },
                    webContainer
                );
                break;
            case 'c':
                await runCode(
                    { mainItem: 'gcc', commands: [Object.keys(fileTree).filter(f => f.endsWith('.c'))[0], '-o', 'main'] },
                    { mainItem: './', commands: ['main'] },
                    webContainer
                );
                break;
            case 'python':
                await runCode(
                    null, // No build step for Python
                    { mainItem: 'python3', commands: [Object.keys(fileTree).filter(f => f.endsWith('.py'))[0]] },
                    webContainer
                );
                break;
            case 'nodejs':
                await runCode(
                    { mainItem: 'npm', commands: ['install'] },
                    { mainItem: 'node', commands: [Object.keys(fileTree).filter(f => f.endsWith('.js'))[0]] },
                    webContainer
                );
                break;
            default:
                console.warn('Unknown language, cannot run code automatically');
        }
    } catch (error) {
        console.error('Error running code for language:', error);
    }
};

const runCode = async (buildCommand, startCommand, webContainer) => {
    try {
        if (buildCommand) {
            const buildProcess = await webContainer?.spawn(buildCommand.mainItem, buildCommand.commands);
            buildProcess?.output.pipeTo(new WritableStream({
                write(chunk) {
                    console.log('Build output:', chunk);
                }
            }));
            await new Promise(resolve => buildProcess?.exit.then(resolve)); // Wait for build to complete
        }

        if (startCommand) {
            const runProcess = await webContainer?.spawn(startCommand.mainItem, startCommand.commands);
            runProcess?.output.pipeTo(new WritableStream({
                write(chunk) {
                    console.log('Run output:', chunk);
                }
            }));
            runProcess(runProcess);
            webContainer?.on('server-ready', (port, url) => {
                console.log('Server ready on port', port, 'URL:', url);
                setIframeUrl(url);
            });
        }
    } catch (error) {
        console.error('Error running code:', error);
    }
};

// Export the generateResult function
export { generateResult };