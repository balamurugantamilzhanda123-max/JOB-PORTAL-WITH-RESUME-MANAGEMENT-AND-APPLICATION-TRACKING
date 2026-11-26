import {
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  Prisma,
  WorkMode,
} from '@prisma/client';
import { prisma } from '../prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { sanitizeRichText, stripHtmlToPlainText } from '../utils/sanitize';
import {
  CandidateJobSearchQuery,
  JobPayloadInput,
  RecruiterJobsQuery,
} from '../validators/job.validator';
import { jobEventBus } from './jobEvents.service';

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: [JobStatus.PUBLISHED, JobStatus.CLOSED],
  PUBLISHED: [JobStatus.PAUSED, JobStatus.CLOSED],
  PAUSED: [JobStatus.PUBLISHED, JobStatus.CLOSED],
  CLOSED: [],
};

const jobIncludeForRecruiter = {
  screeningQuestions: {
    orderBy: { orderIndex: 'asc' as const },
  },
  auditLogs: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: {
      actor: {
        select: { id: true, fullName: true, email: true },
      },
    },
  },
};

const jobIncludeForCandidate = {
  screeningQuestions: {
    orderBy: { orderIndex: 'asc' as const },
  },
};

export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of skills) {
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(clean);
    }
  }
  return normalized;
}

function resolveLocation(input: {
  location?: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  workMode: WorkMode;
}): string {
  const explicit = input.location?.trim();
  if (explicit) return explicit;
  const parts = [input.city?.trim(), input.state?.trim(), input.country?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return input.workMode === WorkMode.REMOTE ? 'Remote' : 'Unspecified';
}

function assertPublishable(job: {
  title: string;
  company: string;
  department: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requiredSkills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryUndisclosed: boolean;
}) {
  if (!job.title?.trim() || !job.company?.trim() || !job.department?.trim()) {
    throw new BadRequestError('Job title, company name, and department are required to publish.');
  }
  if (stripHtmlToPlainText(job.description).length < 30) {
    throw new BadRequestError(
      'Detailed job description must contain at least 30 characters before publishing.',
    );
  }
  if (!job.requiredSkills || job.requiredSkills.length === 0) {
    throw new BadRequestError('At least one required skill is needed before publishing.');
  }
  if (job.workMode !== WorkMode.REMOTE && (!job.location || job.location === 'Unspecified')) {
    throw new BadRequestError('A valid location is required for Hybrid and Onsite job postings.');
  }
  if (
    !job.salaryUndisclosed &&
    job.salaryMin != null &&
    job.salaryMax != null &&
    job.salaryMin > job.salaryMax
  ) {
    throw new BadRequestError('Minimum salary cannot exceed maximum salary.');
  }
}

function buildSanitizedJobFields(input: JobPayloadInput) {
  const location = resolveLocation({
    location: input.location,
    city: input.city,
    state: input.state,
    country: input.country,
    workMode: input.workMode,
  });

  const normalizedSkills = normalizeSkills(input.requiredSkills);
  const salaryUndisclosed = Boolean(input.salaryUndisclosed);
  const salaryMin = salaryUndisclosed ? null : (input.salaryMin ?? null);
  const salaryMax = salaryUndisclosed ? null : (input.salaryMax ?? null);
  const salaryCurrency = (input.salaryCurrency || 'INR').toUpperCase();

  return {
    title: input.title.trim(),
    company: input.company.trim(),
    department: input.department.trim(),
    location,
    country: input.country?.trim() || null,
    state: input.state?.trim() || null,
    city: input.city?.trim() || null,
    workMode: input.workMode,
    employmentType: input.employmentType,
    experienceLevel: input.experienceLevel,
    summary: input.summary?.trim() || null,
    description: sanitizeRichText(input.description),
    responsibilities: input.responsibilities ? sanitizeRichText(input.responsibilities) : null,
    requiredQualifications: input.requiredQualifications
      ? sanitizeRichText(input.requiredQualifications)
      : null,
    preferredQualifications: input.preferredQualifications
      ? sanitizeRichText(input.preferredQualifications)
      : null,
    benefits: input.benefits ? sanitizeRichText(input.benefits) : null,
    requiredSkills: normalizedSkills,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryUndisclosed,
    salaryRange: salaryUndisclosed
      ? { undisclosed: true, currency: salaryCurrency }
      : {
          min: salaryMin,
          max: salaryMax,
          currency: salaryCurrency,
          undisclosed: false,
        },
  };
}

function emitPublicEvent(
  type: 'job.published' | 'job.updated' | 'job.paused' | 'job.closed',
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    status: JobStatus;
    publishedAt: Date | null;
  },
) {
  jobEventBus.emitJobEvent({
    type,
    jobId: job.id,
    timestamp: new Date().toISOString(),
    job:
      type === 'job.published' || type === 'job.updated'
        ? {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            workMode: job.workMode,
            employmentType: job.employmentType,
            status: job.status,
            publishedAt: job.publishedAt ? job.publishedAt.toISOString() : null,
          }
        : undefined,
  });
}

