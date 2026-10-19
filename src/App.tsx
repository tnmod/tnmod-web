import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { profile, projects } from "./content/portfolio";
import "./App.css";

const PhoneScene = lazy(() => import("./components/PhoneScene"));

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="arrow">
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ProjectVisual({
  type,
}: {
  type: (typeof projects)[number]["visual"];
}) {
  if (type === "stock")
    return (
      <div className="project-visual stock-visual">
        <div className="window-top">
          <i />
          <i />
          <i />
          <span>StockPC</span>
        </div>
        <img
          src="/images/stockpc-dashboard.png"
          alt="StockPC inventory management dashboard"
          loading="lazy"
          width="1440"
          height="900"
        />
      </div>
    );
  if (type === "booking")
    return (
      <div
        className="project-visual booking-visual"
        aria-label="190booking flight booking platform"
      >
        <div className="boarding-pass">
          <div className="pass-head">
            <strong>
              190<span>booking</span>
            </strong>
            <span>The journey begins.</span>
          </div>
          <div className="flight-route">
            <span>
              SGN<small>Ho Chi Minh City</small>
            </span>
            <svg viewBox="0 0 160 36" aria-hidden="true">
              <path
                d="M0 18h63m34 0h63"
                stroke="currentColor"
                strokeDasharray="3 5"
              />
              <path
                d="m76 6 4 9 17 5v3l-17-2-4 9-3-1 1-10-6-3v-3l7 1z"
                fill="currentColor"
              />
            </svg>
            <span>
              HAN<small>Hanoi</small>
            </span>
          </div>
          <div className="pass-foot">
            <span>Web & mobile</span>
            <span>Built for the journey</span>
          </div>
        </div>
        <span className="visual-caption">
          From the first search to the next destination.
        </span>
      </div>
    );
  return (
    <div className="project-visual divisions-visual">
      <div className="code-window">
        <div className="code-title">
          <span className="package-icon">{`{ }`}</span>vietnam-divisions-js
          <span className="package-label">TypeScript</span>
        </div>
        <pre>
          <code>
            <span className="syntax-purple">import</span> {"{ v3 }"}{" "}
            <span className="syntax-purple">from</span>
            {"\n"} <span className="syntax-green">'vietnam-divisions-js'</span>
            {"\n\n"}
            <span className="syntax-purple">const</span> provinces ={" "}
            <span className="syntax-purple">await</span>
            {"\n"} v3.<span className="syntax-blue">getAllProvinces</span>()
            {"\n\n"}
            <span className="syntax-comment">
              // Clean data. Simple integration.
            </span>
          </code>
        </pre>
        <div className="code-footer">
          <span className="status-dot" />
          Vietnam’s divisions. Ready for developers.
        </div>
      </div>
    </div>
  );
}

