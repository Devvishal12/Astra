import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { UserContext } from '../context/user.context';
import { useTheme } from '../context/ThemeContext'; // Adjust the path

const PasswordInput = ({ label, value, onChange, id, theme }) => {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
        <div className="mb-6 relative">
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} htmlFor={id}>
                {label}
            </label>
            <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <input
                    type={showPassword ? "text" : "password"}
                    id={id}
                    value={value}
                    onChange={onChange}
                    className={`w-full pl-10 pr-20 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300`}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                >
                    {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { theme, toggleTheme } = useTheme(); // Use global theme

    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();

    function submitHandler(e) {
        e.preventDefault();
        setError('');
        axios.post('/users/login', { email, password })
            .then((res) => {
                // Check if res.data exists and has the expected structure
                if (!res.data || typeof res.data !== 'object') {
                    throw new Error('Invalid response format from login API');
                }
                // Safely access token and user, with fallback values
                const token = res.data.token || res.data.accessToken; // Adjust based on your API
                const userData = res.data.user || res.data.userData; // Adjust based on your API
                if (!token) {
                    throw new Error('No token received from login API');
                }
                if (!userData) {
                    throw new Error('No user data received from login API');
                }
                localStorage.setItem('token', token);
                setUser(userData);
                navigate('/');
            })
            .catch((err) => {
                // Enhanced error handling for different scenarios
                let errorMessage = 'Login failed';
                if (err.response) {
                    // Server responded with an error status (e.g., 401, 500)
                    errorMessage = err.response.data?.message || err.response.data?.error || err.response.statusText || 'Server error';
                } else if (err.request) {
                    // No response received (network error)
                    errorMessage = 'Network error. Please check your connection.';
                } else {
                    // Error setting up the request
                    errorMessage = err.message || 'An unexpected error occurred';
                }
                setError(errorMessage);
            });
    }

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`}>
            <div className={`p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:scale-105 ${theme === 'dark' ? 'bg-gray-800/80 text-white' : 'bg-white/80 text-gray-900'}`}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <svg className="w-12 h-12 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <h2 className="text-3xl font-bold ml-3 animate-fade-in-down">Welcome Back</h2>
                    </div>
                    <button onClick={toggleTheme} className="p-2 hover:text-blue-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {theme === 'dark' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            )}
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-center animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={submitHandler} className="space-y-6">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <input
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            id="email"
                            className={`w-full pl-10 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300`}
                            placeholder="Enter your email"
                        />
                    </div>

                    <PasswordInput 
                        label="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        id="password" 
                        theme={theme}
                    />

                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-105"
                    >
                        Sign In
                    </button>
                </form>

                <p className={`text-center mt-6 animate-fade-in-up ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;