export async function getRecruiterJobStats(recruiterId: string) {
  const [totalJobs, publishedJobs, draftJobs, pausedJobs, closedJobs] = await Promise.all([
    prisma.job.count({ where: { recruiterId } }),
    prisma.job.count({ where: { recruiterId, status: JobStatus.PUBLISHED } }),
    prisma.job.count({ where: { recruiterId, status: JobStatus.DRAFT } }),
    prisma.job.count({ where: { recruiterId, status: JobStatus.PAUSED } }),
    prisma.job.count({ where: { recruiterId, status: JobStatus.CLOSED } }),
  ]);

  return {
    totalJobs,
    publishedJobs,
    draftJobs,
    pausedJobs,
    closedJobs,
  };
}

export async function listRecruiterJobs(recruiterId: string, query: RecruiterJobsQuery) {
  const where: Prisma.JobWhereInput = {
    recruiterId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.workMode) {
    where.workMode = query.workMode;
  }

  if (query.location) {
    where.location = { contains: query.location, mode: 'insensitive' };
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { company: { contains: query.q, mode: 'insensitive' } },
      { department: { contains: query.q, mode: 'insensitive' } },
      { location: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [total, items, stats] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: {
        _count: {
          select: { screeningQuestions: true },
        },
      },
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip,
      take: query.limit,
    }),
    getRecruiterJobStats(recruiterId),
  ]);

  return {
    items,
    stats,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getRecruiterJobById(recruiterId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: jobIncludeForRecruiter,
  });

  if (!job) {
    throw new NotFoundError('Job posting not found');
  }

  if (job.recruiterId !== recruiterId) {
    throw new ForbiddenError('You do not have permission to access this job posting');
  }

  return job;
}

export async function createRecruiterJob(recruiterId: string, input: JobPayloadInput) {
  const fields = buildSanitizedJobFields(input);
  const targetStatus = input.status === JobStatus.PUBLISHED ? JobStatus.PUBLISHED : JobStatus.DRAFT;

  if (targetStatus === JobStatus.PUBLISHED) {
    assertPublishable(fields);
  }

  const created = await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        recruiterId,
        ...fields,
        status: targetStatus,
        publishedAt: targetStatus === JobStatus.PUBLISHED ? new Date() : null,
        screeningQuestions: {
          create: input.screeningQuestions.map((q, idx) => ({
            title: q.title,
            questionType: q.questionType,
            isRequired: q.isRequired,
            options: q.options,
            orderIndex: q.orderIndex ?? idx,
          })),
        },
        auditLogs: {
          create: {
            actorId: recruiterId,
            previousStatus: null,
            newStatus: targetStatus,
            reason:
              targetStatus === JobStatus.PUBLISHED
                ? 'Job created and published'
                : 'Job saved as draft',
          },
        },
      },
      include: jobIncludeForRecruiter,
    });

    return job;
  });

  if (created.status === JobStatus.PUBLISHED) {
    emitPublicEvent('job.published', created);
  }

  return created;
}

