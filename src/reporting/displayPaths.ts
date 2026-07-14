import { isAbsolute, relative, resolve, sep } from "node:path";

import { isPathInsideRepository } from "../utils/paths.js";

const OUTSIDE_REPOSITORY_PREFIX = "[outside repository] ";

function toSlashPath(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

export function formatRepositoryDisplayPath(
  repositoryRoot: string,
  candidatePath: string,
): string {
  const root = resolve(repositoryRoot);
  const candidate = isAbsolute(candidatePath)
    ? resolve(candidatePath)
    : resolve(root, candidatePath);

  if (!isPathInsideRepository(root, candidate)) {
    return `${OUTSIDE_REPOSITORY_PREFIX}${candidatePath}`;
  }

  const repositoryRelative = relative(root, candidate);
  return repositoryRelative.length === 0 ? "." : toSlashPath(repositoryRelative);
}

export { OUTSIDE_REPOSITORY_PREFIX };
