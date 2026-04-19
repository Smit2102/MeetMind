import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './views/Login';
import Home from './views/Home';
import MeetingDetail from './views/MeetingDetail';
import Search from './views/Search';
import Settings from './views/Settings';
import Navbar from '../components/Navbar';

// ─── App Context ─────────────────────────────────────────────

const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}

// ─── App Component ───────────────────────────────────────────

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'login', 'home', 'detail', 'search', 'settings'
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for local-only mode
  const [user, setUser] = useState(null);

  // Check auth state on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if Supabase is configured
      const { supabaseUrl } = await chrome.storage.local.get('supabaseUrl');
      if (!supabaseUrl) {
        // No Supabase configured — run in local-only mode
        setIsAuthenticated(true);
        setUser({ email: 'local@meetmind.app', name: 'Local User' });
        return;
      }

      // TODO: Check Supabase auth session
      setIsAuthenticated(true);
    } catch (error) {
      console.error('[MeetMind] Auth check failed:', error);
      setIsAuthenticated(true); // Fallback to local mode
    }
  }

  function navigateTo(view, meetingId = null) {
    setCurrentView(view);
    if (meetingId) setSelectedMeetingId(meetingId);
  }

  const contextValue = {
    currentView,
    navigateTo,
    selectedMeetingId,
    isAuthenticated,
    user,
    setUser,
    setIsAuthenticated,
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <AppContext.Provider value={contextValue}>
        <Login />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col h-full">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'home' && <Home />}
          {currentView === 'detail' && <MeetingDetail />}
          {currentView === 'search' && <Search />}
          {currentView === 'settings' && <Settings />}
        </div>

        {/* Bottom navigation */}
        <Navbar />
      </div>
    </AppContext.Provider>
  );
}
