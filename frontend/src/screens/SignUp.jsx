import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios';
import { useTheme } from '../context/ThemeContext';

const PasswordInput = ({ label, value, onChange, id, theme }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mb-6 relative">
      <label
        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={onChange}
          className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 text-lg ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          } focus:border-teal-500 focus:ring-4 focus:ring-teal-300/50 transition-all duration-300`}
          placeholder={label}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors duration-200"
        >
          {showPassword ? (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    axios
      .post('/users/register', { name, email, password })
      .then((res) => {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        navigate('/home');
      })
      .catch((err) => setError(err.response.data.message || 'Registration failed'));
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-all duration-500 ${
        theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900' : 'bg-gradient-to-br from-teal-50 via-blue-50 to-purple-100'
      }`}
    >
      <div
        className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl transform transition-all duration-300 hover:shadow-xl ${
          theme === 'dark' ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-900'
        }`}
      >
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors duration-200"
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

        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <svg
            className={`w-12 h-12 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-500'} animate-pulse`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h2
            className={`text-3xl font-bold ml-4 tracking-tight animate-fade-in-down ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Sign Up
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center animate-shake"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submitHandler} className="space-y-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
            <input
              onChange={(e) => setName(e.target.value)}
              type="text"
              id="name"
              className={`w-full pl-12 py-3 rounded-xl border-2 text-lg ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:border-teal-500 focus:ring-4 focus:ring-teal-300/50 transition-all duration-300`}
              placeholder="Name"
            />
          </div>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <input
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              id="email"
              className={`w-full pl-12 py-3 rounded-xl border-2 text-lg ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:border-teal-500 focus:ring-4 focus:ring-teal-300/50 transition-all duration-300`}
              placeholder="Email"
            />
          </div>

          <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} id="password" theme={theme} />
          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            id="confirmPassword"
            theme={theme}
          />

          <button
            type="submit"
            className={`w-full py-4 px-8 rounded-xl text-lg font-semibold text-white shadow-md transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 focus:ring-teal-400'
                : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:ring-teal-300'
            }`}
          >
            Sign Up
          </button>
        </form>

        {/* Navigation to Login */}
        <p
          className={`text-center mt-6 text-sm animate-fade-in-up ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            className={`${
              theme === 'dark' ? 'text-teal-400 hover:text-teal-300' : 'text-teal-500 hover:text-teal-400'
            } font-medium transition-colors duration-200`}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;