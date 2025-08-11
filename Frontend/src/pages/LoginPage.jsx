import React, { useState, useContext } from 'react';
import '../components/AuthForm.css';
import { ThemeContext } from '../Content/ThemeContent';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Fake user check
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser && savedUser.email === email && savedUser.password === password) {
      localStorage.setItem("loggedIn", "true");
      navigate("/home");
    } else {
      alert("Invalid credentials or account doesn't exist.");
    }
  };

  return (
    <div className={`auth-container ${theme}`}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>

        <p className="auth-text">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
