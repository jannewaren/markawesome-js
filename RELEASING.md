# Releasing markawesome-js

This package is published to the **npm registry** (<https://www.npmjs.com/>) as
the unscoped package `markawesome-js`, by the npm user **`jannewaren`**.

(The Ruby `markawesome` gem is published separately to RubyGems — npm is only for
the JavaScript/TypeScript port.)

## One-time setup

1. Have an npm account (`jannewaren`) — <https://www.npmjs.com/signup>.
2. Enabling 2FA on the account is recommended; if you do, `npm publish` will
   prompt for an OTP.
3. Log in on the machine you publish from:

   ```bash
   npm login            # opens a browser / asks for credentials
   npm whoami           # should print: jannewaren
   ```

## Cutting a release

1. **Make sure everything is green.** `npm run check` runs typecheck, lint, the
   full Vitest suite, and the build. It also runs automatically on publish
   (`prepublishOnly`).

   ```bash
   npm run check
   ```

2. **Bump the version** (semver). This updates `package.json` and creates a git
   tag:

   ```bash
   npm version patch   # or minor / major
   ```

3. **Update `CHANGELOG.md`** — move the `Unreleased` notes under the new version
   heading.

4. **Publish.** `files` in `package.json` limits the tarball to `dist/`, the
   README, the CHANGELOG, and the LICENSE; `dist/` is built fresh by
   `prepublishOnly`.

   ```bash
   npm publish
   ```

   The first publish makes the package public (`publishConfig.access: public`).

5. **Push the release commit and tag to git** immediately:

   ```bash
   git push && git push --tags
   ```

## Verifying

```bash
npm view markawesome-js version    # the version you just published
npm pack --dry-run                 # inspect exactly what would be in the tarball
```

## Relationship to `eleventy-plugin-webawesome`

The Eleventy plugin depends on this engine. During local development it uses a
`file:../markawesome-js` link. **Release order:**

1. Release `markawesome-js` here first.
2. In `eleventy-plugin-webawesome`, change the dependency from
   `"markawesome-js": "file:../markawesome-js"` to the published range (e.g.
   `"markawesome-js": "^0.1.0"`), run `npm install`, then release the plugin.
