import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthPage from './pages/AuthPage';
import ParticipantDashboard from './pages/ParticipantDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

import EventDetails from './pages/EventDetails';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const trackVisit = async (userEmail: string | undefined) => {
      if (!userEmail) return;
      try {
        await supabase
          .from('site_visits')
          .upsert({ email: userEmail, last_visited_at: new Date().toISOString() });
      } catch (err) {
        console.error('Error tracking visit:', err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) trackVisit(session.user.email);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) trackVisit(session.user.email);
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login session={session} />} />
        <Route path="/auth" element={<AuthPage session={session} />} />
        <Route path="/details" element={<EventDetails />} />
        <Route 
          path="/dashboard" 
          element={<ParticipantDashboard session={session} />} 
        />
        <Route 
          path="/admin" 
          element={session ? <AdminDashboard session={session} /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
