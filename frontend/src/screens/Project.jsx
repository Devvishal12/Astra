import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer';
import { useTheme } from '../context/ThemeContext'; // Adjust the path

function SyntaxHighlightedCode({ className, children, ...props }) {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current && className?.includes('lang-') && hljs) {
            hljs.highlightElement(ref.current);
            ref.current.removeAttribute('data-highlighted');
        }
    }, [className, children]);

    return <code {...props} ref={ref} className={className}>{children}</code>;
}

const Project = () => {
    const location = useLocation();
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();
    const messageBoxRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [project, setProject] = useState(location.state.project);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [users, setUsers] = useState([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [runProcess, setRunProcess] = useState(null);

    const handleUserClick = (id) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };

    const addCollaborators = () => {
        axios.put("/projects/add-user", {
            projectId: project._id,
            users: Array.from(selectedUserIds)
        }).then(res => {
            setProject(res.data.project);
            setIsModalOpen(false);
        }).catch(err => console.log(err));
    };

    const send = () => {
        if (!message.trim()) return;
        if (message.toLowerCase().startsWith('ai:')) { 
            sendToAI(message.slice(3).trim()); 
        } else {
            const messageData = { message, sender: user };
            sendMessage('project-message', messageData);
            setMessages(prev => [...prev, messageData]);
        }
        setMessage('');
    };

    const sendToAI = async (userPrompt) => {
        try {
            const aiResponse = await generateResult(userPrompt);
            const aiMessage = {
                message: JSON.stringify(aiResponse),
                sender: { _id: 'ai', email: 'AI Assistant' }
            };
            sendMessage('project-message', aiMessage);
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending to AI:', error);
        }
    };

    const saveFileTree = (ft) => {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => console.log(res.data)).catch(err => console.log(err));
    };

    function WriteAiMessage(message) {
        try {
            const messageObject = JSON.parse(message);
            return (
                <div className={`overflow-auto rounded-sm p-2 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}>
                    <Markdown
                        children={messageObject.text}
                        options={{
                            overrides: {
                                code: SyntaxHighlightedCode,
                            },
                        }}
                    />
                </div>
            );
        } catch (error) {
            console.error('Error parsing AI message:', error, 'Raw message:', message);
            return <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Error: Invalid AI message format</p>;
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    }

    useEffect(() => {
        const socket = initializeSocket(project._id);

        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container);
                console.log("WebContainer initialized");
            }).catch(err => console.error("Failed to initialize WebContainer:", err));
        }

        const messageHandler = (data) => {
            console.log('Received message:', data); // Debug the entire message
            if (data.sender._id === 'ai') {
                try {
                    const message = data.message;
                    console.log('Raw AI message:', message); // Log raw message before parsing
                    if (!message || typeof message !== 'string') {
                        console.warn('Invalid AI message format:', message);
                        return; // Skip processing if message is invalid
                    }

                    let parsedMessage;
                    try {
                        parsedMessage = JSON.parse(message);
                    } catch (parseError) {
                        console.error('Failed to parse AI message JSON:', parseError, 'Raw message:', message);
                        return; // Skip processing if parsing fails
                    }

                    console.log('Parsed AI message:', parsedMessage); // Debug parsed message
                    if (parsedMessage.fileTree && typeof parsedMessage.fileTree === 'object' && Object.keys(parsedMessage.fileTree).length > 0) {
                        console.log('Mounting fileTree:', parsedMessage.fileTree);
                        // Ensure fileTree is a valid object with at least one key
                        if (!parsedMessage.fileTree || Object.keys(parsedMessage.fileTree).length === 0) {
                            console.warn('Empty or invalid fileTree in AI message:', parsedMessage.fileTree);
                            return; // Skip mounting if fileTree is invalid
                        }
                        webContainer?.mount(parsedMessage.fileTree).then(() => {
                            console.log('FileTree mounted successfully');
                            setFileTree(parsedMessage.fileTree || {});
                        }).catch(err => {
                            console.error('Failed to mount fileTree:', err);
                        });
                    } else {
                        console.warn('Invalid or missing fileTree in AI message:', parsedMessage.fileTree);
                    }
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.message === data.message && msg.sender._id === data.sender._id);
                        return exists ? prev : [...prev, data];
                    });
                } catch (error) {
                    console.error('Error processing AI message:', error, 'Raw data:', data);
                }
            } else {
                setMessages(prev => {
                    const exists = prev.some(msg => msg.message === data.message && msg.sender._id === data.sender._id);
                    return exists ? prev : [...prev, data];
                });
            }
        };

        receiveMessage('project-message', messageHandler);

        axios.get(`/projects/get-project/${project._id}`)
            .then(res => {
                console.log('Project data:', res.data.project);
                setProject(res.data.project);
                setFileTree(res.data.project.fileTree || {});
            })
            .catch(err => console.log('Error fetching project:', err));

        axios.get('/users/all')
            .then(res => setUsers(res.data.users))
            .catch(err => console.log('Error fetching users:', err));

        const scrollToBottom = () => {
            if (messageBoxRef.current) {
                messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
            }
        };
        scrollToBottom();

        return () => {
            socket.off('project-message', messageHandler);
        };
    }, [project._id, webContainer]);

    return (
        <main className={`h-screen w-screen flex ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            {/* Left Panel */}
            <section className={`flex flex-col h-screen w-96 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <header className={`flex justify-between items-center p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Collaborator
                    </button>
                    <div className="flex gap-2">
                        <button onClick={toggleTheme} className="p-2 hover:text-blue-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {theme === 'dark' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                )}
                            </svg>
                        </button>
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2 hover:text-blue-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </button>
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="p-2 rounded-full hover:bg-opacity-20 hover:bg-blue-500 transition-all duration-200"
                                title="User Profile"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                            {isProfileOpen && (
                                <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border transform transition-all duration-200 animate-fade-in-down z-10`}>
                                    <div className="p-4 border-b border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{user?.name || 'User'}</p>
                                                <p className="text-xs opacity-75">{user?.email || 'user@example.com'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className={`w-full text-left p-4 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} transition-all duration-200 flex items-center gap-2`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col flex-grow p-4 overflow-hidden">
                    <div ref={messageBoxRef} className={`flex-grow overflow-y-auto space-y-3 mb-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                        {messages.length > 0 ? (
                            messages.map((msg, index) => (
                                <div key={index} className={`max-w-xs p-3 rounded-lg ${msg.sender._id === user._id ? 'ml-auto bg-blue-500 text-white' : theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-900'}`}>
                                    <small className="text-xs opacity-75">{msg.sender.email}</small>
                                    {msg.sender._id === 'ai' ? (
                                        WriteAiMessage(msg.message)
                                    ) : (
                                        <p className="break-words">{msg.message}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No messages yet. Start a conversation!</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && send()}
                            className={`flex-grow p-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                            placeholder="Type a message..."
                        />
                        <button onClick={send} className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Side Panel */}
                <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <header className={`flex justify-between items-center p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}>
                        <h1 className="text-lg font-semibold">Collaborators</h1>
                        <button onClick={() => setIsSidePanelOpen(false)} className="p-2 hover:text-blue-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>
                    <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-4rem)]">
                        {project.users?.map(u => (
                            <div key={u._id} className={`flex items-center gap-3 p-2 rounded-lg hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} transition-colors`}>
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <span>{u.email}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Right Panel */}
            <section className={`flex-grow flex ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {/* File Explorer */}
                <div className={`w-64 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} p-4`}>
                    <h2 className="font-semibold mb-2">Files</h2>
                    <div className="space-y-1">
                        {Object.keys(fileTree).map(file => (
                            <button
                                key={file}
                                onClick={() => {
                                    setCurrentFile(file);
                                    setOpenFiles(prev => [...new Set([...prev, file])]);
                                }}
                                className={`w-full text-left p-2 rounded-lg hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} transition-colors`}
                            >
                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {file}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Code Editor */}
                <div className="flex flex-col flex-grow">
                    <div className={`flex ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} p-2`}>
                        {openFiles.map(file => (
                            <button
                                key={file}
                                onClick={() => setCurrentFile(file)}
                                className={`px-4 py-2 rounded-t-lg ${currentFile === file ? theme === 'dark' ? 'bg-gray-800' : 'bg-white' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} hover:${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} transition-colors`}
                            >
                                {file}
                            </button>
                        ))}
                        <button
                            onClick={async () => {
                                await webContainer?.mount(fileTree);
                                const installProcess = await webContainer?.spawn("npm", ["install"]);
                                installProcess?.output.pipeTo(new WritableStream({
                                    write(chunk) {
                                        console.log(chunk);
                                    }
                                }));
                                if (runProcess) {
                                    runProcess.kill();
                                }
                                let tempRunProcess = await webContainer?.spawn("npm", ["start"]);
                                tempRunProcess?.output.pipeTo(new WritableStream({
                                    write(chunk) {
                                        console.log(chunk);
                                    }
                                }));
                                setRunProcess(tempRunProcess);
                                webContainer?.on('server-ready', (port, url) => {
                                    console.log('Server ready on port', port, 'URL:', url);
                                    setIframeUrl(url);
                                });
                            }}
                            className={`ml-auto px-4 py-2 ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors`}
                        >
                            Run
                        </button>
                    </div>
                    {fileTree[currentFile] && (
                        <pre className={`flex-grow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 overflow-auto`}>
                            <code
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const updatedContent = e.target.innerText;
                                    const ft = { ...fileTree, [currentFile]: { file: { contents: updatedContent } } };
                                    setFileTree(ft);
                                    saveFileTree(ft);
                                }}
                                dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value }}
                                className="hljs w-full outline-none"
                                style={{ whiteSpace: 'pre-wrap', paddingBottom: '25rem', counterSet: 'line-numbering' }}
                            />
                        </pre>
                    )}
                </div>

                {/* Preview */}
                {iframeUrl && webContainer && (
                    <div className="w-96 flex flex-col">
                        <input
                            value={iframeUrl}
                            onChange={(e) => setIframeUrl(e.target.value)}
                            className={`p-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'} border`}
                        />
                        <iframe src={iframeUrl} className="flex-grow" />
                    </div>
                )}
            </section>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-96 max-h-[80vh] flex flex-col`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Add Collaborators</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-3 mb-4">
                            {users.map(u => (
                                <div
                                    key={u._id}
                                    onClick={() => handleUserClick(u._id)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUserIds.has(u._id) ? 'bg-blue-500 text-white' : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    {u.email}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Add Selected
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Project;