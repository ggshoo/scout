import React, { useRef, useEffect } from 'react';
import { EventLogEntry } from 'shared';

interface Props {
  log: EventLogEntry[];
}

export default function MoveHistory({ log }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="bg-green-900/50 border border-green-700/40 rounded-xl p-3 text-xs">
      <p className="text-green-400 text-xs uppercase tracking-wider mb-2">Move History</p>
      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
        {log.length === 0 && <p className="text-green-600 italic">No moves yet.</p>}
        {log.map((entry) => (
          <p key={entry.seq} className="text-green-300/80">
            <span className="text-green-500 mr-1">#{entry.seq + 1}</span>
            {entry.description}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
