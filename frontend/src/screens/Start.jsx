import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Start = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-all duration-500 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900"
          : "bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100"
      }`}
    >
      <div
        className={`rounded-3xl shadow-xl overflow-hidden w-full max-w-4xl transform hover:scale-[1.02] transition-transform duration-300 ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left Section - 3D Rendered Image */}
          <div className="md:w-1/2 flex justify-center items-center p-6">
            <img
              src="/Robot1.png" // Replace this with your actual image path
              alt="3D Rendered Robot"
              className="w-full h-auto rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
            />
          </div>

          {/* Right Section - Text and Buttons */}
          <div className="md:w-1/2 p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h1
                  className={`text-3xl sm:text-4xl font-bold tracking-tight animate-fade-in-down ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Welcome to CodeCollab 🚀
                </h1>
                <p
                  className={`mt-3 text-lg leading-relaxed animate-fade-in-up ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  A next-generation collaborative coding platform where
                  developers can create, manage, and code together in real-time.
                  Whether you are working solo or with a team, streamline your
                  workflow with our AI-powered coding assistant and seamless
                  project management.
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200"
                title={
                  theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                <svg
                  className={`w-6 h-6 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {theme === "dark" ? (
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
            </div>

            {/* Buttons Section */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className={`w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl shadow-md transition-all duration-300 transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-indigo-700 text-white hover:bg-indigo-800 focus:ring-indigo-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300"
                } focus:outline-none focus:ring-4`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={`w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl shadow-md transition-all duration-300 transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-400"
                    : "bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-300"
                } focus:outline-none focus:ring-4`}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Start;
