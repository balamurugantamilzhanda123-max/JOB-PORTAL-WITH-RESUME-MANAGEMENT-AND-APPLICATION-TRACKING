import { CompanyVerificationStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { NotFoundError } from '../utils/errors';
import { writeAuditLog } from './realtime.service';

export async function getRecruiterCompanyProfile(recruiterId: string) {
  return prisma.company.findUnique({
    where: { ownerId: recruiterId },
    include: {
      verifiedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function upsertRecruiterCompanyProfile(params: {
  recruiterId: string;
  legalName: string;
  displayName: string;
  website?: string;
  industry?: string;
  sizeBand?: string;
  headquarters?: string;
  description?: string;
  ipAddress?: string;
}) {
  const company = await prisma.$transaction(async (tx) => {
    const saved = await tx.company.upsert({
      where: { ownerId: params.recruiterId },
      update: {
        legalName: params.legalName,
        displayName: params.displayName,
        website: params.website || null,
        industry: params.industry || null,
        sizeBand: params.sizeBand || null,
        headquarters: params.headquarters || null,
        description: params.description || null,
      },
      create: {
        ownerId: params.recruiterId,
        legalName: params.legalName,
        displayName: params.displayName,
        website: params.website || null,
        industry: params.industry || null,
        sizeBand: params.sizeBand || null,
        headquarters: params.headquarters || null,
        description: params.description || null,
        verificationStatus: CompanyVerificationStatus.PENDING,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.recruiterId,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'Company',
      entityId: saved.id,
      metadata: { displayName: saved.displayName },
      ipAddress: params.ipAddress,
    });

    return saved;
  });

  return company;
}

export async function listCompaniesForAdmin(status?: CompanyVerificationStatus) {
  return prisma.company.findMany({
    where: status ? { verificationStatus: status } : undefined,
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      verifiedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function verifyCompanyByAdmin(params: {
  companyId: string;
  adminId: string;
  status: CompanyVerificationStatus;
  reason: string;
  ipAddress?: string;
}) {
  const existing = await prisma.company.findUnique({ where: { id: params.companyId } });
  if (!existing) throw new NotFoundError('Company profile not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { id: params.companyId },
      data: {
        verificationStatus: params.status,
        verifiedById: params.adminId,
        verifiedAt: new Date(),
        verificationReason: params.reason,
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });

    await writeAuditLog(tx, {
      actorId: params.adminId,
      action: 'COMPANY_VERIFICATION_DECISION',
      entityType: 'Company',
      entityId: updated.id,
      metadata: {
        previousStatus: existing.verificationStatus,
        newStatus: params.status,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
    });

    return updated;
  });
}

