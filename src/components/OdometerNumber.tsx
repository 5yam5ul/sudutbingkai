'use client';

import React from 'react';

interface OdometerNumberProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
  digitClassName?: string;
}

/**
 * Mechanical Odometer display inspired by classic analog cameras & retro counters.
 * Digits roll vertically into position smoothly using CSS transitions.
 */
export default function OdometerNumber({
  value,
  prefix = '',
  suffix = '',
  className = '',
  digitClassName = ''
}: OdometerNumberProps) {
  const strValue = String(value);

  return (
    <span className={`inline-flex items-center font-mono font-bold tracking-tight select-none ${className}`}>
      {prefix && <span className="mr-0.5 opacity-80">{prefix}</span>}
      
      <span className="inline-flex overflow-hidden h-[1.15em] leading-[1.15em] items-center">
        {strValue.split('').map((char, index) => {
          // If non-digit (e.g. '.', ',', 'k', '∞')
          if (!/^\d$/.test(char)) {
            return (
              <span key={`char-${index}`} className="inline-block px-0.5 opacity-90">
                {char}
              </span>
            );
          }

          const digit = parseInt(char, 10);
          return (
            <span
              key={`digit-${index}-${strValue.length}`}
              className={`inline-block relative overflow-hidden h-[1.15em] w-[0.62em] text-center ${digitClassName}`}
            >
              <span
                className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: `translateY(-${digit * 10}%)`
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <span
                    key={num}
                    className="h-[1.15em] flex items-center justify-center tabular-nums"
                  >
                    {num}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>

      {suffix && <span className="ml-1 opacity-80 text-[0.8em]">{suffix}</span>}
    </span>
  );
}
