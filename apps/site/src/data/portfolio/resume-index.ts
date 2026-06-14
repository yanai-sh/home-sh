/** Section index for resume split TOC — keep in sync with resume/resume.toml. */
export type ResumeIndexSection = {
  id: string;
  label: string;
  keywords: string[];
};

export const resumeIndex: ResumeIndexSection[] = [
  { id: 'summary', label: 'Summary', keywords: ['summary', 'software', 'systems', 'engineer'] },
  {
    id: 'experience',
    label: 'Experience',
    keywords: ['experience', 'kardome', 'bdr', 'cognyte', 'nexyte'],
  },
  { id: 'kardome', label: 'Kardome', keywords: ['kardome', 'oem', 'benchmark', 'docker'] },
  { id: 'bdr', label: 'BDR Group', keywords: ['bdr', 'csharp', 'postgresql'] },
  {
    id: 'cognyte',
    label: 'Cognyte NEXYTE',
    keywords: ['cognyte', 'nexyte', 'nifi', 'kafka', 'kubernetes'],
  },
  {
    id: 'training',
    label: 'Technical Training',
    keywords: ['training', 'infinity', 'technion', 'devops', 'c++'],
  },
  { id: 'projects', label: 'Projects', keywords: ['projects', 'winmint', 'yanai.sh'] },
  { id: 'skills', label: 'Technical Skills', keywords: ['skills', 'rust', 'python', 'terraform'] },
  { id: 'education', label: 'Education', keywords: ['education', 'reichman', 'muhlenberg'] },
  { id: 'military', label: 'Military Service', keywords: ['military', 'idf', 'medic'] },
  { id: 'languages', label: 'Languages', keywords: ['languages', 'english', 'hebrew'] },
];
