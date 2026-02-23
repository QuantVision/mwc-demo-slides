import React, { useEffect, useRef, useState } from 'react';
import type { TopologyToken } from '../types';
import { MSG_TYPE_COLOR, PATH_MAP } from '../topology/paths';
import { cubicEaseInOut, pointAlongPath, tokenRadius } from '../utils/animateToken';

interface TokenPos {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
  done: boolean;
}

interface TokenLayerProps {
  tokens: TopologyToken[];
  onTokenArrived: (token: TopologyToken) => void;
  onTokenExpired: (tokenId: string) => void;
}

const TokenLayer: React.FC<TokenLayerProps> = ({ tokens, onTokenArrived, onTokenExpired }) => {
  const [positions, setPositions] = useState<TokenPos[]>([]);
  const rafRef = useRef<number>(0);
  const arrivedRef = useRef<Set<string>>(new Set());
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const expired: string[] = [];

      setPositions(
        tokens
          .map((tok): TokenPos => {
            const elapsed = now - tok.startTime;
            const rawT = Math.min(elapsed / tok.duration, 1);
            const eased = cubicEaseInOut(rawT);
            const pos = pointAlongPath(tok.path_id, eased, pathRefs.current);
            const radius = tokenRadius(tok.msg_type);
            const color = MSG_TYPE_COLOR[tok.msg_type] ?? '#00CCD9';

            const trail = [0.05, 0.1, 0.16, 0.22].map((offset, i) => {
              const trailRaw = Math.max(0, rawT - offset);
              const trailPos = pointAlongPath(tok.path_id, cubicEaseInOut(trailRaw), pathRefs.current);
              return { ...trailPos, opacity: 0.24 - i * 0.05 };
            });

            const done = rawT >= 1;
            if (done && !arrivedRef.current.has(tok.id)) {
              arrivedRef.current.add(tok.id);
              onTokenArrived(tok);
              expired.push(tok.id);
            }

            return { id: tok.id, x: pos.x, y: pos.y, color, radius, trail, done };
          })
          .filter((p) => p.x !== 0 || p.y !== 0)
      );

      expired.forEach((id) => {
        setTimeout(() => {
          onTokenExpired(id);
          arrivedRef.current.delete(id);
        }, 80);
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tokens, onTokenArrived, onTokenExpired]);

  const activePathIds = Array.from(new Set(tokens.map((t) => t.path_id)));

  return (
    <g>
      <g visibility="hidden" aria-hidden="true">
        {activePathIds.map((pathId) => {
          const path = PATH_MAP[pathId];
          if (!path) return null;
          return (
            <path
              key={pathId}
              d={path.d}
              ref={(el) => {
                if (el) pathRefs.current.set(pathId, el);
              }}
            />
          );
        })}
      </g>

      {positions.map((pos) => {
        if (pos.done) return null;
        return (
          <g key={pos.id}>
            {pos.trail.map((trailPoint, i) => (
              <circle
                key={`${pos.id}-trail-${i}`}
                cx={trailPoint.x}
                cy={trailPoint.y}
                r={Math.max(1.2, pos.radius - i * 1.2)}
                fill={pos.color}
                opacity={trailPoint.opacity}
              />
            ))}
            <circle cx={pos.x} cy={pos.y} r={pos.radius + 1.2} fill="#0B1A2B" opacity={0.9} />
            <circle cx={pos.x} cy={pos.y} r={pos.radius + 1.2} fill="none" stroke={pos.color} strokeWidth={2} />
            <circle cx={pos.x} cy={pos.y} r={Math.max(2.5, pos.radius - 2.2)} fill={pos.color} />
          </g>
        );
      })}
    </g>
  );
};

export default TokenLayer;
