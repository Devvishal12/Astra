import React from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'
import Login from '../screens/Login'
import Register from '../screens/Register'
import Home from '../screens/Home'
import Project from '../screens/Project'
import UserAuth from '../auth/UserAuth'

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <ThemeProvider>
            <Routes>
                <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/project" element={<UserAuth><Project /></UserAuth>} />
            </Routes>
            </ThemeProvider>
        </BrowserRouter>
    )
}

export default AppRoutes