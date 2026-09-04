import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./App.css";

import {
  API_BASE_URL,
  apiRequest,
  clearAuth,
  formatApiError,
  getToken,
  getTokenType,
  networkErrorMessage,
} from "./api";


/* =========================================================
   CONSTANTS
   ========================================================= */

const MAX_RESUME_SIZE = 10 * 1024 * 1024;

const ACCEPTED_RESUME_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
];


const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    icon: "01",
  },
  {
    id: "resume",
    label: "My Resume",
    icon: "02",
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: "03",
  },
  {
    id: "jobs",
    label: "Job Matches",
    icon: "04",
  },
];


const PAGE_META = {
  overview: {
    title: "Dashboard",
    subtitle: "Your career workspace at a glance",
  },

  resume: {
    title: "My Resume",
    subtitle:
      "Upload and manage the resume AI will analyze",
  },

  analysis: {
    title: "Resume Analysis",
    subtitle:
      "Simple AI-powered insights to improve your resume",
  },

  jobs: {
    title: "Job Matches",
    subtitle:
      "Roles matched to your profile with apply links",
  },
};


/* =========================================================
   JWT USER HELPER
   ========================================================= */

function getUserFromToken() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );

    return {
      id:
        payload.id ??
        payload.user_id ??
        payload.sub ??
        "authenticated_user",

      name:
        payload.name ??
        payload.full_name ??
        payload.username ??
        "",

      email:
        payload.email ??
        "",
    };

  } catch (error) {
    console.error(
      "Could not decode token:",
      error
    );

    return null;
  }
}


/* =========================================================
   SKILLS HELPER
   ========================================================= */

function flattenSkills(analysis) {
  if (!analysis) {
    return [];
  }

  if (Array.isArray(analysis.skills)) {
    return analysis.skills;
  }

  if (Array.isArray(analysis.detected_skills)) {
    return analysis.detected_skills;
  }

  const technicalFields = [
    "programming_languages",
    "frameworks_libraries",
    "frontend",
    "backend",
    "databases",
    "ai_ml",
    "cloud_deployment",
    "developer_tools",
    "apis",
    "tools_technologies",
    "other",
  ];

  const collected = [];

  technicalFields.forEach((field) => {
    const value = analysis[field];

    if (Array.isArray(value)) {
      collected.push(...value);
    } else if (
      typeof value === "string" &&
      value.trim()
    ) {
      collected.push(value);
    }
  });

  return collected;
}


/* =========================================================
   ANALYSIS NORMALIZER
   ========================================================= */

function normalizeAnalysis(payload) {
  if (!payload) {
    return null;
  }

  let data = payload;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return {
        score: 0,
        ats_score: 0,
        resume_score: 0,
        summary: data,
        skills: [],
        strengths: [],
        improvements: [],
        recommended_roles: [],
      };
    }
  }

  if (!data || typeof data !== "object") {
    return null;
  }


  if (
    data.analysis &&
    typeof data.analysis === "object"
  ) {
    data = {
      ...data.analysis,
      ...data,
    };
  }


  if (
    typeof data.analysis === "string"
  ) {
    try {
      const parsed =
        JSON.parse(data.analysis);

      data = {
        ...parsed,
        ...data,
      };

    } catch {
      // Keep original data.
    }
  }


  const score = Number(
    data.ats_score ??
      data.score ??
      data.resume_score ??
      0
  ) || 0;


  const summary =
    data.executive_summary ||
    data.summary ||
    data.overall_summary ||
    "Your resume has been analyzed successfully.";


  const strengths =
    Array.isArray(data.strengths)
      ? data.strengths
      : [];


  const improvements =
    Array.isArray(data.improvements)
      ? data.improvements
      : Array.isArray(data.weaknesses)
        ? data.weaknesses
        : [];


  const recommendedRoles =
    Array.isArray(
      data.recommended_roles
    )
      ? data.recommended_roles
      : Array.isArray(
          data.recommended_job_roles
        )
        ? data.recommended_job_roles
        : [];


  return {
    ...data,

    score,
    ats_score: score,
    resume_score: score,

    summary,

    skills:
      flattenSkills(data),

    strengths,

    improvements,

    recommended_roles:
      recommendedRoles,

    action_plan:
      Array.isArray(data.action_plan)
        ? data.action_plan
        : [],

    projects:
      Array.isArray(data.projects)
        ? data.projects
        : [],

    missing_skills:
      Array.isArray(data.missing_skills)
        ? data.missing_skills
        : [],

    resume_problems:
      Array.isArray(data.resume_problems)
        ? data.resume_problems
        : [],
  };
}


/* =========================================================
   JOB SEARCH LINKS
   ========================================================= */

function buildJobSearchLinks(title) {
  const encodedTitle =
    encodeURIComponent(title);

  return [
    {
      platform: "LinkedIn",
      url:
        `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}`,
    },

    {
      platform: "Indeed",
      url:
        `https://www.indeed.com/jobs?q=${encodedTitle}`,
    },

    {
      platform: "Naukri",
      url:
        `https://www.naukri.com/${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-jobs`,
    },

    {
      platform: "Wellfound",
      url:
        `https://wellfound.com/jobs?query=${encodedTitle}`,
    },
  ];
}


/* =========================================================
   JOB NORMALIZER
   ========================================================= */

function normalizeJob(job, index = 0) {
  if (!job) {
    return {
      id: `job-${index}`,
      title: "Recommended Role",
      company: "Company",
      location: "Remote",
      type: "Full-time",
      match_score: 0,
      match_level: "",
      why_it_matches: "",
      matching_skills: [],
      missing_skills: [],
      recommendations: [],
      url: "",
      job_links: [],
    };
  }


  const title =
    job.title ||
    job.job_title ||
    job.role ||
    "Recommended Role";


  let links =
    Array.isArray(job.job_links)
      ? job.job_links
      : [];


  if (!links.length) {
    links =
      buildJobSearchLinks(title);
  }


  return {
    id:
      job.id ??
      job.job_id ??
      `job-${index}`,

    title,

    company:
      job.company ||
      job.company_name ||
      "Company",

    location:
      job.location ||
      job.city ||
      "Remote",

    type:
      job.type ||
      job.job_type ||
      "Full-time",

    match_score:
      Number(
        job.match_score ??
          job.match_percentage ??
          job.score ??
          0
      ) || 0,

    match_level:
      job.match_level ||
      job.match ||
      "",

    why_it_matches:
      job.why_it_matches ||
      job.reason ||
      job.description ||
      "",

    matching_skills:
      Array.isArray(
        job.matching_skills
      )
        ? job.matching_skills
        : Array.isArray(
            job.skills
          )
          ? job.skills
          : [],

    missing_skills:
      Array.isArray(
        job.missing_skills
      )
        ? job.missing_skills
        : [],

    recommendations:
      Array.isArray(
        job.recommendations
      )
        ? job.recommendations
        : [],

    url:
      job.url ||
      job.apply_url ||
      "",

    job_links: links,
  };
}


