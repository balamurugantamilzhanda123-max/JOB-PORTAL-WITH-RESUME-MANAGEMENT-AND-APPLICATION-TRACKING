import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { BlobAccessError, del, get, put } from '@vercel/blob';
import { JobStatus, ParseStatus, Prisma, UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import {
  computeExplainableMatchScore,
  extractTextFromResumeBuffer,
  ParsedResumeData,
  parseResumeText,
  PARSER_VERSION,
} from './parser.service';
import { writeAuditLog } from './realtime.service';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'resumes');
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function hasBlobStorageConfigured(): boolean {
  return Boolean(
    env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

function isRemoteBlobKey(objectKey: string): boolean {
  return objectKey.startsWith('https://') || objectKey.startsWith('http://');
}

async function storeResumeBytes(params: {
  userId: string;
  relativeKey: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  if (hasBlobStorageConfigured()) {
    const pathname = `resumes/${params.relativeKey}`;
    const preferredAccess = env.BLOB_ACCESS ?? 'private';

    try {
      const uploaded = await put(pathname, params.buffer, {
        access: preferredAccess,
        contentType: params.mimeType,
        addRandomSuffix: false,
      });
      return uploaded.url;
    } catch (error) {
      if (!env.BLOB_ACCESS && error instanceof BlobAccessError) {
        const uploaded = await put(pathname, params.buffer, {
          access: 'public',
          contentType: params.mimeType,
          addRandomSuffix: false,
        });
        return uploaded.url;
      }
      throw error;
    }
  }

  if (env.IS_VERCEL) {
    throw new BadRequestError(
      'Persistent resume storage is not configured. Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) in your Vercel project settings.',
    );
  }

  const userDir = path.join(UPLOAD_ROOT, params.userId);
  await ensureDir(userDir);
  const diskPath = path.resolve(UPLOAD_ROOT, params.relativeKey);

  // Path traversal safeguard
  if (!diskPath.startsWith(UPLOAD_ROOT)) {
    throw new BadRequestError('Invalid storage path.');
  }

  await fs.writeFile(diskPath, params.buffer);
  return params.relativeKey;
}

async function readResumeBytes(objectKey: string): Promise<Buffer> {
  if (isRemoteBlobKey(objectKey)) {
    if (!hasBlobStorageConfigured()) {
      throw new BadRequestError('Vercel Blob credentials are missing in this environment.');
    }

    const preferredAccess = env.BLOB_ACCESS ?? 'private';
    let result = null;

    try {
      result = await get(objectKey, { access: preferredAccess });
    } catch (error) {
      if (!env.BLOB_ACCESS && error instanceof BlobAccessError) {
        result = await get(objectKey, { access: 'public' });
      } else {
        throw error;
      }
    }

    if (!result && !env.BLOB_ACCESS) {
      result = await get(objectKey, { access: 'public' }).catch(() => null);
    }

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new NotFoundError('Stored resume blob could not be retrieved.');
    }

    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (env.IS_VERCEL) {
    throw new NotFoundError('Local disk resume files are unavailable in serverless deployment.');
  }

  const diskPath = path.resolve(UPLOAD_ROOT, objectKey);
  if (!diskPath.startsWith(UPLOAD_ROOT)) {
    throw new BadRequestError('Invalid storage path.');
  }

  return fs.readFile(diskPath);
}

async function removeResumeBytes(objectKey: string): Promise<void> {
  if (isRemoteBlobKey(objectKey)) {
    if (hasBlobStorageConfigured()) {
      await del(objectKey).catch(() => undefined);
    }
    return;
  }

  const diskPath = path.resolve(UPLOAD_ROOT, objectKey);
  if (diskPath.startsWith(UPLOAD_ROOT)) {
    await fs.unlink(diskPath).catch(() => undefined);
  }
}

export async function uploadAndParseResume(params: {
  userId: string;
  title?: string;
  setAsDefault?: boolean;
  file: Express.Multer.File;
  ipAddress?: string;
}) {
  const { userId, file } = params;
  if (!file || !file.buffer) {
    throw new BadRequestError('Please attach a PDF or DOCX resume file.');
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new BadRequestError('Resume file cannot exceed 5 MB.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
    throw new BadRequestError('Invalid file format. Only PDF and DOCX resumes are accepted.');
  }

  // Validate file signature & extract text before persisting
  let rawText = '';
  try {
    rawText = await extractTextFromResumeBuffer(file.buffer, file.mimetype, file.originalname);
  } catch (err) {
    throw new BadRequestError(
      err instanceof Error ? err.message : 'Unable to read uploaded PDF/DOCX document.',
    );
  }

  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const relativeKey = `${userId}/${crypto.randomUUID()}${ext}`;
  const objectKey = await storeResumeBytes({
    userId,
    relativeKey,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  const { parsedJson, skillLabels } = parseResumeText(rawText);

  const resume = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.resume.count({ where: { userId } });
    const latest = await tx.resume.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latest?.version ?? 0) + 1;
    const makeDefault = params.setAsDefault === true || existingCount === 0;

    if (makeDefault) {
      await tx.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await tx.resume.create({
      data: {
        userId,
        title: (params.title?.trim() || path.basename(file.originalname, ext) || `Resume v${nextVersion}`).slice(0, 200),
        fileUrl: `/api/v1/resumes/pending/download`,
        objectKey,
        fileName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        fileSize: file.size,
        checksum,
        parsedJson: parsedJson as unknown as Prisma.InputJsonValue,
        skills: skillLabels,
        isDefault: makeDefault,
        version: nextVersion,
        parseStatus: ParseStatus.COMPLETED,
        parserVersion: PARSER_VERSION,
      },
    });

    const updated = await tx.resume.update({
      where: { id: created.id },
      data: {
        fileUrl: `/api/v1/resumes/${created.id}/download`,
      },
    });

    await tx.resumeParseJob.create({
      data: {
        resumeId: created.id,
        status: ParseStatus.COMPLETED,
        attempts: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        parserVersion: PARSER_VERSION,
      },
    });

    await writeAuditLog(tx, {
      actorId: userId,
      action: 'RESUME_UPLOADED',
      entityType: 'Resume',
      entityId: created.id,
      metadata: { version: nextVersion, fileSize: file.size, skillsCount: skillLabels.length },
      ipAddress: params.ipAddress,
    });

    return updated;
  });

  return resume;
}

export async function listCandidateResumes(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    include: {
      parseJobs: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { version: 'desc' },
  });
}

export async function getCandidateResumeById(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: {
      parseJobs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!resume) {
    throw new NotFoundError('Resume not found');
  }
  if (resume.userId !== userId) {
    throw new ForbiddenError('You do not have permission to access this resume');
  }
  return resume;
}

export async function setDefaultCandidateResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new NotFoundError('Resume not found');
  if (resume.userId !== userId) throw new ForbiddenError('Access denied');

  return prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return tx.resume.update({
      where: { id: resumeId },
      data: { isDefault: true },
    });
  });
}

