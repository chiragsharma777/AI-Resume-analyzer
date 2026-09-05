import { useState } from "react";
import {
  API_BASE_URL,
  formatApiError,
  networkErrorMessage,
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

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      console.log("================================");
      console.log("[REGISTER] API URL:", API_BASE_URL);
      console.log(
        "[REGISTER] Endpoint:",
        `${API_BASE_URL}/auth/register`
      );
      console.log("[REGISTER] Name:", name.trim());
      console.log("[REGISTER] Email:", email.trim());
      console.log("[REGISTER] Sending registration request...");
      console.log("================================");

      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      console.log(
        "[REGISTER] Response status:",
        response.status
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      console.log(
        "[REGISTER] Response data:",
        data
      );

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data?.detail,
            `Registration failed with status ${response.status}.`
          )
        );
      }

      console.log(
        "[REGISTER] Registration successful."
      );

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

    } catch (error) {
      console.error(
        "[REGISTER] Registration error:",
        error
      );

      const message =
        error?.message || "";

      if (
        message.toLowerCase().includes(
          "failed to fetch"
        ) ||
        message.toLowerCase().includes(
          "networkerror"
        ) ||
        message.toLowerCase().includes(
          "network request failed"
        )
      ) {
        setError(
          "Cannot reach the API server. Please check your internet connection or try again."
        );
      } else {
        setError(
          message ||
            networkErrorMessage(error)
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

              <p>
                AI Career Assistant
              </p>
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
                <span>
                  Analyze Your Resume
                </span>
              </div>

              <div className="auth-benefit">
                <div>✓</div>
                <span>
                  Discover Matching Jobs
                </span>
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

            <h2>
              Create Your Account
            </h2>

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
