'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ChatBubbleProps {
  message: ChatMessage;
  personality?: any;
  isLast: boolean;
}

export default function ChatBubble({ message, personality, isLast }: ChatBubbleProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const isUser = message.role === 'user';
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasMetadata = message.metadata;

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTime = (time: number) => {
    return `${time}ms`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAttachment = (attachment: any, index: number) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div key={index} className="mt-2">
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="max-w-xs rounded-lg border"
              onClick={() => window.open(attachment.url, '_blank')}
              style={{ cursor: 'pointer' }}
            />
            <p className="text-xs text-gray-500 mt-1">{attachment.filename}</p>
          </div>
        );
      
      case 'video':
        return (
          <div key={index} className="mt-2">
            <video
              src={attachment.url}
              controls
              className="max-w-xs rounded-lg border"
            />
            <p className="text-xs text-gray-500 mt-1">{attachment.filename}</p>
          </div>
        );
      
      case 'audio':
        return (
          <div key={index} className="mt-2">
            <audio
              src={attachment.url}
              controls
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{attachment.filename}</p>
          </div>
        );
      
      default:
        return (
          <div key={index} className="mt-2 flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">{attachment.filename}</p>
              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
            </div>
            <a
              href={attachment.url}
              download={attachment.filename}
              className="text-blue-500 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
          </div>
        );
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl px-4 py-3 rounded-lg relative group ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        
        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-3">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className={`text-xs flex items-center space-x-1 ${
                isUser ? 'text-blue-100 hover:text-blue-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{showAttachments ? 'Hide' : 'Show'} Attachments</span>
              <svg
                className={`w-3 h-3 transition-transform ${showAttachments ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAttachments && (
              <div className="mt-2 space-y-2">
                {message.attachments?.map((attachment, index) => 
                  renderAttachment(attachment, index)
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-xs mt-2 ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>
        
        {/* Metadata Toggle */}
        {hasMetadata && (
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? 'text-blue-100 hover:text-blue-200' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        
        {/* Metadata Panel */}
        {showMetadata && hasMetadata && (
          <div className={`absolute top-full left-0 mt-2 p-3 bg-gray-800 text-white rounded-lg shadow-lg z-10 min-w-64 ${
            isUser ? 'right-0 left-auto' : ''
          }`}>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Model:</span>
                <span className="font-mono">{message.metadata?.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Provider:</span>
                <span className="font-mono">{message.metadata?.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Tokens:</span>
                <span className="font-mono">{message.metadata?.tokens?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cost:</span>
                <span className="font-mono">{formatCost(message.metadata?.cost || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Time:</span>
                <span className="font-mono">{formatTime(message.metadata?.processingTime || 0)}</span>
              </div>
              {message.metadata?.fallbackUsed && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Fallback:</span>
                  <span className="text-yellow-400">⚠️ Used</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-300">Personality:</span>
                <span className="font-mono">{message.metadata?.personality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Task:</span>
                <span className="font-mono">{message.metadata?.task}</span>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowMetadata(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}