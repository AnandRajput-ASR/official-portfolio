export interface ResumeData {
  name: string;
  phone: string;
  location: string;
  email: string;
  linkedin: string;
  objective: string;
  skills: { category: string; items: string }[];
  experience: {
    title: string;
    company: string;
    location: string;
    period: string;
    keyProjects: string;
    techStack: string;
    projects: { name: string; bullets: string[] }[];
    closing?: string;
  }[];
  certifications: { code: string; name: string }[];
  education: { degree: string; university: string; period: string }[];
}

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (m) => '\\' + m)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function generateLatex(d: ResumeData): string {
  const skillRows = d.skills
    .map((s) => `\\textbf{${esc(s.category)}} & ${esc(s.items)} \\\\`)
    .join('\n');

  const experienceBlocks = d.experience
    .map((exp) => {
      const projects = exp.projects
        .map((p) => {
          const bullets = p.bullets
            .filter((b) => b.trim())
            .map((b) => `    \\item ${esc(b)}`)
            .join('\n');
          return `  \\item \\textbf{Project: ${esc(p.name)}}
  \\begin{itemize}[label=--]
${bullets}
  \\end{itemize}`;
        })
        .join('\n');

      const closing = exp.closing
        ? `\n\\textit{${esc(exp.closing)}}`
        : '';

      return `\\textbf{${esc(exp.title)}} \\hfill ${esc(exp.period)} \\\\
\\textit{${esc(exp.company)}} \\hfill \\textit{${esc(exp.location)}} \\\\[4pt]
\\textbf{Key Projects:} ${esc(exp.keyProjects)} \\\\
\\textbf{Tech Stack:} ${esc(exp.techStack)}

\\begin{itemize}
${projects}
\\end{itemize}${closing}`;
    })
    .join('\n\n');

  const certItems = d.certifications
    .map((c) => `  \\item \\textbf{${esc(c.code)}} -- ${esc(c.name)}`)
    .join('\n');

  const eduItems = d.education
    .map(
      (e) =>
        `\\textbf{${esc(e.degree)}}, ${esc(e.university)} \\hfill ${esc(e.period)}`,
    )
    .join('\n\n');

  return `\\documentclass[a4paper,10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{1em}{0.5em}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{${esc(d.name).toUpperCase()}}} \\\\[4pt]
${esc(d.phone)} $\\diamond$ ${esc(d.location)} \\\\
\\href{mailto:${esc(d.email)}}{${esc(d.email)}} $\\diamond$ \\href{${esc(d.linkedin)}}{LinkedIn}
\\end{center}

\\section*{OBJECTIVE}
${esc(d.objective)}

\\section*{SKILLS}
\\begin{tabular}{ll}
${skillRows}
\\end{tabular}

\\section*{EXPERIENCE}
${experienceBlocks}

\\section*{CERTIFICATIONS}
\\textit{Certified across Microsoft Azure Fundamentals, Administration, Development, and DevOps.}
\\begin{itemize}
${certItems}
\\end{itemize}

\\section*{EDUCATION}
${eduItems}

\\end{document}
`;
}

