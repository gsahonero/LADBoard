/**
 * PersonAutocompleteInput Component
 * Provides autocomplete for assigned to / person fields based on the people involved in the board:
 * - Space owner and collaborators
 * - Current user identity
 * - Invited space members
 * - Previously assigned people across cards
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useOptionalLAD } from '../context/LADContext';
import { getPeopleInBoard, BoardPerson } from '../../core/people/board-people';
import { User, Check, Shield, Crown } from 'lucide-react';

export interface PersonAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  dataTestId?: string;
  id?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export const PersonAutocompleteInput: React.FC<PersonAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'e.g. Dad, Alice...',
  className = '',
  inputClassName = '',
  disabled = false,
  dataTestId = 'person-autocomplete-input',
  id,
  autoFocus = false,
  onBlur,
}) => {
  const lad = useOptionalLAD();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const authEmail = lad?.authService?.getState?.()?.user?.email;

  // Retrieve all people involved in this board
  const boardPeople = useMemo(() => {
    return getPeopleInBoard({
      nodes: lad?.nodes,
      objects: lad?.objects,
      userRegistry: lad?.userRegistry,
      activeManifest: lad?.activeManifest,
      currentUserEmail: authEmail,
    });
  }, [lad?.nodes, lad?.objects, lad?.userRegistry, lad?.activeManifest, authEmail]);

  // Filter candidates based on current input text
  const filteredCandidates = useMemo(() => {
    const trimmed = (value || '').trim().toLowerCase();
    if (!trimmed) {
      return boardPeople.slice(0, 8);
    }
    return boardPeople.filter((p) => {
      const matchName = p.name.toLowerCase().includes(trimmed);
      const matchEmail = p.email ? p.email.toLowerCase().includes(trimmed) : false;
      return matchName || matchEmail;
    });
  }, [boardPeople, value]);

  // Close dropdown on clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPerson = (person: BoardPerson) => {
    onChange(person.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCandidates.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCandidates.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredCandidates.length) {
        e.preventDefault();
        handleSelectPerson(filteredCandidates[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Tab') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredCandidates.length) {
        handleSelectPerson(filteredCandidates[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="person-autocomplete-listbox"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        data-testid={dataTestId}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className={inputClassName || 'w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none'}
      />

      {/* Floating Suggestions Dropdown */}
      {isOpen && filteredCandidates.length > 0 && (
        <div
          id="person-autocomplete-listbox"
          role="listbox"
          data-testid="person-autocomplete-dropdown"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>People in this board</span>
            <span>{filteredCandidates.length}</span>
          </div>

          {filteredCandidates.map((person, index) => {
            const isSelected = value.trim().toLowerCase() === person.name.toLowerCase();
            const isHighlighted = highlightedIndex === index;

            return (
              <div
                key={person.id || person.name}
                role="option"
                aria-selected={isSelected}
                data-testid={`person-option-${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectPerson(person)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  isHighlighted
                    ? 'bg-lad-50 dark:bg-lad-950/50 text-lad-900 dark:text-lad-100'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Avatar circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      person.isCurrentUser
                        ? 'bg-blue-600 text-white shadow-xs'
                        : person.role === 'owner'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    {person.role === 'owner' && !person.isCurrentUser ? (
                      <Crown className="w-3 h-3" />
                    ) : (
                      getInitials(person.name)
                    )}
                  </div>

                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {person.name}
                      </span>
                      {person.isCurrentUser && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          You
                        </span>
                      )}
                      {person.role === 'owner' && !person.isCurrentUser && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          Owner
                        </span>
                      )}
                    </div>
                    {person.email && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {person.email}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-lad-600 dark:text-lad-400 shrink-0 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
