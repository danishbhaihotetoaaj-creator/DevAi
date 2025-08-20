'use client';

import React, { useState, useEffect, useRef } from 'react';

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function VoiceRecorder({ onTranscript, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Set up event handlers
      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setError(null);
        setTranscript('');
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (transcript.trim()) {
          onTranscript(transcript.trim());
          setTranscript('');
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTranscript]);

  const startRecording = () => {
    if (!isSupported || disabled) return;
    
    try {
      setError(null);
      recognitionRef.current?.start();
      
      // Auto-stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className="px-4 py-2 text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed"
        title="Voice recognition not supported in this browser"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg transition-all duration-200 ${
          isRecording
            ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isRecording ? 'Click to stop recording' : 'Click to start voice recording'}
      >
        {isRecording ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Live Transcript Display */}
      {isRecording && transcript && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 text-white rounded-lg shadow-lg max-w-xs z-20">
          <div className="text-xs text-gray-300 mb-1">Live transcript:</div>
          <div className="text-sm">{transcript}</div>
          <div className="text-xs text-gray-400 mt-1">
            Click again to stop and send
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-600 text-white text-xs rounded-lg shadow-lg z-20 max-w-xs">
          {error}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
      )}
    </div>
  );
}