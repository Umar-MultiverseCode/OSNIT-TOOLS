# Contributing

Thank you for helping keep this directory useful. Contributions should give readers a clear starting point and credit the original creator.

## Add a repository

Add one JSON manifest in `data/tools` and a corresponding guide in `docs/tools`. Use a lowercase `owner--repository` identifier. Include these fields:

```json
{
  "id": "owner--repository",
  "name": "repository",
  "owner": "owner",
  "repository": "https://github.com/owner/repository",
  "categories": ["Website-OSINT"],
  "description": "A short factual description in your own words.",
  "source": "https://github.com/owner/repository",
  "license": {
    "label": "Unverified",
    "reference": "https://github.com/owner/repository",
    "verified": false
  },
  "featured": false
}
```

Use an existing category ID from `data/categories.json`. Link the actual upstream license when it is available. Do not infer an MIT license from the fact that a repository is public. A license identification is not a claim that every dependency has the same license.

## Add a web resource

Add a unique HTTP or HTTPS URL in `data/resources.json` with a stable ID, title, category IDs, original source and a type. Supported non-repository types are `web-resource`, `browser-extension`, `telegram-resource` and `video-resource`.

Describe the resource in your own words. Do not copy upstream README prose, add personal investigation results, distribute private datasets, submit account credentials or claim a tool was tested without a recorded check. Mark access requirements in its guide if you have verified them.

## Review your changes

```shell
npm test
npm run build
npm run dev
```

Check desktop and mobile layouts when changing the UI. Check search, combined filters, saved items, keyboard access and the empty state. Keep controls and surfaces rectangular.

Write a commit message that describes what you actually changed. Tool manifests can be committed individually. Use real author and committer dates and avoid colons in commit messages for this repository's preferred style.
