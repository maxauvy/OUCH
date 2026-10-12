/** What tells two builds apart: the commit, and whether it is the tagged
 * release. The push to main and the release tag are the same commit built
 * twice, and only the second knows it is the release (footer "v0.4.0" instead
 * of "0.4.0+sha"): with the commit alone, a browser that loaded the first
 * would never be told about the second. */
export function buildId(commit: string, tagged: boolean): string {
  return tagged ? `${commit}+release` : commit
}