function App() {
  const mainRef = useRef<HTMLElement>(null);
  const [simple, setSimple] = useState(() => {
    try {
      const preference = localStorage.getItem("tnmod-motion");
      if (preference === "full" || preference === "reduced")
        return preference === "reduced";
    } catch {
      // Storage may be unavailable; respect the system preference instead.
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFallback = useCallback(() => setSimple(true), []);
  const staticMode = mobile || simple;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  function toggleMotion() {
    const next = !simple;
    setSimple(next);
    try {
      localStorage.setItem("tnmod-motion", next ? "reduced" : "full");
    } catch {
      // The toggle still works when browser storage is disabled.
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  }

  return (
    <div
      className={`portfolio${staticMode ? " is-simple" : ""}${mobile ? " is-mobile" : ""}`}
    >
      <a className="skip-link" href="#about">
        Skip to the introduction
      </a>
      <header className="header">
        <a
          className="wordmark"
          href="#home"
          aria-label="TNMOD — back to the top"
        >
          tnmod<span className="wordmark-dot">.</span>
        </a>
        <nav
          className={menuOpen ? "nav is-open" : "nav"}
          aria-label="Main navigation"
        >
          {[
            ["#about", "About"],
            ["#work", "Work"],
            ["#contact", "Contact"],
          ].map(([href, text]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {text}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a
            className="cv-link"
            href={profile.cv}
            target="_blank"
            rel="noreferrer"
          >
            Résumé <Arrow diagonal />
          </a>
          <button
            className="menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      {!staticMode && (
        <Suspense
          fallback={
            <div className="scene-loading" role="status">
              Connecting the call…
            </div>
          }
        >
          <PhoneScene contentRef={mainRef} onFallback={handleFallback} />
        </Suspense>
      )}
      <div className="progress-track" aria-hidden="true">
        <span />
      </div>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main ref={mainRef}>
            <section
              id="home"
              className="chapter hero-section"
              aria-labelledby="hero-title"
            >
              <div className="hero-copy">
                <p className="intro-line">
                  <span className="status-dot" />
                  {staticMode
                    ? "Nguyễn Phú Tín · Frontend Developer"
                    : "An incoming call from Phú Tín"}
                </p>
                <h1 id="hero-title">
                  Good ideas.
                  <br />
                  Let’s connect<span className="title-stop">.</span>
                </h1>
                <p className="hero-description">
                  I’m Tín, a frontend developer turning ideas into thoughtful
                  experiences for web and mobile.
                </p>
                <a
                  href={staticMode ? "#work" : "#caller"}
                  className="round-link"
                >
                  <span className="circle-icon">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 4v16m-6-6 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </span>
                  {staticMode ? "Explore my work" : "Scroll to pick up"}
                </a>
              </div>
              {simple && !mobile && (
                <img
                  className="static-phone"
                  src="/images/phone-rest.png"
                  alt="A desk telephone, the central object of this portfolio"
                  width="1100"
                  height="900"
                />
              )}
              <div className="hero-bottom">
                <span>
                  Frontend developer
                  <br />
                  <span className="muted">
                    Web, mobile & the details in between.
                  </span>
                </span>
                <span className="hero-index">
                  A conversation.
                  <br />A little possibility.
                </span>
              </div>
            </section>
            <section
              id="caller"
              className="chapter caller-section"
              aria-label="See who is calling"
            >
              <div className="caller-note">
                <span className="status-dot" />
                <span>Phú Tín is calling…</span>
              </div>
              <p className="caller-hint">
                A short conversation.
                <br />A look at how I build things.
              </p>
            </section>
            <section
              id="pickup"
              className="chapter pickup-section"
              aria-label="Pick up the receiver"
            >
              <div className="pickup-message">
                <span className="small-label">On the other end</span>
                <p>
                  “Hello.
                  <br />
                  Tín here.”
                </p>
              </div>
            </section>
            <section
              id="about"
              className="chapter about-section"
              aria-labelledby="about-title"
            >
              <div className="section-copy left-copy">
                <p className="section-kicker">Nice to meet you.</p>
                <h2 id="about-title">
                  Interfaces,
                  <br />
                  with a human
                  <br />
                  on either side.
                </h2>
                <p className="body-large">
                  I work with React, Next.js and React Native. From the first
                  architectural decision to the final interaction, I care about
                  making a product feel right.
                </p>
                <div className="experience-list">
                  <div>
                    <span className="experience-period">
                      Jun 2025 — present
                    </span>
                    <h3>VietNamBooking</h3>
                    <p>Frontend Team Lead</p>
                    <p className="experience-detail">
                      Leading frontend development for 190booking, from
                      architecture and feature development to code reviews and
                      production releases.
                    </p>
                  </div>
                  <div>
                    <span className="experience-period">
                      Sep 2024 — May 2025
                    </span>
                    <h3>NorthStudio</h3>
                    <p>Mobile Developer</p>
                    <p className="experience-detail">
                      Built React Native applications for Android, iOS and
                      Android TV across more than five projects, including
                      Momokai Toolkit.
                    </p>
                  </div>
                </div>
                <div className="skill-line">
                  <span>JavaScript</span>
                  <span>TypeScript</span>
                  <span>React</span>
                  <span>Next.js</span>
                  <span>React Native</span>
                </div>
                <a
                  className="text-link"
                  href={profile.cv}
                  target="_blank"
                  rel="noreferrer"
                >
                  The longer story, in my résumé <Arrow diagonal />
                </a>
              </div>
            </section>
            <section
              id="transition"
              className="chapter transition-section"
              aria-label="Moving to selected work"
            >
              <p>
                Let me show you
                <br />
                <span>a few things I’ve built.</span>
              </p>
            </section>
            <section
              id="work"
              className="chapter work-section"
              aria-labelledby="work-title"
            >
              <div className="right-copy">
                <div className="work-heading">
                  <p className="section-kicker">Ideas, out in the world.</p>
                  <h2 id="work-title">
                    Selected
                    <br />
                    connections.
                  </h2>
                  <p>
                    Products I’ve helped bring to life,
                    <br className="desktop-break" /> and tools I’ve built along
                    the way.
                  </p>
                </div>
                <div className="projects">
                  {projects.map((project, index) => (
                    <article
                      className={`project project-${project.visual}`}
                      key={project.name}
                    >
                      <a
                        className="visual-link"
                        href={project.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${project.linkLabel}: ${project.name}`}
                      >
                        <ProjectVisual type={project.visual} />
                        <span className="project-open">
                          <Arrow diagonal />
                        </span>
                      </a>
                      <div className="project-heading">
                        <div>
                          <p className="project-category">{project.category}</p>
                          <h3>{project.name}</h3>
                        </div>
                        <span
                          className="project-number"
                          aria-label={`Work ${index + 1}`}
                        >
                          0{index + 1}
                        </span>
                      </div>
                      <p className="project-role">{project.role}</p>
                      <p className="project-description">
                        {project.description}
                      </p>
                      <div className="project-bottom">
                        <div className="project-stack">
                          {project.stack.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <a
                          className="project-link"
                          href={project.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {project.linkLabel}
                          <Arrow diagonal />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
                <a
                  className="all-work"
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  More experiments live on GitHub <Arrow diagonal />
                </a>
              </div>
            </section>
            <section
              id="hangup"
              className="chapter hangup-section"
              aria-label="Ending the call"
            >
              <p>
                This could be
                <br />
                the start of something.
              </p>
            </section>
            <section
              id="contact"
              className="chapter contact-section"
              aria-labelledby="contact-title"
            >
              <div className="contact-copy">
                <p className="section-kicker">The line is still open.</p>
                <h2 id="contact-title">
                  Your idea.
                  <br />
                  Our next
                  <br />
                  conversation.
                </h2>
                <a className="contact-email" href={`mailto:${profile.email}`}>
                  {profile.email}
                  <Arrow diagonal />
                </a>
                <div className="contact-links">
                  <button className="text-link" onClick={copyEmail}>
                    {copied ? "Email copied" : "Copy email"}
                  </button>
                  <a href={profile.github} target="_blank" rel="noreferrer">
                    GitHub <Arrow diagonal />
                  </a>
                  <a href={profile.cv} target="_blank" rel="noreferrer">
                    CV <Arrow diagonal />
                  </a>
                </div>
                <span className="sr-only" role="status">
                  {copied ? "Email address copied." : ""}
                </span>
              </div>
            </section>
          </main>
          <footer className="footer">
            <a className="wordmark" href="#home">
              tnmod<span className="wordmark-dot">.</span>
            </a>
            <p>
              Nguyễn Phú Tín
              <br />
              <span>Built with purpose. Made to feel right.</span>
            </p>
            <a href="#home" className="back-top">
              Back to top <Arrow />
            </a>
          </footer>
        </div>
      </div>
      {!mobile && (
        <div className="scene-toolbar">
          <span className="connection-status">
            <span className="status-dot" />
            <span className="connection-label">
              {simple ? "Simple view" : "Incoming call"}
            </span>
          </span>
          <button onClick={toggleMotion} aria-pressed={simple}>
            {simple ? "Enable 3D experience" : "Reduce motion"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
