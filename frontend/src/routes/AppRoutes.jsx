import React from 'react';
import { Route, BrowserRouter, Routes } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import Login from '../screens/Login';
import SignUp from '../screens/SignUp';
import Home from '../screens/Home';
import Project from '../screens/Project';
import Start from '../screens/Start';
import UserAuth from '../auth/UserAuth';

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <Routes>
                    {/* Set Start.jsx as the landing page */}
                    <Route path="/" element={<Start />} />
                    {/* Public routes for login and registration */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    {/* Protected routes requiring authentication */}
                    <Route path="/home" element={<UserAuth><Home /></UserAuth>} />
                    <Route path="/project" element={<UserAuth><Project /></UserAuth>} />
                </Routes>
            </ThemeProvider>
        </BrowserRouter>
    );
};

export default AppRoutes;