export function defaultResumeData(): ResumeData {
  return {
    name: 'Anand Rajput',
    phone: '+91 8446-222-324',
    location: 'Pune, India',
    email: 'anandraj.asr@gmail.com',
    linkedin: 'https://linkedin.com/in/anandrajput',
    objective:
      'Results-driven Angular developer with 5+ years of experience delivering scalable, high-performance web applications. Proficient in Angular (8+), TypeScript, and RESTful APIs, with strong expertise in state management, performance optimization, and accessibility. Experienced in CI/CD pipelines, cloud integration (Azure, AWS), and mentoring developers to streamline team delivery in agile environments.',
    skills: [
      { category: 'Frontend', items: 'Angular (8+), TypeScript, JavaScript, RxJS, NgRx' },
      { category: 'Backend', items: 'Node.js, Express.js, RESTful APIs' },
      { category: 'Cloud/DevOps', items: 'Azure, Azure DevOps, AWS (Lambda, ECS, CloudWatch), GitHub Actions' },
      { category: 'Databases', items: 'PostgreSQL, Azure Cosmos DB' },
      { category: 'Tools', items: 'Git, VS Code, Postman' },
      { category: 'Soft Skills', items: 'Communication, Leadership, Mentoring, Problem Solving, Team Collaboration' },
    ],
    experience: [
      {
        title: 'Packaged App Development Analyst',
        company: 'Accenture',
        location: 'Pune, India',
        period: 'Jan 2021 - Present',
        keyProjects: 'BIAL, Hannover Messe, Smart ACP & Hoteling, True Supplier Marketplace & Supplier Hub',
        techStack: 'Angular, Node.js, Azure DevOps, AWS (Lambda, CloudWatch, ECS), Azure Functions, PostgreSQL',
        projects: [
          {
            name: 'BIAL – Internal Operations Portal',
            bullets: [
              'Developed a fully responsive enterprise web UI for internal airport operations using Angular.',
              'Implemented robust unit testing to improve frontend reliability and maintainability.',
              'Optimized layout for cross-device compatibility (desktop and tablet), enhancing user experience.',
            ],
          },
          {
            name: 'Hannover Messe – AWS IoT Use Case (PoC)',
            bullets: [
              'Created a prototype using AWS SiteWise, TwinMaker, Grafana, and QuickSight to demonstrate IoT capabilities.',
              'Simulated sensor-based data and integrated Lambda functions to demonstrate predictive analytics.',
              'Delivered a functional PoC that influenced client buy-in for future implementation.',
            ],
          },
          {
            name: 'Smart ACP & Hoteling',
            bullets: [
              'Led Angular development of modules including Admin Entity, Communication, and Role Management.',
              'Developed backend features using Azure Function Apps (.NET) with Cosmos DB and SQL.',
              'Delivered stable releases (major + minor) via Azure DevOps CI/CD pipelines.',
              'Onboarded and mentored junior developers through project setup, KT sessions, and task delegation.',
              'Recognized with 2× Star of the Month awards for ownership and consistent delivery excellence.',
              'Earned Microsoft Azure certifications while actively applying them.',
            ],
          },
          {
            name: 'True Supplier Marketplace (TSM) / Supplier Hub (SH)',
            bullets: [
              'Developed Angular UI and Node.js backend for supplier onboarding workflows.',
              'Designed and optimized DB scripts enabling smoother SAP integration and multi-teams approval routing.',
              'Used AWS CloudWatch, Lambda, and ECS to debug, monitor logs, and ensure stable runtime operations.',
              'Supported the OPS team by resolving PPTASKs and critical production bugs.',
              'Acted as a supplier-facing point of contact, assisting with onboarding challenges and issue resolution.',
              'Handled credential, secrets rotation and container image lifecycle management to ensure security and compliance.',
              'Mentored 5–6 new joiners through technical KT, PR reviews, and process familiarization.',
              'Collaborated with BAs and stakeholders to ensure accurate, end-to-end supplier onboarding.',
            ],
          },
        ],
        closing: 'Trusted for delivering quality work, supporting teammates, and maintaining smooth coordination with others.',
      },
    ],
    certifications: [
      { code: 'AZ-900', name: 'Microsoft Certified: Azure Fundamentals' },
      { code: 'AZ-104', name: 'Microsoft Certified: Azure Administrator Associate' },
      { code: 'AZ-204', name: 'Microsoft Certified: Azure Developer Associate' },
      { code: 'AZ-400', name: 'Microsoft Certified: DevOps Engineer Expert' },
    ],
    education: [
      { degree: 'Master of Computer Application - MCA', university: 'Savitribai Phule Pune University', period: '2017 - 2020' },
    ],
  };
}
