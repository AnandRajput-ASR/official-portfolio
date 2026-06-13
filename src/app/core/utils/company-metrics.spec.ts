import {
  applyDefaultPeriod,
  calcTenure,
  getCompletedCount,
  getCompletionRate,
  getDuplicateProjectTitles,
  getInProgressCount,
  getProjectsMissingDetailsCount,
  getProjectsWithImpact,
  getTechProjectCount,
  getUniqueTechStack,
  hasInvalidDateRange,
  impactScore,
  impactStrengthClass,
  impactStrengthLabel,
  isDuplicateProjectTitle,
  isProjectDetailsMissing,
  isValidWebsite,
  monthStamp,
} from './company-metrics';
import { Company, CompanyProject } from '@core/models';

function makeProject(over: Partial<CompanyProject> = {}): CompanyProject {
  return {
    id: 'p',
    number: '01',
    title: 'API',
    description: 'desc',
    tech: ['Angular'],
    link: '#',
    displayOrder: 0,
    ...over,
  } as CompanyProject;
}

function makeCompany(over: Partial<Company> = {}): Company {
  return {
    id: 'c',
    name: 'Acme',
    role: 'Engineer',
    period: '',
    location: 'Pune',
    logo: '🏢',
    accentColor: '#f5a623',
    current: false,
    description: 'desc',
    projects: [],
    displayOrder: 0,
    ...over,
  } as Company;
}

describe('monthStamp', () => {
  it('returns null for undefined / empty', () => {
    expect(monthStamp(undefined)).toBeNull();
    expect(monthStamp('')).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(monthStamp('2024')).toBeNull();
    expect(monthStamp('2024-13')).toBeNull();
    expect(monthStamp('2024-00')).toBeNull();
  });

  it('encodes YYYY-MM as year*12+month', () => {
    expect(monthStamp('2024-01')).toBe(2024 * 12 + 1);
    expect(monthStamp('2024-12')).toBe(2024 * 12 + 12);
    expect(monthStamp('2025-06')).toBe(2025 * 12 + 6);
  });
});

describe('hasInvalidDateRange', () => {
  it('returns false when one or both dates are missing', () => {
    expect(hasInvalidDateRange(makeCompany({}))).toBeFalse();
    expect(hasInvalidDateRange(makeCompany({ startDate: '2020-01' }))).toBeFalse();
  });

  it('returns true when end is before start', () => {
    expect(
      hasInvalidDateRange(makeCompany({ startDate: '2022-01', endDate: '2020-01' })),
    ).toBeTrue();
  });

  it('returns false when end is on or after start', () => {
    expect(
      hasInvalidDateRange(makeCompany({ startDate: '2020-01', endDate: '2022-01' })),
    ).toBeFalse();
    expect(
      hasInvalidDateRange(makeCompany({ startDate: '2022-01', endDate: '2022-01' })),
    ).toBeFalse();
  });
});

describe('calcTenure', () => {
  it('returns empty string when no start date', () => {
    expect(calcTenure(makeCompany({}))).toBe('');
  });

  it('returns "Xy Ymo" for a multi-year period', () => {
    expect(
      calcTenure(
        makeCompany({ startDate: '2020-01', endDate: '2022-04' }),
        new Date('2024-01-01'),
      ),
    ).toBe('2y 3mo');
  });

  it('returns "Xy" when no remainder', () => {
    expect(
      calcTenure(
        makeCompany({ startDate: '2020-01', endDate: '2022-01' }),
        new Date('2024-01-01'),
      ),
    ).toBe('2y');
  });

  it('returns "Xmo" when less than a year', () => {
    expect(
      calcTenure(
        makeCompany({ startDate: '2020-01', endDate: '2020-04' }),
        new Date('2024-01-01'),
      ),
    ).toBe('3mo');
  });

  it('uses now when current=true or no endDate', () => {
    const co = makeCompany({ startDate: '2020-01', current: true });
    expect(calcTenure(co, new Date('2020-04-01'))).toBe('3mo');
  });
});

describe('isValidWebsite', () => {
  it('treats empty as valid', () => {
    expect(isValidWebsite('')).toBeTrue();
    expect(isValidWebsite(undefined)).toBeTrue();
  });

  it('accepts http and https', () => {
    expect(isValidWebsite('https://example.com')).toBeTrue();
    expect(isValidWebsite('http://example.com')).toBeTrue();
  });

  it('rejects other schemes', () => {
    expect(isValidWebsite('ftp://example.com')).toBeFalse();
    expect(isValidWebsite('not-a-url')).toBeFalse();
  });
});

describe('getUniqueTechStack', () => {
  it('returns empty for a company with no projects', () => {
    expect(getUniqueTechStack(makeCompany())).toEqual([]);
  });

  it('returns unique tech sorted by frequency', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', tech: ['Angular', 'Node'] }),
        makeProject({ id: 'b', tech: ['Angular'] }),
      ],
    });
    const stack = getUniqueTechStack(co);
    expect(stack[0]).toBe('Angular');
    expect(stack).toContain('Node');
  });

  it('getTechProjectCount returns the count per tech', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', tech: ['Angular', 'Node'] }),
        makeProject({ id: 'b', tech: ['Angular'] }),
      ],
    });
    expect(getTechProjectCount(co, 'Angular')).toBe(2);
    expect(getTechProjectCount(co, 'Node')).toBe(1);
    expect(getTechProjectCount(co, 'Missing')).toBe(0);
  });
});

