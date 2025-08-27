'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header/Header';
import './FTB-results.css';

function FTBResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [sessionData, setSessionData] = useState(null);
  const [aggregateStats, setAggregateStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId) {
      loadSessionResults();
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  const loadSessionResults = async () => {
    try {
      const response = await fetch(`/api/fixThatBias?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load session data');
      }
      
      const data = await response.json();
      setSessionData(data.session);
      setAggregateStats(data.aggregateStats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load session results:', error);
      setError('Failed to load results. Please try again.');
      setLoading(false);
    }
  };

  const calculateAverageAttempts = () => {
    if (!sessionData?.caseStudyResults || sessionData.caseStudyResults.length === 0) return { problem: 0, solution: 0, total: 0 };
    
    const problemAttempts = sessionData.caseStudyResults.reduce((sum, result) => sum + result.problemAttempts, 0);
    const solutionAttempts = sessionData.caseStudyResults.reduce((sum, result) => sum + (result.solutionAttempts || 0), 0);
    const totalAttempts = problemAttempts + solutionAttempts;
    const studyCount = sessionData.caseStudyResults.length;

    return {
      problem: Math.round((problemAttempts / studyCount) * 10) / 10,
      solution: Math.round((solutionAttempts / studyCount) * 10) / 10,
      total: Math.round((totalAttempts / studyCount) * 10) / 10
    };
  };

  const getTotalAttempts = (result) => {
    return result.problemAttempts + (result.solutionAttempts || 0);
  };

  const formatProblemSelection = (result) => {
    if (result.selectedProblemStep === 'no_concerns') {
      return 'No Concerns Selected';
    }
    return `Step: ${result.selectedProblemStep}`;
  };

  const formatSolutionSelection = (result) => {
    if (!result.selectedSolution) {
      return 'Not attempted';
    }
    return `Solution: ${result.selectedSolution}`;
  };

  const handleRestartApplication = () => {
    // Force page reload to create a new session
    window.location.href = '/pages/FTB-1';
  };

  if (loading) {
    return (
      <>
        <Header 
          title="Fix That Bias" 
          onLogoClick={handleRestartApplication}
        />
        <div className="results-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your results...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          title="Fix That Bias" 
          onLogoClick={handleRestartApplication}
        />
        <div className="results-container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error}</p>
            <button 
              className="retry-btn"
              onClick={handleRestartApplication}
            >
              Restart Activity
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!sessionData) {
    return (
      <>
        <Header 
          title="Fix That Bias" 
          onLogoClick={handleRestartApplication}
        />
        <div className="results-container">
          <div className="error-state">
            <h2>No Data Found</h2>
            <p>No session data was found for this ID.</p>
            <button 
              className="retry-btn"
              onClick={handleRestartApplication}
            >
              Restart Activity
            </button>
          </div>
        </div>
      </>
    );
  }

  const userAverages = calculateAverageAttempts();

  return (
    <>
      <Header 
        title="Fix That Bias" 
        onLogoClick={handleRestartApplication}
      />
      <div className="results-container">
        <header className="results-header">
          <h1>Results</h1>
          <div className="session-info">
            <p>Session completed on {new Date(sessionData.updatedAt).toLocaleDateString()}</p>
          </div>
        </header>

      <div className="performance-summary">
        <div className="user-performance">
          <h2>Your Performance</h2>
          <div className="performance-stats">
            <div className="stat-item">
              <span className="stat-number">{userAverages.problem}</span>
              <span className="stat-label">Avg Problem Attempts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{userAverages.solution}</span>
              <span className="stat-label">Avg Solution Attempts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{userAverages.total}</span>
              <span className="stat-label">Avg Total Attempts</span>
            </div>
          </div>
        </div>

        {aggregateStats && aggregateStats.totalSessions > 1 && (
          <div className="aggregate-performance">
            <h2>All Users Performance</h2>
            <div className="aggregate-summary">
              <p><strong>{aggregateStats.totalSessions}</strong> total sessions completed</p>
              <div className="performance-stats">
                <div className="stat-item">
                  <span className="stat-number">{aggregateStats.averageAttempts.problem}</span>
                  <span className="stat-label">Avg Problem Attempts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{aggregateStats.averageAttempts.solution}</span>
                  <span className="stat-label">Avg Solution Attempts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{aggregateStats.averageAttempts.total}</span>
                  <span className="stat-label">Avg Total Attempts</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="results-table-container">
        <h2>Detailed Results</h2>
        <div className="table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Case Study</th>
                <th>Problem Attempts</th>
                <th>Solution Attempts</th>
                <th>Total Attempts</th>
                {aggregateStats && aggregateStats.totalSessions > 1 && (
                  <th>vs Average</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sessionData.caseStudyResults.map((result, index) => {
                const totalAttempts = getTotalAttempts(result);
                const caseStudyAggregate = aggregateStats?.caseStudyStats?.[result.caseStudyId];
                
                return (
                  <tr key={index}>
                    <td className="study-title">
                      <div>
                        <strong>{result.caseStudyTitle}</strong>
                      </div>
                    </td>
                    <td className="attempts-cell">
                      <div className="attempts-display">
                        <span className="user-attempts">{result.problemAttempts}</span>
                        {caseStudyAggregate && (
                          <span className="avg-comparison">
                            (avg: {caseStudyAggregate.averageProblemAttempts})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="attempts-cell">
                      <div className="attempts-display">
                        <span className="user-attempts">{result.solutionAttempts || 0}</span>
                        {caseStudyAggregate && (
                          <span className="avg-comparison">
                            (avg: {caseStudyAggregate.averageSolutionAttempts})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="attempts-cell">
                      <div className="attempts-display">
                        <span className="user-attempts">{totalAttempts}</span>
                        {caseStudyAggregate && (
                          <span className="avg-comparison">
                            (avg: {caseStudyAggregate.averageTotalAttempts})
                          </span>
                        )}
                      </div>
                    </td>
                    {aggregateStats && aggregateStats.totalSessions > 1 && (
                      <td className="comparison-cell">
                        {caseStudyAggregate && (
                          <div className="comparison-data">
                            <div className="difference-display">
                              {totalAttempts - caseStudyAggregate.averageTotalAttempts > 0 ? '+' : ''}{Math.round((totalAttempts - caseStudyAggregate.averageTotalAttempts) * 10) / 10}
                            </div>
                            <div className="difference-label">vs avg</div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {aggregateStats && aggregateStats.totalSessions > 1 && (
        <div className="insights-section">
          <h2>Comparison with Other Users</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Your Attempt Summary</h3>
              <p>
                You averaged <strong>{userAverages.total}</strong> attempts per case study, 
                compared to the overall average of <strong>{aggregateStats.averageAttempts.total}</strong> attempts.
              </p>
              <div className="comparison-summary">
                <p><strong>Problem Identification:</strong> You: {userAverages.problem} | Average: {aggregateStats.averageAttempts.problem}</p>
                <p><strong>Solution Selection:</strong> You: {userAverages.solution} | Average: {aggregateStats.averageAttempts.solution}</p>
              </div>
            </div>
            
            <div className="insight-card">
              <h3>Study Distribution</h3>
              <p>
                Your attempts were distributed as <strong>{userAverages.problem}</strong> for problem identification 
                and <strong>{userAverages.solution}</strong> for solution selection.
              </p>
              <div className="comparison-summary">
                <p><strong>Total Studies Completed:</strong> {sessionData.caseStudyResults.length}</p>
                <p><strong>Total Sessions in Database:</strong> {aggregateStats.totalSessions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="results-actions">
        <button 
          className="new-session-btn"
          onClick={handleRestartApplication}
        >
          Restart Activity
        </button>
        
        <button 
          className="home-btn"
          onClick={() => router.push('/')}
        >
          Return Home
        </button>
      </div>

      {/* <div className="results-footer">
        <p>
          Thank you for participating in the Fix That Bias activity! 
          This exercise helps develop critical thinking skills for identifying 
          and addressing methodological concerns in research.
        </p>
      </div> */}
      </div>
    </>
  );
}


export default function FTBResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FTBResultsPageContent />
    </Suspense>
  );
}