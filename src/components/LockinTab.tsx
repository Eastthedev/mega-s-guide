"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { W, Week } from "../data/timetable";
import { getUserStats, syncUserStats } from "../utils/supabase";
import "./LockinTab.css";

type SubjectKey = "haem" | "chem" | "morb_tue" | "mcb" | "pharm" | "morb_fri";

interface SubjectMeta {
  key: string;
  name: string;
  color: string;
}

const SUBJECTS: SubjectMeta[] = [
  { key: "haem", name: "Haematology", color: "#378ADD" },
  { key: "chem", name: "Chem Path", color: "#639922" },
  { key: "morb", name: "Morbid Anatomy", color: "#D85A30" },
  { key: "mcb", name: "Microbiology", color: "#7F77DD" },
  { key: "pharm", name: "Pharmacology", color: "#BA7517" },
];

export default function LockinTab({ onAddToast }: { onAddToast: (msg: string) => void }) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Avoid hydration mismatch by waiting until component is mounted
  useEffect(() => {
    setIsMounted(true);
    
    // Load theme from localStorage or preferred system media query
    const savedTheme = localStorage.getItem("timetable-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }

    // Load completed topics state from localStorage first
    const savedProgress = localStorage.getItem("timetable-progress");
    let localProgress = {};
    if (savedProgress) {
      try {
        localProgress = JSON.parse(savedProgress);
        setCompletedTopics(localProgress);
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }

    // Async load from Supabase database to merge/restore
    const loadDBProgress = async () => {
      try {
        const stats = await getUserStats();
        if (stats && stats.timetable_progress) {
          const merged = { ...localProgress, ...stats.timetable_progress };
          setCompletedTopics(merged);
          localStorage.setItem("timetable-progress", JSON.stringify(merged));
        }
      } catch (err) {
        console.error("Failed to load progress from Supabase:", err);
      }
    };
    loadDBProgress();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("timetable-theme", nextTheme);
    onAddToast(`Timetable switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Theme 💡`);
  };

  const toggleTopic = async (id: string) => {
    const nextState = { ...completedTopics, [id]: !completedTopics[id] };
    setCompletedTopics(nextState);
    localStorage.setItem("timetable-progress", JSON.stringify(nextState));

    try {
      const stats = await getUserStats();
      if (stats) {
        stats.timetable_progress = nextState;
        await syncUserStats(stats);
      }
    } catch (err) {
      console.error("Failed to sync progress to Supabase:", err);
    }
  };

  const resetProgress = async () => {
    if (confirm("Are you sure you want to reset all your progress?")) {
      setCompletedTopics({});
      localStorage.removeItem("timetable-progress");
      onAddToast("All progress reset! Let's start fresh. 💪");

      try {
        const stats = await getUserStats();
        if (stats) {
          stats.timetable_progress = {};
          await syncUserStats(stats);
        }
      } catch (err) {
        console.error("Failed to sync reset to Supabase:", err);
      }
    }
  };

  // Helper to count topics
  const getTopicStats = () => {
    let total = 0;
    let completed = 0;
    const breakdown: Record<string, { total: number; completed: number }> = {
      haem: { total: 0, completed: 0 },
      chem: { total: 0, completed: 0 },
      morb: { total: 0, completed: 0 },
      mcb: { total: 0, completed: 0 },
      pharm: { total: 0, completed: 0 },
    };

    W.forEach((w) => {
      // Haem
      w.haem.forEach((_, idx) => {
        const id = `${w.n}-haem-${idx}`;
        total++;
        breakdown.haem.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.haem.completed++;
        }
      });
      // Chem
      w.chem.forEach((_, idx) => {
        const id = `${w.n}-chem-${idx}`;
        total++;
        breakdown.chem.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.chem.completed++;
        }
      });
      // Morb Tue
      w.morb_tue.forEach((_, idx) => {
        const id = `${w.n}-morb_tue-${idx}`;
        total++;
        breakdown.morb.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.morb.completed++;
        }
      });
      // Mcb
      w.mcb.forEach((_, idx) => {
        const id = `${w.n}-mcb-${idx}`;
        total++;
        breakdown.mcb.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.mcb.completed++;
        }
      });
      // Pharm
      w.pharm.forEach((_, idx) => {
        const id = `${w.n}-pharm-${idx}`;
        total++;
        breakdown.pharm.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.pharm.completed++;
        }
      });
      // Morb Fri
      w.morb_fri.forEach((_, idx) => {
        const id = `${w.n}-morb_fri-${idx}`;
        total++;
        breakdown.morb.total++;
        if (completedTopics[id]) {
          completed++;
          breakdown.morb.completed++;
        }
      });
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage, breakdown };
  };

  const stats = getTopicStats();

  // Filter content matching search query
  const matchQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Determine which columns are displayed based on subject filter
  const showHaem = activeFilter === "all" || activeFilter === "haem";
  const showChem = activeFilter === "all" || activeFilter === "chem";
  const showMorb = activeFilter === "all" || activeFilter === "morb";
  const showMcb = activeFilter === "all" || activeFilter === "mcb";
  const showPharm = activeFilter === "all" || activeFilter === "pharm";

  // Calculate dynamic grid column layout
  let numCols = 0;
  if (showHaem) numCols++;
  if (showChem || showMorb) numCols++; // Tue column
  if (showMcb) numCols++;
  if (showPharm) numCols++;
  if (showMorb) numCols++; // Fri column (only if Morb is shown)
  
  // Adjust count if we are filtering:
  if (activeFilter === "chem") numCols = 1;
  if (activeFilter === "morb") numCols = 2;
  if (activeFilter === "all") numCols = 5;

  const colCss = `repeat(${numCols}, 1fr)`;

  // Check if a week has any topics after search filtering
  const getFilteredTopics = (w: Week, key: SubjectKey) => {
    return w[key].map((topic, index) => ({ topic, index, id: `${w.n}-${key}-${index}` }))
                 .filter((item) => matchQuery(item.topic));
  };

  const isWeekVisible = (w: Week) => {
    if (!searchQuery) return true;
    
    const haemMatches = getFilteredTopics(w, "haem").length;
    const chemMatches = getFilteredTopics(w, "chem").length;
    const morbTueMatches = getFilteredTopics(w, "morb_tue").length;
    const mcbMatches = getFilteredTopics(w, "mcb").length;
    const pharmMatches = getFilteredTopics(w, "pharm").length;
    const morbFriMatches = getFilteredTopics(w, "morb_fri").length;

    return (haemMatches + chemMatches + morbTueMatches + mcbMatches + pharmMatches + morbFriMatches) > 0;
  };

  // Circular progress stroke calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

  if (!isMounted) {
    return null;
  }

  const hasVisibleWeeks = W.some((w) => isWeekVisible(w));

  return (
    <div className="lockinTab">
      <div className="container">
        <header>
          <div className="top-action-bar">
            <div>
              <h1>MBBS Second Block Study Timetable</h1>
              <p className="subtitle">
                University of Nigeria 
                <span className="dot-separator"></span> 
                2028 Class 
                <span className="dot-separator"></span> 
                June – August 2026 
                <span className="dot-separator"></span> 
                Target completion: Week of Aug 17
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === "light" ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    Dark Mode
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    Light Mode
                  </>
                )}
              </button>
              <button className="theme-toggle" onClick={resetProgress} title="Reset all progress checkmarks">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 2v6h6M21.5 22v-6h-6"></path>
                  <path d="M22 11.5A10 10 0 0 0 3.2 7.2L2.5 8M21.5 16a10 10 0 0 1-18.8-4.3l.7-.7"></path>
                </svg>
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Stats Dashboard */}
          <div className="stats-panel">
            <div className="stats-circle-container">
              <div className="progress-circle">
                <svg>
                  <circle className="bg" cx="60" cy="60" r={radius} />
                  <circle 
                    className="bar" 
                    cx="60" 
                    cy="60" 
                    r={radius} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="progress-text">{stats.percentage}%</div>
              </div>
              <div className="stats-circle-label">Overall Completion</div>
            </div>

            <div className="stats-breakdown">
              {SUBJECTS.map((subject) => {
                const item = stats.breakdown[subject.key];
                const subjPercent = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                return (
                  <div key={subject.key} className="stat-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        {subject.name}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                        {item.completed}/{item.total}
                      </span>
                    </div>
                    <div className="stat-progress-bar">
                      <div 
                        className="stat-progress-fill" 
                        style={{ 
                          width: `${subjPercent}%`, 
                          backgroundColor: subject.color 
                        }} 
                      />
                    </div>
                    <span className="stat-lbl">{subjPercent}% Complete</span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* Legend & Filter Controls */}
        <div className="controls-container">
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search study topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="legend">
            {SUBJECTS.map((subject) => (
              <div key={subject.key} className="leg-item">
                <span className="leg-dot" style={{ backgroundColor: subject.color }} />
                {subject.name}
              </div>
            ))}
          </div>
        </div>

        <div className="filter-bar">
          <button 
            className={`filter-btn fb-all ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All Subjects
          </button>
          {SUBJECTS.map((subject) => (
            <button
              key={subject.key}
              className={`filter-btn fb-${subject.key} ${activeFilter === subject.key ? "active" : ""}`}
              onClick={() => setActiveFilter(subject.key)}
            >
              {subject.name}
            </button>
          ))}
        </div>

        {/* Weeks rendering */}
        <div className="weeks-container">
          {hasVisibleWeeks ? (
            W.filter((w) => isWeekVisible(w)).map((w) => {
              const gridStyle = { gridTemplateColumns: colCss };

              return (
                <div key={w.n} className={`week-block ${w.deadline ? "deadline" : ""}`}>
                  <div className="week-header">
                    <span className="week-label">{w.label} {w.deadline ? "— TARGET COMPLETE" : ""}</span>
                    <span className="week-dates">{w.dates}</span>
                  </div>

                  <div className="days-grid" style={gridStyle}>
                    {/* Monday Haem */}
                    {showHaem && (
                      <div className="day-cell">
                        <div className="day-label">
                          <span>Mon · Haematology</span>
                        </div>
                        {getFilteredTopics(w, "haem").map((item) => (
                          <div
                            key={item.id}
                            className={`topic-pill pill-haem ${completedTopics[item.id] ? "completed" : ""}`}
                            onClick={() => toggleTopic(item.id)}
                          >
                            <span className="checkbox" />
                            <span>{item.topic}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tuesday Chem Path / Morbid */}
                    {(showChem || showMorb) && (
                      <div className="day-cell">
                        <div className="day-label">
                          <span>Tue · Chem / Morbid</span>
                        </div>
                        {showChem && (
                          <div>
                            {activeFilter === "all" && <div className="sub-label">Chem Path</div>}
                            {getFilteredTopics(w, "chem").map((item) => (
                              <div
                                key={item.id}
                                className={`topic-pill pill-chem ${completedTopics[item.id] ? "completed" : ""}`}
                                onClick={() => toggleTopic(item.id)}
                              >
                                <span className="checkbox" />
                                <span>{item.topic}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {showMorb && (
                          <div style={{ marginTop: showChem && activeFilter === "all" ? "12px" : "0" }}>
                            {activeFilter === "all" && <div className="sub-label">Morbid Anatomy (PM)</div>}
                            {getFilteredTopics(w, "morb_tue").map((item) => (
                              <div
                                key={item.id}
                                className={`topic-pill pill-morb ${completedTopics[item.id] ? "completed" : ""}`}
                                onClick={() => toggleTopic(item.id)}
                              >
                                <span className="checkbox" />
                                <span>{item.topic}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Wednesday Microbiology */}
                    {showMcb && (
                      <div className="day-cell">
                        <div className="day-label">
                          <span>Wed · Microbiology</span>
                        </div>
                        {getFilteredTopics(w, "mcb").map((item) => {
                          const isPrac = item.topic.toLowerCase().includes("practical");
                          return (
                            <div
                              key={item.id}
                              className={`topic-pill ${isPrac ? "pill-prac" : "pill-mcb"} ${completedTopics[item.id] ? "completed" : ""}`}
                              onClick={() => toggleTopic(item.id)}
                            >
                              <span className="checkbox" />
                              <span>{item.topic}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Thursday Pharmacology */}
                    {showPharm && (
                      <div className="day-cell">
                        <div className="day-label">
                          <span>Thu · Pharmacology</span>
                        </div>
                        {getFilteredTopics(w, "pharm").map((item) => (
                          <div
                            key={item.id}
                            className={`topic-pill pill-pharm ${completedTopics[item.id] ? "completed" : ""}`}
                            onClick={() => toggleTopic(item.id)}
                          >
                            <span className="checkbox" />
                            <span>{item.topic}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Friday Morbid Anatomy */}
                    {showMorb && (
                      <div className="day-cell">
                        <div className="day-label">
                          <span>Fri · Morbid Anatomy</span>
                        </div>
                        {getFilteredTopics(w, "morb_fri").map((item) => (
                          <div
                            key={item.id}
                            className={`topic-pill pill-morb ${completedTopics[item.id] ? "completed" : ""}`}
                            onClick={() => toggleTopic(item.id)}
                          >
                            <span className="checkbox" />
                            <span>{item.topic}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <h3>No matching topics found</h3>
              <p>Try refining your search terms or selecting a different subject filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
