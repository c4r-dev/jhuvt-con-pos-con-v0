// Testing version of Activity 3 with debug features enabled
'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import { getCommentsForFlow } from '../flow-viewer/utils/commentUtils';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import '../activity-3/word-cloud.css';

// This component now only serves to extract search params and pass them up.
// It is wrapped in Suspense in the parent.
function SearchParamsReader({ onParamsLoaded }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onParamsLoaded(searchParams);
  }, [searchParams, onParamsLoaded]);
  return null;
}

function WordCloudContent({ initialFlowId, initialSessionId }) {
  // Import all the existing state and functions from the original component
  // ... [All the existing state and functions remain the same] ...

  // Add new debug-specific state
  const [showDebugPanel, setShowDebugPanel] = useState(true); // Debug panel visible by default in testing
  const [debugMode, setDebugMode] = useState(true); // Debug mode enabled by default
  const [apiCallLogs, setApiCallLogs] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    processingTime: 0,
    renderTime: 0
  });

  // Add debug logging function
  const logApiCall = (action, details) => {
    setApiCallLogs(prev => [{
      timestamp: new Date().toISOString(),
      action,
      details
    }, ...prev]);
  };

  // Modify existing functions to include debug logging
  const loadFlowAndProcess = async (flowId) => {
    const startTime = performance.now();
    logApiCall('loadFlowAndProcess', { flowId });

    if (!sessionId) {
      logApiCall('error', 'No sessionId available');
      setErrorMessage('Session ID is required');
      setAutoGenerating(false);
      return;
    }

    try {
      setConcernsLoading(true);
      const loadStartTime = performance.now();
      
      // Fetch concerns
      const result = await getCommentsForFlow(flowId, sessionId);
      logApiCall('getCommentsForFlow', { 
        flowId, 
        sessionId, 
        success: result.success,
        concernCount: result.data?.length 
      });
      
      const loadEndTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: loadEndTime - loadStartTime
      }));

      if (!result.success) {
        throw new Error('Failed to load concerns');
      }
      
      const concernsData = result.data;
      setConcerns(concernsData);

      if (concernsData.length === 0) {
        throw new Error('No concerns found for this flow');
      }
      
      // Process with OpenAI
      setProcessingConcerns(true);
      const processStartTime = performance.now();
      
      try {
        const optimizedConcerns = concernsData.map(concern => ({
          id: concern._id,
          text: concern.text,
          commentType: concern.commentType,
          nodeLabels: concern.nodeLabels
        }));
        
        const response = await fetch('/api/openAI', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            comments: optimizedConcerns,
            flowId: flowId 
          }),
        });
        
        logApiCall('openAI processing', {
          status: response.status,
          concernCount: optimizedConcerns.length
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const processEndTime = performance.now();
        
        setPerformanceMetrics(prev => ({
          ...prev,
          processingTime: processEndTime - processStartTime
        }));

        setThemedConcerns(data);
        setSelectedFlow(flowId);
        
        try {
          sessionStorage.setItem(`themedConcerns-${flowId}`, JSON.stringify(data));
          logApiCall('cache', `Saved themedConcerns for flowId ${flowId}`);
        } catch (e) {
          logApiCall('error', `Failed to save to sessionStorage: ${e.message}`);
        }
      } catch (error) {
        logApiCall('error', `OpenAI processing error: ${error.message}`);
        setErrorMessage('Error processing concerns: ' + error.message);
      }
    } catch (error) {
      logApiCall('error', `Flow loading error: ${error.message}`);
      setErrorMessage('Error: ' + error.message);
    } finally {
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        totalTime: endTime - startTime
      }));
      setProcessingConcerns(false);
      setAutoGenerating(false);
      setConcernsLoading(false);
    }
  };

  return (
    <div className="word-cloud-page full-width-page">
      {/* Testing Environment Banner */}
      <div style={{
        background: '#ff6b6b',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        TESTING ENVIRONMENT - DEBUG MODE ENABLED
      </div>

      {/* Debug Control Panel */}
      <div style={{
        position: 'fixed',
        top: '50px',
        right: '20px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '15px',
        width: '300px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Debug Controls</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            /> Show Debug Info
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '10px 0' }}>Performance Metrics</h4>
          <div>Load Time: {performanceMetrics.loadTime.toFixed(2)}ms</div>
          <div>Processing Time: {performanceMetrics.processingTime.toFixed(2)}ms</div>
          <div>Total Time: {performanceMetrics.totalTime?.toFixed(2)}ms</div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '10px 0' }}>Current State</h4>
          <div>Selected Flow: {selectedFlow || 'none'}</div>
          <div>Session ID: {sessionId || 'none'}</div>
          <div>Concerns Count: {concerns.length}</div>
          <div>Themed Groups: {themedConcerns?.themes?.length || 0}</div>
        </div>

        <div>
          <h4 style={{ margin: '10px 0' }}>API Call Log</h4>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            fontSize: '12px'
          }}>
            {apiCallLogs.map((log, index) => (
              <div key={index} style={{ 
                padding: '5px',
                borderBottom: '1px solid #dee2e6'
              }}>
                <div style={{ color: '#666' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                <div><strong>{log.action}</strong></div>
                <div style={{ wordBreak: 'break-word' }}>
                  {typeof log.details === 'object' 
                    ? JSON.stringify(log.details, null, 2)
                    : log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Original Component Content */}
      {/* ... [Rest of the original component JSX remains the same] ... */}
    </div>
  );
}

export default function WordCloudTestingPage() {
  const [initialFlowIdFromUrl, setInitialFlowIdFromUrl] = useState(null);
  const [initialSessionIdFromUrl, setInitialSessionIdFromUrl] = useState(null);
  const [paramsLoaded, setParamsLoaded] = useState(false);

  const handleParamsLoaded = useCallback((searchParams) => {
    const flowId = searchParams.get('flowId');
    const sessionId = searchParams.get('sessionID');
    if (flowId) {
      setInitialFlowIdFromUrl(flowId);
    }
    if (sessionId) {
      setInitialSessionIdFromUrl(sessionId);
    }
    setParamsLoaded(true);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="loading-indicator"><div className="spinner"></div><p>Loading URL parameters...</p></div>}>
        <SearchParamsReader onParamsLoaded={handleParamsLoaded} />
      </Suspense>
      {paramsLoaded && <WordCloudContent initialFlowId={initialFlowIdFromUrl} initialSessionId={initialSessionIdFromUrl} />}
      {!paramsLoaded && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading page...</p>
        </div>
      )}
    </>
  );
} 