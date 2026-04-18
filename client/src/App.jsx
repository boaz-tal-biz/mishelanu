import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Recommend from './pages/Recommend.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminProvider from './pages/AdminProvider.jsx';
import Monitor from './pages/Monitor.jsx';
import SimGroup from './pages/SimGroup.jsx';
import SimProvider from './pages/SimProvider.jsx';
import SimRequester from './pages/SimRequester.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Disclaimer from './pages/Disclaimer.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <main style={{ padding: '1.5rem 0', minHeight: 'calc(100vh - 56px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/provider/:slug" element={<Profile />} />
          <Route path="/recommend/:token" element={<Recommend />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/provider/:id" element={<AdminProvider />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/sim/group" element={<SimGroup />} />
          <Route path="/sim/provider/:phone" element={<SimProvider />} />
          <Route path="/sim/requester/:phone" element={<SimRequester />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  );
}
