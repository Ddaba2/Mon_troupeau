import React from 'react';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 2, className = '' }: SkeletonCardProps) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/5 mb-2.5" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
          style={{ width: `${60 + (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
