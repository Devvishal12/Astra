import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import axios from "../config/axios";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext'; // Adjust the path

const Home = () => {
    const { user, setUser } = useContext(UserContext); // Access user and setUser from UserContext
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projects, setProjects] = useState([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false); // State for profile dropdown
    const { theme, toggleTheme } = useTheme(); // Use global theme

    const navigate = useNavigate();

    function createProject(e) {
        e.preventDefault();
        axios.post('/projects/create', { name: projectName })
            .then((res) => {
                setProjects([...projects, res.data.project]);
                setIsModalOpen(false);
                setProjectName('');
            })
            .catch((error) => console.log(error));
    }

    function handleLogout() {
        localStorage.removeItem('token'); // Clear token from localStorage
        setUser(null); // Clear user from context
        navigate('/login'); // Redirect to login page
    }

    useEffect(() => {
        axios.get('/projects/all')
            .then((res) => setProjects(res.data.projects))
            .catch(err => console.log(err));
    }, []);

    return (
        <main className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900'}`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-extrabold animate-fade-in-down flex items-center tracking-tight">
                        <svg className="w-10 h-10 mr-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Your Projects
                    </h1>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTheme} 
                            className="p-3 rounded-full hover:bg-opacity-20 hover:bg-blue-500 transition-all duration-200"
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {theme === 'dark' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                )}
                            </svg>
                        </button>
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="p-3 rounded-full hover:bg-opacity-20 hover:bg-blue-500 transition-all duration-200"
                                title="User Profile"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Projects Grid */}
                <div className="projects grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`group relative p-8 rounded-2xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-300 hover:bg-gray-100'} transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                    >
                        <div className="flex flex-col items-center justify-center h-full">
                            <svg className="w-16 h-16 text-blue-500 mb-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-lg font-semibold">New Project</span>
                        </div>
                    </button>

                    {projects.map((project) => (
                        <div
                            key={project._id}
                            onClick={() => navigate('/project', { state: { project } })}
                            className={`group p-8 rounded-2xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-300 hover:bg-gray-100'} cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                        >
                            <div className="flex items-center mb-4">
                                <svg className="w-8 h-8 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h2 className="text-2xl font-semibold truncate">{project.name}</h2>
                            </div>
                            <div className="flex items-center text-sm">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 1.857h10M12 3a4 4 0 110 8 4 4 0 010-8z" />
                                </svg>
                                <span>Collaborators: <span className="text-blue-400 font-medium">{project.users.length}</span></span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in">
                        <div className={`p-8 rounded-2xl shadow-2xl w-full max-w-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} transform transition-all duration-300 scale-95 animate-modal-in`}>
                            <div className="flex items-center mb-6">
                                <svg className="w-8 h-8 text-blue-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <h2 className="text-2xl font-bold">Create New Project</h2>
                            </div>
                            <form onSubmit={createProject}>
                                <div className="mb-6 relative">
                                    <label className="block text-sm font-medium mb-2">Project Name</label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <input
                                            onChange={(e) => setProjectName(e.target.value)}
                                            value={projectName}
                                            type="text"
                                            className={`w-full pl-10 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300`}
                                            placeholder="Enter project name"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className={`px-6 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'} transition-all duration-200`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Home;