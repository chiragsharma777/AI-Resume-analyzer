import { useState } from "react";
import {
  API_BASE_URL,
  formatApiError,
} from "./api";

function Register({ onBack, onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const url = `${API_BASE_URL}/auth/register`;

      console.log("================================");
      console.log("[REGISTER] Starting registration");
      console.log("[REGISTER] API URL:", API_BASE_URL);
      console.log("[REGISTER] Endpoint:", url);
      console.log("[REGISTER] Name:", cleanName);
      console.log("[REGISTER] Email:", cleanEmail);
      console.log("================================");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: password,
        }),
      });

      console.log("[REGISTER] HTTP status:", response.status);

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { detail: text } : null;
      }

      console.log("[REGISTER] Response:", data);

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data?.detail || data?.message,
            `Registration failed with status ${response.status}.`
          )
        );
      }

      console.log("[REGISTER] Registration successful");

      setSuccess(
        "Account created successfully! Redirecting to login..."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onLogin();
      }, 1500);
    } catch (err) {
      console.error("[REGISTER] Error:", err);

      const message = String(err?.message || "");

      if (
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("networkerror") ||
        message.toLowerCase().includes("network request failed")
      ) {
        setError(
          "Cannot reach the API server. Please check your internet connection or try again."
        );
      } else {
        setError(
          message || "Unable to create your account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-background">
        <div className="auth-orb auth-orb-one"></div>
        <div className="auth-orb auth-orb-two"></div>
      </div>

      <button
        className="auth-back-button"
        onClick={onBack}
        type="button"
      >
        ← Back to Home
      </button>

      <div className="auth-container">

        <div className="auth-info">

          <div className="auth-brand">
            <div className="auth-brand-icon">
              R
            </div>

            <div>
              <h2>
                Resume<span>AI</span>
              </h2>

              <p>AI Career Assistant</p>
            </div>
          </div>

          <div className="auth-info-content">

            <div className="auth-small-badge">
              <span>AI</span>
              AI-POWERED
            </div>

            <h1>
              Start Your
              <br />
              <span>Career Journey.</span>
            </h1>

            <p>
              Create your ResumeAI account and get
              personalized resume analysis, job matching,
              and career recommendations.
            </p>

            <div className="auth-benefits">

              <div className="auth-benefit">
                <div>✓</div>
                <span>Analyze Your Resume</span>
              </div>

              <div className="auth-benefit">
                <div>✓</div>
                <span>Discover Matching Jobs</span>
              </div>

              <div className="auth-benefit">
                <div>✓</div>
                <span>
                  Get Personalized Career Insights
                </span>
              </div>

            </div>

          </div>
        </div>

        <div className="auth-card">

          <div className="auth-card-header">

            <div className="mobile-auth-icon">
              R
            </div>

            <h2>Create Your Account</h2>

            <p>
              Join ResumeAI and start improving your career.
            </p>

          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              <span>✓</span>
              {success}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleRegister}
          >

            <div className="auth-field">

              <label htmlFor="name">
                Full Name
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  R
                </span>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  autoComplete="name"
                  required
                />

              </div>
            </div>

            <div className="auth-field">

              <label htmlFor="register-email">
                Email Address
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  @
                </span>

                <input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                />

              </div>
            </div>

            <div className="auth-field">

              <label htmlFor="register-password">
                Password
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  •••
                </span>

                <input
                  id="register-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

              </div>
            </div>

            <div className="auth-field">

              <label htmlFor="confirm-password">
                Confirm Password
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  •••
                </span>

                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <div className="auth-register-text">

            <span>
              Already have an account?
            </span>

            <button
              type="button"
              onClick={onLogin}
            >
              Sign In
            </button>

          </div>

          <p className="auth-security">
            <span>SECURE</span>
            Your account information is securely protected.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;