/* =========================================================
   ANALYSIS TEXT HELPER
   ========================================================= */

function getAnalysisText(item) {
  if (
    typeof item === "string"
  ) {
    return item;
  }

  if (
    !item ||
    typeof item !== "object"
  ) {
    return "";
  }

  return (
    item.description ||
    item.text ||
    item.reason ||
    item.title ||
    item.skill ||
    item.name ||
    item.message ||
    ""
  );
}


/* =========================================================
   ANALYSIS TAGS
   ========================================================= */

function AnalysisTags({
  items = [],
  emptyText = "No information available.",
}) {
  if (!Array.isArray(items)) {
    return (
      <p className="analysis-summary">
        {emptyText}
      </p>
    );
  }


  const cleanedItems =
    items
      .map((item) => {
        if (
          typeof item === "string"
        ) {
          return item;
        }

        if (
          item &&
          typeof item === "object"
        ) {
          return (
            item.name ||
            item.skill ||
            item.title ||
            item.text ||
            item.description ||
            ""
          );
        }

        return "";
      })
      .filter(Boolean);


  if (!cleanedItems.length) {
    return (
      <p className="analysis-summary">
        {emptyText}
      </p>
    );
  }


  return (
    <div className="dashboard-tags">
      {cleanedItems.map(
        (item, index) => (
          <span
            key={`${item}-${index}`}
          >
            {item}
          </span>
        )
      )}
    </div>
  );
}


/* =========================================================
   ANALYSIS CARD
   ========================================================= */

function AnalysisCard({
  title,
  children,
  className = "",
}) {
  return (
    <section
      className={`dashboard-card analysis-detail-card ${className}`}
    >
      <div className="dashboard-card-heading">
        <h3>{title}</h3>
      </div>

      {children}
    </section>
  );
}


/* =========================================================
   ANALYSIS SCORE
   ========================================================= */

function AnalysisScore({
  score = 0,
}) {
  const safeScore = Math.max(
    0,
    Math.min(
      100,
      Number(score) || 0
    )
  );


  let rating =
    "Needs Polish";


  if (safeScore >= 85) {
    rating = "Excellent";
  } else if (safeScore >= 70) {
    rating = "Strong";
  } else if (safeScore >= 55) {
    rating = "Good Foundation";
  }


  return (
    <section className="analysis-score-card analysis-detailed-hero">

      <div className="analysis-big-score">

        <div
          className="score-circle"
          style={{
            "--score-angle":
              `${safeScore * 3.6}deg`,
          }}
        >
          <div className="score-circle-inner">
            {safeScore}%
          </div>
        </div>


        <strong>
          {rating}
        </strong>


        <span>
          ATS Readiness
        </span>

      </div>

    </section>
  );
}


/* =========================================================
   SIMPLIFIED DETAILED ANALYSIS
   ========================================================= */

