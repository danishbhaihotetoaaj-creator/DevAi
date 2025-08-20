'use client';

import React, { useEffect, useState } from 'react';

interface StreamingResponseProps {
  content: string;
  personality?: any;
}

export default function StreamingResponse({ content, personality }: StreamingResponseProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    setDisplayedContent(content);
  }, [content]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const getPersonalityIcon = (personalityId?: string) => {
    if (!personalityId) return '🤖';
    
    switch (personalityId) {
      case 'researcher':
        return '🔬';
      case 'visheshagya':
        return '🧘';
      case 'shikshak':
        return '📚';
      case 'mitra':
        return '🤝';
      default:
        return '🤖';
    }
  };

  const getPersonalityColor = (personalityId?: string) => {
    if (!personalityId) return 'border-gray-200 bg-gray-50';
    
    switch (personalityId) {
      case 'researcher':
        return 'border-blue-200 bg-blue-50';
      case 'visheshagya':
        return 'border-purple-200 bg-purple-50';
      case 'shikshak':
        return 'border-green-200 bg-green-50';
      case 'mitra':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="flex justify-start">
      <div className={`max-w-3xl px-4 py-3 rounded-lg border-2 ${getPersonalityColor(personality?.id)} relative`}>
        {/* Personality Indicator */}
        <div className="absolute -top-3 left-4 px-2 py-1 bg-white border border-gray-200 rounded-full text-sm">
          <span className="mr-2">{getPersonalityIcon(personality?.id)}</span>
          <span className="text-gray-700 font-medium">
            {personality?.name || 'AI'} is typing...
          </span>
        </div>

        {/* Streaming Content */}
        <div className="whitespace-pre-wrap break-words text-gray-800 leading-relaxed">
          {displayedContent}
          <span
            className={`inline-block w-2 h-5 ml-1 ${
              cursorVisible ? 'bg-blue-500' : 'bg-transparent'
            } transition-colors duration-100`}
            style={{ animation: 'blink 1s infinite' }}
          />
        </div>

        {/* Streaming Status */}
        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Streaming response...</span>
          </div>
          
          <span className="text-gray-300">•</span>
          
          <span>Live generation</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.min((content.length / 100) * 100, 100)}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}