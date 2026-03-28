import React from 'react';
import { HandCard } from 'shared';
import CardView from './CardView';

interface Props {
  hand: HandCard[];
  selectedIndices: number[];
  onToggleCard: (index: number) => void;
  isMyTurn: boolean;
  phase: string;
  /** Whether we're in scout-insertion mode */
  insertMode?: boolean;
  /** If in insert mode, which slot is hovered */
  insertPos?: number | null;
  onInsertHover?: (pos: number | null) => void;
  onInsertConfirm?: (pos: number) => void;
}

export default function Hand({
  hand,
  selectedIndices,
  onToggleCard,
  isMyTurn,
  phase,
  insertMode = false,
  insertPos = null,
  onInsertHover,
  onInsertConfirm,
}: Props) {
  if (phase === 'lobby' || phase === 'game_end') return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-green-300 text-xs">Your Hand ({hand.length} cards)</p>
      <div className="flex flex-wrap justify-center gap-1 items-end">
        {insertMode && (
          <InsertSlot
            pos={0}
            active={insertPos === 0}
            onHover={onInsertHover}
            onConfirm={onInsertConfirm}
          />
        )}
        {hand.map((card, i) => (
          <React.Fragment key={card.id}>
            <CardView
              card={card}
              index={i}
              selected={selectedIndices.includes(i)}
              showBothValues
              onClick={isMyTurn && !insertMode ? () => onToggleCard(i) : undefined}
            />
            {insertMode && (
              <InsertSlot
                pos={i + 1}
                active={insertPos === i + 1}
                onHover={onInsertHover}
                onConfirm={onInsertConfirm}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {isMyTurn && !insertMode && hand.length > 0 && (
        <p className="text-yellow-400/60 text-xs">
          {selectedIndices.length > 0
            ? `${selectedIndices.length} card${selectedIndices.length > 1 ? 's' : ''} selected`
            : 'Click cards to select a consecutive set'}
        </p>
      )}

      {insertMode && (
        <p className="text-blue-300 text-sm animate-pulse">
          Click a slot (▼) to insert the scouted card
        </p>
      )}
    </div>
  );
}

function InsertSlot({
  pos,
  active,
  onHover,
  onConfirm,
}: {
  pos: number;
  active: boolean;
  onHover?: (pos: number | null) => void;
  onConfirm?: (pos: number) => void;
}) {
  return (
    <div
      className={`w-3 flex items-center justify-center cursor-pointer transition-all duration-100 self-stretch ${
        active ? 'bg-blue-500/40 w-5 rounded' : 'hover:bg-blue-500/20'
      }`}
      onMouseEnter={() => onHover?.(pos)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onConfirm?.(pos)}
    >
      <span className={`text-xs ${active ? 'text-blue-300' : 'text-blue-600'}`}>▼</span>
    </div>
  );
}
