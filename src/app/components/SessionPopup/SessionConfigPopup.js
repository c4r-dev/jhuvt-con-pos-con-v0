"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography
} from '@mui/material';

const SessionConfigPopup = ({ 
  open, 
  onClose,
  sessionID: initialSessionID,
  targetPage = 'FTB-1',
  defaultFlowId = null
}) => {
  const [mode, setMode] = useState(null);
  const [sessionID, setSessionID] = useState(initialSessionID || generateSessionID());
  const [isOpen, setIsOpen] = useState(open);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  function generateSessionID() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Generate QR code URL using QR Server API
  const generateQRCode = (url) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    setQrCodeUrl(qrUrl);
  };

  // Check for sessionID in URL on mount
  useEffect(() => {
    const urlSessionID = searchParams.get('sessionID');
    if (!urlSessionID) {
      onClose?.();
    }
  }, [searchParams]);

  const handleClose = (event, reason) => {
    // Prevent closing when clicking outside
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    
    setIsOpen(false);
    setMode(null);
    setQrCodeUrl('');
    onClose?.();
  };

  const handleModeSelect = (selectedMode) => {
    if (selectedMode === 'individual') {
      // Route to individual mode with hardcoded sessionID
      const url = new URL(`${window.location.origin}/pages/${targetPage}`);
      url.searchParams.set('sessionID', 'individual1');
      if (defaultFlowId) {
        url.searchParams.set('flowId', defaultFlowId);
      }
      router.push(url.pathname + url.search);
      handleClose();
    } else {
      // Generate new sessionID for group mode
      const newSessionID = generateSessionID();
      setSessionID(newSessionID);
      setMode('group');
      
      // Generate QR code for the sharing URL
      const url = new URL(`${window.location.origin}/pages/${targetPage}`);
      url.searchParams.set('sessionID', newSessionID);
      if (defaultFlowId) {
        url.searchParams.set('flowId', defaultFlowId);
      }
      const sharingURL = url.toString();
      generateQRCode(sharingURL);
    }
  };

  const handleBack = () => {
    setMode(null);
    setQrCodeUrl('');
  };

  const handleStart = () => {
    const url = new URL(`${window.location.origin}/pages/${targetPage}`);
    url.searchParams.set('sessionID', sessionID);
    if (defaultFlowId) {
      url.searchParams.set('flowId', defaultFlowId);
    }
    router.push(url.pathname + url.search);
    handleClose();
  };

  const handleCopyLink = async () => {
    try {
      const url = new URL(`${window.location.origin}/pages/${targetPage}`);
      url.searchParams.set('sessionID', sessionID);
      if (defaultFlowId) {
        url.searchParams.set('flowId', defaultFlowId);
      }
      const sharingURL = url.toString();
      await navigator.clipboard.writeText(sharingURL);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
    >
      {mode === null ? (
        <>
          <DialogTitle sx={{ textAlign: 'center' }}>
            How are you completing this activity?
          </DialogTitle>
          <DialogContent>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
              alignItems: 'center',
              mt: 6,
              mb: 6
            }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => handleModeSelect('individual')}
                style={{ 
                  backgroundColor: '#6200EE',
                  color: 'white',
                  width: '200px'
                }}
                sx={{
                  '&:hover': {
                    backgroundColor: '#5000C8',
                  }
                }}
              >
                As an Individual
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={() => handleModeSelect('group')}
                style={{ 
                  backgroundColor: '#6200EE',
                  color: 'white',
                  width: '200px'
                }}
                sx={{
                  '&:hover': {
                    backgroundColor: '#5000C8',
                  }
                }}
              >
                As a Group
              </Button>
            </Box>
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle>Configure Group Activity</DialogTitle>
          <DialogContent>
            <Button 
              variant="text" 
              onClick={handleBack}
              sx={{ mb: 2 }}
            >
              ← Back
            </Button>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: 'center',
              p: 2 
            }}>
              {/* Left side - Link and Copy Button */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography gutterBottom variant="h6">
                  Share this link with your group:
                </Typography>
                <Typography variant="body1" sx={{ 
                  p: 2, 
                  mb: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  fontSize: '0.9rem'
                }}>
                  {(() => {
                    const url = new URL(`${window.location.origin}/pages/${targetPage}`);
                    url.searchParams.set('sessionID', sessionID);
                    if (defaultFlowId) {
                      url.searchParams.set('flowId', defaultFlowId);
                    }
                    return url.toString();
                  })()}
                </Typography>
                <Button 
                  variant="contained"
                  onClick={handleCopyLink}
                  fullWidth
                  style={{ 
                    backgroundColor: '#6200EE',
                    color: 'white'
                  }}
                  sx={{ 
                    mb: 2,
                    '&:hover': {
                      backgroundColor: '#5000C8',
                    }
                  }}
                >
                  Copy Link
                </Button>
              </Box>

              {/* Right side - QR Code */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="h6" gutterBottom>
                  Or scan QR code:
                </Typography>
                {qrCodeUrl && (
                  <Box sx={{
                    p: 2,
                    backgroundColor: 'white',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                  }}>
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code for group activity"
                      style={{ 
                        display: 'block',
                        width: '200px',
                        height: '200px'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleStart}
                style={{ 
                  backgroundColor: '#6200EE',
                  color: 'white'
                }}
                sx={{
                  '&:hover': {
                    backgroundColor: '#5000C8',
                  }
                }}
              >
                Start Activity
              </Button>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default SessionConfigPopup;