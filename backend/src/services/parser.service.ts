import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { ExperienceLevel } from '@prisma/client';

export const PARSER_VERSION = '1.0.0';

const SKILL_TAXONOMY: Array<{ key: string; label: string; aliases: string[] }> = [
  { key: 'python', label: 'Python', aliases: ['python', 'py'] },
  { key: 'java', label: 'Java', aliases: ['java'] },
  { key: 'typescript', label: 'TypeScript', aliases: ['typescript', 'ts'] },
  { key: 'javascript', label: 'JavaScript', aliases: ['javascript', 'js', 'ecmascript'] },
  { key: 'react', label: 'React', aliases: ['react', 'reactjs', 'react.js'] },
  { key: 'nextjs', label: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { key: 'nodejs', label: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { key: 'express', label: 'Express.js', aliases: ['express', 'express.js', 'expressjs'] },
  { key: 'fastapi', label: 'FastAPI', aliases: ['fastapi'] },
  { key: 'django', label: 'Django', aliases: ['django'] },
  { key: 'sql', label: 'SQL', aliases: ['sql', 't-sql', 'pl/sql'] },
  { key: 'postgresql', label: 'PostgreSQL', aliases: ['postgresql', 'postgres', 'psql'] },
  { key: 'mysql', label: 'MySQL', aliases: ['mysql'] },
  { key: 'mongodb', label: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { key: 'redis', label: 'Redis', aliases: ['redis'] },
  { key: 'prisma', label: 'Prisma', aliases: ['prisma'] },
  { key: 'docker', label: 'Docker', aliases: ['docker', 'dockerfile'] },
  { key: 'kubernetes', label: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { key: 'aws', label: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
  { key: 'gcp', label: 'GCP', aliases: ['gcp', 'google cloud'] },
  { key: 'azure', label: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { key: 'git', label: 'Git', aliases: ['git', 'github', 'gitlab'] },
  { key: 'rest', label: 'REST APIs', aliases: ['rest', 'rest api', 'rest apis', 'restful'] },
  { key: 'graphql', label: 'GraphQL', aliases: ['graphql'] },
  { key: 'tailwind', label: 'Tailwind CSS', aliases: ['tailwind', 'tailwind css', 'tailwindcss'] },
  { key: 'css', label: 'CSS', aliases: ['css', 'css3'] },
  { key: 'html', label: 'HTML', aliases: ['html', 'html5'] },
  { key: 'linux', label: 'Linux', aliases: ['linux', 'ubuntu', 'bash'] },
  { key: 'playwright', label: 'Playwright', aliases: ['playwright'] },
  { key: 'vitest', label: 'Vitest', aliases: ['vitest', 'jest'] },
  { key: 'cicd', label: 'CI/CD', aliases: ['ci/cd', 'github actions', 'jenkins'] },
  { key: 'datastructures', label: 'Data Structures', aliases: ['data structures', 'algorithms', 'dsa'] },
  { key: 'powerbi', label: 'Power BI', aliases: ['power bi', 'powerbi'] },
  { key: 'excel', label: 'Excel', aliases: ['excel', 'spreadsheets'] },
  { key: 'machinelearning', label: 'Machine Learning', aliases: ['machine learning', 'scikit-learn', 'pytorch', 'tensorflow'] },
];

export interface ExtractedSkillEvidence {
  name: string;
  normalizedKey: string;
  evidenceSnippet: string;
  confidence: number;
}

export interface ParsedResumeData {
  parserVersion: string;
  wordCount: number;
  extractedAt: string;
  contact: {
    email: string | null;
    phone: string | null;
    links: string[];
  };
  skills: ExtractedSkillEvidence[];
  experience: {
    estimatedYears: number | null;
    uncertain: boolean;
    highlights: string[];
  };
  education: string[];
  rawTextPreview: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function extractTextFromResumeBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const header = buffer.subarray(0, 4).toString('ascii');
    if (header !== '%PDF') {
      throw new Error('File signature does not match a valid PDF document.');
    }
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text || '';
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (!isZip) {
      throw new Error('File signature does not match a valid DOCX archive.');
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  throw new Error('Unsupported resume format. Please upload a PDF or DOCX file.');
}

export function parseResumeText(rawText: string): {
  parsedJson: ParsedResumeData;
  skillLabels: string[];
} {
  const cleanText = rawText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const emailMatch = cleanText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/);
  const linkMatches = Array.from(
    new Set(cleanText.match(/https?:\/\/[^\s)>,]+/gi) || []),
  ).slice(0, 5);

  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const extractedSkills: ExtractedSkillEvidence[] = [];
  for (const item of SKILL_TAXONOMY) {
    let matchedSnippet: string | null = null;
    for (const alias of item.aliases) {
      const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, 'i');
      const matchingLine = lines.find((line) => regex.test(line));
      if (matchingLine) {
        matchedSnippet = matchingLine.slice(0, 140);
        break;
      }
      if (regex.test(cleanText)) {
        matchedSnippet = `Detected "${alias}" in resume text`;
        break;
      }
    }
    if (matchedSnippet) {
      extractedSkills.push({
        name: item.label,
        normalizedKey: item.key,
        evidenceSnippet: matchedSnippet,
        confidence: 0.9,
      });
    }
  }

  // Estimate years of experience if explicitly stated
  const yearsMatch = cleanText.match(/(\d+(?:\.\d+)?)\+?\s+years?\s+(?:of\s+)?experience/i);
  const estimatedYears = yearsMatch ? Number(yearsMatch[1]) : null;

  const educationLines = lines
    .filter((l) =>
      /\b(b\.?tech|b\.?e\.?|b\.?sc|m\.?tech|m\.?sc|bachelor|master|university|college|institute|degree)\b/i.test(
        l,
      ),
    )
    .slice(0, 5);

  const experienceHighlights = lines
    .filter((l) =>
      /\b(intern|engineer|developer|architect|analyst|manager|built|developed|led|designed)\b/i.test(
        l,
      ),
    )
    .slice(0, 6);

  const parsedJson: ParsedResumeData = {
    parserVersion: PARSER_VERSION,
    wordCount,
    extractedAt: new Date().toISOString(),
    contact: {
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      links: linkMatches,
    },
    skills: extractedSkills,
    experience: {
      estimatedYears,
      uncertain: estimatedYears === null,
      highlights: experienceHighlights,
    },
    education: educationLines,
    rawTextPreview: cleanText.slice(0, 1500),
  };

  return {
    parsedJson,
    skillLabels: extractedSkills.map((s) => s.name),
  };
}

export interface MatchScoreBreakdown {
  scoringVersion: string;
  totalScore: number;
  requiredSkillCoverage: {
    score: number;
    maxScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  experienceAlignment: {
    score: number;
    maxScore: number;
    status: string;
  };
  profileAndKeywords: {
    score: number;
    maxScore: number;
    note: string;
  };
  educationAndStructure: {
    score: number;
    maxScore: number;
    note: string;
  };
}

function requiredYearsForLevel(level: ExperienceLevel): number {
  switch (level) {
    case 'FRESHER':
      return 0;
    case 'ENTRY_LEVEL':
      return 1;
    case 'ONE_TO_TWO_YEARS':
      return 2;
    case 'THREE_TO_FIVE_YEARS':
      return 3;
    case 'FIVE_PLUS_YEARS':
      return 5;
  }
}

export function computeExplainableMatchScore(params: {
  resumeSkills: string[];
  parsedJson: ParsedResumeData | null;
  jobRequiredSkills: string[];
  jobExperienceLevel: ExperienceLevel;
}): MatchScoreBreakdown {
  const resumeSkillsLower = params.resumeSkills.map((s) => s.trim().toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of params.jobRequiredSkills) {
    const reqLower = req.trim().toLowerCase();
    const hit = resumeSkillsLower.some(
      (rs) => rs === reqLower || rs.includes(reqLower) || reqLower.includes(rs),
    );
    if (hit) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  }

  // 1. Required Skill Coverage (60%)
  const skillMax = 60;
  const skillRatio =
    params.jobRequiredSkills.length > 0
      ? matchedSkills.length / params.jobRequiredSkills.length
      : 1;
  const skillScore = Math.round(skillRatio * skillMax);

  // 2. Experience Alignment (20%)
  const expMax = 20;
  const neededYears = requiredYearsForLevel(params.jobExperienceLevel);
  const estYears = params.parsedJson?.experience?.estimatedYears ?? null;
  let expScore = 10; // Neutral baseline when dates/years are uncertain
  let expStatus = 'Years not explicitly detected in resume (neutral 10/20)';
  if (neededYears === 0) {
    expScore = 20;
    expStatus = 'Entry / Fresher role alignment (20/20)';
  } else if (estYears !== null) {
    if (estYears >= neededYears) {
      expScore = 20;
      expStatus = `Detected ~${estYears} yrs meets target ${neededYears}+ yrs`;
    } else {
      expScore = Math.max(8, Math.round((estYears / neededYears) * expMax));
      expStatus = `Detected ~${estYears} yrs vs target ${neededYears}+ yrs`;
    }
  }

  // 3. Resume Depth & Highlights (10%)
  const depthMax = 10;
  const wordCount = params.parsedJson?.wordCount ?? 0;
  const depthScore = wordCount >= 120 ? 10 : wordCount >= 40 ? 6 : 3;

  // 4. Education / Structured Sections (10%)
  const eduMax = 10;
  const hasEdu = (params.parsedJson?.education?.length ?? 0) > 0;
  const eduScore = hasEdu ? 10 : 5;

  const totalScore = Math.min(100, Math.max(0, skillScore + expScore + depthScore + eduScore));

  return {
    scoringVersion: '1.0.0',
    totalScore,
    requiredSkillCoverage: {
      score: skillScore,
      maxScore: skillMax,
      matchedSkills,
      missingSkills,
    },
    experienceAlignment: {
      score: expScore,
      maxScore: expMax,
      status: expStatus,
    },
    profileAndKeywords: {
      score: depthScore,
      maxScore: depthMax,
      note: `Resume word count: ${wordCount} words`,
    },
    educationAndStructure: {
      score: eduScore,
      maxScore: eduMax,
      note: hasEdu ? 'Education details detected' : 'Education section not detected',
    },
  };
}

