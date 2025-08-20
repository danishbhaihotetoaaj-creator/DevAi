'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getPersonality, getEnabledPersonalities } from '@/lib/config/personalities';
import { ChatMessage, MessageInsights } from '@/lib/types';
import ChatBubble from './ChatBubble';
import VoiceRecorder from './VoiceRecorder';
import PersonalitySelector from './PersonalitySelector';
import ChatHistory from './ChatHistory';
import UserProfile from './UserProfile';
import FileUpload from './FileUpload';
import StreamingResponse from './StreamingResponse';

interface ChatInterfaceProps {
  userId: string;
  initialPersonality?: string;
}

interface ChatResponse {
  message: string;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    fallbackUsed: boolean;
    processingTime: number;
    personality: string;
    task: string;
  };
  conversationId: string;
  messageId: string;
  insights?: MessageInsights;
}

export default function ChatInterface({ userId, initialPersonality = 'mitra' }: ChatInterfaceProps) {
  const [personality, setPersonality] = useState(initialPersonality);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [attachments, setAttachments] = useState<Array<{
    type: 'image' | 'document' | 'audio' | 'video';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const personalities = getEnabledPersonalities();
  const currentPersonality = getPersonality(personality);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setIsLoading(true);
    setError(null);
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch(`/api/chat/${personality}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          conversationId,
          attachments,
          clientContext: {
            task: 'chat',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content') {
                  setStreamingMessage(prev => prev + data.content);
                } else if (data.type === 'complete') {
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date(),
                    metadata: data.metadata,
                  };

                  setMessages(prev => [...prev, assistantMessage]);
                  
                  if (!conversationId) {
                    setConversationId(data.conversationId);
                  }
                  
                  setIsStreaming(false);
                  setStreamingMessage('');
                  break;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      } else {
        // Fallback to non-streaming response
        const data = await response.json();
        
        if (data.success) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: data.data.message,
            timestamp: new Date(),
            metadata: data.metadata,
          };

          setMessages(prev => [...prev, assistantMessage]);
          
          if (!conversationId) {
            setConversationId(data.data.conversationId);
          }
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePersonalityChange = (newPersonality: string) => {
    setPersonality(newPersonality);
    setShowPersonalitySelector(false);
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  const handleVoiceInput = (transcript: string) => {
    setInputMessage(transcript);
    inputRef.current?.focus();
  };

  const handleFileUpload = (files: FileList) => {
    const newAttachments = Array.from(files).map(file => ({
      type: getFileType(file.type),
      url: URL.createObjectURL(file),
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const getFileType = (mimeType: string): 'image' | 'document' | 'audio' | 'video' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setAttachments([]);
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTime = (time: number) => {
    return `${time}ms`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPersonalitySelector(!showPersonalitySelector)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="font-medium">
                {currentPersonality?.name || 'Select Personality'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {currentPersonality && (
              <div className="text-sm text-gray-600">
                {currentPersonality.description}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowUserProfile(!showUserProfile)}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            
            <button
              onClick={clearConversation}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Personality Selector */}
        {showPersonalitySelector && (
          <PersonalitySelector
            personalities={personalities}
            currentPersonality={personality}
            onSelect={handlePersonalityChange}
            onClose={() => setShowPersonalitySelector(false)}
          />
        )}

        {/* Chat History Sidebar */}
        {showChatHistory && (
          <ChatHistory
            userId={userId}
            onSelectConversation={(convId) => {
              setConversationId(convId);
              setShowChatHistory(false);
            }}
            onClose={() => setShowChatHistory(false)}
          />
        )}

        {/* User Profile Sidebar */}
        {showUserProfile && (
          <UserProfile
            userId={userId}
            onClose={() => setShowUserProfile(false)}
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-2xl mb-2">👋</div>
            <p>Start a conversation with {currentPersonality?.name || 'your AI companion'}!</p>
            <p className="text-sm mt-1">They're ready to help with whatever you need.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            message={message}
            personality={currentPersonality}
            isLast={index === messages.length - 1}
          />
        ))}

        {/* Streaming Response */}
        {isStreaming && streamingMessage && (
          <StreamingResponse
            content={streamingMessage}
            personality={currentPersonality}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Attachments Display */}
      {attachments.length > 0 && (
        <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-blue-800">Attachments:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border">
                <span className="text-sm text-gray-600">{attachment.filename}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${currentPersonality?.name || 'your AI companion'}...`}
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              rows={1}
              disabled={isLoading}
            />
            
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
          </div>
          
          <VoiceRecorder
            onTranscript={handleVoiceInput}
            disabled={isLoading}
          />
          
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line • Use voice input or attach files
        </div>
      </div>
    </div>
  );
}