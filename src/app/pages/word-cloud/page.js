/*
word cloud page

I'd like to add a feature to this application 

Application so far:

So far on the Activity-1 page, users will viewing a react-flow powered flowchart and will be adding comments to the nodes. In the context of the application, the users are researchers in training. The flowchart will be pre-built, such that each node represents a phase or action of a research study. 

The users are tasked with identifying concerns that pertain to parts of the study, in the form of leaving comments. The users will select one or many nodes in a dropdown and then select a type of concern from the dropdown and also type a comment that identifies this concern. They will then submit these comments so that they appear in a table at the bottom of the page.

This is all functioning as desired so far.


Next steps:

Adding new feature: Utilize LLM to group similar submissions and assign these groups 1-2 word thematic names

I'd like to add a feature to this application that will be utilized on the next page we're building. 
I need to process some data that will later be used to generate a visual word cloud based on data collected in these concern-comments.
We are NOT going to build the word cloud just yet. 
We need to first process the submitted comment data from the Activity-1 in such a way so we can make a useful data set for the word cloud.

Technical outline
- Add a new page with a dropdown. Allowing me to select a given flowchart from the database. 
- Upon selection of a given flowchart, we will fetch all of the comments from the database for this flowchart.
- We will then pass this data to the OpenAI API to process the data and group similar submissions.


The LLM will be tasked with the following:
  - Read through all of the comments for a given flowchart, noting the node that the comment is associated with, the type of concern, and the comment text.
  - Group similar submissions into thematic groups and assign these groups 1-2 word names
  - Return each of the comments in the same format as before, but organized into distinct groups, each with a 1-2 word name.
  - It is essential that the LLM does not change the content of the comments, only group them into distinct thematic groups and assign these groups 1-2 word names.
  - There may be many comments or very few comments. Regardless, you should strive to create between 3 and 15 groups. (Assuming there are at least 3 comments)
  - The LLM should return the data in a format that can be easily parsed by the application.
  - The format of the data should be very conistent and predictable, so that the application can parse it correctly.


Now:
- Please create the page with the dropdown and the functionality to select a given flowchart.
- Please create the functionality to fetch the comments from the database for the selected flowchart.
- Please create the functionality to pass the data to the LLM to process the data and group similar submissions.
- Please write a prompt for the LLM to accomplish the task outlined above.
- Please create the functionality to display the processed data in a table before we attempt to create the word cloud.

*/

'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFlowsFromDatabase } from '../designer/utils/flowUtils';
import { getCommentsForFlow } from '../flow-viewer/utils/commentUtils';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import './word-cloud.css';

// This component now only serves to extract search params and pass them up.
// It is wrapped in Suspense in the parent.
function SearchParamsReader({ onParamsLoaded }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onParamsLoaded(searchParams);
  }, [searchParams, onParamsLoaded]);
  return null;
}