export async function reparseCandidateResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new NotFoundError('Resume not found');
  if (resume.userId !== userId) throw new ForbiddenError('Access denied');
  if (!resume.objectKey) {
    throw new BadRequestError('No stored file associated with this resume record.');
  }

  const buffer = await readResumeBytes(resume.objectKey);
  const rawText = await extractTextFromResumeBuffer(
    buffer,
    resume.mimeType || 'application/pdf',
    resume.fileName || 'resume.pdf',
  );
  const { parsedJson, skillLabels } = parseResumeText(rawText);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.resume.update({
      where: { id: resumeId },
      data: {
        parsedJson: parsedJson as unknown as Prisma.InputJsonValue,
        skills: skillLabels,
        parseStatus: ParseStatus.COMPLETED,
        parseError: null,
        parserVersion: PARSER_VERSION,
      },
    });

    await tx.resumeParseJob.create({
      data: {
        resumeId,
        status: ParseStatus.COMPLETED,
        attempts: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        parserVersion: PARSER_VERSION,
      },
    });

    return updated;
  });
}

export async function deleteCandidateResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new NotFoundError('Resume not found');
  if (resume.userId !== userId) throw new ForbiddenError('Access denied');

  if (resume.objectKey) {
    await removeResumeBytes(resume.objectKey);
  }

  await prisma.$transaction(async (tx) => {
    await tx.resume.delete({ where: { id: resumeId } });

    if (resume.isDefault) {
      const nextLatest = await tx.resume.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
      });
      if (nextLatest) {
        await tx.resume.update({
          where: { id: nextLatest.id },
          data: { isDefault: true },
        });
      }
    }
  });
}