export async function updateRecruiterJob(
  recruiterId: string,
  jobId: string,
  input: JobPayloadInput,
) {
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!existing) {
    throw new NotFoundError('Job posting not found');
  }
  if (existing.recruiterId !== recruiterId) {
    throw new ForbiddenError('You do not have permission to modify this job posting');
  }

  const fields = buildSanitizedJobFields(input);

  // Determine resulting status: if currently CLOSED, keep CLOSED; if input requests PUBLISHED, validate transition & completeness
  let nextStatus = existing.status;
  if (existing.status !== JobStatus.CLOSED && input.status) {
    if (existing.status === JobStatus.DRAFT && input.status === JobStatus.PUBLISHED) {
      nextStatus = JobStatus.PUBLISHED;
    } else if (existing.status === JobStatus.PAUSED && input.status === JobStatus.PUBLISHED) {
      nextStatus = JobStatus.PUBLISHED;
    } else if (existing.status === JobStatus.PUBLISHED && input.status === JobStatus.DRAFT) {
      // Allow moving back to draft only via explicit status or keep published if saving edits
      nextStatus = JobStatus.PUBLISHED;
    }
  }

  if (nextStatus === JobStatus.PUBLISHED) {
    assertPublishable(fields);
  }

  const publishedAt =
    nextStatus === JobStatus.PUBLISHED ? (existing.publishedAt ?? new Date()) : existing.publishedAt;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.jobScreeningQuestion.deleteMany({
      where: { jobId },
    });

    const job = await tx.job.update({
      where: { id: jobId },
      data: {
        ...fields,
        status: nextStatus,
        publishedAt,
        screeningQuestions: {
          create: input.screeningQuestions.map((q, idx) => ({
            title: q.title,
            questionType: q.questionType,
            isRequired: q.isRequired,
            options: q.options,
            orderIndex: q.orderIndex ?? idx,
          })),
        },
      },
      include: jobIncludeForRecruiter,
    });

    if (existing.status !== nextStatus) {
      await tx.jobAuditLog.create({
        data: {
          jobId: job.id,
          actorId: recruiterId,
          previousStatus: existing.status,
          newStatus: nextStatus,
          reason: 'Updated and published job posting',
        },
      });
      return tx.job.findUniqueOrThrow({
        where: { id: job.id },
        include: jobIncludeForRecruiter,
      });
    }

    return job;
  });

  if (existing.status !== JobStatus.PUBLISHED && updated.status === JobStatus.PUBLISHED) {
    emitPublicEvent('job.published', updated);
  } else if (updated.status === JobStatus.PUBLISHED) {
    emitPublicEvent('job.updated', updated);
  }

  return updated;
}

export async function transitionRecruiterJobStatus(
  recruiterId: string,
  jobId: string,
  targetStatus: JobStatus,
  reason?: string,
) {
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!existing) {
    throw new NotFoundError('Job posting not found');
  }

  if (existing.recruiterId !== recruiterId) {
    throw new ForbiddenError('You do not have permission to change the status of this job');
  }

  if (existing.status === targetStatus) {
    throw new BadRequestError(`Job is already in ${targetStatus} state.`);
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(targetStatus)) {
    throw new BadRequestError(
      `Invalid status transition from ${existing.status} to ${targetStatus}.`,
      undefined,
      'INVALID_STATUS_TRANSITION',
    );
  }

  if (targetStatus === JobStatus.PUBLISHED) {
    assertPublishable(existing);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.jobAuditLog.create({
      data: {
        jobId,
        actorId: recruiterId,
        previousStatus: existing.status,
        newStatus: targetStatus,
        reason: reason || `Status transitioned from ${existing.status} to ${targetStatus}`,
      },
    });

    return tx.job.update({
      where: { id: jobId },
      data: {
        status: targetStatus,
        publishedAt:
          targetStatus === JobStatus.PUBLISHED
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
      },
      include: jobIncludeForRecruiter,
    });
  });

  if (targetStatus === JobStatus.PUBLISHED) {
    emitPublicEvent('job.published', updated);
  } else if (targetStatus === JobStatus.PAUSED) {
    emitPublicEvent('job.paused', updated);
  } else if (targetStatus === JobStatus.CLOSED) {
    emitPublicEvent('job.closed', updated);
  }

  return updated;
}

function parseEnumList<T extends string>(raw: string | undefined, validValues: readonly T[]): T[] {
  if (!raw) return [];
  const validSet = new Set<string>(validValues);
  return raw
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is T => validSet.has(v));
}

function computeRelevanceScore(
  job: {
    title: string;
    company: string;
    department: string;
    location: string;
    summary: string | null;
    description: string;
    requiredSkills: string[];
  },
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;

  const title = job.title.toLowerCase();
  const company = job.company.toLowerCase();
  const department = job.department.toLowerCase();
  const location = job.location.toLowerCase();
  const summary = (job.summary || '').toLowerCase();
  const desc = stripHtmlToPlainText(job.description).toLowerCase();
  const skillsLower = job.requiredSkills.map((s) => s.toLowerCase());

  if (title === q) score += 120;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 60;

  if (company.includes(q)) score += 35;
  if (department.includes(q)) score += 25;
  if (location.includes(q)) score += 25;
  if (skillsLower.some((s) => s === q)) score += 50;
  else if (skillsLower.some((s) => s.includes(q))) score += 30;
  if (summary.includes(q)) score += 20;
  if (desc.includes(q)) score += 10;

  for (const token of tokens) {
    if (title.includes(token)) score += 20;
    if (skillsLower.some((s) => s.includes(token))) score += 15;
    if (company.includes(token)) score += 10;
    if (location.includes(token)) score += 8;
    if (department.includes(token)) score += 8;
    if (desc.includes(token)) score += 4;
  }

  return score;
}

