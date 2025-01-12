import { format } from "prettier";

import { isDeprecated } from "./util.mjs";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const ENDPOINTS = JSON.parse(
  readFileSync(
    new URL("generated/endpoints.json", new URL(".", import.meta.url)),
  ).toString(),
);

generateRoutes();

async function generateRoutes() {
  const endpoints = ENDPOINTS.filter((endpoint) => {
    if (isDeprecated(endpoint)) return false;

    return true;
  });

  for (const endpoint of endpoints) {
    const dirPath = `docs/${endpoint.scope}`;
    const path = `${dirPath}/${endpoint.id}.md`;
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(path, await template(endpoint));
    console.log(`${path} written`);
  }
}

async function template(endpoint) {
  const deprecationNotice = endpoint.isDeprecated
    ? "**This method is deprecated.**"
    : "";
  const renameNotice = endpoint.renamed
    ? `**Deprecated:** This method has been renamed to ${endpoint.renamed.after.scope}.${endpoint.renamed.after.id}`
    : "";

  const parameterRows = endpoint.parameters.map(
    (param) =>
      `<tr><td>${param.name}</td><td>${param.required ? "yes" : "no"}</td><td>

${param.description || ""}

</td></tr>`,
  );

  const requiredParameterNames = endpoint.parameters
    .filter((parameter) => parameter.required)
    .map((parameter) => parameter.name);
  const example =
    `octokit.rest.${endpoint.scope}.${endpoint.id}` +
    (requiredParameterNames.length
      ? `({
        ${requiredParameterNames.join(",\n")}
      })`
      : "()");

  const parametersTable = `
<table>
  <thead>
    <tr>
      <th>name</th>
      <th>required</th>
      <th>description</th>
    </tr>
  </thead>
  <tbody>
    ${parameterRows.join("\n")}
  </tbody>
</table>`;

  const parameters = endpoint.parameters.length
    ? parametersTable
    : `This endpoint has no parameters`;

  const frontmatterExample = example
    .replace(/\s\s+/g, " ")
    .replace(/,\n}/g, " }")
    .replace(/\n/g, " ");
  const content = `
---
name: ${endpoint.name}
example: ${frontmatterExample}
route: ${endpoint.method} ${endpoint.url}
scope: ${endpoint.scope}
type: API method
---
# ${endpoint.name}

${deprecationNotice}

${renameNotice}

${endpoint.description}

\`\`\`js
${example}
\`\`\`

## Parameters

${parameters}

See also: [GitHub Developer Guide documentation](${endpoint.documentationUrl}).`;

  return await format(content, {
    parser: "markdown",
  });
}
