import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
// Importing standard UI components that are assumed to be available
// If using ShadCN, these would be the default imports.
const Button = (props) => <button {...props} className={"p-2 rounded-lg transition-colors " + props.className}>{props.children}</button>;
const Card = (props) => <div {...props} className={"rounded-xl bg-white shadow-lg " + props.className}>{props.children}</div>;
const Input = (props) => <input {...props} className={"w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 " + props.className} />;
// --- UPDATED AVATAR COMPONENT ---
// Now supports name initial fallback logic and ensures the image scales correctly
const Avatar = ({ children, className, fallbackText, imageUrl }) => {
    const initial = fallbackText ? fallbackText.charAt(0).toUpperCase() : '?';
    
    return (
        <div className={"h-10 w-10 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 " + className}>
            {/* The image should cover the container and clip due to overflow-hidden on the parent div */}
            {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt="User Avatar" 
                    className="h-full w-full object-cover" // object-cover is key for proper scaling
                    onError={(e) => {
                        e.target.style.display = 'none'; // Hide broken image
                        e.target.parentElement.querySelector('.avatar-fallback-text').style.display = 'flex'; // Show fallback
                    }} 
                />
            ) : null}
            <div 
                className="avatar-fallback-text h-full w-full flex items-center justify-center text-sm font-semibold text-gray-700 bg-gray-300" 
                style={{ display: imageUrl ? 'none' : 'flex' }}
            >
                {initial}
            </div>
        </div>
    );
};
// Removed AvatarImage and AvatarFallback mock components as logic is now in Avatar
const Badge = (props) => <span {...props} className={"inline-flex items-center px-3 py-1 text-xs font-medium rounded-full " + props.className}>{props.children}</span>;
const ScrollArea = (props) => <div {...props} className={"overflow-y-auto " + props.className}>{props.children}</div>;
const Separator = (props) => <div {...props} className={"h-px w-full bg-gray-200 " + props.className} />;
const toast = { error: (msg) => console.error("Toast Error:", msg) }; // Simple mock for toast
const Toaster = () => null; // Mock for toaster

// Importing Lucide icons
const Send = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const LogOut = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const MessageCircle = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20.3c-.7-.3-1.4-.4-2.1-.4C3 19.9 1 17 1 12S3 4.1 5.8 4.1c2.8 0 4.8 2.9 4.8 7.9s-2 7.9-4.8 7.9zM19.3 12c0 2.8-1 5.3-2.7 7.1"/><path d="M11 16c0 1.1-.9 2-2 2H7.9c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h1.1c1.1 0 2 .9 2 2v2zM15 12c0 2.8-1 5.3-2.7 7.1"/></svg>;
const AlertTriangle = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h18.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>;
const User = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const Mic = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>;
const Volume2 = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth service
class AuthService {
    static getToken() {
        return localStorage.getItem('farha_session_token');
    }

    static setToken(token) {
        localStorage.setItem('farha_session_token', token);
    }

