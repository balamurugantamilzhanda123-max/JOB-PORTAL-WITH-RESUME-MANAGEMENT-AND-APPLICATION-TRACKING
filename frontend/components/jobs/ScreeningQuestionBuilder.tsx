'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatQuestionType } from '@/lib/utils';
import { JobScreeningQuestion, QuestionType } from '@/types';

interface ScreeningQuestionBuilderProps {
  questions: JobScreeningQuestion[];
  onChange: (questions: JobScreeningQuestion[]) => void;
}

const DEFAULT_DRAFT: JobScreeningQuestion = {
  title: '',
  questionType: 'SHORT_TEXT',
  isRequired: true,
  options: [],
};

export function ScreeningQuestionBuilder({
  questions,
  onChange,
}: ScreeningQuestionBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<JobScreeningQuestion>(DEFAULT_DRAFT);
  const [optionInput, setOptionInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsOptions =
    draft.questionType === 'SINGLE_CHOICE' || draft.questionType === 'MULTIPLE_CHOICE';

  const resetForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setDraft(DEFAULT_DRAFT);
    setOptionInput('');
    setError(null);
  };

  const handleAddOption = () => {
    const clean = optionInput.trim();
    if (!clean) return;
    if (draft.options.some((o) => o.toLowerCase() === clean.toLowerCase())) {
      setError('Duplicate answer option.');
      return;
    }
    setError(null);
    setDraft((prev) => ({ ...prev, options: [...prev.options, clean] }));
    setOptionInput('');
  };

  const handleSaveQuestion = () => {
    if (draft.title.trim().length < 3) {
      setError('Question prompt must be at least 3 characters.');
      return;
    }
    if (needsOptions && draft.options.length < 2) {
      setError('Choice questions require at least 2 answer options.');
      return;
    }

    const cleaned: JobScreeningQuestion = {
      ...draft,
      title: draft.title.trim(),
      options: needsOptions ? draft.options : [],
    };

    if (editingIndex !== null) {
      const updated = questions.map((q, i) => (i === editingIndex ? cleaned : q));
      onChange(updated.map((q, idx) => ({ ...q, orderIndex: idx })));
    } else {
      const updated = [...questions, cleaned];
      onChange(updated.map((q, idx) => ({ ...q, orderIndex: idx })));
    }
    resetForm();
  };

  const handleStartEdit = (idx: number) => {
    setEditingIndex(idx);
    setIsAdding(true);
    setDraft({ ...questions[idx] });
    setError(null);
  };

  const handleDelete = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    onChange(updated.map((q, i) => ({ ...q, orderIndex: i })));
  };

  const handleMove = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    onChange(copy.map((q, i) => ({ ...q, orderIndex: i })));
  };

  return (
    <div className="space-y-4">
      {questions.length > 0 && (
        <div className="space-y-2.5">
          {questions.map((q, idx) => (
            <div
              key={`${q.title}-${idx}`}
              className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-start"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Q{idx + 1}.</span>
                  <p className="text-sm font-medium text-slate-900">{q.title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{formatQuestionType(q.questionType)}</Badge>
                  <Badge variant={q.isRequired ? 'blue' : 'muted'}>
                    {q.isRequired ? 'Required' : 'Optional'}
                  </Badge>
                  {q.options.length > 0 && (
                    <span className="text-xs text-slate-500">
                      Options: {q.options.join(' • ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  aria-label="Move question up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === questions.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  aria-label="Move question down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStartEdit(idx)}
                  aria-label="Edit question"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(idx)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {editingIndex !== null ? 'Edit Screening Question' : 'New Screening Question'}
            </p>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
              aria-label="Cancel question edit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sq-title">Question Title</Label>
              <Input
                id="sq-title"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., How many years of production PostgreSQL experience do you have?"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sq-type">Question Type</Label>
              <select
                id="sq-type"
                value={draft.questionType}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    questionType: e.target.value as QuestionType,
                  }))
                }
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="SHORT_TEXT">Short Text</option>
                <option value="YES_NO">Yes / No</option>
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              </select>
            </div>
          </div>

          {needsOptions && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <Label>Answer Options (minimum 2)</Label>
              <div className="flex gap-2">
                <Input
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Enter an option and click Add"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  Add Option
                </Button>
              </div>
              {draft.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {draft.options.map((opt) => (
                    <span
                      key={opt}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            options: prev.options.filter((o) => o !== opt),
                          }))
                        }
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Remove option ${opt}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isRequired}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, isRequired: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>Required question</span>
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleSaveQuestion}>
                {editingIndex !== null ? 'Save Question' : 'Add Question'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
          Add Screening Question
        </Button>
      )}
    </div>
  );
}

