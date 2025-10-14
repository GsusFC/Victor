import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function CollapsibleCard({
  title,
  children,
  defaultExpanded = true,
  className = "",
  headerClassName = "",
  contentClassName = ""
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={`border-input ${className}`}>
      <CardHeader
        className={`p-2.5 pb-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${headerClassName}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-xs font-mono font-medium tracking-wide">
          <span>{title}</span>
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className={`p-2.5 pt-1.5 ${contentClassName}`}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}