export async function getAuthorizedResumeDownload(params: {
  resumeId: string;
  requesterId: string;
  requesterRole: UserRole;
  ipAddress?: string;
}) {
  const resume = await prisma.resume.findUnique({
    where: { id: params.resumeId },
  });
  if (!resume || !resume.objectKey) {
    throw new NotFoundError('Resume file not found');
  }

  let authorized = false;
  if (params.requesterRole === UserRole.ADMIN) {
    authorized = true;
  } else if (params.requesterRole === UserRole.CANDIDATE) {
    authorized = resume.userId === params.requesterId;
  } else if (params.requesterRole === UserRole.RECRUITER) {
    const linkedApplication = await prisma.application.findFirst({
      where: {
        resumeId: resume.id,
        job: { recruiterId: params.requesterId },
      },
      select: { id: true },
    });
    authorized = Boolean(linkedApplication);
  }

  if (!authorized) {
    throw new ForbiddenError('You are not authorized to download this resume file.');
  }

  const buffer = await readResumeBytes(resume.objectKey);

  await writeAuditLog(prisma, {
    actorId: params.requesterId,
    action: 'RESUME_DOWNLOADED',
    entityType: 'Resume',
    entityId: resume.id,
    ipAddress: params.ipAddress,
  });

  return {
    buffer,
    fileName: resume.fileName || `${resume.title}.pdf`,
    mimeType: resume.mimeType || 'application/pdf',
  };
}

export async function getResumeReadinessForJob(params: {
  candidateId: string;
  jobId: string;
  resumeId?: string;
}) {
  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    select: {
      id: true,
      title: true,
      company: true,
      requiredSkills: true,
      experienceLevel: true,
      status: true,
    },
  });

  if (!job || job.status !== JobStatus.PUBLISHED) {
    throw new NotFoundError('Published job not found');
  }

  const resume = params.resumeId
    ? await prisma.resume.findUnique({ where: { id: params.resumeId } })
    : await prisma.resume.findFirst({
        where: { userId: params.candidateId },
        orderBy: [{ isDefault: 'desc' }, { version: 'desc' }],
      });

  if (!resume) {
    throw new NotFoundError('No resume found in your vault. Upload a resume first.');
  }
  if (resume.userId !== params.candidateId) {
    throw new ForbiddenError('Access denied');
  }

  const breakdown = computeExplainableMatchScore({
    resumeSkills: resume.skills,
    parsedJson: (resume.parsedJson as unknown as ParsedResumeData | null) ?? null,
    jobRequiredSkills: job.requiredSkills,
    jobExperienceLevel: job.experienceLevel,
  });

  return {
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      requiredSkills: job.requiredSkills,
    },
    resume: {
      id: resume.id,
      title: resume.title,
      version: resume.version,
      skills: resume.skills,
    },
    readiness: breakdown,
    disclaimer:
      'Advisory keyword alignment preview based on detected resume text. Final hiring review is performed by recruiters.',
  };
}

