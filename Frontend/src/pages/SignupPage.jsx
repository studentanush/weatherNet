import React, { useState, useContext } from 'react';
import '../components/AuthForm.css';
import { ThemeContext } from '../Content/ThemeContent';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Save fake user in localStorage
    localStorage.setItem("user", JSON.stringify({ name, email, password }));
    localStorage.setItem("loggedIn", "true");

    navigate("/home");
  };

  return (
    <div className={`auth-container ${theme}`}>
      <form className="auth-form fade-slide-in" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>

        {error && <div className="error">{error}</div>}

        <label>Full Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        <label>Confirm Password</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit">Create Account</button>

        <p className="auth-text">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
