import { useEffect, useState } from "react";
import "./App.css";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import { clearAuth, getToken } from "./api";


/* =========================================================
   GET INITIAL PAGE
   ========================================================= */

function getInitialPage() {
  const token = getToken();

  // If user is logged in, always open dashboard
  if (token) {
    return "dashboard";
  }

  // Otherwise restore the last public page
  const savedPage = localStorage.getItem("resumeai_page");

  if (
    savedPage === "login" ||
    savedPage === "register"
  ) {
    return savedPage;
  }

  return "home";
}


/* =========================================================
   APP
   ========================================================= */

function App() {
  const [page, setPage] = useState(
    getInitialPage
  );


  /* =======================================================
     SAVE PAGE
     ======================================================= */

  useEffect(() => {
    /*
     * If a valid token exists, always remember dashboard.
     */
    if (getToken()) {
      localStorage.setItem(
        "resumeai_page",
        "dashboard"
      );

      return;
    }

    /*
     * No token = user is not logged in.
     * Save only public pages.
     */
    if (
      page === "home" ||
      page === "login" ||
      page === "register"
    ) {
      localStorage.setItem(
        "resumeai_page",
        page
      );
    }
  }, [page]);


  /* =======================================================
     NAVIGATION HELPER
     ======================================================= */

  const navigate = (nextPage) => {
    /*
     * Never allow dashboard without authentication.
     */
    if (
      nextPage === "dashboard" &&
      !getToken()
    ) {
      setPage("login");
      return;
    }

    setPage(nextPage);
  };


  /* =======================================================
     LOGIN
     ======================================================= */

  if (page === "login") {
    return (
      <Login
        onBack={() => navigate("home")}
        onRegister={() => navigate("register")}
        onLoginSuccess={() => {
          /*
           * Login component stores the token first.
           * Then move to dashboard.
           */
          localStorage.setItem(
            "resumeai_page",
            "dashboard"
          );

          setPage("dashboard");
        }}
      />
    );
  }


  /* =======================================================
     REGISTER
     ======================================================= */

  if (page === "register") {
    return (
      <Register
        onBack={() => navigate("home")}
        onLogin={() => navigate("login")}
      />
    );
  }


  /* =======================================================
     DASHBOARD
     ======================================================= */

  if (page === "dashboard") {

    /*
     * Safety check.
     *
     * If token is removed/expired and the Dashboard
     * sends the user to logout, return to home.
     */
    if (!getToken()) {
      return (
        <Login
          onBack={() => navigate("home")}
          onRegister={() => navigate("register")}
          onLoginSuccess={() => {
            localStorage.setItem(
              "resumeai_page",
              "dashboard"
            );

            setPage("dashboard");
          }}
        />
      );
    }

    return (
      <Dashboard
        onLogout={() => {
          clearAuth();

          localStorage.removeItem(
            "resumeai_page"
          );

          setPage("home");
        }}
      />
    );
  }


  /* =======================================================
     HOME PAGE
     ======================================================= */

  return (
    <div className="home-page">

      {/* =================================================
          NAVBAR
          ================================================= */}

      <nav className="home-navbar">

        <button
          className="home-logo"
          onClick={() => navigate("home")}
          aria-label="Go to home"
        >

          <div className="home-logo-icon">
            R
          </div>

          <div className="home-logo-text">

            <h2>
              Resume<span>AI</span>
            </h2>

            <p>
              AI Career Assistant
            </p>

          </div>

        </button>


        <div className="home-nav-actions">

          <button
            className="home-login-button"
            onClick={() => navigate("login")}
          >
            Login
          </button>

          <button
            className="home-register-button"
            onClick={() => navigate("register")}
          >
            Get Started
          </button>

        </div>

      </nav>


      {/* =================================================
          HERO SECTION
          ================================================= */}

      <section className="home-hero">

        <div className="hero-content">

          <div className="home-badge">
            <span>AI</span>
            AI-Powered Career Assistant
          </div>


          <h1>
            Build a Resume
            <br />
            <span>That Gets You Hired.</span>
          </h1>


          <p className="hero-description">
            Analyze your resume with AI, improve your ATS
            score, and discover jobs that match your skills
            and experience.
          </p>


          <div className="hero-buttons">

            <button
              className="home-primary-button"
              onClick={() => navigate("login")}
            >
              Analyze My Resume
              <span>→</span>
            </button>


            <button
              className="home-secondary-button"
              onClick={() => navigate("register")}
            >
              Create Free Account
            </button>

          </div>


          {/* HERO STATS */}

          <div className="home-stats">

            <div className="home-stat-card">

              <strong>
                95%
              </strong>

              <span>
                ATS Optimization
              </span>

            </div>


            <div className="home-stat-divider"></div>


            <div className="home-stat-card">

              <strong>
                AI
              </strong>

              <span>
                Smart Analysis
              </span>

            </div>


            <div className="home-stat-divider"></div>


            <div className="home-stat-card">

              <strong>
                Jobs
              </strong>

              <span>
                Smart Matching
              </span>

            </div>

          </div>

        </div>


        {/* =================================================
            RESUME PREVIEW
            ================================================= */}

        <div className="hero-visual">

          <div className="hero-glow"></div>


          <div className="resume-preview">

            <div className="resume-preview-header">

              <div className="resume-user-icon">
                R
              </div>


              <div className="resume-title">

                <strong>
                  Resume Analysis
                </strong>

                <span>
                  AI-powered insights
                </span>

              </div>


              <div className="analysis-status">
                ✓
              </div>

            </div>


            <div className="resume-score">

              <div className="score-circle">

                <strong>
                  95
                </strong>

                <span>
                  /100
                </span>

              </div>


              <div className="score-info">

                <strong>
                  Excellent Resume
                </strong>

                <span>
                  ATS Compatibility
                </span>


                <div className="score-bar">
                  <div></div>
                </div>

              </div>

            </div>


            <div className="preview-item">

              <span>
                ✓
              </span>

              Strong technical skills

            </div>


            <div className="preview-item">

              <span>
                ✓
              </span>

              Clear professional summary

            </div>


            <div className="preview-item warning">

              <span>
                !
              </span>

              Improve keyword matching

            </div>


            <div className="preview-job">

              <div>

                <small>
                  AI MATCH
                </small>

                <strong>
                  Full-Stack Developer
                </strong>

              </div>


              <b>
                92%
              </b>

            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          FEATURES SECTION
          ================================================= */}

      <section className="home-features">

        <div className="section-heading">

          <div className="home-badge">

            <span>
              06
            </span>

            Powerful Features

          </div>


          <h2>

            Everything You Need to
            <span>
              {" "}Get Hired
            </span>

          </h2>


          <p>
            One intelligent platform to analyze, improve,
            and optimize your entire career profile.
          </p>

        </div>


        <div className="feature-grid">

          <Feature
            icon="01"
            title="AI Resume Analysis"
            text="Get detailed AI-powered feedback about your resume, skills, experience, and overall profile."
          />

          <Feature
            icon="02"
            title="ATS Compatibility"
            text="Discover how well your resume performs against Applicant Tracking Systems."
          />

          <Feature
            icon="03"
            title="Smart Job Matching"
            text="Find realistic job roles that match your current skills and experience."
          />

          <Feature
            icon="04"
            title="AI Career Insights"
            text="Receive personalized recommendations to guide your career growth."
          />

          <Feature
            icon="05"
            title="Easy Resume Upload"
            text="Upload your PDF resume and let AI analyze it in seconds."
          />

          <Feature
            icon="06"
            title="Actionable Suggestions"
            text="Get clear and practical recommendations for improving your career profile."
          />

        </div>

      </section>


      {/* =================================================
          HOW IT WORKS
          ================================================= */}

      <section className="how-it-works">

        <div className="section-heading">

          <div className="home-badge">

            <span>
              PROCESS
            </span>

            Simple Process

          </div>


          <h2>

            Your Career,
            <span>
              {" "}Upgraded by AI
            </span>

          </h2>


          <p>
            From resume upload to job discovery in four
            simple steps.
          </p>

        </div>


        <div className="steps">

          <Step
            number="01"
            icon="UP"
            title="Upload Resume"
            text="Upload your existing resume in PDF format."
          />


          <Step
            number="02"
            icon="AI"
            title="AI Analysis"
            text="Our AI analyzes your skills, experience and ATS compatibility."
          />


          <Step
            number="03"
            icon="AN"
            title="Get Insights"
            text="Understand your strengths, weaknesses and improvement areas."
          />


          <Step
            number="04"
            icon="JOB"
            title="Find Jobs"
            text="Discover job roles that best match your profile."
          />

        </div>

      </section>


      {/* =================================================
          CTA SECTION
          ================================================= */}

      <section className="home-cta">

        <div className="cta-glow"></div>


        <div className="cta-content">

          <div className="home-badge">

            <span>
              START
            </span>

            Start Your Career Journey

          </div>


          <h2>

            Ready to Improve
            <br />

            <span>
              Your Resume?
            </span>

          </h2>


          <p>

            Let AI analyze your resume and help you take
            the next step toward your dream career.

          </p>


          <button
            className="home-primary-button"
            onClick={() => navigate("register")}
          >

            Start Analyzing

            <span>
              →
            </span>

          </button>

        </div>

      </section>


      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="home-footer">

        <div className="footer-logo">

          <div className="home-logo-icon">
            R
          </div>


          <div>

            <strong>
              Resume<span>AI</span>
            </strong>

            <small>
              AI Career Assistant
            </small>

          </div>

        </div>


        <p>
          © 2026 ResumeAI. All rights reserved.
        </p>

      </footer>

    </div>
  );
}


/* =========================================================
   FEATURE COMPONENT
   ========================================================= */

function Feature({
  icon,
  title,
  text,
}) {
  return (
    <div className="feature-card">

      <div className="feature-icon">
        {icon}
      </div>


      <h3>
        {title}
      </h3>


      <p>
        {text}
      </p>


      <span className="feature-arrow">
        Explore feature →
      </span>

    </div>
  );
}


/* =========================================================
   STEP COMPONENT
   ========================================================= */

function Step({
  number,
  icon,
  title,
  text,
}) {
  return (
    <div className="step-card">

      <div className="step-number">
        {number}
      </div>


      <div className="step-icon">
        {icon}
      </div>


      <h3>
        {title}
      </h3>


      <p>
        {text}
      </p>

    </div>
  );
}


export default App;