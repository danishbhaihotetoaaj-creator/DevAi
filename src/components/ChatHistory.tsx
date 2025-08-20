'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  personality: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  userId: string;
  onSelectConversation: (conversationId: string) => void;
  onClose: () => void;
}

export default function ChatHistory({ userId, onSelectConversation, onClose }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'personality'>('all');
  const [selectedPersonality, setSelectedPersonality] = useState<string>('all');

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        id: 'conv_1',
        title: 'Research on AI Ethics',
        personality: 'researcher',
        lastMessage: 'The ethical implications of AI development are complex and multifaceted...',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        messageCount: 15,
      },
      {
        id: 'conv_2',
        title: 'Life Guidance Session',
        personality: 'visheshagya',
        lastMessage: 'Remember that every challenge is an opportunity for growth...',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        messageCount: 8,
      },
      {
        id: 'conv_3',
        title: 'Learning Python Basics',
        personality: 'shikshak',
        lastMessage: 'Great! You\'ve understood the fundamentals. Let\'s move to functions...',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        messageCount: 23,
      },
      {
        id: 'conv_4',
        title: 'Casual Chat',
        personality: 'mitra',
        lastMessage: 'That sounds like a wonderful experience! I\'m so happy for you...',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        messageCount: 12,
      },
    ];

    // Simulate API delay
    setTimeout(() => {
      setConversations(mockConversations);
      setIsLoading(false);
    }, 500);
  }, [userId]);

  const getPersonalityIcon = (personalityId: string) => {
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

  const getPersonalityName = (personalityId: string) => {
    switch (personalityId) {
      case 'researcher':
        return 'Researcher';
      case 'visheshagya':
        return 'Visheshagya';
      case 'shikshak':
        return 'Shikshak';
      case 'mitra':
        return 'Mitra';
      default:
        return 'AI';
    }
  };

  const getPersonalityColor = (personalityId: string) => {
    switch (personalityId) {
      case 'researcher':
        return 'bg-blue-100 text-blue-800';
      case 'visheshagya':
        return 'bg-purple-100 text-purple-800';
      case 'shikshak':
        return 'bg-green-100 text-green-800';
      case 'mitra':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'recent' && 
                          conversation.timestamp > new Date(Date.now() - 1000 * 60 * 60 * 24)) ||
                         (selectedFilter === 'personality' && 
                          (selectedPersonality === 'all' || conversation.personality === selectedPersonality));
    
    return matchesSearch && matchesFilter;
  });

  const deleteConversation = async (conversationId: string) => {
    try {
      // TODO: Implement actual API call to delete conversation
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading conversations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('recent')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedFilter === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Recent (24h)
            </button>
            <button
              onClick={() => setSelectedFilter('personality')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedFilter === 'personality'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              By Personality
            </button>
          </div>

          {/* Personality Filter */}
          {selectedFilter === 'personality' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedPersonality('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedPersonality === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Personalities
              </button>
              {['researcher', 'visheshagya', 'shikshak', 'mitra'].map(personality => (
                <button
                  key={personality}
                  onClick={() => setSelectedPersonality(personality)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedPersonality === personality
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {getPersonalityIcon(personality)} {getPersonalityName(personality)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium">No conversations found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getPersonalityIcon(conversation.personality)}</span>
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPersonalityColor(
                            conversation.personality
                          )}`}
                        >
                          {getPersonalityName(conversation.personality)}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {conversation.lastMessage}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{conversation.messageCount} messages</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(conversation.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}