function DetailedAnalysis({
  analysis,
  onFindJobs,
}) {
  if (!analysis) {
    return null;
  }


  const score = Math.max(
    0,
    Math.min(
      100,
      Number(
        analysis.ats_score ??
          analysis.score ??
          analysis.resume_score ??
          0
      ) || 0
    )
  );


  const summary =
    analysis.executive_summary ||
    analysis.summary ||
    analysis.overall_summary ||
    "Your resume has been analyzed successfully.";


  const skills =
    Array.isArray(
      analysis.skills
    )
      ? analysis.skills
      : Array.isArray(
          analysis.detected_skills
        )
        ? analysis.detected_skills
        : [];


  const strengths =
    Array.isArray(
      analysis.strengths
    )
      ? analysis.strengths
      : [];


  const improvements =
    Array.isArray(
      analysis.improvements
    )
      ? analysis.improvements
      : Array.isArray(
          analysis.weaknesses
        )
        ? analysis.weaknesses
        : [];


  const roles =
    Array.isArray(
      analysis.recommended_roles
    )
      ? analysis.recommended_roles
      : Array.isArray(
          analysis.recommended_job_roles
        )
        ? analysis.recommended_job_roles
        : [];


  return (
    <div className="dashboard-analysis-details">

      {/* =====================================================
          ATS SCORE
         ===================================================== */}

      <AnalysisScore
        score={score}
      />


      {/* =====================================================
          AI SUMMARY
         ===================================================== */}

      <AnalysisCard
        title="AI Summary"
      >

        <p className="analysis-summary analysis-main-summary">
          {summary}
        </p>

      </AnalysisCard>


      {/* =====================================================
          SKILLS
         ===================================================== */}

      <AnalysisCard
        title="Skills"
      >

        <AnalysisTags
          items={skills}
          emptyText="No skills detected."
        />

      </AnalysisCard>


      {/* =====================================================
          STRENGTHS
         ===================================================== */}

      <AnalysisCard
        title="Strengths"
      >

        {strengths.length ? (

          <div className="analysis-list">

            {strengths.map(
              (
                item,
                index
              ) => {

                const text =
                  getAnalysisText(
                    item
                  );

                if (!text) {
                  return null;
                }

                return (
                  <div
                    className="analysis-list-item"
                    key={index}
                  >

                    <span className="analysis-list-icon">
                      ✓
                    </span>

                    <p>
                      {text}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        ) : (

          <p className="analysis-summary">
            No specific strengths were detected.
          </p>

        )}

      </AnalysisCard>


      {/* =====================================================
          IMPROVEMENTS
         ===================================================== */}

      <AnalysisCard
        title="Improvements"
      >

        {improvements.length ? (

          <div className="analysis-list">

            {improvements.map(
              (
                item,
                index
              ) => {

                const text =
                  getAnalysisText(
                    item
                  );

                if (!text) {
                  return null;
                }

                return (
                  <div
                    className="analysis-list-item"
                    key={index}
                  >

                    <span className="analysis-list-icon">
                      →
                    </span>

                    <p>
                      {text}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        ) : (

          <p className="analysis-summary">
            No major improvements were identified.
          </p>

        )}

      </AnalysisCard>


      {/* =====================================================
          RECOMMENDED CAREER ROLES
         ===================================================== */}

      <AnalysisCard
        title="Recommended Career Roles"
      >

        {roles.length ? (

          <div className="analysis-role-list">

            {roles.map(
              (
                role,
                index
              ) => {

                const roleName =
                  typeof role === "string"
                    ? role
                    : role?.title ||
                      role?.role ||
                      role?.name ||
                      "Recommended Role";


                const roleScore =
                  typeof role === "object"
                    ? Number(
                        role.match_score ??
                          role.match_percentage ??
                          role.score ??
                          0
                      ) || 0
                    : 0;


                const reason =
                  typeof role === "object"
                    ? role.reason ||
                      role.description ||
                      ""
                    : "";


                return (
                  <div
                    className="analysis-role-item"
                    key={index}
                  >

                    <div className="analysis-role-info">

                      <strong>
                        {roleName}
                      </strong>

                      {reason && (
                        <p>
                          {reason}
                        </p>
                      )}

                    </div>


                    {roleScore > 0 && (
                      <span className="analysis-role-score">
                        {roleScore}%
                      </span>
                    )}

                  </div>
                );
              }
            )}

          </div>

        ) : (

          <p className="analysis-summary">
            No career roles were generated yet.
          </p>

        )}


        <div className="dashboard-actions">

          <button
            className="dashboard-primary-button"
            onClick={
              onFindJobs
            }
          >
            Explore Job Matches
          </button>

        </div>

      </AnalysisCard>

    </div>
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

export default function Dashboard({
  onLogout,
}) {

  const [user, setUser] =
    useState(null);


  const [page, setPage] =
    useState("overview");


  const [resume, setResume] =
    useState(null);


  const [resumeId, setResumeId] =
    useState(null);


  const [selectedFile, setSelectedFile] =
    useState(null);


  const [isDragging, setIsDragging] =
    useState(false);


  const [analysis, setAnalysis] =
    useState(null);


  const [jobs, setJobs] =
    useState([]);


  const [jobMeta, setJobMeta] =
    useState({
      career_recommendation: "",
      skills_to_learn: [],
      top_match: null,
      candidate_profile: null,
    });


  const [loading, setLoading] =
    useState(false);


  const [uploading, setUploading] =
    useState(false);


  const [error, setError] =
    useState("");


  const [success, setSuccess] =
    useState("");


  const fileInputRef =
    useRef(null);


  const jobsFetchedFor =
    useRef(null);


  /* =========================================================
     AUTH / INITIAL LOAD
     ========================================================= */

  useEffect(() => {

    const token =
      getToken();


    if (!token) {
      onLogout?.();
      return;
    }


    let savedUser = null;


    try {

      const stored =
        localStorage.getItem(
          "user"
        );


      if (stored) {
        savedUser =
          JSON.parse(
            stored
          );
      }

    } catch (err) {

      console.error(
        "Could not read saved user:",
        err
      );

    }


    const tokenUser =
      getUserFromToken();


    const currentUser =
      savedUser ||
      tokenUser || {
        id: "authenticated_user",
        name: "User",
        email: "",
      };


    setUser(
      currentUser
    );


    localStorage.setItem(
      "user",
      JSON.stringify(
        currentUser
      )
    );


    const savedResumeId =
      localStorage.getItem(
        `resume_id_${currentUser.id}`
      );


    if (savedResumeId) {
      setResumeId(
        savedResumeId
      );
    }

  }, [onLogout]);


  /* =========================================================
     STORAGE KEY
     ========================================================= */

  const storageKey =
    (key) => {

      const userId =
        user?.id ||
        "authenticated_user";


      return `${key}_${userId}`;
    };


  /* =========================================================
     NAVIGATION
     ========================================================= */

  const goTo =
    (nextPage) => {

      setError("");
      setSuccess("");

      setPage(
        nextPage
      );
    };


  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout =
    () => {

      clearAuth();


      if (user?.id) {

        localStorage.removeItem(
          `resume_${user.id}`
        );


        localStorage.removeItem(
          `resume_id_${user.id}`
        );


        localStorage.removeItem(
          `analysis_${user.id}`
        );


        localStorage.removeItem(
          `jobs_${user.id}`
        );


        localStorage.removeItem(
          `job_meta_${user.id}`
        );

      }


      onLogout?.();
    };


  /* =========================================================
     FILE VALIDATION
     ========================================================= */

  const getFileValidationError =
    (file) => {

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase();


      if (
        !extension ||
        !ACCEPTED_RESUME_EXTENSIONS.includes(
          extension
        )
      ) {

        return (
          "Please choose a PDF, DOC, DOCX, or TXT resume."
        );
      }


      if (
        file.size >
        MAX_RESUME_SIZE
      ) {

        return (
          "Your resume must be 10 MB or smaller."
        );
      }


      return "";
    };


  /* =========================================================
     UPLOAD
     ========================================================= */

  const uploadFile =
    async (file) => {

      if (!file) {
        return;
      }


      setError("");
      setSuccess("");


      const validationError =
        getFileValidationError(
          file
        );


      if (validationError) {

        setSelectedFile(
          null
        );

        setError(
          validationError
        );

        return;
      }


      setSelectedFile(
        file
      );

      setUploading(
        true
      );


      try {

        const token =
          getToken();


        if (!token) {

          throw new Error(
            "Authentication token missing. Please login again."
          );
        }


        const formData =
          new FormData();


        formData.append(
          "file",
          file
        );


        let response;


        try {

          response =
            await fetch(
              `${API_BASE_URL}/resumes/upload`,
              {
                method: "POST",

                headers: {
                  Authorization:
                    `${getTokenType()} ${token}`,
                },

                body:
                  formData,
              }
            );

        } catch (err) {

          throw new Error(
            networkErrorMessage(
              err
            )
          );

        }


        let data = null;


        try {

          data =
            await response.json();

        } catch {

          data = null;

        }


        if (
          response.status ===
          401
        ) {

          handleLogout();


          throw new Error(
            formatApiError(
              data?.detail,
              "Authentication failed. Please login again."
            )
          );
        }


        if (!response.ok) {

          throw new Error(
            formatApiError(
              data?.detail ||
                data?.message,
              "Failed to upload resume."
            )
          );
        }


        const returnedResume =
          data?.resume ||
          data;


        const returnedResumeId =
          data?.resume_id ||
          data?.id ||
          returnedResume?.id;


        if (
          !returnedResumeId
        ) {

          throw new Error(
            "Resume uploaded, but no resume ID was returned."
          );
        }


        const resumePayload = {
          id:
            returnedResumeId,

          filename:
            returnedResume?.filename ||
            data?.filename ||
            file.name,
        };


        setResume(
          resumePayload
        );


        setResumeId(
          returnedResumeId
        );


        setAnalysis(
          null
        );


        setJobs(
          []
        );


        setJobMeta({
          career_recommendation:
            "",
          skills_to_learn: [],
          top_match: null,
          candidate_profile:
            null,
        });


        jobsFetchedFor.current =
          null;


        localStorage.setItem(
          storageKey("resume"),
          JSON.stringify(
            resumePayload
          )
        );


        localStorage.setItem(
          storageKey("resume_id"),
          String(
            returnedResumeId
          )
        );


        localStorage.removeItem(
          storageKey("analysis")
        );


        localStorage.removeItem(
          storageKey("jobs")
        );


        localStorage.removeItem(
          storageKey("job_meta")
        );


        setSuccess(
          "Resume uploaded successfully."
        );


        setPage(
          "resume"
        );

      } catch (err) {

        console.error(
          "Resume upload error:",
          err
        );


        setError(
          err?.message ||
            "Failed to upload resume."
        );

      } finally {

        setUploading(
          false
        );


        if (
          fileInputRef.current
        ) {

          fileInputRef.current.value =
            "";

        }

      }
    };


  /* =========================================================
     FILE HANDLERS
     ========================================================= */

  const handleUpload =
    (event) =>
      uploadFile(
        event.target.files?.[0]
      );


  const handleDrop =
    (event) => {

      event.preventDefault();


      setIsDragging(
        false
      );


      uploadFile(
        event.dataTransfer.files?.[0]
      );
    };


  const formatFileSize =
    (bytes) => {

      if (
        bytes <
        1024 * 1024
      ) {

        return `${Math.ceil(
          bytes / 1024
        )} KB`;
      }


      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    };


  /* =========================================================
     LOAD SAVED DATA
     ========================================================= */

  useEffect(() => {

    if (!user?.id) {
      return;
    }


    try {

      const savedResume =
        localStorage.getItem(
          storageKey("resume")
        );


      const savedResumeId =
        localStorage.getItem(
          storageKey("resume_id")
        );


      const savedJobs =
        localStorage.getItem(
          storageKey("jobs")
        );


      const savedJobMeta =
        localStorage.getItem(
          storageKey("job_meta")
        );


      if (savedResume) {

        setResume(
          JSON.parse(
            savedResume
          )
        );
      }


      if (savedResumeId) {

        setResumeId(
          savedResumeId
        );
      }


      if (savedJobs) {

        const parsed =
          JSON.parse(
            savedJobs
          );


        setJobs(
          Array.isArray(parsed)
            ? parsed.map(
                normalizeJob
              )
            : []
        );
      }


      if (savedJobMeta) {

        setJobMeta(
          JSON.parse(
            savedJobMeta
          )
        );
      }

    } catch (err) {

      console.error(
        "Could not load saved dashboard data:",
        err
      );

    }

  }, [user]);


  /* =========================================================
     LOAD RESUME
     ========================================================= */

  const loadResume =
    async () => {

      if (!resumeId) {

        setError(
          "Please upload a resume first."
        );

        return;
      }


      setLoading(
        true
      );

      setError(
        ""
      );


      try {

        const data =
          await apiRequest(
            `/resumes/${resumeId}`
          );


        setResume(
          data
        );


        localStorage.setItem(
          storageKey("resume"),
          JSON.stringify(
            data
          )
        );

      } catch (err) {

        console.error(
          "Resume loading error:",
          err
        );


        setError(
          err?.message ||
            "Could not load resume."
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     ANALYZE RESUME
     ========================================================= */

  const analyzeResume =
    async () => {

      if (!resumeId) {

        setError(
          "Please upload a resume first."
        );

        return;
      }


      setLoading(
        true
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );


      try {

        const data =
          await apiRequest(
            `/analysis/${resumeId}`,
            {
              method: "POST",
            }
          );


        const normalized =
          normalizeAnalysis(
            data
          );


        setAnalysis(
          normalized
        );


        localStorage.setItem(
          storageKey("analysis"),
          JSON.stringify(
            normalized
          )
        );


        setSuccess(
          "Resume analysis completed successfully."
        );


        setPage(
          "analysis"
        );

      } catch (err) {

        console.error(
          "Resume analysis error:",
          err
        );


        setError(
          err?.message ||
            "Could not analyze resume."
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     LOAD ANALYSIS
     ========================================================= */

  const loadAnalysis =
    async () => {

      if (!resumeId) {
        return;
      }


      setLoading(
        true
      );

      setError(
        ""
      );


      try {

        const data =
          await apiRequest(
            `/analysis/${resumeId}`
          );


        const normalized =
          normalizeAnalysis(
            data
          );


        setAnalysis(
          normalized
        );


        localStorage.setItem(
          storageKey("analysis"),
          JSON.stringify(
            normalized
          )
        );

      } catch (err) {

        if (
          !String(
            err?.message || ""
          )
            .toLowerCase()
            .includes(
              "not been analyzed"
            )
        ) {

          console.error(
            "Analysis loading error:",
            err
          );


          setError(
            err?.message ||
              "Could not load analysis."
          );
        }

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     LOAD JOBS
     ========================================================= */

  const loadJobs =
    async ({
      force = false,
    } = {}) => {

      if (!resumeId) {

        setError(
          "Please upload a resume first."
        );


        setJobs(
          []
        );


        return;
      }


      if (
        !force &&
        jobsFetchedFor.current ===
          String(resumeId) &&
        jobs.length
      ) {

        return;
      }


      setLoading(
        true
      );

      setError(
        ""
      );


      try {

        const data =
          await apiRequest(
            `/jobs/recommend?resume_id=${encodeURIComponent(
              resumeId
            )}`,
            {
              method: "POST",
            }
          );


        const recommendedJobs =
          data?.jobs ||
          data?.recommendations ||
          data?.job_matches ||
          [];


        const normalizedJobs =
          Array.isArray(
            recommendedJobs
          )
            ? recommendedJobs.map(
                normalizeJob
              )
            : [];


        const meta = {
          career_recommendation:
            data?.career_recommendation ||
            "",

          skills_to_learn:
            Array.isArray(
              data?.skills_to_learn
            )
              ? data.skills_to_learn
              : [],

          top_match:
            data?.top_match ||
            null,

          candidate_profile:
            data?.candidate_profile ||
            null,
        };


        setJobs(
          normalizedJobs
        );


        setJobMeta(
          meta
        );


        jobsFetchedFor.current =
          String(resumeId);


        localStorage.setItem(
          storageKey("jobs"),
          JSON.stringify(
            normalizedJobs
          )
        );


        localStorage.setItem(
          storageKey("job_meta"),
          JSON.stringify(
            meta
          )
        );


        if (
          normalizedJobs.length
        ) {

          setSuccess(
            `Found ${normalizedJobs.length} job matches with search links.`
          );
        }

      } catch (err) {

        console.error(
          "Job recommendation error:",
          err
        );


        setError(
          err?.message ||
            "Could not load job recommendations."
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     RESTORE ANALYSIS
     ========================================================= */

  useEffect(() => {

    if (!user) {
      return;
    }


    const savedAnalysis =
      localStorage.getItem(
        storageKey("analysis")
      );


    if (savedAnalysis) {

      try {

        setAnalysis(
          normalizeAnalysis(
            JSON.parse(
              savedAnalysis
            )
          )
        );

      } catch {

        localStorage.removeItem(
          storageKey("analysis")
        );

      }
    }

  }, [user]);


  /* =========================================================
     PAGE EFFECT
     ========================================================= */

  useEffect(() => {

    if (
      page === "analysis" &&
      resumeId
    ) {

      loadAnalysis();
    }


    if (
      page === "jobs" &&
      resumeId
    ) {

      loadJobs();
    }

  }, [
    page,
    resumeId,
  ]);


  /* =========================================================
     UI VALUES
     ========================================================= */

  const userName =
    user?.name ||
    user?.email?.split("@")[0] ||
    "User";


  const userInitial =
    userName
      .charAt(0)
      .toUpperCase();


  const scoreValue =
    Number(
      analysis?.ats_score ||
      analysis?.score ||
      analysis?.resume_score ||
      0
    );


  const nextStep =
    useMemo(() => {

      if (!resumeId) {

        return {
          title:
            "Upload your resume",

          text:
            "Start by uploading a PDF, DOCX, or TXT resume.",

          action:
            () =>
              goTo("resume"),

          label:
            "Upload Resume",
        };
      }


      if (!analysis) {

        return {
          title:
            "Run AI analysis",

          text:
            "Get your ATS score, skills, strengths, improvements, and career recommendations.",

          action:
            analyzeResume,

          label:
            loading
              ? "Analyzing..."
              : "Analyze Resume",
        };
      }


      return {
        title:
          "Discover matching jobs",

        text:
          "Find roles that fit your profile and open them on LinkedIn, Indeed, Naukri, and Wellfound.",

        action:
          () =>
            goTo("jobs"),

        label:
          "Find Jobs",
      };

    }, [
      resumeId,
      analysis,
      loading,
    ]);


  const readinessLabel =
    scoreValue >= 80
      ? "Strong profile"
      : scoreValue >= 60
        ? "Good foundation"
        : scoreValue > 0
          ? "Needs polish"
          : "Not scored yet";


  const completedSteps =
    [
      !!resumeId,
      !!analysis,
      jobs.length > 0,
    ].filter(Boolean)
      .length;


  const progressPercent =
    Math.round(
      (completedSteps / 3) *
        100
    );


  const pageMeta =
    PAGE_META[page] ||
    PAGE_META.overview;


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
         ===================================================== */}

      <aside className="dashboard-sidebar">

        <div className="dashboard-logo">

          <div className="dashboard-logo-mark">
            R
          </div>

          <div>

            <strong>
              ResumeAI
            </strong>

            <span>
              Career workspace
            </span>

          </div>

        </div>


        <div className="dashboard-user">

          <div className="dashboard-user-avatar">
            {userInitial}
          </div>

          <div>

            <strong>
              {userName}
            </strong>

            <small>
              {user?.email ||
                "Signed in"}
            </small>

          </div>

        </div>


        <div className="dashboard-nav-heading">
          WORKSPACE
        </div>


        <nav className="dashboard-navigation">

          {NAV_ITEMS.map(
            (item) => (

              <button
                key={
                  item.id
                }
                className={`dashboard-nav-link${
                  page === item.id
                    ? " active"
                    : ""
                }`}
                onClick={() =>
                  goTo(
                    item.id
                  )
                }
              >

                <span className="dashboard-icon">
                  {item.icon}
                </span>

                {item.label}

              </button>
            )
          )}

        </nav>


        <div className="dashboard-sidebar-bottom">

          <div className="dashboard-tip">

            <strong>
              Next up
            </strong>

            <p>
              {nextStep.text}
            </p>

            <button
              className="dashboard-primary-button dashboard-tip-button"
              onClick={
                nextStep.action
              }
              disabled={
                loading
              }
            >
              {nextStep.label}
            </button>

          </div>


          <button
            className="dashboard-signout"
            onClick={
              handleLogout
            }
          >
            Sign out
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN
         ===================================================== */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <div className="dashboard-header-eyebrow">
              RESUMEAI
            </div>

            <h1>
              {pageMeta.title}
            </h1>

            <p className="dashboard-header-subtitle">
              {pageMeta.subtitle}
            </p>

          </div>


          <div className="dashboard-header-actions">

            {page === "jobs" &&
              resumeId && (

                <button
                  className="dashboard-primary-button"
                  onClick={() =>
                    loadJobs({
                      force: true,
                    })
                  }
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Searching..."
                    : "Search Jobs"}
                </button>
              )}


            {page === "analysis" &&
              resumeId && (

                <button
                  className="dashboard-secondary-button"
                  onClick={
                    analyzeResume
                  }
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Analyzing..."
                    : analysis
                      ? "Re-run Analysis"
                      : "Analyze Resume"}
                </button>
              )}


            <div className="dashboard-header-profile">

              <div className="dashboard-header-avatar">
                {userInitial}
              </div>

              <div>

                <strong>
                  {userName}
                </strong>

                <small>
                  {user?.email}
                </small>

              </div>

            </div>

          </div>

        </header>


        <div className="dashboard-content">

          {/* =================================================
              ALERTS
             ================================================= */}

          {error && (
            <div className="dashboard-alert dashboard-alert-error">
              {error}
            </div>
          )}


          {success && (
            <div className="dashboard-alert dashboard-alert-success">
              {success}
            </div>
          )}


          {/* =================================================
              OVERVIEW
             ================================================= */}

          {page === "overview" && (

            <div className="dashboard-overview">

              <section className="dashboard-hero-panel">

                <div className="dashboard-hero-copy">

                  <div className="dashboard-eyebrow">
                    YOUR CAREER COMMAND CENTER
                  </div>

                  <h2>
                    Welcome back,{" "}
                    {userName}
                  </h2>

                  <p>
                    Build a stronger career profile,
                    improve your resume with AI,
                    and discover opportunities that
                    match your skills.
                  </p>

                  <div className="dashboard-actions">

                    <button
                      className="dashboard-primary-button"
                      onClick={
                        nextStep.action
                      }
                      disabled={
                        loading
                      }
                    >
                      {nextStep.label}
                    </button>

                    <button
                      className="dashboard-secondary-button"
                      onClick={() =>
                        goTo(
                          analysis
                            ? "jobs"
                            : "resume"
                        )
                      }
                    >
                      {analysis
                        ? "Browse Jobs"
                        : "Open Resume"}
                    </button>

                  </div>

                </div>


                <div className="dashboard-score-panel">

                  <div className="dashboard-card-label">
                    ATS READINESS
                  </div>

                  <div
                    className="score-circle"
                    style={{
                      "--score-angle":
                        `${scoreValue * 3.6}deg`,
                    }}
                  >

                    <div className="score-circle-inner">
                      {scoreValue}%
                    </div>

                  </div>

                  <strong>
                    {readinessLabel}
                  </strong>

                  <span>
                    {analysis
                      ? "Based on your latest AI analysis"
                      : "Complete your profile to get scored"}
                  </span>

                </div>

              </section>


              {/* =================================================
                  PROGRESS
                 ================================================= */}

              <section className="dashboard-progress-track">

                <button
                  className={`progress-step${
                    resumeId
                      ? " done"
                      : ""
                  }${
                    !resumeId
                      ? " current"
                      : ""
                  }`}
                  onClick={() =>
                    goTo("resume")
                  }
                >

                  <span className="progress-step-index">
                    {resumeId
                      ? "✓"
                      : "1"}
                  </span>

                  <div>

                    <strong>
                      Resume
                    </strong>

                    <small>
                      {resumeId
                        ? "Uploaded successfully"
                        : "Upload your resume"}
                    </small>

                  </div>

                </button>


                <button
                  className={`progress-step${
                    analysis
                      ? " done"
                      : ""
                  }${
                    resumeId &&
                    !analysis
                      ? " current"
                      : ""
                  }`}
                  onClick={() =>
                    goTo("analysis")
                  }
                  disabled={
                    !resumeId
                  }
                >

                  <span className="progress-step-index">
                    {analysis
                      ? "✓"
                      : "2"}
                  </span>

                  <div>

                    <strong>
                      AI Analysis
                    </strong>

                    <small>
                      {analysis
                        ? `${scoreValue}% ATS score`
                        : "Analyze your resume"}
                    </small>

                  </div>

                </button>


                <button
                  className={`progress-step${
                    jobs.length
                      ? " done"
                      : ""
                  }${
                    analysis &&
                    !jobs.length
                      ? " current"
                      : ""
                  }`}
                  onClick={() =>
                    goTo("jobs")
                  }
                  disabled={
                    !resumeId
                  }
                >

                  <span className="progress-step-index">
                    {jobs.length
                      ? "✓"
                      : "3"}
                  </span>

                  <div>

                    <strong>
                      Job Matches
                    </strong>

                    <small>
                      {jobs.length
                        ? `${jobs.length} roles found`
                        : "Discover opportunities"}
                    </small>

                  </div>

                </button>

              </section>


              {/* =================================================
                  METRICS
                 ================================================= */}

              <section className="dashboard-metric-grid">

                <article className="dashboard-metric-card">

                  <span>
                    RESUME STATUS
                  </span>

                  <strong>
                    {resume
                      ? "Ready"
                      : "Not uploaded"}
                  </strong>

                  <button
                    onClick={() =>
                      goTo("resume")
                    }
                  >
                    {resume
                      ? "Manage"
                      : "Upload"}
                  </button>

                </article>


                <article className="dashboard-metric-card">

                  <span>
                    ATS SCORE
                  </span>

                  <strong>
                    {analysis
                      ? `${scoreValue}%`
                      : "—"}
                  </strong>

                  <button
                    onClick={() =>
                      goTo(
                        "analysis"
                      )
                    }
                    disabled={
                      !resumeId
                    }
                  >
                    {analysis
                      ? "View analysis"
                      : "Analyze"}
                  </button>

                </article>


                <article className="dashboard-metric-card">

                  <span>
                    JOB MATCHES
                  </span>

                  <strong>
                    {jobs.length}
                  </strong>

                  <button
                    onClick={() =>
                      goTo("jobs")
                    }
                    disabled={
                      !resumeId
                    }
                  >
                    Explore
                  </button>

                </article>


                <article className="dashboard-metric-card highlight">

                  <span>
                    NEXT ACTION
                  </span>

                  <strong>
                    {nextStep.title}
                  </strong>

                  <button
                    onClick={
                      nextStep.action
                    }
                    disabled={
                      loading
                    }
                  >
                    Continue
                  </button>

                </article>

              </section>


              {/* =================================================
                  CURRENT PROGRESS
                 ================================================= */}

              <section className="dashboard-section">

                <div className="dashboard-section-heading">

                  <div>

                    <div className="dashboard-eyebrow">
                      CAREER SNAPSHOT
                    </div>

                    <h2>
                      Your current progress
                    </h2>

                  </div>

                  <span>
                    {progressPercent}% complete
                  </span>

                </div>


                <div className="dashboard-card">

                  <div className="dashboard-card-heading">

                    <h3>
                      Profile readiness
                    </h3>

                    <strong>
                      {completedSteps}/3
                    </strong>

                  </div>


                  <p className="analysis-summary">

                    {resumeId &&
                    analysis
                      ? "Your resume has been analyzed. Explore your job matches and start applying to roles that fit your profile."
                      : resumeId
                        ? "Your resume is uploaded. Run the AI analysis to discover your ATS score, strengths, and recommended career direction."
                        : "Upload your resume to begin your AI-powered career journey."}

                  </p>


                  <div className="dashboard-actions">

                    {!resumeId && (

                      <button
                        className="dashboard-primary-button"
                        onClick={() =>
                          goTo(
                            "resume"
                          )
                        }
                      >
                        Upload Resume
                      </button>

                    )}


                    {resumeId &&
                      !analysis && (

                        <button
                          className="dashboard-primary-button"
                          onClick={
                            analyzeResume
                          }
                          disabled={
                            loading
                          }
                        >
                          {loading
                            ? "Analyzing..."
                            : "Analyze Resume"}
                        </button>

                      )}


                    {resumeId &&
                      analysis && (

                        <button
                          className="dashboard-primary-button"
                          onClick={() =>
                            goTo("jobs")
                          }
                        >
                          Find Matching Jobs
                        </button>

                      )}


                    <button
                      className="dashboard-secondary-button"
                      onClick={() =>
                        goTo(
                          resumeId
                            ? "analysis"
                            : "resume"
                        )
                      }
                    >
                      {resumeId
                        ? "View Analysis"
                        : "Open Resume"}
                    </button>

                  </div>

                </div>

              </section>


              {/* =================================================
                  TOP JOBS
                 ================================================= */}

              {!!jobs.length && (

                <section className="dashboard-section">

                  <div className="dashboard-section-heading">

                    <div>

                      <div className="dashboard-eyebrow">
                        RECOMMENDED FOR YOU
                      </div>

                      <h2>
                        Top job matches
                      </h2>

                    </div>

                    <button
                      className="dashboard-secondary-button"
                      onClick={() =>
                        goTo("jobs")
                      }
                    >
                      View all
                    </button>

                  </div>


                  <div className="dashboard-job-grid">

                    {jobs
                      .slice(0, 3)
                      .map(
                        (job) => (

                          <article
                            className="job-card"
                            key={
                              job.id
                            }
                          >

                            <div className="job-card-header">

                              <div className="company-avatar">
                                {job.title
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>

                                <h3>
                                  {job.title}
                                </h3>

                                <div className="job-company">
                                  {job.company}
                                </div>

                              </div>


                              {job.match_score >
                                0 && (

                                <span className="job-match">
                                  {
                                    job.match_score
                                  }
                                  %
                                </span>

                              )}

                            </div>


                            <div className="job-location">
                              {job.location}
                            </div>


                            <div className="job-links-row">

                              {job.job_links
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    link
                                  ) => (

                                    <a
                                      key={`${job.id}-${link.platform}`}
                                      href={
                                        link.url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="job-link-chip"
                                    >
                                      {
                                        link.platform
                                      }
                                    </a>

                                  )
                                )}

                            </div>

                          </article>

                        )
                      )}

                  </div>

                </section>

              )}


              {/* =================================================
                  NEXT OPPORTUNITY
                 ================================================= */}

              {!jobs.length && (

                <section className="dashboard-section">

                  <div className="dashboard-card dashboard-insight-card">

                    <div className="dashboard-card-heading">

                      <div>

                        <div className="dashboard-eyebrow">
                          YOUR NEXT OPPORTUNITY
                        </div>

                        <h3>

                          {resumeId
                            ? analysis
                              ? "Ready to discover your best-fit roles?"
                              : "Turn your resume into career insights"
                            : "Start your career workspace"}

                        </h3>

                      </div>

                    </div>


                    <p className="analysis-summary">

                      {resumeId
                        ? analysis
                          ? "Use AI-powered job matching to discover roles based on your resume, skills, and career profile."
                          : "Run the AI analysis to understand your ATS readiness and unlock personalized job recommendations."
                        : "Upload your latest resume and let ResumeAI analyze your skills, experience, and career potential."}

                    </p>


                    <button
                      className="dashboard-primary-button"
                      onClick={
                        nextStep.action
                      }
                      disabled={
                        loading
                      }
                    >
                      {nextStep.label}
                    </button>

                  </div>

                </section>

              )}

            </div>

          )}


          {/* =================================================
              RESUME
             ================================================= */}

          {page === "resume" && (

            <section className="dashboard-resume-layout">

              <div
                className={`dashboard-upload-card${
                  isDragging
                    ? " dashboard-upload-card-dragging"
                    : ""
                }`}
                onDragEnter={(
                  event
                ) => {

                  event.preventDefault();

                  setIsDragging(
                    true
                  );

                }}
                onDragOver={(
                  event
                ) =>
                  event.preventDefault()
                }
                onDragLeave={(
                  event
                ) => {

                  if (
                    event.currentTarget ===
                    event.target
                  ) {

                    setIsDragging(
                      false
                    );

                  }

                }}
                onDrop={
                  handleDrop
                }
              >

                <div className="dashboard-card-label">
                  Upload
                </div>


                <h2>
                  Add your latest resume
                </h2>


                <p>
                  Drop a PDF, DOCX, or TXT file.
                  We’ll extract the text and prepare
                  it for AI analysis.
                </p>


                <label className="dashboard-upload-button">

                  {uploading
                    ? "Uploading..."
                    : "Choose file"}


                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={
                      handleUpload
                    }
                    disabled={
                      uploading
                    }
                    hidden
                  />

                </label>


                {selectedFile && (

                  <div className="dashboard-selected-file">

                    <div>

                      <strong>
                        {
                          selectedFile.name
                        }
                      </strong>

                      <small>
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </small>

                    </div>

                  </div>

                )}


                <small>
                  PDF · DOC · DOCX · TXT · Max 10 MB
                </small>

              </div>


              <div className="resume-current-card">

                {resume ? (

                  <>

                    <div className="resume-success">
                      Resume ready
                    </div>


                    <h3>
                      {resume.filename ||
                        "Current Resume"}
                    </h3>


                    <p>
                      Stored as resume #
                      {resumeId}
                    </p>


                    <div className="dashboard-resume-actions">

                      <button
                        className="dashboard-primary-button"
                        onClick={
                          analyzeResume
                        }
                        disabled={
                          loading
                        }
                      >
                        {loading
                          ? "Analyzing..."
                          : "Analyze now"}
                      </button>


                      <button
                        className="dashboard-secondary-button"
                        onClick={
                          loadResume
                        }
                        disabled={
                          loading
                        }
                      >
                        Refresh
                      </button>

                    </div>

                  </>

                ) : (

                  <div className="dashboard-empty compact">

                    <h3>
                      No resume yet
                    </h3>

                    <p>
                      Upload a file on the left
                      to unlock analysis and job
                      matching.
                    </p>

                  </div>

                )}

              </div>

            </section>

          )}


          {/* =================================================
              ANALYSIS
             ================================================= */}

          {page === "analysis" && (

            <section className="dashboard-analysis-page">

              {!resumeId ? (

                <div className="dashboard-empty">

                  <h2>
                    Upload a resume first
                  </h2>

                  <p>
                    Analysis needs resume text
                    to score ATS readiness.
                  </p>


                  <button
                    className="dashboard-primary-button"
                    onClick={() =>
                      goTo("resume")
                    }
                  >
                    Go to Resume
                  </button>

                </div>

              ) : loading &&
                !analysis ? (

                <div className="dashboard-empty">

                  <div className="analysis-loading-spinner" />


                  <h2>
                    AI is analyzing your resume...
                  </h2>


                  <p>
                    Gemini is checking your resume
                    and preparing your ATS score,
                    skills, strengths, improvements,
                    and career recommendations.
                  </p>

                </div>

              ) : !analysis ? (

                <div className="dashboard-empty">

                  <h2>
                    Run your first analysis
                  </h2>


                  <p>
                    Get your ATS score, AI summary,
                    skills, strengths, improvements,
                    and recommended career roles.
                  </p>


                  <button
                    className="dashboard-primary-button"
                    onClick={
                      analyzeResume
                    }
                    disabled={
                      loading
                    }
                  >
                    {loading
                      ? "Analyzing..."
                      : "Start Analysis"}
                  </button>

                </div>

              ) : (

                <DetailedAnalysis
                  analysis={
                    analysis
                  }
                  onFindJobs={() =>
                    goTo("jobs")
                  }
                />

              )}

            </section>

          )}


          {/* =================================================
              JOBS
             ================================================= */}

          {page === "jobs" && (

            <section className="dashboard-jobs-page">

              {jobMeta.career_recommendation && (

                <div className="dashboard-card dashboard-insight-card">

                  <div className="dashboard-card-heading">

                    <h3>
                      Career direction
                    </h3>

                  </div>


                  <p className="analysis-summary">
                    {
                      jobMeta.career_recommendation
                    }
                  </p>


                  {!!jobMeta.skills_to_learn
                    .length && (

                    <div
                      className="dashboard-tags"
                      style={{
                        marginTop:
                          "1rem",
                      }}
                    >

                      {jobMeta.skills_to_learn.map(
                        (
                          skill,
                          index
                        ) => (

                          <span
                            key={`${skill}-${index}`}
                          >
                            {skill}
                          </span>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}


              {!resumeId ? (

                <div className="dashboard-empty">

                  <h2>
                    Upload a resume first
                  </h2>


                  <p>
                    Job matching needs an
                    uploaded resume.
                  </p>


                  <button
                    className="dashboard-primary-button"
                    onClick={() =>
                      goTo("resume")
                    }
                  >
                    Go to Resume
                  </button>

                </div>

              ) : loading &&
                jobs.length === 0 ? (

                <div className="dashboard-empty">

                  <h2>
                    Searching matches...
                  </h2>


                  <p>
                    AI is reviewing your profile
                    and building role suggestions.
                  </p>

                </div>

              ) : jobs.length === 0 ? (

                <div className="dashboard-empty">

                  <h2>
                    No matches yet
                  </h2>


                  <p>
                    Search now to get personalized
                    roles with LinkedIn, Indeed,
                    Naukri, and Wellfound links.
                  </p>


                  <button
                    className="dashboard-primary-button"
                    onClick={() =>
                      loadJobs({
                        force: true,
                      })
                    }
                    disabled={
                      loading
                    }
                  >
                    {loading
                      ? "Searching..."
                      : "Search jobs"}
                  </button>

                </div>

              ) : (

                <div className="dashboard-job-grid">

                  {jobs.map(
                    (job) => (

                      <article
                        className="job-card"
                        key={
                          job.id
                        }
                      >

                        <div className="job-card-header">

                          <div className="company-avatar">
                            {job.title
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>


                          <div>

                            <h3>
                              {job.title}
                            </h3>


                            <div className="job-company">
                              {job.company}
                            </div>

                          </div>


                          {job.match_score >
                            0 && (

                            <span className="job-match">
                              {
                                job.match_score
                              }
                              %
                            </span>

                          )}

                        </div>


                        <div className="job-meta-row">

                          <span>
                            {job.location}
                          </span>


                          <span>
                            {job.type}
                          </span>


                          {job.match_level ? (

                            <span>
                              {
                                job.match_level
                              }
                            </span>

                          ) : null}

                        </div>


                        {job.why_it_matches && (

                          <p className="job-why">
                            {
                              job.why_it_matches
                            }
                          </p>

                        )}


                        {!!job.matching_skills
                          .length && (

                          <div className="dashboard-tags job-skill-tags">

                            {job.matching_skills
                              .slice(
                                0,
                                6
                              )
                              .map(
                                (
                                  skill,
                                  index
                                ) => (

                                  <span
                                    key={`${job.id}-match-${index}`}
                                  >
                                    {skill}
                                  </span>

                                )
                              )}

                          </div>

                        )}


                        <div className="job-links">

                          <span className="job-links-label">
                            Apply on
                          </span>


                          <div className="job-links-row">

                            {job.job_links.map(
                              (
                                link
                              ) => (

                                <a
                                  key={`${job.id}-${link.platform}`}
                                  href={
                                    link.url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="job-link-chip"
                                >
                                  {
                                    link.platform
                                  }
                                </a>

                              )
                            )}

                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )}

            </section>

          )}

        </div>

      </main>

    </div>
  );
}