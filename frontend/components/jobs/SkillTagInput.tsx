'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const COMMON_SKILLS = [
  'Python',
  'Java',
  'React',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'AWS',
  'Data Structures',
];

interface SkillTagInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillTagInput({ skills, onChange }: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const addSkill = (raw: string) => {
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (!clean) return;

    const exists = skills.some((s) => s.toLowerCase() === clean.toLowerCase());
    if (exists) {
      setDupWarning(`"${clean}" is already added.`);
      return;
    }

    setDupWarning(null);
    onChange([...skills, clean]);
    setInputValue('');
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (dupWarning) setDupWarning(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkill(inputValue);
            }
          }}
          placeholder="Type a skill (e.g., Python, PostgreSQL, React) and press Enter"
          aria-label="Add required skill"
        />
        <Button type="button" variant="outline" onClick={() => addSkill(inputValue)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {dupWarning && <p className="text-xs text-amber-600">{dupWarning}</p>}

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="rounded-full p-0.5 text-blue-500 hover:bg-blue-200/60 hover:text-blue-900"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No required skills added yet.</p>
      )}

      <div className="pt-1">
        <p className="mb-1.5 text-xs font-medium text-slate-500">Quick add common skills:</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_SKILLS.filter(
            (preset) => !skills.some((s) => s.toLowerCase() === preset.toLowerCase()),
          ).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addSkill(preset)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            >
              + {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

