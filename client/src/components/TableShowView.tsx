import React from 'react';
import { TableShow, visibleValue } from 'shared';
import CardView from './CardView';

interface Props {
  show: TableShow | null;
  /** If true, show left/right scout buttons */
  canScout: boolean;
  onScoutLeft?: () => void;
  onScoutRight?: () => void;
  /** highlight the end that would be scouted */
  pendingScoutEnd?: 'left' | 'right' | null;
}

export default function TableShowView({ show, canScout, onScoutLeft, onScoutRight, pendingScoutEnd }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-green-400 text-xs uppercase tracking-widest">Current Show</p>
      <div className="min-h-24 bg-green-900/40 border border-green-600/30 rounded-2xl px-6 py-3 flex items-center gap-3">
        {!show ? (
          <span className="text-green-600 text-sm italic">No cards on table</span>
        ) : (
          <>
            {canScout && onScoutLeft && (
              <button
                onClick={onScoutLeft}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm font-bold
                  ${pendingScoutEnd === 'left'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-blue-900/60 hover:bg-blue-700 text-blue-300'}`}
                title="Scout leftmost card"
              >
                ←
              </button>
            )}

            <div className="flex gap-1 items-end">
              {show.cards.map((card, i) => {
                const isLeft = i === 0;
                const isRight = i === show.cards.length - 1;
                const isScoutTarget =
                  (pendingScoutEnd === 'left' && isLeft) ||
                  (pendingScoutEnd === 'right' && isRight);
                return (
                  <CardView
                    key={`${card.id}-${i}`}
                    card={card}
                    showBothValues
                    isScoutTarget={isScoutTarget}
                  />
                );
              })}
            </div>

            {canScout && onScoutRight && (
              <button
                onClick={onScoutRight}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm font-bold
                  ${pendingScoutEnd === 'right'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-blue-900/60 hover:bg-blue-700 text-blue-300'}`}
                title="Scout rightmost card"
              >
                →
              </button>
            )}
          </>
        )}
      </div>
      {show && (
        <p className="text-green-400/60 text-xs">
          {show.cards.length} card{show.cards.length > 1 ? 's' : ''} ·
          values: {show.cards.map((c) => visibleValue(c)).join(', ')}
        </p>
      )}
    </div>
  );
}