describe('project status / impact helpers', () => {
  it('counts completed and in-progress projects', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', status: 'completed' }),
        makeProject({ id: 'b', status: 'in-progress' }),
        makeProject({ id: 'c' }),
      ],
    });
    expect(getCompletedCount(co)).toBe(2);
    expect(getInProgressCount(co)).toBe(1);
  });

  it('rounds completion rate', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', status: 'completed' }),
        makeProject({ id: 'b', status: 'completed' }),
        makeProject({ id: 'c', status: 'in-progress' }),
        makeProject({ id: 'd' }),
      ],
    });
    expect(getCompletionRate(co)).toBe(50);
  });

  it('counts projects with impact text', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', impact: 'Reduced latency by 50%' }),
        makeProject({ id: 'b' }),
        makeProject({ id: 'c', impact: '' }),
        makeProject({ id: 'd', impact: '   ' }),
      ],
    });
    expect(getProjectsWithImpact(co)).toBe(1);
  });
});

describe('getDuplicateProjectTitles', () => {
  it('returns lower-cased duplicate titles', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', title: 'API' }),
        makeProject({ id: 'b', title: 'api' }),
        makeProject({ id: 'c', title: 'Web' }),
      ],
    });
    expect(getDuplicateProjectTitles(co)).toEqual(['api']);
  });

  it('ignores empty titles', () => {
    const co = makeCompany({
      projects: [makeProject({ id: 'a', title: '' }), makeProject({ id: 'b', title: '' })],
    });
    expect(getDuplicateProjectTitles(co)).toEqual([]);
  });

  it('isDuplicateProjectTitle mirrors the set', () => {
    const co = makeCompany({
      projects: [makeProject({ id: 'a', title: 'API' }), makeProject({ id: 'b', title: 'api' })],
    });
    expect(isDuplicateProjectTitle(co, co.projects[0])).toBeTrue();
    expect(isDuplicateProjectTitle(co, co.projects[1])).toBeTrue();
  });
});

describe('isProjectDetailsMissing', () => {
  it('is true when description is empty or tech is empty', () => {
    expect(isProjectDetailsMissing(makeProject({ description: '' }))).toBeTrue();
    expect(isProjectDetailsMissing(makeProject({ description: 'x', tech: [] }))).toBeTrue();
  });

  it('is false when both are present', () => {
    expect(isProjectDetailsMissing(makeProject({ description: 'x', tech: ['A'] }))).toBeFalse();
  });

  it('getProjectsMissingDetailsCount counts them', () => {
    const co = makeCompany({
      projects: [
        makeProject({ id: 'a', description: 'x', tech: ['A'] }),
        makeProject({ id: 'b', description: '' }),
      ],
    });
    expect(getProjectsMissingDetailsCount(co)).toBe(1);
  });
});

describe('impact scoring', () => {
  it('returns 0 for empty impact', () => {
    expect(impactScore('')).toBe(0);
    expect(impactStrengthLabel('')).toBe('Weak');
    expect(impactStrengthClass('')).toBe('weak');
  });

  it('scores a strong metric-rich statement highly', () => {
    const strong = 'Reduced API latency by 40% across 1000 users and improved uptime';
    expect(impactScore(strong)).toBeGreaterThanOrEqual(75);
    expect(impactStrengthLabel(strong)).toBe('Strong');
  });

  it('scores a weak statement low', () => {
    expect(impactScore('did stuff')).toBeLessThan(45);
  });

  it('caps the score at 100', () => {
    const massive = 'by ' + 'x'.repeat(50) + ' 100% reduced increased improved optimized saved';
    expect(impactScore(massive)).toBeLessThanOrEqual(100);
  });
});

describe('applyDefaultPeriod', () => {
  it('does not overwrite a user-typed period', () => {
    const co = makeCompany({ period: 'Custom', startDate: '2020-01' });
    applyDefaultPeriod(co);
    expect(co.period).toBe('Custom');
  });

  it('fills "Jan 2020 — Present" when current with no end', () => {
    const co = makeCompany({ startDate: '2020-01', current: true });
    applyDefaultPeriod(co);
    expect(co.period).toBe('Jan 2020 — Present');
  });

  it('fills a full range when both start and end are present', () => {
    const co = makeCompany({ startDate: '2020-01', endDate: '2022-04' });
    applyDefaultPeriod(co);
    expect(co.period).toBe('Jan 2020 — Apr 2022');
  });

  it('is a no-op when startDate is missing or invalid', () => {
    const co = makeCompany({});
    applyDefaultPeriod(co);
    expect(co.period).toBe('');
  });
});
