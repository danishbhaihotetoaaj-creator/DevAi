'use client';

import React from 'react';

interface Personality {
  id: string;
  name: string;
  description: string;
  personalityTraits: string[];
  expertise: string[];
  communicationStyle: string;
}

interface PersonalitySelectorProps {
  personalities: Personality[];
  currentPersonality: string;
  onSelect: (personalityId: string) => void;
  onClose: () => void;
}

export default function PersonalitySelector({
  personalities,
  currentPersonality,
  onSelect,
  onClose,
}: PersonalitySelectorProps) {
  const getCommunicationStyleColor = (style: string) => {
    switch (style) {
      case 'formal':
        return 'bg-purple-100 text-purple-800';
      case 'casual':
        return 'bg-green-100 text-green-800';
      case 'friendly':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your AI Companion</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {personalities.map((personality) => (
          <div
            key={personality.id}
            className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
              currentPersonality === personality.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onSelect(personality.id)}
          >
            {/* Current Selection Indicator */}
            {currentPersonality === personality.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Personality Icon */}
            <div className="text-3xl mb-3 text-center">
              {getPersonalityIcon(personality.id)}
            </div>

            {/* Personality Name */}
            <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              {personality.name}
            </h4>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-3 text-center leading-relaxed">
              {personality.description}
            </p>

            {/* Communication Style */}
            <div className="mb-3 text-center">
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCommunicationStyleColor(
                  personality.communicationStyle
                )}`}
              >
                {personality.communicationStyle.charAt(0).toUpperCase() + personality.communicationStyle.slice(1)}
              </span>
            </div>

            {/* Personality Traits */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Traits:</h5>
              <div className="flex flex-wrap gap-1">
                {personality.personalityTraits.slice(0, 3).map((trait, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {trait}
                  </span>
                ))}
                {personality.personalityTraits.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                    +{personality.personalityTraits.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Expertise Areas */}
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">Expertise:</h5>
              <div className="flex flex-wrap gap-1">
                {personality.expertise.slice(0, 2).map((expertise, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                  >
                    {expertise}
                  </span>
                ))}
                {personality.expertise.length > 2 && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    +{personality.expertise.length - 2}
                  </span>
                )}
              </div>
            </div>

            {/* Select Button */}
            <button
              className={`w-full mt-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPersonality === personality.id
                  ? 'bg-blue-600 text-white cursor-default'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={currentPersonality === personality.id}
            >
              {currentPersonality === personality.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Quick Tips:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Researcher:</strong> Best for analysis, fact-checking, and deep research</li>
          <li>• <strong>Visheshagya:</strong> Ideal for spiritual guidance and life wisdom</li>
          <li>• <strong>Shikshak:</strong> Perfect for learning and skill development</li>
          <li>• <strong>Mitra:</strong> Great for casual conversation and emotional support</li>
        </ul>
      </div>
    </div>
  );
}