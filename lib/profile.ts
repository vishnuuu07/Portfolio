export type EvidenceBeat = { id: string; label: string; title: string; body: string; bullets: readonly string[]; technologies: string };
export const resumeBeatSummaries = [
  "React and TypeScript interfaces, Java and Spring Boot services, business logic, REST APIs, and GraphQL.",
  "Google Cloud Apigee proxies with OAuth 2.0 flows, CORS, routing, policies, and OpenAPI specifications.",
  "Cross-layer issue investigation and root cause analysis, with fixes delivered through QA and production environments.",
  "Bi-weekly production releases, deployment coordination, validation, post-deployment checks, and Scrum Master responsibilities.",
] as const;
export const profile = {
  name: "Vishnu Chittampalli", role: "Software Engineer", location: "Hyderabad, India",
  email: "vishnu911ch@gmail.com", linkedin: "https://www.linkedin.com/in/vishnu-ch-58811416a/",
  summary: "Software Engineer based in Hyderabad, building across React and TypeScript interfaces, Java and Spring Boot services, and secure API integrations. Strong hands-on fluency in agentic-AI workflows and AI-assisted development, with an emphasis on structured planning, direction, review, testing, and engineering accountability.",
  hero: { eyebrow: "SOFTWARE ENGINEER · HYDERABAD, INDIA", title: "Engineering in motion.", body: "I build interfaces, APIs, and connected systems. AI is part of how I think, design, and develop.", technologies: "Java · React · API engineering · Agentic workflows" },
  about: { title: "Across the layers.", lead: "Software Engineer based in Hyderabad.", body: "My work connects React and TypeScript interfaces, Java and Spring Boot services, and secure API integrations.", support: "I work fluently with agentic AI—from exploring design options to structuring tasks, directing tools, and refining implementations. I review outputs, test behaviour, and stay accountable for the result.", labels: ["Full-stack engineering", "Secure integrations", "Agentic workflows"] },
  employment: { employer: "O.C. Tanner", title: "Associate Software Engineer", dates: "Oct 2024 — Present", lead: "Across the interface. Behind the API. Into production.", summary: "I develop and support enterprise applications across frontend, backend, and API layers, with a focus on maintainable implementation, secure integrations, and reliable delivery.", beats: [
    { id: "experience-applications", label: "01 / APPLICATION ENGINEERING", title: "From interface to implementation.", body: "I develop frontend and backend features using React, TypeScript, Java, and Spring Boot. My work includes reusable UI components, business logic, REST APIs, and GraphQL queries and mutations.", bullets: ["Reusable components for enterprise admin interfaces", "Responsive layouts and consistent UI behaviour", "Application logic across frontend and backend layers"], technologies: "React · TypeScript · Java · Spring Boot · GraphQL" },
    { id: "experience-integrations", label: "02 / INTEGRATIONS & SECURITY", title: "Making systems work together.", body: "I develop and troubleshoot Google Cloud Apigee API proxies, working with OAuth 2.0 flows, CORS, routing, policies, and OpenAPI specifications to support secure client integrations.", bullets: ["API proxy development and troubleshooting", "Authentication, access policies, and request routing", "OpenAPI 3.0 specifications and API validation"], technologies: "Apigee · OAuth 2.0 · CORS · OpenAPI · REST" },
    { id: "experience-production", label: "03 / PRODUCTION & RELIABILITY", title: "Following the issue to its source.", body: "I investigate issues across frontend, backend, and API layers by analysing logs, tracing request flows, identifying root causes, and delivering fixes through QA and production environments.", bullets: ["Cross-layer troubleshooting and root cause analysis", "Coralogix log analysis and request-flow investigation", "Scheduled and asynchronous workloads using Quartz and multithreading"], technologies: "Coralogix · Quartz Scheduler · Multithreading · API testing" },
    { id: "experience-delivery", label: "04 / RELEASES & TEAM DELIVERY", title: "The work around the release.", body: "I contribute to a bi-weekly production release cycle, coordinate deployment activities, validate changes, and support post-deployment checks. I also take on Scrum Master responsibilities to help the team keep delivery visible and organised.", bullets: ["Stand-ups, ticket allocation, and sprint retrospectives", "Sprint and engineering progress tracking with Jira and Jellyfish", "Code reviews, API validation, and GitHub Actions workflows", "GitHub Copilot support for development, review, debugging, refactoring, and testing"], technologies: "Release coordination · Scrum · Jira · Jellyfish · GitHub Actions" }
  ] satisfies EvidenceBeat[] },
  research: { title: "Finding the unusual.", publication: "Studies on Anomaly Detection Techniques", metadata: "IEEE conference publication · 2023", body: "Published research on anomaly detection, alongside my work in software engineering.", url: "https://ieeexplore.ieee.org/document/10083885" },
  approach: { title: "Engineering judgment, amplified.", lead: "Agentic AI is a core part of how I work—from shaping an idea to directing tasks, reviewing outputs, and refining the implementation.", body: "I use it to explore alternatives, challenge assumptions, structure a plan, and work through execution. I stay responsible for what gets built, how it behaves, and whether the result holds up.", stages: [
    { label: "01 / Explore", title: "Think beyond the first answer.", body: "I use AI to compare directions, question assumptions, and improve a design before committing to an approach." },
    { label: "02 / Structure", title: "Turn ambiguity into a plan.", body: "I define requirements, bounded tasks, context, constraints, and review points that guide the work." },
    { label: "03 / Direct", title: "Guide the work as it develops.", body: "I give context and constraints, inspect intermediate outputs, and steer the next step instead of accepting the first result." },
    { label: "04 / Verify", title: "Review, test, refine.", body: "I review code, test behaviour and edge cases, and refine the implementation against the original goal." }
  ], exampleLabel: "This portfolio", example: "Visual exploration → Motion storyboard → Content & build specification" },
  freelance: { title: "Useful interfaces. Thoughtfully built.", project: "Filostech", metadata: "UI application · Freelance collaboration · Team of 4", body: "I worked with a four-person team on a UI application using React, TypeScript, and AngularJS, focusing on reusable components, responsive layouts, and UI improvements.", bullets: ["Developed modular, reusable UI components", "Proposed and implemented UI/UX improvements", "Focused on responsive behaviour and maintainable frontend structure"], technologies: "React · TypeScript · AngularJS · TSX" },
  education: { degree: "B.Tech in Computer Science and Engineering", institution: "KL University, Guntur", dates: "2020 — 2024", cgpa: "9.2" },
  credentials: [
    { title: "Red Hat Certified Enterprise Application Developer", description: "Enterprise Java application development.", earned: "Dec 2022", validThrough: "Dec 2025", url: "https://www.credly.com/badges/b6483d12-ab32-4c64-ab12-6e5bc099aa97/public_url" },
    { title: "AWS Certified Cloud Practitioner", description: "Cloud concepts, core AWS services, security, and pricing fundamentals.", earned: "May 2022", validThrough: "May 2025", url: "https://www.credly.com/badges/e85766a6-876c-4605-8abb-5f49e85fbb3c" }
  ],
  contact: { title: "Bring it together.", support: "Thoughtful systems. Agentic workflows." },
} as const;

export const sections = [
  { id: "top", label: "Opening", number: "00" }, { id: "about", label: "About", number: "01" },
  { id: "experience", label: "Experience", number: "02" }, { id: "research", label: "Research", number: "03" },
  { id: "approach", label: "Approach", number: "04" }, { id: "freelance", label: "Freelance", number: "05" },
  { id: "foundations", label: "Foundations", number: "06" }, { id: "contact", label: "Contact", number: "07" },
] as const;
