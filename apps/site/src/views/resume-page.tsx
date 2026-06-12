import type { FC } from 'hono/jsx';
import resumeSnapshot from '@resume/generated';
import { DocumentLayout } from '@/views/document-layout';
import { portfolio } from '@/data/portfolio';

export const ResumeDocument: FC = () => {
  const { data } = resumeSnapshot;
  const { header, summary, experience, projects, skills, education } = data;

  return (
    <article class="resume-document">
      <header class="resume-document__header">
        <h1>{header.name}</h1>
        {header.headline ? <p class="resume-document__headline">{header.headline}</p> : null}
        <p class="resume-document__meta">
          {[header.location, header.email].filter(Boolean).join(' · ')}
        </p>
      </header>

      {summary ? (
        <section class="resume-document__section">
          <h2>Summary</h2>
          <p>{summary}</p>
        </section>
      ) : null}

      <section class="resume-document__section">
        <h2>Experience</h2>
        {experience.map((job) => (
          <div class="resume-document__entry">
            <h3>
              {job.role} · {job.company}
            </h3>
            <p class="resume-document__subhead">
              {job.period}
              {job.location ? ` · ${job.location}` : ''}
            </p>
            {job.subtitle ? <p class="resume-document__subtitle">{job.subtitle}</p> : null}
            {job.highlights.length > 0 ? (
              <ul>
                {job.highlights.map((highlight) => (
                  <li>{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </section>

      {projects.length > 0 ? (
        <section class="resume-document__section">
          <h2>Projects</h2>
          {projects.map((project) => (
            <div class="resume-document__entry">
              <h3>{project.name}</h3>
              {project.description ? <p>{project.description}</p> : null}
              {project.highlights.length > 0 ? (
                <ul>
                  {project.highlights.map((highlight) => (
                    <li>{highlight}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {Object.keys(skills).length > 0 ? (
        <section class="resume-document__section">
          <h2>Skills</h2>
          {Object.entries(skills).map(([category, items]) => (
            <div class="resume-document__entry">
              <h3>{category}</h3>
              <p>{items.join(', ')}</p>
            </div>
          ))}
        </section>
      ) : null}

      {education.length > 0 ? (
        <section class="resume-document__section">
          <h2>Education</h2>
          {education.map((entry) => (
            <div class="resume-document__entry">
              <h3>
                {entry.degree} · {entry.institution}
              </h3>
              <p class="resume-document__subhead">
                {entry.period}
                {entry.location ? ` · ${entry.location}` : ''}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  );
};

export const ResumePage: FC = () => (
  <DocumentLayout title={`Resume — ${portfolio.pageTitle}`} pathname="/resume">
    <main id="main-content" class="document-shell resume-page">
      <ResumeDocument />
      <p class="resume-page__actions">
        <a
          class="button-link button-link--primary"
          href="/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download PDF
        </a>
        <a class="button-link" href="/">
          Back to splash
        </a>
      </p>
    </main>
  </DocumentLayout>
);
