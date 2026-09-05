import { useState } from "react";
import {
  API_BASE_URL,
  formatApiError,
  networkErrorMessage,
} from "./api";

function Login({ onBack, onRegister, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email.trim());
      formData.append("password", password);

      console.log("================================");
      console.log("[LOGIN] API URL:", API_BASE_URL);
      console.log("[LOGIN] Endpoint:", `${API_BASE_URL}/auth/login`);
      console.log("[LOGIN] Email:", email.trim());
      console.log("[LOGIN] Sending login request...");
      console.log("================================");

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      console.log("[LOGIN] Response status:", response.status);

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      console.log("[LOGIN] Response data:", data);

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data?.detail,
            `Login failed with status ${response.status}.`
          )
        );
      }

      if (!data?.access_token) {
        throw new Error(
          "Login succeeded, but the server did not return an access token."
        );
      }

      // Save authentication information
      localStorage.setItem(
        "access_token",
        data.access_token
      );

      localStorage.setItem(
        "token_type",
        data.token_type || "Bearer"
      );

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      } else {
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: email.trim(),
            name:
              email.trim().split("@")[0] || "User",
          })
        );
      }

      console.log("[LOGIN] Login successful.");

      onLoginSuccess();
    } catch (err) {
      console.error("[LOGIN] Login error:", err);

      const message =
        err?.message || "";

      if (
        message.includes(
          "Cannot reach the API server"
        ) ||
        message.toLowerCase().includes(
          "failed to fetch"
        ) ||
        message.toLowerCase().includes(
          "networkerror"
        )
      ) {
        setError(
          "Cannot reach the API server. Please check your internet connection or try again."
        );
      } else {
        setError(
          message ||
            networkErrorMessage(err)
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
              Welcome
              <br />
              <span>Back.</span>
            </h1>

            <p>
              Continue your career journey with
              AI-powered resume analysis, job
              matching, and career insights.
            </p>

            <div className="auth-benefits">

              <div className="auth-benefit">
                <div>✓</div>
                <span>
                  AI Resume Analysis
                </span>
              </div>

              <div className="auth-benefit">
                <div>✓</div>
                <span>
                  Smart Job Matching
                </span>
              </div>

              <div className="auth-benefit">
                <div>✓</div>
                <span>
                  Personalized Career Insights
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
              Sign in to ResumeAI
            </h2>

            <p>
              Enter your details to access your
              dashboard.
            </p>

          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              {error}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleLogin}
          >

            <div className="auth-field">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  required
                />

              </div>

            </div>

            <div className="auth-field">

              <div className="auth-label-row">

                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => {
                    alert(
                      "Password reset will be available soon."
                    );
                  }}
                >
                  Forgot password?
                </button>

              </div>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  •••
                </span>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
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
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={onRegister}
            >
              Create an account
            </button>

          </div>

          <p className="auth-security">
            <span>SECURE</span>
            Your account information is securely
            protected.
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;