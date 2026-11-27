'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { User } from '@/types';

export function ProfileEditorPanel({ user }: { user: User }) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user.fullName);
  const [headline, setHeadline] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [education, setEducation] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);

  useEffect(() => {
    let active = true;
    authService
      .getProfile()
      .then((res) => {
        if (!active) return;
        setFullName(res.user.fullName);
        if (res.profile) {
          setHeadline(res.profile.headline ?? '');
          setPhone(res.profile.phone ?? '');
          setLocation(res.profile.location ?? '');
          setPortfolioUrl(res.profile.portfolioUrl ?? '');
          setBio(res.profile.bio ?? '');
          setExperienceSummary(res.profile.experienceSummary ?? '');
          setEducation(res.profile.education ?? '');
          setSkillsText(res.profile.skills.join(', '));
          setProfileVisible(res.profile.profileVisible);
        }
      })
      .catch(() => {
        toast.error('Unable to load profile details');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const skills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await authService.updateProfile({
        fullName,
        headline: headline || null,
        phone: phone || null,
        location: location || null,
        portfolioUrl: portfolioUrl || null,
        bio: bio || null,
        experienceSummary: experienceSummary || null,
        education: education || null,
        skills,
        profileVisible,
      });
      await refreshUser();
      toast.success('Profile saved to PostgreSQL');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
        Loading profile...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-600" />
              Candidate Profile &amp; Contact Information
            </CardTitle>
            <CardDescription>
              Keep your headline, experience summary, education, skills, and visibility consent current
            </CardDescription>
          </div>
          <Badge variant={profileVisible ? 'emerald' : 'muted'}>
            {profileVisible ? 'Visible on applications' : 'Hidden from directory'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prof-fullname">Full Name</Label>
              <Input
                id="prof-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="prof-headline">Headline</Label>
              <Input
                id="prof-headline"
                placeholder="e.g. Full-Stack TypeScript & Node.js Engineer"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prof-phone">Phone</Label>
              <Input
                id="prof-phone"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prof-location">Location</Label>
              <Input
                id="prof-location"
                placeholder="Bengaluru / Chennai / Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="prof-portfolio">Portfolio / GitHub / LinkedIn URL</Label>
              <Input
                id="prof-portfolio"
                type="url"
                placeholder="https://github.com/your-handle"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prof-skills">Skills (comma-separated)</Label>
            <Input
              id="prof-skills"
              placeholder="TypeScript, React, Next.js, Node.js, PostgreSQL"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="prof-bio">Professional Summary</Label>
            <textarea
              id="prof-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              placeholder="Brief overview of your core strengths and target roles..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prof-exp">Experience Highlights</Label>
              <textarea
                id="prof-exp"
                rows={4}
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                placeholder="Roles, organizations, and measurable outcomes..."
              />
            </div>
            <div>
              <Label htmlFor="prof-edu">Education &amp; Certifications</Label>
              <textarea
                id="prof-edu"
                rows={4}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                placeholder="Degrees, institutions, graduation years..."
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={profileVisible}
              onChange={(e) => setProfileVisible(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Allow recruiters reviewing my submitted applications to see my profile summary
          </label>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
