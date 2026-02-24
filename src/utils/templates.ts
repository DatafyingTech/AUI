function titleCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function agentTemplate(name: string, description: string): string {
  const title = titleCase(name);
  return `---
name: ${title}
description: ${description}
---

# ${title}

${description}
`;
}

export function skillTemplate(name: string, description: string): string {
  const title = titleCase(name);
  return `---
name: ${name}
description: ${description}
---

# ${title}

## Steps

1. [Define steps here]

## Notes
- ${description}
`;
}