function WordCloudContent({ initialFlowId }) {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedFlowInfo, setSelectedFlowInfo] = useState(null);
  const [concerns, setConcerns] = useState([]);
  const [themedConcerns, setThemedConcerns] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [processingConcerns, setProcessingConcerns] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(true); // Manage dropdown visibility
  const router = useRouter();
  const cloudRef = useRef(null);

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Memoized loadFlowData
  const loadFlowData = useCallback((flowId, flows) => {
    const selectedFlowData = flows.find(flow => flow.id === flowId);
    if (selectedFlowData) {
      setSelectedFlowInfo({
        name: selectedFlowData.name,
        description: selectedFlowData.description,
        nodeCount: selectedFlowData.nodeCount,
        edgeCount: selectedFlowData.edgeCount,
        created: selectedFlowData.timestamp
      });
      loadConcernsForFlow(flowId); // Defined below
    } else {
      // This case should ideally be handled before calling loadFlowData if flowId is invalid
      setErrorMessage(`Flow with ID "${flowId}" not found.`);
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setConcerns([]);
      setShowDropdown(true);
      if (initialFlowId === flowId) { // Only replace URL if the bad ID came from URL
          router.replace('/pages/word-cloud', { shallow: true });
      }
    }
  }, [router, initialFlowId]); // initialFlowId added to dependencies

  // Load flows from database on component mount
  useEffect(() => {
    const loadSavedFlows = async () => {
      setIsLoading(true);
      let dbFlows = [];
      try {
        dbFlows = await getFlowsFromDatabase();
        setSavedFlows(dbFlows);
        
        // If an initialFlowId is provided (from URL), try to select it
        if (initialFlowId) {
          const flowExists = dbFlows.some(flow => flow.id === initialFlowId);
          if (flowExists) {
            setSelectedFlow(initialFlowId);
            setShowDropdown(false); // Hide dropdown if flow from URL is valid
            // loadFlowData will be called by the next useEffect
          } else {
            setErrorMessage(`Flow with ID "${initialFlowId}" not found. Please select a flow from the dropdown.`);
            setShowDropdown(true); // Show dropdown as URL flow is invalid
            router.replace('/pages/word-cloud', { shallow: true }); // Clear invalid flowId from URL
          }
        }
      } catch (error) {
        console.error('Error loading database flows:', error);
        setErrorMessage('Failed to load flowcharts. Please try again.');
      }
      setIsLoading(false);
    };
    loadSavedFlows();
  }, [initialFlowId, router]); // initialFlowId and router are dependencies

  // Effect to load flow data when selectedFlow (valid) changes or savedFlows are loaded
  useEffect(() => {
    if (selectedFlow && savedFlows.length > 0) {
      loadFlowData(selectedFlow, savedFlows);
    }
  }, [selectedFlow, savedFlows, loadFlowData]);


  // Generate word cloud when themed concerns are available
  useEffect(() => {
    if (themedConcerns && themedConcerns.themes && themedConcerns.themes.length > 0 && cloudRef.current) {
      generateWordCloud();
    }
  }, [themedConcerns]);

  // Generate word cloud visualization
  const generateWordCloud = () => {
    if (!themedConcerns || !themedConcerns.themes) return;
    
    // Clear previous word cloud
    d3.select(cloudRef.current).selectAll("*").remove();
    
    const width = cloudRef.current.clientWidth;
    const height = 500;
    
    // Prepare data for word cloud
    const words = themedConcerns.themes.map(theme => {
      // Handle multi-word themes better
      const words = theme.name.split(/\s+/);
      const isMultiWord = words.length > 1;
      
      return {
        text: theme.name,
        words: words,
        isMultiWord: isMultiWord,
        size: 10 + Math.sqrt(theme.concerns.length) * 15, // Scale font size based on count
        value: theme.concerns.length, // Store original count
        theme: theme // Store the entire theme object for reference
      };
    });
    
    // Create layout
    const layout = cloud()
      .size([width, height])
      .words(words)
      .padding(10) // Adjusted padding
      .rotate(0) // No rotation for better readability
      .font("Impact")
      .fontSize(d => d.size)
      .on("end", draw);
    
    layout.start();
    
    // Draw the word cloud
    function draw(words) {
      const svg = d3.select(cloudRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "word-cloud-svg")
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);
      
      // Create groups for each bubble
      const bubbleGroups = svg.selectAll(".bubble-group")
        .data(words)
        .enter()
        .append("g")
        .attr("class", "bubble-group")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          setSelectedTheme(d.theme);
          setIsModalOpen(true);
        });
      
      // Add background circles
      bubbleGroups.append("circle")
        .attr("r", d => {
          if (d.isMultiWord) {
            // d.words.length will be 2 or more here
            return d.size * (1 + (d.words.length - 1) * 0.45); // Revised formula 
          }
          return d.size * 1.4; // For single words (d.words.length is 1)
        })
        .attr("fill", (d, i) => `hsl(${i * (360 / words.length)}, 70%, 80%)`)
        .attr("class", "word-bubble");
      
      // For single-word themes, add text directly
      bubbleGroups.filter(d => !d.isMultiWord)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .style("fill", (d, i) => `hsl(${i * (360 / words.length)}, 70%, 40%)`)
        .text(d => d.text)
        .style("pointer-events", "none"); // Make text not capture clicks
      
      // For multi-word themes, add each word as a separate text element with positioning
      bubbleGroups.filter(d => d.isMultiWord)
        .each(function(d) {
          const wordCount = d.words.length;
          // Using the smaller font size for lineHeight calculation
          const effectiveFontSize = d.size * 0.85;
          const lineHeight = effectiveFontSize * 1.1; // Adjusted line height slightly for better spacing
          const startY = -((wordCount - 1) * lineHeight) / 2; // Center vertically
          
          d.words.forEach((word, i) => {
            d3.select(this)
              .append("text")
              .attr("text-anchor", "middle")
              .attr("y", startY + i * lineHeight)
              .style("font-size", `${effectiveFontSize}px`) // Use calculated effective font size
              .style("font-family", "Impact")
              .style("fill", (_, j) => `hsl(${j * (360 / words.length)}, 70%, 40%)`)
              .text(word)
              .style("pointer-events", "none");
          });
        });
    }
  };

  // Handle flow selection from dropdown
  const handleFlowSelection = async (e) => {
    const flowId = e.target.value;
    
    setThemedConcerns(null); // Reset processed data
    setErrorMessage('');
    
    if (!flowId) {
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setConcerns([]);
      router.replace('/pages/word-cloud', { shallow: true });
      setShowDropdown(true); // Ensure dropdown is visible if "Select a flow" is chosen
      return;
    }

    // Update URL with flowId without causing a full page refresh
    router.replace(`/pages/word-cloud?flowId=${flowId}`, { shallow: true });
    setSelectedFlow(flowId);
    setShowDropdown(false); // Hide dropdown after selection
    // loadFlowData will be called by the useEffect watching [selectedFlow, savedFlows]
  };


  // Load concerns from database (memoized)
  const loadConcernsForFlow = useCallback(async (flowId) => {
    setConcernsLoading(true);
    try {
      const result = await getCommentsForFlow(flowId);
      if (result.success) {
        setConcerns(result.data);
      } else {
        setConcerns([]);
        setErrorMessage('Failed to load concerns. Please try again.');
      }
    } catch (error) {
      console.error('Error loading concerns:', error);
      setConcerns([]);
      setErrorMessage('Failed to load concerns. Please try again.');
    } finally {
      setConcernsLoading(false);
    }
  }, []); // Empty dependency array as it doesn't depend on component scope variables directly

  // Process concerns with OpenAI
  const processConcerns = async () => {
    if (concerns.length === 0) {
      setErrorMessage('No concerns to process.');
      return;
    }

    setProcessingConcerns(true);
    setErrorMessage('');
    
    try {
      // Prepare optimized payload with only essential data
      const optimizedConcerns = concerns.map(concern => ({
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
          flowId: selectedFlow 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      setThemedConcerns(data);
    } catch (error) {
      console.error('Error processing concerns:', error);
      setErrorMessage('Failed to process concerns. Please try again.');
    } finally {
      setProcessingConcerns(false);
    }
  };

  // Navigate to designer
  const goToDesigner = () => {
    router.push('/pages/designer');
  };

  // Get concern type label
  const getConcernTypeLabel = (type) => {
    const typeMap = {
      'confound': 'CONFOUND',
      'bias': 'BIAS',
      'not_sure': 'NOT SURE',
      'other': 'OTHER'
    };
    return typeMap[type] || type.toUpperCase();
  };

  // Get affected nodes text
  const getAffectedNodesText = (nodeLabels) => {
    if (!nodeLabels || nodeLabels.length === 0) return '';
    
    if (nodeLabels.length <= 3) {
      return nodeLabels.join(', ');
    } else {
      return `${nodeLabels.slice(0, 3).join(', ')} and ${nodeLabels.length - 3} more`;
    }
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTheme(null);
    setCommentInput('');
  };

  // Handle comment input change
  const handleCommentInputChange = (e) => {
    setCommentInput(e.target.value);
  };

  return (
    <div className="word-cloud-page">
      <div className="page-header">
        <h1>Word Cloud Preprocessing</h1>
        {/* Conditionally render dropdown based on showDropdown state */}
        {showDropdown && (
          <div className="flow-selection">
            <select 
              value={selectedFlow || ''} 
              onChange={handleFlowSelection}
              className="flow-select"
              disabled={isLoading} // Disable while loading initial flows
            >
              <option value="">Select a flow to process</option>
              {savedFlows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name} ({flow.nodeCount} nodes, {flow.edgeCount} edges)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading && !selectedFlow && ( // Show main loading only if no flow is selected yet
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {selectedFlowInfo && (
        <div className="selected-flow-info">
          <h2>{selectedFlowInfo.name}</h2>
          <div className="flow-date">Created: {formatDate(selectedFlowInfo.created)}</div>
          {selectedFlowInfo.description && (
            <p className="flow-description">{selectedFlowInfo.description}</p>
          )}
        </div>
      )}

      {selectedFlow && concerns.length > 0 && (
        <div className="concerns-section">
          <div className="section-header">
            <h2>Concerns ({concerns.length})</h2>
            <button 
              className="button button-primary" 
              onClick={processConcerns}
              disabled={processingConcerns || concernsLoading} // Disable if loading concerns too
            >
              {processingConcerns ? 'Processing...' : (concernsLoading ? 'Loading Concerns...' : 'Process Concerns for Word Cloud')}
            </button>
          </div>

          {concernsLoading && !themedConcerns && ( // Show concerns loading only if not already processed
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading concerns...</p>
            </div>
          )}
          
          {!concernsLoading && concerns.length > 0 && (
            <div className="concerns-table-container">
              <table className="concerns-table">
                <thead>
                  <tr>
                    <th className="concern-col">CONCERN</th>
                    <th className="type-col">TYPE</th>
                    <th className="processes-col">PROCESSES AFFECTED</th>
                  </tr>
                </thead>
                <tbody>
                  {concerns.map(concern => (
                    <tr 
                      key={concern._id}
                      className={`concern-row concern-type-${concern.commentType}`}
                    >
                      <td className="concern-col">{concern.text}</td>
                      <td className="type-col">{getConcernTypeLabel(concern.commentType)}</td>
                      <td className="processes-col">{getAffectedNodesText(concern.nodeLabels)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedFlow && concerns.length === 0 && !concernsLoading && !processingConcerns && !isLoading && (
        <div className="no-concerns">
          <p>No concerns found for this flowchart. Please go back to Activity 1 and add some concerns, or select a different flow.</p>
        </div>
      )}

      {themedConcerns && themedConcerns.themes && (
        <div className="themed-concerns-section">
          <h2>Processed Themes</h2>
          
          <div className="themes-grid">
            {themedConcerns.themes.map((theme, index) => (
              <div key={index} className="theme-card">
                <h3 className="theme-name">{theme.name}</h3>
                <p className="theme-count">{theme.concerns.length} concerns</p>
                
                <div className="theme-concerns">
                  <table className="theme-concerns-table">
                    <thead>
                      <tr>
                        <th>Concern</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {theme.concerns.map((concern, concernIndex) => (
                        <tr key={concernIndex}>
                          <td>{concern.text}</td>
                          <td>{getConcernTypeLabel(concern.commentType)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          
          <div className="theme-summary">
            <h3>Theme Summary</h3>
            <div className="theme-summary-content">
              <div className="theme-distribution">
                {themedConcerns.themes.map((theme, index) => (
                  <div key={index} className="theme-item">
                    <span className="theme-name">{theme.name}</span>
                    <span className="theme-count">{theme.concerns.length}</span>
                    <div 
                      className="theme-bar" 
                      style={{ 
                        width: `${(theme.concerns.length / concerns.length) * 100}%`,
                        backgroundColor: `hsl(${index * (360 / themedConcerns.themes.length)}, 70%, 60%)`
                      }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Word Cloud Visualization */}
          <div className="word-cloud-visualization">
            <h2>CLICK WORDS TO EXPLORE THE GROUP&apos;S CONCERNS</h2>
            <div 
              className="word-cloud-container" 
              ref={cloudRef}
            ></div>
          </div>
        </div>
      )}
      
      {/* Theme Exploration Modal */}
      {isModalOpen && selectedTheme && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>CLICK WORDS TO EXPLORE THE GROUP&apos;S CONCERNS</h2>
              <button className="modal-close-button" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-theme-section">
                <div className="modal-theme-bubble" style={{ 
                  backgroundColor: `hsl(${themedConcerns.themes.findIndex(t => t.name === selectedTheme.name) * (360 / themedConcerns.themes.length)}, 70%, 80%)`
                }}>
                  {selectedTheme.name.split(/\s+/).map((word, i, arr) => (
                    <div key={i} className="modal-theme-name-word">{word}</div>
                  ))}
                </div>
                
                <div className="modal-theme-details">
                  <table className="modal-concerns-table">
                    <thead>
                      <tr>
                        <th className="concern-col">CONCERN TEXT</th>
                        <th className="type-col">TYPE</th>
                        <th className="processes-col">PROCESSES AFFECTED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTheme.concerns.map((concern, index) => (
                        <tr key={index}>
                          <td className="concern-col">{concern.text}</td>
                          <td className="type-col">{getConcernTypeLabel(concern.commentType)}</td>
                          <td className="processes-col">{getAffectedNodesText(concern.nodeLabels)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="modal-comment-section">
                <h3>Why is this a concern?...</h3>
                <textarea 
                  value={commentInput}
                  onChange={handleCommentInputChange}
                  className="modal-comment-input"
                  placeholder="Type your explanation here..."
                  rows={4}
                ></textarea>
                
                <div className="modal-actions">
                  <button className="button button-secondary" onClick={closeModal}>BACK TO CLOUD</button>
                  <button className="button button-primary">CONTINUE</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WordCloudPage() {
  const [initialFlowIdFromUrl, setInitialFlowIdFromUrl] = useState(null);
  const [paramsLoaded, setParamsLoaded] = useState(false);

  const handleParamsLoaded = useCallback((searchParams) => {
    const flowId = searchParams.get('flowId');
    if (flowId) {
      setInitialFlowIdFromUrl(flowId);
    }
    setParamsLoaded(true);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="loading-indicator"><div className="spinner"></div><p>Loading URL parameters...</p></div>}>
        <SearchParamsReader onParamsLoaded={handleParamsLoaded} />
      </Suspense>
      {/* Render WordCloudContent only after params are loaded to ensure initialFlowId is available */}
      {paramsLoaded && <WordCloudContent initialFlowId={initialFlowIdFromUrl} />}
      {!paramsLoaded && ( // Show a general loading indicator until params are confirmed
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading page...</p>
        </div>
      )}
    </>
  );
}