export async function searchCandidateJobs(candidateId: string, query: CandidateJobSearchQuery) {
  const workModes = parseEnumList(query.workMode, Object.values(WorkMode));
  const employmentTypes = parseEnumList(query.employmentType, Object.values(EmploymentType));
  const experienceLevels = parseEnumList(query.experienceLevel, Object.values(ExperienceLevel));

  const andConditions: Prisma.JobWhereInput[] = [{ status: JobStatus.PUBLISHED }];

  if (workModes.length > 0) {
    andConditions.push({ workMode: { in: workModes } });
  }

  if (employmentTypes.length > 0) {
    andConditions.push({ employmentType: { in: employmentTypes } });
  }

  if (experienceLevels.length > 0) {
    andConditions.push({ experienceLevel: { in: experienceLevels } });
  }

  if (query.department) {
    andConditions.push({
      department: { equals: query.department, mode: 'insensitive' },
    });
  }

  if (query.location) {
    const loc = query.location.trim();
    if (loc.toLowerCase() === 'remote') {
      andConditions.push({
        OR: [
          { workMode: WorkMode.REMOTE },
          { location: { contains: 'remote', mode: 'insensitive' } },
        ],
      });
    } else {
      andConditions.push({
        OR: [
          { location: { contains: loc, mode: 'insensitive' } },
          { city: { contains: loc, mode: 'insensitive' } },
          { state: { contains: loc, mode: 'insensitive' } },
          { country: { contains: loc, mode: 'insensitive' } },
        ],
      });
    }
  }

  // Salary filtering: NEVER treat undisclosed salary as 0.
  if (query.salaryMin != null || query.salaryMax != null) {
    andConditions.push({
      salaryUndisclosed: false,
      OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
    });

    if (query.salaryMin != null) {
      andConditions.push({
        OR: [
          { salaryMax: { gte: query.salaryMin } },
          { AND: [{ salaryMax: null }, { salaryMin: { gte: query.salaryMin } }] },
        ],
      });
    }

    if (query.salaryMax != null) {
      andConditions.push({
        OR: [
          { salaryMin: { lte: query.salaryMax } },
          { AND: [{ salaryMin: null }, { salaryMax: { lte: query.salaryMax } }] },
        ],
      });
    }
  }

  const candidateJobs = await prisma.job.findMany({
    where: { AND: andConditions },
    include: {
      ...jobIncludeForCandidate,
      bookmarks: {
        where: { candidateId },
        select: { id: true },
      },
    },
  });

  // Apply case-insensitive keyword & multi-skill ANY/ALL filtering + relevance ranking
  const selectedSkills = query.skills
    ? query.skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const qTerms = query.q
    ? query.q
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
    : [];

  const filtered = candidateJobs.filter((job) => {
    const jobSkillsLower = job.requiredSkills.map((s) => s.toLowerCase());

    if (selectedSkills.length > 0) {
      if (query.skillsMatch === 'ALL') {
        const allMatch = selectedSkills.every((reqSkill) =>
          jobSkillsLower.some((js) => js === reqSkill || js.includes(reqSkill)),
        );
        if (!allMatch) return false;
      } else {
        const anyMatch = selectedSkills.some((reqSkill) =>
          jobSkillsLower.some((js) => js === reqSkill || js.includes(reqSkill)),
        );
        if (!anyMatch) return false;
      }
    }

    if (qTerms.length > 0) {
      const searchableBlob = [
        job.title,
        job.company,
        job.department,
        job.location,
        job.summary || '',
        stripHtmlToPlainText(job.description),
        job.requiredSkills.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      // Every query token must appear somewhere in the job fields
      const matchesAllTokens = qTerms.every((term) => searchableBlob.includes(term));
      if (!matchesAllTokens) return false;
    }

    return true;
  });

  // Sort results cleanly
  const scored = filtered.map((job) => ({
    job,
    relevance: query.q ? computeRelevanceScore(job, query.q) : 0,
  }));

  scored.sort((a, b) => {
    switch (query.sort) {
      case 'oldest': {
        const aTime = (a.job.publishedAt ?? a.job.createdAt).getTime();
        const bTime = (b.job.publishedAt ?? b.job.createdAt).getTime();
        return aTime - bTime;
      }
      case 'salary_asc': {
        const aUndisclosed =
          a.job.salaryUndisclosed || (a.job.salaryMin == null && a.job.salaryMax == null);
        const bUndisclosed =
          b.job.salaryUndisclosed || (b.job.salaryMin == null && b.job.salaryMax == null);
        if (aUndisclosed && bUndisclosed) return 0;
        if (aUndisclosed) return 1; // Undisclosed always last
        if (bUndisclosed) return -1;
        const aVal = a.job.salaryMin ?? a.job.salaryMax ?? 0;
        const bVal = b.job.salaryMin ?? b.job.salaryMax ?? 0;
        return aVal - bVal;
      }
      case 'salary_desc': {
        const aUndisclosed =
          a.job.salaryUndisclosed || (a.job.salaryMin == null && a.job.salaryMax == null);
        const bUndisclosed =
          b.job.salaryUndisclosed || (b.job.salaryMin == null && b.job.salaryMax == null);
        if (aUndisclosed && bUndisclosed) return 0;
        if (aUndisclosed) return 1; // Undisclosed always last
        if (bUndisclosed) return -1;
        const aVal = a.job.salaryMax ?? a.job.salaryMin ?? 0;
        const bVal = b.job.salaryMax ?? b.job.salaryMin ?? 0;
        return bVal - aVal;
      }
      case 'relevant': {
        if (query.q && b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        const aTime = (a.job.publishedAt ?? a.job.createdAt).getTime();
        const bTime = (b.job.publishedAt ?? b.job.createdAt).getTime();
        return bTime - aTime;
      }
      case 'newest':
      default: {
        const aTime = (a.job.publishedAt ?? a.job.createdAt).getTime();
        const bTime = (b.job.publishedAt ?? b.job.createdAt).getTime();
        return bTime - aTime;
      }
    }
  });

  const total = scored.length;
  const skip = (query.page - 1) * query.limit;
  const paged = scored.slice(skip, skip + query.limit).map(({ job }) => {
    const { bookmarks, ...rest } = job;
    return {
      ...rest,
      isBookmarked: bookmarks.length > 0,
    };
  });

  // Collect real facets from all currently published jobs
  const allPublishedForFacets = await prisma.job.findMany({
    where: { status: JobStatus.PUBLISHED },
    select: {
      location: true,
      department: true,
      requiredSkills: true,
    },
  });

  const locationSet = new Set<string>();
  const departmentSet = new Set<string>();
  const skillSet = new Set<string>();

  for (const row of allPublishedForFacets) {
    if (row.location) locationSet.add(row.location);
    if (row.department) departmentSet.add(row.department);
    for (const s of row.requiredSkills) skillSet.add(s);
  }

  return {
    items: paged,
    facets: {
      locations: Array.from(locationSet).sort(),
      departments: Array.from(departmentSet).sort(),
      skills: Array.from(skillSet).sort(),
    },
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getPublishedJobForCandidate(candidateId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      ...jobIncludeForCandidate,
      bookmarks: {
        where: { candidateId },
        select: { id: true },
      },
    },
  });

  if (!job || job.status !== JobStatus.PUBLISHED) {
    throw new NotFoundError('Published job posting not found');
  }

  const { bookmarks, ...rest } = job;
  return {
    ...rest,
    isBookmarked: bookmarks.length > 0,
  };
}

export async function listCandidateBookmarks(candidateId: string) {
  const bookmarks = await prisma.jobBookmark.findMany({
    where: { candidateId },
    include: {
      job: {
        include: jobIncludeForCandidate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookmarks.map((b) => ({
    bookmarkId: b.id,
    savedAt: b.createdAt,
    isUnavailable: b.job.status !== JobStatus.PUBLISHED,
    job: {
      ...b.job,
      isBookmarked: true,
    },
  }));
}

export async function createBookmark(candidateId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });

  if (!job) {
    throw new NotFoundError('Job posting not found');
  }

  if (job.status !== JobStatus.PUBLISHED) {
    throw new BadRequestError('Only published job postings can be bookmarked');
  }

  const existing = await prisma.jobBookmark.findUnique({
    where: {
      candidateId_jobId: { candidateId, jobId },
    },
  });

  if (existing) {
    throw new ConflictError('Job is already bookmarked', 'ALREADY_BOOKMARKED');
  }

  return prisma.jobBookmark.create({
    data: { candidateId, jobId },
  });
}

export async function deleteBookmark(candidateId: string, jobId: string) {
  const existing = await prisma.jobBookmark.findUnique({
    where: {
      candidateId_jobId: { candidateId, jobId },
    },
  });

  if (!existing) {
    throw new NotFoundError('Bookmark not found');
  }

  await prisma.jobBookmark.delete({
    where: { id: existing.id },
  });
}

