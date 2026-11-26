import {
  CompanyVerificationStatus,
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  QuestionType,
  UserRole,
  WorkMode,
} from '@prisma/client';
import { env } from '../config/env';
import { hashPassword } from '../utils/crypto';
import { prisma } from './client';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' && process.env.DEMO_SEED_ENABLED !== 'true') {
    console.info('ℹ️ Demo seeding is disabled in production unless DEMO_SEED_ENABLED=true.');
    return;
  }

  const demoPassword = process.env.DEMO_SEED_PASSWORD || 'DemoPass!2026#';
  const pwHash = await hashPassword(demoPassword);

  const [demoCandidate, demoRecruiter] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'candidate.demo@example.test' },
      update: {},
      create: {
        fullName: 'Aarav Demo Candidate',
        email: 'candidate.demo@example.test',
        passwordHash: pwHash,
        role: UserRole.CANDIDATE,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'recruiter.demo@example.test' },
      update: {},
      create: {
        fullName: 'Priya Demo Recruiter',
        email: 'recruiter.demo@example.test',
        passwordHash: pwHash,
        role: UserRole.RECRUITER,
        isActive: true,
      },
    }),
  ]);

  await prisma.company.upsert({
    where: { ownerId: demoRecruiter.id },
    update: {},
    create: {
      ownerId: demoRecruiter.id,
      legalName: 'Northstar Fintech Demo Pvt Ltd',
      displayName: 'Northstar Fintech Demo (DEMO)',
      website: 'https://northstar-demo.example.test',
      industry: 'Fintech / Payments',
      sizeBand: '50-200',
      headquarters: 'Chennai, Tamil Nadu',
      description:
        'DEMO COMPANY ONLY: Illustrative payments platform building APIs, reconciliation, and fraud-monitoring tools.',
      verificationStatus: CompanyVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      verificationReason: 'Synthetic demo company verification',
    },
  });

  const existingJobs = await prisma.job.count({ where: { recruiterId: demoRecruiter.id } });
  if (existingJobs === 0) {
    const demoJobs = [
      {
        company: 'Northstar Fintech Demo Pvt Ltd (DEMO)',
        title: 'Backend Software Engineer Intern — DEMO VACANCY',
        department: 'Engineering',
        location: 'Chennai, Tamil Nadu, India',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.INTERNSHIP,
        experienceLevel: ExperienceLevel.FRESHER,
        summary:
          'DEMO LISTING: Work with a mentor to build and test backend endpoints for a sample payment reconciliation product.',
        description:
          '<p><strong>DEMO VACANCY ONLY:</strong> Work with a mentor to build and test REST endpoints, write SQL queries, add unit tests, and debug test failures.</p>',
        responsibilities:
          '<ul><li>Implement REST endpoints</li><li>Write SQL queries</li><li>Add unit tests and document API behavior</li></ul>',
        requiredQualifications:
          '<ul><li>Python fundamentals, SQL basics, HTTP/REST, Git, and problem solving</li></ul>',
        preferredQualifications: '<ul><li>PostgreSQL, Docker, and basic cloud knowledge</li></ul>',
        requiredSkills: ['Python', 'SQL', 'REST APIs', 'Git'],
        salaryMin: 15000,
        salaryMax: 25000,
        salaryCurrency: 'INR',
        screeningQuestions: [
          {
            title: 'Are you available for the stated internship period?',
            questionType: QuestionType.YES_NO,
            isRequired: true,
            options: [],
          },
          {
            title: 'Describe one Python project you built',
            questionType: QuestionType.SHORT_TEXT,
            isRequired: true,
            options: [],
          },
          {
            title: 'Which database have you used?',
            questionType: QuestionType.SINGLE_CHOICE,
            isRequired: true,
            options: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB'],
          },
        ],
      },
      {
        company: 'BlueOrbit Commerce Demo Pvt Ltd (DEMO)',
        title: 'Frontend Developer — DEMO VACANCY',
        department: 'Software Development',
        location: 'Bengaluru, Karnataka, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        summary:
          'DEMO LISTING: Build responsive e-commerce storefronts and checkout workflows in React and TypeScript.',
        description:
          '<p><strong>DEMO VACANCY ONLY:</strong> Join our frontend engineering group building fast, accessible product search and checkout interfaces.</p>',
        requiredSkills: ['React', 'TypeScript', 'CSS', 'REST APIs'],
        salaryMin: 500000,
        salaryMax: 800000,
        salaryCurrency: 'INR',
        screeningQuestions: [],
      },
      {
        company: 'CedarStack Cloud Demo Pvt Ltd (DEMO)',
        title: 'Junior Cloud Engineer — DEMO VACANCY',
        department: 'Engineering',
        location: 'Hyderabad, Telangana, India',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        workMode: WorkMode.ONSITE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        summary:
          'DEMO LISTING: Manage containerized SaaS workloads on Linux and AWS.',
        description:
          '<p><strong>DEMO VACANCY ONLY:</strong> Support cloud infrastructure automation, Docker packaging, and Python operational tooling.</p>',
        requiredSkills: ['Linux', 'Docker', 'AWS', 'Python'],
        salaryMin: 450000,
        salaryMax: 700000,
        salaryCurrency: 'INR',
        screeningQuestions: [],
      },
      {
        company: 'GreenRoute Mobility Demo Pvt Ltd (DEMO)',
        title: 'Data Analyst Intern — DEMO VACANCY',
        department: 'Data Science',
        location: 'Pune, Maharashtra, India',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.INTERNSHIP,
        experienceLevel: ExperienceLevel.FRESHER,
        summary:
          'DEMO LISTING: Analyze fleet delivery metrics using SQL, Python, Excel, and Power BI.',
        description:
          '<p><strong>DEMO VACANCY ONLY:</strong> Build operational dashboards and SQL queries for logistics route optimization.</p>',
        requiredSkills: ['SQL', 'Python', 'Excel', 'Power BI'],
        salaryMin: 12000,
        salaryMax: 20000,
        salaryCurrency: 'INR',
        screeningQuestions: [],
      },
      {
        company: 'Kaveri Analytics Demo Labs (DEMO)',
        title: 'QA Automation Trainee — DEMO VACANCY',
        department: 'Engineering',
        location: 'Chennai, Tamil Nadu, India',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        workMode: WorkMode.ONSITE,
        employmentType: EmploymentType.INTERNSHIP,
        experienceLevel: ExperienceLevel.FRESHER,
        summary:
          'DEMO LISTING: Write end-to-end Playwright browser tests and API test suites.',
        description:
          '<p><strong>DEMO VACANCY ONLY:</strong> Automate UI and REST API regression checks using Python, Playwright, and Git workflows.</p>',
        requiredSkills: ['Python', 'Playwright', 'REST APIs', 'Git'],
        salaryMin: 10000,
        salaryMax: 18000,
        salaryCurrency: 'INR',
        screeningQuestions: [],
      },
    ];

    for (const item of demoJobs) {
      await prisma.job.create({
        data: {
          recruiterId: demoRecruiter.id,
          company: item.company,
          title: item.title,
          department: item.department,
          location: item.location,
          city: item.city,
          state: item.state,
          country: item.country,
          workMode: item.workMode,
          employmentType: item.employmentType,
          experienceLevel: item.experienceLevel,
          summary: item.summary,
          description: item.description,
          responsibilities: item.responsibilities || null,
          requiredQualifications: item.requiredQualifications || null,
          preferredQualifications: item.preferredQualifications || null,
          requiredSkills: item.requiredSkills,
          salaryMin: item.salaryMin,
          salaryMax: item.salaryMax,
          salaryCurrency: item.salaryCurrency,
          salaryUndisclosed: false,
          status: JobStatus.PUBLISHED,
          publishedAt: new Date(),
          screeningQuestions: {
            create: item.screeningQuestions.map((q, idx) => ({
              title: q.title,
              questionType: q.questionType,
              isRequired: q.isRequired,
              options: q.options,
              orderIndex: idx,
            })),
          },
        },
      });
    }
  }

  console.info('✅ Demo data seeded safely:', {
    demoCandidate: demoCandidate.email,
    demoRecruiter: demoRecruiter.email,
  });
}

main()
  .catch((err) => {
    console.error('❌ Demo seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

