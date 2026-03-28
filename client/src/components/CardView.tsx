import React from 'react';
import { HandCard, visibleValue } from 'shared';

interface Props {
  card: HandCard;
  index?: number;
  selected?: boolean;
  isScoutTarget?: boolean;
  onClick?: () => void;
  /** If true, show both values (top=hi, bottom=lo or top=lo, bottom=hi) */
  showBothValues?: boolean;
  /** Hide the card face (opponent's hand) */
  faceDown?: boolean;
  small?: boolean;
}

const VALUE_COLORS: Record<number, string> = {
  1: 'text-red-600',
  2: 'text-orange-500',
  3: 'text-yellow-600',
  4: 'text-green-600',
  5: 'text-teal-600',
  6: 'text-blue-600',
  7: 'text-indigo-600',
  8: 'text-purple-600',
  9: 'text-pink-600',
  10: 'text-rose-600',
};

export default function CardView({
  card,
  selected = false,
  isScoutTarget = false,
  onClick,
  showBothValues = false,
  faceDown = false,
  small = false,
}: Props) {
  const visible = visibleValue(card);
  const other = card.face === 'lo' ? card.hi : card.lo;
  const colorClass = VALUE_COLORS[visible] ?? 'text-gray-600';
  const otherColorClass = VALUE_COLORS[other] ?? 'text-gray-400';

  const width = small ? 'w-10' : 'w-14';
  const height = small ? 'h-14' : 'h-20';
  const fontSize = small ? 'text-lg' : 'text-2xl';
  const smallFontSize = small ? 'text-[9px]' : 'text-[11px]';

  if (faceDown) {
    return (
      <div
        className={`${width} ${height} rounded-lg border-2 border-blue-900 bg-gradient-to-br from-blue-900 to-blue-800 shadow-md flex items-center justify-center`}
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)' }}
      >
        <span className="text-blue-600 text-xl">🃏</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={[
        'card-base',
        width,
        height,
        'card-normal',
        selected ? 'card-selected' : '',
        isScoutTarget ? 'card-scout-target' : '',
        onClick ? 'cursor-pointer hover:shadow-md' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top-left: visible value */}
      <span className={`absolute top-1 left-1.5 ${fontSize} font-black leading-none ${colorClass}`}>
        {visible}
      </span>

      {/* Bottom-right: other value (upside down) */}
      {showBothValues && (
        <span
          className={`absolute bottom-1 right-1.5 ${smallFontSize} font-semibold leading-none ${otherColorClass} rotate-180`}
        >
          {other}
        </span>
      )}

      {/* Center pip */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${small ? 'text-base' : 'text-xl'} font-black ${colorClass} opacity-20`}>
          {visible}
        </span>
      </div>

      {/* Card id (small, bottom center) – helps identify during play */}
      <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-gray-400 font-mono">
        {card.lo}/{card.hi}
      </span>
    </div>
  );
}
