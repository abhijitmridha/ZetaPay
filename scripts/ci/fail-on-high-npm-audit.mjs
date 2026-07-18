import fs from 'node:fs';

const auditPath = process.argv[2];

if (!auditPath) {
  console.error('Usage: node scripts/ci/fail-on-high-npm-audit.mjs <audit-json-lines>');
  process.exit(2);
}

const highFindings = [];
const errors = [];

for (const line of fs.readFileSync(auditPath, 'utf8').split('\n')) {
  if (!line.trim()) {
    continue;
  }

  let event;

  try {
    event = JSON.parse(line);
  } catch (error) {
    errors.push(`Invalid audit JSON: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  if (event.type === 'error') {
    errors.push(event.data || 'Unknown yarn audit error');
    continue;
  }

  if (event.type !== 'auditAdvisory') {
    continue;
  }

  const advisory = event.data?.advisory;
  const severity = advisory?.severity;

  if (severity === 'high' || severity === 'critical') {
    highFindings.push({
      severity,
      module: advisory.module_name,
      title: advisory.title,
      vulnerableVersions: advisory.vulnerable_versions,
      patchedVersions: advisory.patched_versions,
    });
  }
}

if (errors.length > 0) {
  console.error('yarn audit failed before producing usable advisory output:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (highFindings.length > 0) {
  console.error(`Found ${highFindings.length} high/critical npm audit finding(s):`);
  for (const finding of highFindings) {
    console.error(
      `- [${finding.severity}] ${finding.module}: ${finding.title} ` +
        `(vulnerable: ${finding.vulnerableVersions}, patched: ${finding.patchedVersions})`
    );
  }
  process.exit(1);
}

console.log('No high or critical npm vulnerabilities found.');
