import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

/**
 * Renders text containing LaTeX delimiters.
 * - $...$ for inline math
 * - $$...$$ for block/display math
 * - Plain text is rendered as-is
 * - Newlines create line breaks
 */
export default function MathText({ text, className, block = false }: MathTextProps) {
  // Split on newlines first, then process each line
  const lines = text.split('\n');

  return (
    <span className={className}>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {renderLine(line, block)}
        </React.Fragment>
      ))}
    </span>
  );
}

function renderLine(line: string, block: boolean): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match $$...$$ (display) or $...$ (inline)
  const regex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
    }

    if (match[1] !== undefined) {
      // $$...$$ block math
      parts.push(<BlockMath key={key++} math={match[1]} />);
    } else if (match[2] !== undefined) {
      // $...$ inline math
      parts.push(<InlineMath key={key++} math={match[2]} />);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < line.length) {
    parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);
  }

  return parts;
}
