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

import Header from '@/app/components/Header/Header';

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
  const [themeComments, setThemeComments] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // State for debug mode
  const [autoGenerating, setAutoGenerating] = useState(false); // State for auto word cloud generation
  const [autoGenerationAttempted, setAutoGenerationAttempted] = useState(false); // NEW: Track if auto-generation was attempted
  const [currentFlowId, setCurrentFlowId] = useState(null); // NEW: Track current flow ID for continue button
  const [sessionId, setSessionId] = useState(initialSessionId); // Add sessionId state
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
      // In debug mode, load concerns manually; in non-debug mode, let auto-generation handle it
      if (debugMode && !autoGenerating && !processingConcerns && !themedConcerns) {
        console.log("loadFlowData: Loading concerns for manually selected flow in debug mode", flowId);
        loadConcernsForFlow(flowId); // Defined below
      } else if (debugMode) {
        console.log("loadFlowData: Skipping concern loading in debug mode - already processing or have themed data");
      } else {
        console.log("loadFlowData: In non-debug mode, auto-generation will handle data loading");
      }
    } else {
      // This case should ideally be handled before calling loadFlowData if flowId is invalid
      setErrorMessage(`Flow with ID "${flowId}" not found.`);
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setConcerns([]);
      setShowDropdown(true);
      if (initialFlowId === flowId) { // Only replace URL if the bad ID came from URL
          router.replace('/pages/activity-2', { shallow: true }); // Corrected path
      }
    }
  }, [router, initialFlowId, autoGenerating, processingConcerns, themedConcerns, debugMode]); // Added debugMode to dependencies

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
            setCurrentFlowId(initialFlowId); // Set current flow ID for URL-based flows
            setShowDropdown(false); // Hide dropdown if flow from URL is valid
            // In non-debug mode, we still want to auto-process the URL flow
            if (!debugMode) {
              setAutoGenerationAttempted(false); // Allow auto-generation for URL flows in non-debug mode
            } else {
              setAutoGenerationAttempted(true); // Prevent auto-generation when URL flow is provided in debug mode
            }
            // loadFlowData will be called by the next useEffect
          } else {
            setErrorMessage(`Flow with ID "${initialFlowId}" not found. Please select a flow from the dropdown.`);
            setShowDropdown(true); // Show dropdown as URL flow is invalid
            router.replace('/pages/activity-2', { shallow: true }); // Clear invalid flowId from URL
          }
        }
      } catch (error) {
        console.error('Error loading database flows:', error);
        setErrorMessage('Failed to load flowcharts. Please try again.');
      }
      setIsLoading(false);
    };
    loadSavedFlows();
  }, [initialFlowId, router, debugMode]); // Added debugMode to dependencies

  // Effect to load flow data when selectedFlow (valid) changes or savedFlows are loaded
  useEffect(() => {
    if (selectedFlow && savedFlows.length > 0) {
      setCurrentFlowId(selectedFlow);
      loadFlowData(selectedFlow, savedFlows);
    }
  }, [selectedFlow, savedFlows, loadFlowData]);

  // Check for debug parameter in URL and set debug mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug');
    setDebugMode(debug === 'true');
  }, []);

  // Auto-generate word cloud when in non-debug mode
  useEffect(() => {
    console.log("Activity-2: Auto-generation EFFECT TRIGGERED. States:", {
      debugMode,
      flowsCount: savedFlows.length,
      hasThemedConcerns: !!themedConcerns,
      processingConcerns,
      autoGenerating,
      autoGenerationAttempted,
      initialFlowId,
      selectedFlow // Log selectedFlow too
    });

    // Only run in non-debug mode once flows are loaded and we haven't attempted auto-generation yet
    if (!debugMode && savedFlows.length > 0 && !themedConcerns && !processingConcerns && !autoGenerating && !autoGenerationAttempted) {
      console.log("Activity-2: Auto-generation: CONDITIONS MET. Starting data processing...");
      setAutoGenerating(true);
      setAutoGenerationAttempted(true); // Mark that we've attempted auto-generation
      
      let flowToProcess = null;
      
      // If we have a selected flow (from URL), use that; otherwise use most recent
      if (selectedFlow) {
        flowToProcess = selectedFlow;
        console.log("Activity-2: Auto-generation: Using selected flow from URL:", flowToProcess);
      } else {
        // Find the most recent flow
        try {
          const sortedFlows = [...savedFlows].sort((a, b) => {
            const dateA = a.timestamp || a.createdAt || 0;
            const dateB = b.timestamp || b.createdAt || 0;
            return new Date(dateB) - new Date(dateA);
          });
          
          if (sortedFlows.length === 0) {
            console.log("Activity-2: Auto-generation: No flows available in sortedFlows.");
            setErrorMessage('No flows available to generate word cloud');
            setAutoGenerating(false);
            // autoGenerationAttempted is already set to true above
            return;
          }
          
          // Select the most recent flow
          flowToProcess = sortedFlows[0].id;
          console.log("Activity-2: Auto-generation: Using most recent flow:", flowToProcess);
        } catch (error) {
          console.error("Activity-2: Auto-generation: Error during setup (e.g., sorting flows):", error);
          setErrorMessage('Error starting auto-generation');
          setAutoGenerating(false);
          // autoGenerationAttempted is already set to true above
          return;
        }
      }
      
      // Load data for this flow (function defined below)
      loadFlowAndProcess(flowToProcess);
    } else if (!debugMode) {
      // Log why auto-generation is not running or conditions not met
      console.log("Activity-2: Auto-generation: SKIPPED or conditions not met. Current states:", {
        debugMode,
        flowsCount: savedFlows.length,
        hasThemedConcerns: !!themedConcerns,
        processingConcerns,
        autoGenerating,
        autoGenerationAttempted,
        selectedFlow
      });
    }
  }, [debugMode, savedFlows, themedConcerns, processingConcerns, autoGenerating, autoGenerationAttempted, initialFlowId, selectedFlow]); // Added selectedFlow to dependencies

  // Function to load and process a flow
  const loadFlowAndProcess = async (flowId) => {
    if (!sessionId) {
      console.log('No sessionId available, skipping processing');
      setErrorMessage('Session ID is required');
      setAutoGenerating(false);
      setAutoGenerationAttempted(true);
      return;
    }

    try {
      setConcernsLoading(true);
      console.log("Activity-2: loadFlowAndProcess: Starting for flowId:", flowId, "sessionId:", sessionId);
      
      // Fetch concerns
      const result = await getCommentsForFlow(flowId, sessionId);
      
      if (!result.success) {
        console.warn("Activity-2: loadFlowAndProcess: Failed to load comments for flowId:", flowId, "Error:", result.error);
        setErrorMessage('Failed to load concerns');
        setAutoGenerating(false);
        setAutoGenerationAttempted(true); // Ensure we don't retry auto-generation
        setConcernsLoading(false);
        return;
      }
      
      // Set the concerns
      const concernsData = result.data;
      setConcerns(concernsData);
      console.log("Activity-2: loadFlowAndProcess: Loaded", concernsData.length, "concerns for flowId:", flowId);
      
      if (concernsData.length === 0) {
        console.log("Activity-2: loadFlowAndProcess: No concerns found for flowId:", flowId, ". Word cloud generation will be skipped for this flow.");
        setErrorMessage('No concerns found for this flow');
        // setThemedConcerns(null); // Explicitly ensure it's null if no concerns
        setAutoGenerating(false);
        setAutoGenerationAttempted(true); // Ensure we don't retry auto-generation
        setConcernsLoading(false);
        return;
      }
      
      // Process with OpenAI
      setProcessingConcerns(true);
      console.log("Activity-2: loadFlowAndProcess: Processing", concernsData.length, "concerns with OpenAI for flowId:", flowId);
      
      try {
        // Prepare data
        const optimizedConcerns = concernsData.map(concern => ({
          id: concern._id,
          text: concern.text,
          commentType: concern.commentType,
          nodeLabels: concern.nodeLabels
        }));
        
        // Make API request
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
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Activity-2: loadFlowAndProcess: OpenAI API error. Status:", response.status, "Response:", errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        // Process response
        const data = await response.json();
        console.log("Activity-2: loadFlowAndProcess: Received raw data from OpenAI:", JSON.stringify(data));
        
        if (data && data.themes) {
            console.log("Activity-2: loadFlowAndProcess: OpenAI data has themes. Theme count:", data.themes.length, ". Calling setThemedConcerns.");
            setThemedConcerns(data);
            
            // SAVE TO SESSION STORAGE - only save valid themed data
            try {
              sessionStorage.setItem(`themedConcerns-${flowId}`, JSON.stringify(data));
              console.log(`Activity-2: Saved themedConcerns for flowId ${flowId} to sessionStorage`);
            } catch (e) {
              console.error("Activity-2: Error saving to sessionStorage:", e);
            }
        } else {
            console.warn("Activity-2: loadFlowAndProcess: OpenAI data is missing themes, is null/undefined, or themes array is empty. Data:", JSON.stringify(data));
            setThemedConcerns(null); // Explicitly set to null if data is not as expected
            setErrorMessage('AI processing returned no themes. Ensure comments are sufficient for theming.');
        }
        
        setCurrentFlowId(flowId); // Set the current flow ID for continue button
      } catch (error) {
        console.error("Activity-2: loadFlowAndProcess: Error during OpenAI processing for flowId:", flowId, error);
        setErrorMessage('Error processing concerns: ' + error.message);
        setThemedConcerns(null); // Ensure themedConcerns is null on error
        setAutoGenerationAttempted(true); // Ensure we don't retry auto-generation on errors
      } finally {
        setProcessingConcerns(false);
        setAutoGenerating(false);
        // autoGenerationAttempted is set if an error occurred or successfully completed. If it was successful, it's set again here, which is fine.
        setAutoGenerationAttempted(true);
        console.log("Activity-2: loadFlowAndProcess: Finished OpenAI processing part for flowId:", flowId);
      }
    } catch (error) {
      console.error("Activity-2: loadFlowAndProcess: Outer error for flowId:", flowId, error);
      setErrorMessage('Error: ' + error.message);
      setThemedConcerns(null); // Ensure themedConcerns is null on outer error
      setAutoGenerating(false);
      setAutoGenerationAttempted(true); // Ensure we don't retry auto-generation on errors
    } finally {
      setConcernsLoading(false);
      console.log("Activity-2: loadFlowAndProcess: Fully finished for flowId:", flowId, "Current themedConcerns set (next render will show it):", themedConcerns );
    }
  };

  // Generate word cloud when themed concerns are available
  useEffect(() => {
    console.log("Activity-2: Word cloud generation useEffect. themedConcerns:", themedConcerns, "cloudRef.current:", cloudRef.current, "Debug Mode:", debugMode);
    if (themedConcerns && themedConcerns.themes && themedConcerns.themes.length > 0 && cloudRef.current) {
      console.log("Activity-2: Conditions met, calling generateWordCloud. ClientWidth:", cloudRef.current.clientWidth, "ClientHeight:", cloudRef.current.clientHeight);
      generateWordCloud();
    } else {
      console.log("Activity-2: Conditions NOT met for word cloud generation. Reasons:", {
        hasThemedConcerns: !!themedConcerns,
        hasThemes: !!(themedConcerns && themedConcerns.themes),
        themesLength: themedConcerns && themedConcerns.themes ? themedConcerns.themes.length : undefined,
        hasCloudRef: !!cloudRef.current
      });
    }
  }, [themedConcerns, debugMode]); // Added debugMode to dependency array

  // Generate word cloud visualization
  const generateWordCloud = () => {
    if (!themedConcerns || !themedConcerns.themes) return;
    
    // Clear previous word cloud
    d3.select(cloudRef.current).selectAll("*").remove();
    
    const width = cloudRef.current.clientWidth;
    const height = debugMode ? 500 : cloudRef.current.clientHeight || 700;
    
    // Prepare data for word cloud
    const bubbleData = themedConcerns.themes.map((theme, index) => {
      const words = theme.name.split(/\s+/);
      const isMultiWord = words.length > 1;
      
      // Calculate size based on number of concerns - make larger in non-debug mode
      // But scale down overall size as requested
      const value = theme.concerns.length;
      const sizeScaleFactor = debugMode ? 12 : 18; // Reduced from 15/22
      const fontSize = 8 + Math.sqrt(value) * sizeScaleFactor;
      
      return {
        id: index,
        text: theme.name,
        words: words,
        isMultiWord: isMultiWord,
        fontSize: fontSize,
        value: value,
        theme: theme,
        // Calculate initial radius - will be adjusted later if needed
        radius: isMultiWord 
          ? fontSize * (1.4 + (words.length - 1) * 0.5) // Slightly reduced multipliers
          : fontSize * 1.6, // Reduced from 1.8
        color: `hsl(${index * (360 / themedConcerns.themes.length)}, 70%, 80%)`
      };
    });
    
    // Create SVG
    const svg = d3.select(cloudRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "word-cloud-svg");
    
    // Create a group to hold all bubbles, centered in the container
    const bubbleGroup = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
    // Create temporary text elements to measure actual text dimensions
    bubbleData.forEach(bubble => {
      const textGroup = svg.append("g")
        .attr("class", "temp-text")
        .style("visibility", "hidden");
      
      if (bubble.isMultiWord) {
        let maxWidth = 0;
        const lineHeight = bubble.fontSize * 0.85 * 1.1;
        const wordCount = bubble.words.length;
        
        bubble.words.forEach((word, i) => {
          const text = textGroup.append("text")
            .style("font-size", `${bubble.fontSize * 0.85}px`)
            .style("font-family", "Impact")
            .text(word);
          
          const bbox = text.node().getBBox();
          maxWidth = Math.max(maxWidth, bbox.width);
        });
        
        // Add padding and calculate radius based on text dimensions
        const textHeight = wordCount * lineHeight;
        bubble.textWidth = maxWidth;
        bubble.textHeight = textHeight;
        bubble.radius = Math.max(bubble.radius, 
          Math.sqrt(Math.pow(maxWidth / 1.5, 2) + Math.pow(textHeight / 1.5, 2)) + 15); // Reduced padding from 20
      } else {
        const text = textGroup.append("text")
          .style("font-size", `${bubble.fontSize}px`)
          .style("font-family", "Impact")
          .text(bubble.text);
        
        const bbox = text.node().getBBox();
        bubble.textWidth = bbox.width;
        bubble.textHeight = bbox.height;
        bubble.radius = Math.max(bubble.radius, 
          Math.sqrt(Math.pow(bbox.width / 1.5, 2) + Math.pow(bbox.height / 1.5, 2)) + 12); // Reduced padding from 15
      }
      
      textGroup.remove(); // Remove temporary elements
    });
    
    // Create force simulation with wider distribution
    const simulation = d3.forceSimulation(bubbleData)
      // Center force pulls bubbles toward center
      .force("center", d3.forceCenter(0, 0))
      // Collision force with padding to avoid overlap - reduced strength for wider spread
      .force("collision", d3.forceCollide().radius(d => d.radius + 8).strength(0.7))
      // X positioning force - increased strength for wider distribution
      .force("x", d3.forceX().strength(0.03))
      // Y positioning force
      .force("y", d3.forceY().strength(0.03))
      // Add charge force to make bubbles repel each other - increased for more spacing
      .force("charge", d3.forceManyBody().strength(d => -Math.pow(d.radius, 1.4) * 0.6));
    
    // Create groups for each bubble
    const bubbles = bubbleGroup.selectAll(".bubble-group")
      .data(bubbleData)
      .enter()
      .append("g")
      .attr("class", "bubble-group")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedTheme(d.theme);
        setIsModalOpen(true);
      });
    
    // Add circles
    bubbles.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("class", "word-bubble");
    
    // Add text for single-word bubbles
    bubbles.filter(d => !d.isMultiWord)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", d => `${d.fontSize}px`)
      .style("font-family", "Impact")
      .style("fill", d => d.color.replace("80%", "40%"))
      .text(d => d.text)
      .style("pointer-events", "none");
    
    // Add text for multi-word bubbles
    bubbles.filter(d => d.isMultiWord)
      .each(function(d) {
        const wordCount = d.words.length;
        const effectiveFontSize = d.fontSize * 0.85;
        const lineHeight = effectiveFontSize * 1.1;
        const startY = -((wordCount - 1) * lineHeight) / 2;
        
        d.words.forEach((word, i) => {
          d3.select(this)
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", startY + i * lineHeight)
            .style("font-size", `${effectiveFontSize}px`)
            .style("font-family", "Impact")
            .style("fill", d.color.replace("80%", "40%"))
            .text(word)
            .style("pointer-events", "none");
        });
      });
    
    // Update bubble positions on each simulation tick
    simulation.on("tick", () => {
      // Constrain bubbles to stay within view - allow wider spread
      bubbleData.forEach(d => {
        const maxX = (width / 2) * 0.95 - d.radius;
        const maxY = (height / 2) * 0.95 - d.radius;
        
        d.x = Math.max(-maxX, Math.min(maxX, d.x));
        d.y = Math.max(-maxY, Math.min(maxY, d.y));
      });
      
      // Update positions
      bubbles.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Stop simulation after a few seconds for performance
    setTimeout(() => {
      simulation.stop();
    }, 3000);
  };

  // Handle flow selection from dropdown
  const handleFlowSelection = async (e) => {
    const flowId = e.target.value;
    
    setThemedConcerns(null); // Reset processed data
    setErrorMessage('');
    setAutoGenerationAttempted(false); // Reset auto-generation flag when manually selecting
    
    if (!flowId) {
      setSelectedFlow(null);
      setSelectedFlowInfo(null);
      setConcerns([]);
      // Preserve sessionId when clearing flowId
      const params = new URLSearchParams();
      if (sessionId) {
        params.set('sessionID', sessionId);
      }
      const newUrl = `/pages/activity-2${params.toString() ? `?${params.toString()}` : ''}`;
      router.replace(newUrl, { shallow: true });
      setShowDropdown(true); // Ensure dropdown is visible if "Select a flow" is chosen
      return;
    }

    // Update URL with flowId and preserve sessionID
    const params = new URLSearchParams();
    if (sessionId) {
      params.set('sessionID', sessionId);
    }
    params.set('flowId', flowId);
    router.replace(`/pages/activity-2?${params.toString()}`, { shallow: true });
    setSelectedFlow(flowId);
    setShowDropdown(false); // Hide dropdown after selection
    // loadFlowData will be called by the useEffect watching [selectedFlow, savedFlows]
  };


  // Load concerns from database (memoized)
  const loadConcernsForFlow = useCallback(async (flowId) => {
    if (!sessionId) {
      console.log('No sessionId available, skipping concern loading');
      return;
    }
    
    console.log("loadConcernsForFlow: Called for flow", flowId, "sessionId:", sessionId);
    setConcernsLoading(true);
    try {
      const result = await getCommentsForFlow(flowId, sessionId);
      if (result.success) {
        console.log("loadConcernsForFlow: Loaded", result.data.length, "concerns");
        setConcerns(result.data);
      } else {
        console.log("loadConcernsForFlow: Failed to load concerns");
        setConcerns([]);
        setErrorMessage('Failed to load concerns. Please try again.');
      }
    } catch (error) {
      console.error('loadConcernsForFlow: Error loading concerns:', error);
      setConcerns([]);
      setErrorMessage('Failed to load concerns. Please try again.');
    } finally {
      setConcernsLoading(false);
      console.log("loadConcernsForFlow: Finished loading concerns for", flowId);
    }
  }, [sessionId]); // Add sessionId to dependency array

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

  // Load theme comments when modal opens
  useEffect(() => {
    if (isModalOpen && selectedTheme) {
      const flowIdToUse = currentFlowId || selectedFlow;
      if (flowIdToUse) {
        loadThemeComments(flowIdToUse, selectedTheme.name);
      }
    }
  }, [isModalOpen, selectedTheme, currentFlowId, selectedFlow]);

  // Load theme comments from API
  const loadThemeComments = async (flowId, themeName) => {
    if (!sessionId) {
      console.log('No sessionId available, skipping theme comments loading');
      return;
    }
    
    setCommentsLoading(true);
    setThemeComments([]);
    try {
      console.log("Fetching theme comments for:", flowId, themeName, "sessionId:", sessionId);
      const response = await fetch(`/api/themeComments?flowId=${flowId}&sessionId=${sessionId}&themeName=${themeName}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Theme comments result:", data);
      
      if (data.success) {
        setThemeComments(data.data);
      } else {
        console.error('Failed to load comments:', data.error);
      }
    } catch (error) {
      console.error('Error loading theme comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!commentInput.trim()) {
      return; // Don't submit empty comments
    }
    
    if (!sessionId) {
      setCommentSubmitError('Session ID is required');
      return;
    }
    
    setIsSubmittingComment(true);
    setCommentSubmitError('');
    
    try {
      const flowIdToUse = currentFlowId || selectedFlow;
      const response = await fetch('/api/themeComments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: flowIdToUse,
          sessionId: sessionId,
          themeName: selectedTheme.name,
          commentText: commentInput.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Add new comment to state and clear input
        setThemeComments(prevComments => [data.data, ...prevComments]);
        setCommentInput('');
      } else {
        setCommentSubmitError('Failed to submit comment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setCommentSubmitError('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Format date for comment display
  const formatCommentDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTheme(null);
    setCommentInput('');
    setThemeComments([]);
    setCommentSubmitError('');
  };

  // Handle comment input change
  const handleCommentInputChange = (e) => {
    setCommentInput(e.target.value);
  };

  const handleContinue = () => {
    const flowIdToUse = currentFlowId || selectedFlow; // Use currentFlowId first, fallback to selectedFlow
    const params = new URLSearchParams();
    if (sessionId) {
      params.set('sessionID', sessionId);
    }
    params.set('flowId', flowIdToUse);
    router.push(`/pages/activity-3?${params.toString()}`);
  };

  const handleLogoClick = () => {
    router.push('/pages/newSession-NS');
  };

  return (
    <div className="word-cloud-page full-width-page">
      <Header title="Neuroserpin" onLogoClick={handleLogoClick} />
      {/* Debug information panel - only shown in debug mode */}
      {debugMode && (
        <div style={{ 
          padding: '10px', 
          background: '#f0f0f0', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          margin: '10px 0',
          fontSize: '12px'
        }}>
          <div><strong>Debug Mode:</strong> {debugMode ? 'ON' : 'OFF'}</div>
          <div><strong>Flows:</strong> {savedFlows.length}</div>
          <div><strong>Selected Flow:</strong> {selectedFlow || 'none'}</div>
          <div><strong>Current Flow ID:</strong> {currentFlowId || 'none'}</div>
          <div><strong>Auto Generation Attempted:</strong> {autoGenerationAttempted ? 'Yes' : 'No'}</div>
          <div><strong>Loading:</strong> {isLoading || concernsLoading || processingConcerns || autoGenerating ? 'Yes' : 'No'}</div>
          <div><strong>Has Themed Data:</strong> {themedConcerns ? 'Yes' : 'No'}</div>
          <div><strong>Error:</strong> {errorMessage || 'None'}</div>
          <button 
            onClick={() => {
              if (savedFlows.length > 0) {
                setAutoGenerationAttempted(false); // Reset auto-generation flag
                setThemedConcerns(null); // Clear existing data
                setErrorMessage(''); // Clear errors
                loadFlowAndProcess(savedFlows[0].id);
              } else {
                setErrorMessage('No flows available');
              }
            }}
            style={{
              marginTop: '5px',
              padding: '3px 8px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Force Generate
          </button>
        </div>
      )}

      {/* Show header and flow selection only in debug mode */}
      {debugMode && (
        <>
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
                  onClick={() => loadFlowAndProcess(selectedFlow)}
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
        </>
      )}

      {/* Auto-generate loading indicator - only shown in non-debug mode */}
      {(isLoading || concernsLoading || processingConcerns || autoGenerating) && !themedConcerns && (
        <div className="auto-generate-loading">
          <div className="spinner"></div>
          <p>Building word cloud...</p>
          {isLoading && <div>Loading flows...</div>}
          {concernsLoading && <div>Loading concerns...</div>}
          {processingConcerns && <div>Processing with AI...</div>}
          {autoGenerating && <div>Starting generation...</div>}
        </div>
      )}

      {!debugMode && errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {themedConcerns && themedConcerns.themes && (
        <div className="themed-concerns-section">
          {/* Show themes grid and theme summary only in debug mode */}
          {debugMode && (
            <>
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
            </>
          )}
          
          {/* Word Cloud Visualization - always shown */}
          <div className="word-cloud-visualization">
            <h2>CLICK WORDS TO EXPLORE THE GROUP&apos;S CONCERNS</h2>
            <div 
              className="word-cloud-container" 
              ref={cloudRef}
            ></div>
          </div>
        </div>
      )}
      
      {/* Theme Exploration Modal - always shown when active */}
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
                
                {/* Comments list moved above the text input */}
                <div className="comments-list-container">
                  {commentsLoading ? (
                    <div className="comments-loading">Loading comments...</div>
                  ) : themeComments.length > 0 ? (
                    <div className="comments-list">
                      {themeComments.map((comment) => (
                        <div key={comment._id} className="comment-item">
                          <div className="comment-text">{comment.commentText}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-comments">No comments yet. Be the first to add one!</div>
                  )}
                </div>
                
                <textarea 
                  value={commentInput}
                  onChange={handleCommentInputChange}
                  className="modal-comment-input"
                  placeholder="Type your explanation here..."
                  rows={4}
                ></textarea>
                
                {commentSubmitError && (
                  <div className="comment-error-message">{commentSubmitError}</div>
                )}

                <div className="modal-actions">
                  <button className="button button-secondary" onClick={closeModal}>BACK TO CLOUD</button>
                  <button 
                    className="button button-primary"
                    onClick={handleCommentSubmit}
                    disabled={isSubmittingComment || !commentInput.trim()}
                  >
                    {isSubmittingComment ? 'SUBMITTING...' : 'SUBMIT COMMENT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      {(currentFlowId || selectedFlow) && themedConcerns && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}>
          <button
            onClick={handleContinue}
            className="button button-primary"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
            }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

export default function WordCloudPage() {
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
      {/* Render WordCloudContent only after params are loaded to ensure initialFlowId is available */}
      {paramsLoaded && <WordCloudContent initialFlowId={initialFlowIdFromUrl} initialSessionId={initialSessionIdFromUrl} />}
      {!paramsLoaded && ( // Show a general loading indicator until params are confirmed
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading page...</p>
        </div>
      )}
    </>
  );
}