    static removeToken() {
        localStorage.removeItem('farha_session_token');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
}

// Embedded CSS content (Hoisted for both components to use easily)
const embeddedStyles = `
    /* ------------------------------------------------------------------------- */
    /* BASE & UTILITY STYLES */
    /* ------------------------------------------------------------------------- */

    html, body, #root, .App {
        height: 100%; 
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden; 
    }

    body {
        font-family: 'Inter', sans-serif;
        background-color: #f8f9fa;
        color: #212529;
    }

    .App {
        display: flex;
        justify-content: center;
        align-items: center;
        /* Desktop/Standard: 100vh */
        min-height: 100vh; 
        width: 100vw;
        /* MOBILE FIX: On mobile, stretch the content vertically */
        @media (max-width: 768px) {
            align-items: stretch;
            /* CRITICAL REINFORCEMENT for mobile height issues */
            height: 100%; 
            min-height: -webkit-fill-available; /* iOS fix */
            min-height: 100dvh; /* Modern mobile fix (dvh = dynamic viewport height) */
        }
    }

    .farha-container {
        display: flex;
        flex-direction: column;
        /* Updated height strategy: 90vh for desktop card view */
        height: 90vh; 
        width: 95%; 
        max-width: 1000px;
        background: #ffffff;
        border-radius: 1.5rem; 
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        
        /* MOBILE FIX: Use 100% height and flex column structure for internal layout */
        @media (max-width: 768px) {
            height: 100%; 
            min-height: -webkit-fill-available; /* iOS fix */
            min-height: 100dvh; /* Modern mobile fix */
            width: 100vw;
            border-radius: 0;
            box-shadow: none;
            /* CRITICAL: Ensure the mobile container is a perfect column layout */
            display: flex;
            flex-direction: column;
        }
    }

    /* ------------------------------------------------------------------------- */
    /* HEADER STYLES */
    /* ------------------------------------------------------------------------- */

    .farha-header {
        flex-shrink: 0; /* Important: Header should not shrink */
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background-color: #fefefe;
        border-bottom: 1px solid #e0e0e0;
        z-index: 10;
        /* MOBILE FIX: Reduced padding for more vertical space */
        @media (max-width: 768px) {
            padding: 0.75rem 1rem; 
        }
    }

    .farha-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .farha-logo h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #4f46e5; 
        margin: 0;
        /* MOBILE FIX: Reduced font size slightly on mobile */
        @media (max-width: 768px) {
            font-size: 1.125rem; /* Slightly smaller title on mobile */
        }
    }

    .header-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .user-menu {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.25rem 0.5rem; 
        border: 1px solid #e0e0e0;
        border-radius: 9999px; /* Fully rounded container */
        background-color: #f9fafb;
    }
    
    .user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        margin-right: 0.5rem;
        /* MOBILE FIX: Hide user name and email to save space */
        @media (max-width: 768px) {
            display: none;
        }
    }

    .user-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        line-height: 1;
    }

    .user-email-hint {
        font-size: 0.75rem;
        color: #6b7280;
        line-height: 1;
    }
    
    /* Ensures the Avatar is always circular and sized correctly */
    .user-avatar {
        height: 2.25rem;
        width: 2.25rem;
        border-radius: 9999px; 
        flex-shrink: 0;
        background-color: #a78bfa; /* Default fallback color */
        color: white; /* Fallback text color */
        font-weight: 600;
        /* CRITICAL FIX: Ensure the circular boundary is enforced */
        overflow: hidden;
    }
    
    /* CRITICAL FIX: Ensure the image inside the avatar container scales properly */
    .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover; /* Ensures the image covers the circle without distortion */
    }
    
    /* MOBILE FIX: Adjust logout button size on mobile */
    .user-menu > button {
        @media (max-width: 768px) {
            padding: 0.5rem;
        }
    }


    /* ------------------------------------------------------------------------- */
    /* CHAT & MESSAGING STYLES */
    /* ------------------------------------------------------------------------- */

    .chat-container {
        flex-grow: 1; /* CRITICAL: Takes up all available space between header and input */
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        min-height: 0; /* Ensures it shrinks correctly when space is tight */
    }

    .messages-area {
        flex-grow: 1; /* CRITICAL: The scrolling part takes up the remaining height */
        padding: 1rem 1.5rem;
        overflow-y: auto;
        /* Add extra padding at the bottom to ensure the last message is visible above the input area */
        padding-bottom: 5rem; 
        min-height: 0; /* Important for internal scrolling element */
        
        /* MOBILE FIX: Slightly less padding */
        @media (max-width: 768px) {
            padding: 0.75rem 1rem;
            padding-bottom: 5rem; /* Maintain extra bottom padding for visibility */
        }
    }
    
    /* Welcome Message */
    .welcome-message {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        text-align: center;
        padding: 2rem;
    }

    /* Message list styles */
    .messages-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .message {
        display: flex;
    }
    /* ... (other message styles remain the same) */

    /* ------------------------------------------------------------------------- */
    /* INPUT AREA STYLES */
    /* ------------------------------------------------------------------------- */

    .input-area {
        flex-shrink: 0; /* CRITICAL: Input area should not shrink */
        padding: 1rem 1.5rem;
        border-top: 1px solid #e0e0e0;
        background-color: #ffffff;
        box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.05);
        /* MOBILE FIX: Ensure it sticks to the bottom and uses less padding */
        @media (max-width: 768px) {
            padding: 0.75rem 1rem; 
            position: relative; 
        }
    }

    .input-form {
        display: flex;
        align-items: center;
    }

    .input-container {
        display: flex;
        flex-grow: 1;
        gap: 0.5rem;
        align-items: center;
    }

    .message-input {
        flex-grow: 1;
    }

    .send-btn {
        background-color: #4f46e5;
        transition: background-color 0.2s;
    }

    .send-btn:hover:not(:disabled) {
        background-color: #4338ca;
    }

    /* ------------------------------------------------------------------------- */
    /* KEYFRAMES & AUTH STYLES (unchanged) */
    /* ------------------------------------------------------------------------- */
    /* ... (rest of the styles are the same as before, ensuring core layout changes are effective) */

    /* AI VISUALIZATION & TYPING INDICATOR */
    .ai-face-visualization {
        position: relative;
        width: 3rem; 
        height: 3rem;
        margin: 0 auto 1.5rem; 
    }

    .face-mesh {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 3px solid #00bcd4;
        opacity: 0.5;
        animation: scan-pulse 4s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: 0 0 15px rgba(0, 188, 212, 0.8);
    }

    .face-core {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1rem;
        height: 1rem;
        background-color: #00bcd4;
        border-radius: 50%;
        animation: core-flicker 1.5s infinite alternate;
        box-shadow: 0 0 10px #00bcd4;
    }

    .loading-bar {
        width: 100%;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
        margin-top: 1rem;
    }

    .loading-bar::before {
        content: '';
        display: block;
        height: 100%;
        background-color: #4f46e5;
        width: 50%;
        animation: load 1.5s infinite ease-in-out;
    }


    /* Typing Indicator (Dots) */
    .typing-indicator {
        display: flex;
        align-items: center;
        height: 1.5rem;
    }

    .typing-indicator span {
        height: 6px;
        width: 6px;
        margin: 0 2px;
        background-color: #9ca3af;
        border-radius: 50%;
        opacity: 0;
        animation: bounce 1.2s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
    }

    /* AUTH PAGE STYLES (DARK THEME) */
    .auth-container {
        min-height: 100vh;
        width: 100vw;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(circle at center, #151b2a 0%, #080c18 100%);
        color: #e2e8f0;
        margin: 0;
        padding: 0;
    }

    .auth-card {
        background: #1e293b;
        width: 90%;
        max-width: 400px; 
        height: auto;
        border-radius: 1.5rem; 
        padding: 3rem 2rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 50px rgba(0, 188, 212, 0.15); 
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: all 0.3s ease-in-out;
        overflow: visible; 
        
        @media (max-width: 768px) {
            padding: 2rem 1.5rem;
        }
    }

    .farha-logo-large {
        margin-bottom: 2rem;
    }

    .farha-logo-large h1 {
        font-size: 2.5rem; 
        font-weight: 900; 
        color: #e2e8f0;
        margin: 0.5rem 0 0.25rem;
        text-shadow: 0 0 5px rgba(0, 188, 212, 0.5);
        @media (max-width: 768px) {
            font-size: 2rem;
        }
    }

    .farha-logo-large p {
        color: #94a3b8;
        font-size: 1rem; 
        margin-bottom: 2rem;
    }

    .features-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 2rem;
        text-align: left;
    }

    .feature-item {
        background: #2a3447;
        color: #e2e8f0;
        padding: 0.8rem 1.25rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 1rem;
        font-weight: 500;
        border: 1px solid #334155;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .feature-item svg {
        color: #00bcd4;
    }

    .login-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        background: linear-gradient(90deg, #4f46e5 0%, #00bcd4 100%);
        color: white;
        font-weight: 700;
        border-radius: 0.75rem; 
        padding: 1rem 1.5rem;
        font-size: 1.1rem;
        transition: all 0.3s ease;
        box-shadow: 0 5px 20px rgba(0, 188, 212, 0.3);
    }

    .login-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(0, 188, 212, 0.5);
    }
    
    .google-icon-path {
        fill: white;
    }

    .auth-hint {
        margin-top: 1.5rem;
        font-size: 0.85rem;
        color: #94a3b8;
        max-width: 100%;
    }

    .error-message {
        background-color: #451a1a;
        color: #fca5a5;
        padding: 0.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        border: 1px solid #7f1d1d;
    }

    @keyframes scan-pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 0.5;
        }
        50% {
            transform: scale(1.1);
            opacity: 1;
        }
    }

    @keyframes core-flicker {
        0%, 100% {
            background-color: #00bcd4;
        }
        50% {
            background-color: #4f46e5;
        }
    }
    
    @keyframes load {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    /* Additional Mobile Specific CSS Overrides for Layout Hierarchy */
    @media (max-width: 768px) {
        /* Ensure root elements occupy the available space */
        html, body, #root, .App {
            height: 100%;
            overflow: hidden; 
        }

        /* CRITICAL FIX: Use 100% height and flex column structure */
        .farha-container {
            height: 100%; 
            min-height: -webkit-fill-available;
            min-height: 100dvh; /* Dynamic viewport height */
            display: flex;
            flex-direction: column;
        }
        
        /* The header is flex-shrink: 0, and the input-area is flex-shrink: 0. 
           The chat-container (which holds the scroll area) MUST be flex-grow: 1 to fill the rest. */
        .chat-container {
            flex-grow: 1;
            /* CRITICAL: Must be defined as a column to contain the scroll area */
            display: flex;
            flex-direction: column;
            min-height: 0; /* Important for flex items with scrolling content */
        }
        
        /* The actual scrollable element */
        .messages-area {
            flex-grow: 1; /* Make the scroll area fill the chat-container */
            overflow-y: auto;
            /* Added padding-bottom to ensure the last message isn't hidden behind the input area */
            padding-bottom: 5rem; 
            min-height: 0; /* Also important for internal scrolling element */
        }

        .welcome-message {
            height: 100%; /* Make sure the welcome message takes up the available scroll area */
        }
    }
`;

// Chat interface component (Minimal changes, mostly cleanup)
function ChatInterface({ user, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getUserInitial = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    useEffect(() => {
        // Delay scrolling slightly to allow DOM layout to finish, improving reliability on mobile
        const timer = setTimeout(() => scrollToBottom(), 100); 
        return () => clearTimeout(timer);
    }, [messages]);

    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = async () => {
        try {
            const response = await axios.get(`${API}/chat/history`, {
                headers: AuthService.getAuthHeaders()
            });
            
            const historyMessages = response.data.reverse().flatMap(item => {
                const userMsg = {
                    id: item.message_id + '-user',
                    text: item.message,
                    timestamp: item.timestamp,
                    isUser: true,
                    status: 'sent'
                };
                const aiMsg = {
                    id: item.message_id + '-ai',
                    text: item.response,
                    timestamp: new Date().toISOString(),
                    isUser: false,
                    status: 'received'
                };
                return [userMsg, aiMsg];
            });

            setMessages(historyMessages);
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMessage = {
            id: Date.now().toString() + '-user',
            text: text, 
            timestamp: new Date().toISOString(),
            isUser: true,
            status: 'sent'
        };

        const pendingAiMessage = {
            id: Date.now().toString() + '-ai-pending',
            text: '', 
            timestamp: new Date().toISOString(),
            isUser: false,
            status: 'pending' 
        };
        
        setMessages(prev => [...prev, userMessage, pendingAiMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API}/chat`,
                { message: text }, 
                { headers: AuthService.getAuthHeaders() }
            );

            const finalAiMessage = {
                id: response.data.message_id + '-ai',
                text: response.data.response, 
                timestamp: response.data.timestamp,
                isUser: false,
                status: 'received'
            };

            setMessages(prev => {
                const newMessages = prev.filter(msg => msg.id !== pendingAiMessage.id); 
                return [...newMessages, finalAiMessage]; 
            });

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to get response. Please try again.');
            
            setMessages(prev => prev.filter(msg => msg.id !== pendingAiMessage.id));

        } finally {
            setIsLoading(false);
        }
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(inputMessage);
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${API}/auth/logout`, {}, {
                headers: AuthService.getAuthHeaders()
            });
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            AuthService.removeToken();
            onLogout();
        }
    };

    return (
        <div className="farha-container">
            {/* Embedded styles to apply custom designs */}
            <style>{embeddedStyles}</style>

            {/* Header (flex-shrink: 0) */}
            <div className="farha-header">
                <div className="farha-logo">
                    {/* The AI visualization is reused for the header logo */}
                    <div className="ai-face-visualization" style={{ margin: 0, width: '2rem', height: '2rem' }}>
                        <div className="face-mesh"></div>
                        <div className="face-core"></div>
                    </div>
                    <h1>F.A.R.H.A</h1>
                </div>
                
                <div className="header-controls">
                    <div className="user-menu">
                        {/* User info container to show name/email hint - Hidden on mobile via CSS */}
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email-hint">Logged in</span>
                        </div>
                        
                        {/* AVATAR IMPLEMENTATION */}
                        <Avatar 
                            className="user-avatar" 
                            imageUrl={user.picture}
                            fallbackText={user.name}
                        />
                        
                        <Button
                            onClick={handleLogout}
                            className="bg-transparent text-gray-700 hover:bg-gray-100 p-2 rounded-full"
                            data-testid="logout-btn"
                        >
                            <LogOut size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chat Area (flex-grow: 1) */}
            <div className="chat-container">
                <ScrollArea className="messages-area">
                    <div className="messages-list">
                        {messages.length === 0 && (
                            <div className="welcome-message">
                                <div className="welcome-content">
                                    <h2>Welcome to F.A.R.H.A</h2>
                                    <p>Your streamlined AI assistant is ready to help!</p>
                                    <div className="feature-badges">
                                        <Badge className="bg-indigo-100 text-indigo-700">Intelligent Chat</Badge>
                                        <Badge className="bg-indigo-100 text-indigo-700">Minimal Interface</Badge>
                                    </div>
                                    <p className="wake-word-hint">
                                        💡 Type your message below to begin a conversation.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => (
                            <div key={msg.id || index} className={`message ${msg.isUser ? 'user-message' : 'ai-message'}`}>
                                <div className="message-content" key={msg.id + '-content'}>
                                    {msg.isUser ? (
                                        <div className="user-bubble">
                                            <p>{msg.text}</p>
                                        </div>
                                    ) : (
                                        <div className="ai-bubble">
                                            <div className="ai-avatar">
                                                <div className="ai-icon"></div>
                                            </div>
                                            <div className="ai-text">
                                                {msg.status === 'pending' ? (
                                                    <div className="typing-indicator">
                                                        <span></span>
                                                        <span></span>
                                                        <span></span>
                                                    </div>
                                                ) : (
                                                    <p>{msg.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area (flex-shrink: 0) */}
            <div className="input-area">
                <form onSubmit={handleSubmit} className="input-form">
                    <div className="input-container">
                        <Input
                            ref={inputRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type your message to F.A.R.H.A..."
                            className="message-input"
                            disabled={isLoading}
                            data-testid="message-input"
                        />
                        
                        <Button
                            type="submit"
                            disabled={!inputMessage.trim() || isLoading}
                            className="send-btn"
                            data-testid="send-btn"
                        >
                            <Send size={20} />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Authentication component
function AuthPage({ onAuthSuccess }) {
    const [isLoading, setIsLoading] = useState(true); // Start as loading to check token
    const [authFailed, setAuthFailed] = useState(false);
    const [authAttempted, setAuthAttempted] = useState(false);

    useEffect(() => {
        if (authAttempted) return;

        const fragment = window.location.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const sessionId = params.get('session_id');

        setAuthAttempted(true);

        if (sessionId) {
            handleSessionAuth(sessionId);
        } else if (AuthService.isAuthenticated()) {
            verifyExistingSession();
        } else {
            setIsLoading(false);
        }
    }, [authAttempted]);

    const handleSessionAuth = async (sessionId) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API}/auth/session`, {
                session_id: sessionId
            });

            AuthService.setToken(response.data.session_token);
            
            window.history.replaceState(null, null, window.location.pathname);
            
            setAuthFailed(false);
            onAuthSuccess(response.data.user);
        } catch (error) {
            console.error('Authentication error (Session):', error);
            toast.error('Authentication Failed: The session link may have expired.');
            setAuthFailed(true);
            AuthService.removeToken();
        } finally {
            setIsLoading(false);
        }
    };

    const verifyExistingSession = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API}/user/profile`, {
                headers: AuthService.getAuthHeaders()
            });
            setAuthFailed(false);
            onAuthSuccess(response.data);
        } catch (error) {
            console.error('Authentication error (Verification):', error);
            toast.error('Session Expired: Please log in again.');
            AuthService.removeToken();
            setAuthFailed(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const redirectUrl = encodeURIComponent(window.location.origin);
        window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
    };

    // If still loading, show loading screen
    if (isLoading) {
        return (
            <div className="auth-container loading">
                 {/* Ensure loading screen is styled */}
                 <style>{embeddedStyles}</style> 
                <div className="auth-card">
                    <div className="loading-content">
                        <div className="ai-face-visualization loading">
                            <div className="face-mesh"></div>
                            <div className="face-core"></div>
                        </div>
                        <div className="loading-bar"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            {/* Fix: Replaced the problematic <style ref={...}>...</style> with the standard JSX pattern. */}
            <style>{embeddedStyles}</style> 
            <div className="auth-card">
                <div className="auth-content">
                    <div className="farha-logo-large">
                        <div className="ai-face-visualization">
                            <div className="face-mesh"></div>
                            <div className="face-core"></div>
                        </div>
                        <h1>F.A.R.H.A</h1>
                        <p>Your Advanced AI Assistant</p>
                    </div>
                    
                    {authFailed && (
                        <div className="error-message">
                            <AlertTriangle size={16} />
                            Authentication failed. Try again.
                        </div>
                    )}
                    
                    {/* Feature list from the requested design image */}
                    <div className="features-list"> 
                        <div className="feature-item">
                            <MessageCircle size={20} /> Intelligent Conversations
                        </div>
                        <div className="feature-item">
                            <Mic size={20} /> Voice Activation
                        </div>
                        <div className="feature-item">
                            <Volume2 size={20} /> Natural Speech
                        </div>
                    </div> 
                    
                    <Button
                        onClick={handleGoogleLogin}
                        className="login-btn"
                        data-testid="google-login-btn"
                        disabled={isLoading}
                    >
                        <svg className="google-icon" width="24" height="24" viewBox="0 0 24 24">
                            {/* Paths are updated to use the .google-icon-path class for fill: white */}
                            <path className="google-icon-path" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path className="google-icon-path" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path className="google-icon-path" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path className="google-icon-path" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                    </Button>
                    
                    <p className="auth-hint">
                        Sign in to access your personalized AI assistant with voice activation.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Main App component
function App() {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleAuthSuccess = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            isAuthenticated ? (
                                <ChatInterface user={user} onLogout={handleLogout} />
                            ) : (
                                <AuthPage onAuthSuccess={handleAuthSuccess} />
                            )
                        } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            <Toaster position="top-right" />
        </div>
    );
}

export default App;
