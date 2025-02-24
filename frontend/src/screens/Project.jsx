import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer';
import { useTheme } from '../context/ThemeContext';
import { loadPyodide } from 'pyodide';

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
  const [project, setProject] = useState(location.state?.project || null);
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
  const [isSetupComplete, setIsSetupComplete] = useState({ python: false, gcc: false });
  const [pyodideInstance, setPyodideInstance] = useState(null);

  const handleUserClick = (id) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const addCollaborators = () => {
    if (!project || !project._id) {
      console.error('No project ID available for adding collaborators');
      return;
    }
    axios
      .put('/projects/add-user', {
        projectId: project._id,
        users: Array.from(selectedUserIds),
      })
      .then((res) => {
        setProject(res.data.project);
        setIsModalOpen(false);
      })
      .catch((err) => console.log(err));
  };

  const send = () => {
    if (!message.trim()) return;
    if (message.toLowerCase().startsWith('ai:')) {
      sendToAI(message.slice(3).trim());
    } else {
      const messageData = { message, sender: user };
      sendMessage('project-message', messageData);
      setMessages((prev) => [...prev, messageData]);
    }
    setMessage('');
  };

  const sendToAI = async (userPrompt) => {
    try {
      const aiResponse = await generateResult(userPrompt); // Assuming generateResult is defined elsewhere
      const aiMessage = {
        message: JSON.stringify(aiResponse),
        sender: { _id: 'ai', email: 'AI Assistant' },
      };
      sendMessage('project-message', aiMessage);
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending to AI:', error);
    }
  };

  const saveFileTree = (ft) => {
    if (!project || !project._id) {
      console.error('No project ID available for saving file tree');
      return;
    }
    axios
      .put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: ft,
      })
      .then((res) => console.log(res.data))
      .catch((err) => console.log(err));
  };

  const WriteAiMessage = (message) => {
    try {
      const messageObject = JSON.parse(message);
      return (
        <div
          className={`overflow-auto rounded-xl p-3 ${
            theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'
          }`}
        >
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
      return (
        <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          Error: Invalid AI message format
        </p>
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const detectLanguage = (fileName) => {
    if (!fileName) return 'plaintext';
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cxx':
      case 'cc':
        return 'cpp';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'plaintext';
    }
  };

  const setupEnvironment = async (language) => {
    if (!webContainer) return;
    try {
      if (language === 'c' || language === 'cpp') {
        if (!isSetupComplete.gcc) {
          setMessages((prev) => [
            ...prev,
            { message: 'Setting up GCC environment...', sender: { _id: 'system', email: 'System' } },
          ]);
          await webContainer.spawn('npm', ['install', '-g', 'emscripten']);
          setIsSetupComplete((prev) => ({ ...prev, gcc: true }));
          setMessages((prev) => [
            ...prev,
            { message: 'GCC environment ready.', sender: { _id: 'system', email: 'System' } },
          ]);
        }
      }
    } catch (error) {
      console.error(`Error setting up ${language} environment:`, error);
      setMessages((prev) => [
        ...prev,
        { message: `Failed to setup ${language} environment: ${error.message}`, sender: { _id: 'system', email: 'System' } },
      ]);
    }
  };

  const runCodeForLanguage = async (language) => {
    if (!webContainer || !currentFile) {
      console.error('WebContainer or current file not available');
      setMessages((prev) => [
        ...prev,
        { message: 'Error: WebContainer or file not available.', sender: { _id: 'system', email: 'System' } },
      ]);
      return;
    }

    try {
      if (runProcess) await runProcess.kill();
      await setupEnvironment(language);

      let command, args, outputFile;
      switch (language) {
        case 'javascript':
        case 'typescript':
          command = 'node';
          args = [currentFile];
          break;
        case 'python':
          if (!pyodideInstance) {
            setMessages((prev) => [
              ...prev,
              { message: 'Loading Pyodide for Python...', sender: { _id: 'system', email: 'System' } },
            ]);
            const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/' });
            let outputBuffer = '';
            pyodide.setStdout({
              write: (str) => {
                outputBuffer += str;
                return str.length;
              },
            });
            pyodide.setStderr({
              write: (str) => {
                outputBuffer += str;
                return str.length;
              },
            });
            setPyodideInstance(pyodide);
            await webContainer.mount(fileTree);
            await pyodide.runPythonAsync(fileTree[currentFile].file.contents);
            setMessages((prev) => [
              ...prev,
              { message: outputBuffer || 'Python executed (no output)', sender: { _id: 'system', email: 'Output' } },
            ]);
            setIsSetupComplete((prev) => ({ ...prev, python: true }));
          } else {
            let outputBuffer = '';
            pyodideInstance.setStdout({
              write: (str) => {
                outputBuffer += str;
                return str.length;
              },
            });
            pyodideInstance.setStderr({
              write: (str) => {
                outputBuffer += str;
                return str.length;
              },
            });
            await webContainer.mount(fileTree);
            await pyodideInstance.runPythonAsync(fileTree[currentFile].file.contents);
            setMessages((prev) => [
              ...prev,
              { message: outputBuffer || 'Python executed (no output)', sender: { _id: 'system', email: 'Output' } },
            ]);
          }
          return;
        case 'c':
        case 'cpp':
          if (!isSetupComplete.gcc) {
            setMessages((prev) => [
              ...prev,
              { message: 'GCC setup not complete yet.', sender: { _id: 'system', email: 'System' } },
            ]);
            return;
          }
          outputFile = currentFile.replace(/\.(c|cpp|cxx|cc)$/, '.js');
          await webContainer.spawn('emcc', [currentFile, '-o', outputFile, '-s', 'ENVIRONMENT=node']);
          command = 'node';
          args = [outputFile];
          break;
        case 'html':
          command = 'npx';
          args = ['serve', '.'];
          setIframeUrl('http://localhost:3000');
          break;
        default:
          console.warn(`Unsupported language: ${language}`);
          setMessages((prev) => [
            ...prev,
            { message: `Error: Execution of ${language} files is not supported.`, sender: { _id: 'system', email: 'System' } },
          ]);
          return;
      }

      const process = await webContainer.spawn(command, args);
      setRunProcess(process);

      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log(`Output: ${chunk}`);
            setMessages((prev) => [...prev, { message: chunk, sender: { _id: 'system', email: 'Output' } }]);
          },
        })
      );

      const exitCode = await process.exit;
      if (exitCode !== 0) {
        console.error(`Process exited with code ${exitCode}`);
        setMessages((prev) => [
          ...prev,
          { message: `Process exited with error code ${exitCode}`, sender: { _id: 'system', email: 'System' } },
        ]);
      }
    } catch (error) {
      console.error('Error running code:', error);
      setMessages((prev) => [
        ...prev,
        { message: `Error running code: ${error.message}`, sender: { _id: 'system', email: 'System' } },
      ]);
    }
  };

  useEffect(() => {
    const socket = initializeSocket(project?._id);

    if (!webContainer) {
      getWebContainer()
        .then((container) => {
          setWebContainer(container);
          console.log('WebContainer initialized');
        })
        .catch((err) => console.error('Failed to initialize WebContainer:', err));
    }

    const messageHandler = (data) => {
      console.log('Received message:', data);
      if (data.sender._id === 'ai') {
        try {
          const message = data.message;
          if (!message || typeof message !== 'string') {
            console.warn('Invalid AI message format:', message);
            return;
          }
          const parsedMessage = JSON.parse(message);
          if (parsedMessage.fileTree && typeof parsedMessage.fileTree === 'object' && Object.keys(parsedMessage.fileTree).length > 0) {
            const validatedFileTree = {};
            for (const [fileName, fileData] of Object.entries(parsedMessage.fileTree)) {
              if (fileData.file && typeof fileData.file.contents === 'string') {
                validatedFileTree[fileName] = { file: { contents: fileData.file.contents } };
              } else {
                console.warn(`Invalid file data for ${fileName}:`, fileData);
              }
            }
            if (Object.keys(validatedFileTree).length > 0) {
              webContainer?.mount(validatedFileTree).then(() => {
                console.log('FileTree mounted successfully');
                setFileTree(validatedFileTree || {});
              }).catch((err) => console.error('Failed to mount fileTree:', err));
            }
          }
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.message === data.message && msg.sender._id === data.sender._id);
            return exists ? prev : [...prev, data];
          });
        } catch (error) {
          console.error('Error processing AI message:', error, 'Raw data:', data);
        }
      } else {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.message === data.message && msg.sender._id === data.sender._id);
          return exists ? prev : [...prev, data];
        });
      }
    };

    receiveMessage('project-message', messageHandler);

    if (project && project._id) {
      axios
        .get(`/projects/get-project/${project._id}`)
        .then((res) => {
          setProject(res.data.project);
          setFileTree(res.data.project.fileTree || {});
        })
        .catch((err) => console.log('Error fetching project:', err));
    }

    axios
      .get('/users/all')
      .then((res) => setUsers(res.data.users))
      .catch((err) => console.log('Error fetching users:', err));

    const scrollToBottom = () => {
      if (messageBoxRef.current) {
        messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
      }
    };
    scrollToBottom();

    return () => socket.off('project-message', messageHandler);
  }, [project?._id, webContainer]);

  if (!project) {
    return (
      <main
        className={`h-screen w-screen flex flex-col items-center justify-center transition-all duration-500 ${
          theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-indigo-900' : 'bg-gradient-to-br from-indigo-50 to-purple-100'
        }`}
      >
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Project not found. Please return to the home page.
        </p>
        <button
          onClick={() => navigate('/home')}
          className={`mt-6 px-8 py-3 rounded-xl text-lg font-semibold text-white shadow-md transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 ${
            theme === 'dark'
              ? 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500'
              : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-300'
          }`}
        >
          Go to Home
        </button>
      </main>
    );
  }

  return (
    <>
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <main
        className={`h-screen w-screen flex transition-all duration-500 ${
          theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-indigo-900' : 'bg-gradient-to-br from-indigo-50 to-purple-100'
        }`}
      >
        {/* Sidebar */}
        <section
          className={`flex flex-col h-screen w-80 transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <header
            className={`flex justify-between items-center p-4 border-b ${
              theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-semibold transition-all duration-200 ${
                theme === 'dark' ? 'text-indigo-400 hover:bg-gray-700' : 'text-indigo-500 hover:bg-gray-200'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Collaborator
            </button>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <svg
                  className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {theme === 'dark' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <svg
                  className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200"
                  title="User Profile"
                >
                  <svg
                    className={`w-7 h-7 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>
                {isProfileOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border transform transition-all duration-200 animate-fade-in-down z-20 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="p-4 border-b border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
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
                      className={`w-full text-left p-4 flex items-center gap-3 hover:bg-opacity-50 transition-all duration-200 ${
                        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex flex-col flex-grow p-4 overflow-hidden">
            <div
              ref={messageBoxRef}
              className={`flex-grow overflow-y-auto space-y-4 mb-4 rounded-xl p-4 hide-scrollbar ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
              }`}
            >
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`max-w-md p-4 rounded-xl shadow-md transition-all duration-200 ${
                      msg.sender._id === user._id
                        ? 'ml-auto bg-indigo-500 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-100'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <small className="text-xs opacity-75 block mb-1">{msg.sender.email}</small>
                    {msg.sender._id === 'ai' ? WriteAiMessage(msg.message) : <p className="break-words">{msg.message}</p>}
                  </div>
                ))
              ) : (
                <p
                  className={`text-center py-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  No messages yet. Start a conversation!
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && send()}
                className={`flex-grow p-3 rounded-xl border-2 text-lg ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:border-indigo-500 focus:ring-4 focus:ring-indigo-300/50 transition-all duration-300`}
                placeholder="Type a message..."
              />
              <button
                onClick={send}
                className={`p-3 rounded-xl text-white shadow-md transition-all duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 ${
                  theme === 'dark'
                    ? 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500'
                    : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-300'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Collaborators Sidebar */}
          <div
            className={`absolute inset-0 transition-transform duration-300 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            } ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <header
              className={`flex justify-between items-center p-4 border-b ${
                theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <h1 className="text-xl font-semibold">Collaborators</h1>
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-4rem)] hide-scrollbar">
              {project.users?.map((u) => (
                <div
                  key={u._id}
                  className={`flex items-center gap-3 p-3 rounded-xl hover:bg-opacity-50 transition-all duration-200 ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-lg">{u.email}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Editor Section */}
        <section className={`flex-grow flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`w-72 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-4`}>
            <h2 className="text-xl font-semibold mb-3">Files</h2>
            <div className="space-y-2">
              {Object.keys(fileTree).map((file) => (
                <button
                  key={file}
                  onClick={() => {
                    setCurrentFile(file);
                    setOpenFiles((prev) => [...new Set([...prev, file])]);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-lg hover:bg-opacity-50 transition-all duration-200 ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5 inline mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {file}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col flex-grow">
            <div
              className={`flex items-center p-3 border-b ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
              }`}
            >
              {openFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => setCurrentFile(file)}
                  className={`px-4 py-2 rounded-t-xl text-lg font-medium transition-all duration-200 ${
                    currentFile === file
                      ? theme === 'dark'
                        ? 'bg-gray-900 text-gray-100'
                        : 'bg-white text-gray-900'
                      : theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {file}
                </button>
              ))}
              <button
                onClick={async () => {
                  if (!fileTree || Object.keys(fileTree).length === 0) {
                    setMessages((prev) => [
                      ...prev,
                      { message: 'No files available to run.', sender: { _id: 'system', email: 'System' } },
                    ]);
                    return;
                  }
                  if (!currentFile) {
                    setMessages((prev) => [
                      ...prev,
                      { message: 'Please select a file to run.', sender: { _id: 'system', email: 'System' } },
                    ]);
                    return;
                  }
                  await webContainer?.mount(fileTree);
                  const language = detectLanguage(currentFile);
                  runCodeForLanguage(language);
                }}
                className={`ml-auto px-6 py-2 rounded-xl text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 ${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-400'
                    : 'bg-green-500 hover:bg-green-600 focus:ring-green-300'
                }`}
              >
                Run
              </button>
            </div>
            {fileTree[currentFile] && (
              <pre
                className={`flex-grow ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-4 overflow-auto hide-scrollbar`}
              >
                <code
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const updatedContent = e.target.innerText;
                    const ft = { ...fileTree, [currentFile]: { file: { contents: updatedContent } } };
                    setFileTree(ft);
                    saveFileTree(ft);
                  }}
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight(detectLanguage(currentFile), fileTree[currentFile].file.contents).value,
                  }}
                  className="hljs w-full outline-none text-lg"
                  style={{ whiteSpace: 'pre-wrap', paddingBottom: '25rem' }}
                />
              </pre>
            )}
          </div>

          {iframeUrl && webContainer && (
            <div className="w-96 flex flex-col border-l border-gray-700/50">
              <input
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                className={`p-3 border-b text-lg ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                    : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              <iframe src={iframeUrl} className="flex-grow" />
            </div>
          )}
        </section>

        {/* Add Collaborators Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center animate-fade-in">
            <div
              className={`p-6 rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col transform transition-all duration-300 animate-modal-in ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Collaborators</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-grow overflow-y-auto space-y-3 mb-4 hide-scrollbar">
                {users.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => handleUserClick(u._id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedUserIds.has(u._id)
                        ? 'bg-indigo-500 text-white'
                        : theme === 'dark'
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <span className="text-lg">{u.email}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={addCollaborators}
                className={`w-full py-3 rounded-xl text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 ${
                  theme === 'dark'
                    ? 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500'
                    : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-300'
                }`}
              >
                Add Selected
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Project;