import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Shell from './components/Shell';
import Lobby from './components/Lobby';
import Game from './components/Game';
import FriendPicker from './components/FriendPicker';
import MatchmakingWaiting from './components/MatchmakingWaiting';
import LiveMatch from './components/LiveMatch';
import SocialHub from './components/SocialHub';
import Leaderboard from './components/Leaderboard';
import Achievements from './components/Achievements';
import Ranked from './components/Ranked';
import './components/Game.css';

function LoginPage() {
  return (
    <div className="game-container">
      <h1 className="game-title">BLACKJACK</h1>
      <Login />
    </div>
  );
}

function RequireAuth({ children }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  return children;
}

function Protected({ children }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

function AppRoutes() {
  const { auth, ready } = useAuth();
  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<Protected><Lobby /></Protected>} />
      <Route path="/play/ai" element={<Protected><Game /></Protected>} />
      <Route path="/play/friend" element={<Protected><FriendPicker /></Protected>} />
      <Route path="/play/random" element={<Protected><MatchmakingWaiting /></Protected>} />
      <Route path="/play/match/:matchId" element={<Protected><LiveMatch /></Protected>} />
      <Route path="/social" element={<Protected><SocialHub /></Protected>} />
      <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
      <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
      <Route path="/ranked" element={<Protected><Ranked /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
