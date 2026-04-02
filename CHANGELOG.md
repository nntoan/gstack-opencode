# Changelog

## [0.4.1](https://github.com/nntoan/gstack-opencode/compare/v0.4.0...v0.4.1) (2026-04-02)


### Bug Fixes

* **ci:** predownload baseline compile target before platform build ([e25874c](https://github.com/nntoan/gstack-opencode/commit/e25874c544f8c248368a6568c0e9d06b3b1332de))

## [0.4.0](https://github.com/nntoan/gstack-opencode/compare/v0.3.0...v0.4.0) (2026-03-31)


### Features

* **install:** adopt provider-based fallback model setup ([8c57156](https://github.com/nntoan/gstack-opencode/commit/8c57156be3890e48026c8cccbcd246ffb1956a24))


### Bug Fixes

* **plugin:** register gstack agents in OpenCode and globalize install config ([eef23fa](https://github.com/nntoan/gstack-opencode/commit/eef23fa6fe17178766ddf25f0bbf230931682860))
* **release:** harden windows baseline binary build and rename platform packages ([e52dc01](https://github.com/nntoan/gstack-opencode/commit/e52dc011159a11e0a9c50e94ee21a62c4ea503f5))

## [0.3.0](https://github.com/nntoan/gstack-opencode/compare/v0.2.0...v0.3.0) (2026-03-24)


### Features

* **release:** adopt new baseline binary matrix ([95a9512](https://github.com/nntoan/gstack-opencode/commit/95a951286d029032599070a99a54dddabba9d746))


### Bug Fixes

* **release:** remove unsupported windows platform targets ([7cc0f77](https://github.com/nntoan/gstack-opencode/commit/7cc0f7715c81793cabc1a7dbf08ee95d6c3c200c))

## [0.2.0](https://github.com/nntoan/gstack-opencode/compare/v0.1.0...v0.2.0) (2026-03-23)


### Features

* **agents:** add 13 sprint-phase agents ([cde9c7e](https://github.com/nntoan/gstack-opencode/commit/cde9c7e6576d5fbd681ae2cd24dd8865b4136dbc))
* **analytics:** add JSONL analytics event tracking ([9ff218e](https://github.com/nntoan/gstack-opencode/commit/9ff218e3791c705ec1c77d9285268982b10b64df))
* **browser-daemon:** add Playwright browser daemon ([d35cee1](https://github.com/nntoan/gstack-opencode/commit/d35cee1e566283f7b18f8b80168b5b4b97cb61da))
* **build:** add platform build scripts and packages ([a4cc698](https://github.com/nntoan/gstack-opencode/commit/a4cc698194cb5ba30fdc8716f74def068968a52f))
* **cli:** add install and doctor CLI commands ([d86be0c](https://github.com/nntoan/gstack-opencode/commit/d86be0cdcb4b6738b5a9e96310b81f94a949cb79))
* **config:** add JSONC config system with Zod schema validation ([5444649](https://github.com/nntoan/gstack-opencode/commit/5444649abb75d623b5ca679b3fc1f699852bcd4a))
* **mcp:** add 5 lazy MCP server configurations ([44fd5c5](https://github.com/nntoan/gstack-opencode/commit/44fd5c566cdbec4362629e7378bca85b23139313))
* **orchestrator:** add multi-agent intent orchestrator ([6bc7ba6](https://github.com/nntoan/gstack-opencode/commit/6bc7ba6b544fb0d4a15ed8b17d86358c09589dfb))
* **plugin:** add plugin entry, interface, handlers, and factories ([a9bf211](https://github.com/nntoan/gstack-opencode/commit/a9bf2115889e682cbccd19e829e540dae3412367))
* **shared:** add shared path helper utilities ([e1e0ea2](https://github.com/nntoan/gstack-opencode/commit/e1e0ea2ef604b06c33ef359212f38e7a5669af89))
* **skill-adapter:** add content transformer and placeholder system ([e0e8149](https://github.com/nntoan/gstack-opencode/commit/e0e8149ab16a1134c4b8e129dad9652e05da50b7))
* **skill-mcp-manager:** add skill MCP connection manager ([7efb586](https://github.com/nntoan/gstack-opencode/commit/7efb5864c951271c15d98d05ad287146b4a1d995))
* **skills:** add 25 gstack builtin skills with factory system ([cf47d4b](https://github.com/nntoan/gstack-opencode/commit/cf47d4bffd9a2118c3fd658de0fc65e308b66bce))
* **sprint-backlog:** add Backlog.md sprint management integration ([ac139fa](https://github.com/nntoan/gstack-opencode/commit/ac139fa7dc8eef06d7294ab62ded1c206a58270e))
* **types:** add TypeScript type definitions for gstack plugin ([2997bc3](https://github.com/nntoan/gstack-opencode/commit/2997bc3aefaba909f7b05b2643dd8e43b678021b))
* **workspace:** add workspace state management system ([509bc88](https://github.com/nntoan/gstack-opencode/commit/509bc882b1d9e1c152e6fbf218024d39bb08792f))


### Bug Fixes

* **gitignore:** correctly ignore researchs/ directory ([c2767d6](https://github.com/nntoan/gstack-opencode/commit/c2767d686f22fc0a727645fd8799fd40551a9206))
* **lint:** update eslint config with browser globals and rule overrides ([f5c71e8](https://github.com/nntoan/gstack-opencode/commit/f5c71e8561a5823020c020d023ce3341e4301da3))
* **testing:** resolve lint no-console and test exit-code leak ([8eae9c5](https://github.com/nntoan/gstack-opencode/commit/8eae9c5c18b29d9ede555eaf7b3d4f0d4e4ab632))
* **types:** preserve process.exitCode union type in doctor tests ([8a19526](https://github.com/nntoan/gstack-opencode/commit/8a19526eb5946ef99f01df7f52276633aa3b86ec))

## [0.1.0](https://github.com/nntoan/gstack-opencode/compare/v0.0.1...v0.1.0) (2026-03-23)


### Features

* **agents:** add 13 sprint-phase agents ([cde9c7e](https://github.com/nntoan/gstack-opencode/commit/cde9c7e6576d5fbd681ae2cd24dd8865b4136dbc))
* **analytics:** add JSONL analytics event tracking ([9ff218e](https://github.com/nntoan/gstack-opencode/commit/9ff218e3791c705ec1c77d9285268982b10b64df))
* **browser-daemon:** add Playwright browser daemon ([d35cee1](https://github.com/nntoan/gstack-opencode/commit/d35cee1e566283f7b18f8b80168b5b4b97cb61da))
* **build:** add platform build scripts and packages ([a4cc698](https://github.com/nntoan/gstack-opencode/commit/a4cc698194cb5ba30fdc8716f74def068968a52f))
* **cli:** add install and doctor CLI commands ([d86be0c](https://github.com/nntoan/gstack-opencode/commit/d86be0cdcb4b6738b5a9e96310b81f94a949cb79))
* **config:** add JSONC config system with Zod schema validation ([5444649](https://github.com/nntoan/gstack-opencode/commit/5444649abb75d623b5ca679b3fc1f699852bcd4a))
* **mcp:** add 5 lazy MCP server configurations ([44fd5c5](https://github.com/nntoan/gstack-opencode/commit/44fd5c566cdbec4362629e7378bca85b23139313))
* **orchestrator:** add multi-agent intent orchestrator ([6bc7ba6](https://github.com/nntoan/gstack-opencode/commit/6bc7ba6b544fb0d4a15ed8b17d86358c09589dfb))
* **plugin:** add plugin entry, interface, handlers, and factories ([a9bf211](https://github.com/nntoan/gstack-opencode/commit/a9bf2115889e682cbccd19e829e540dae3412367))
* **shared:** add shared path helper utilities ([e1e0ea2](https://github.com/nntoan/gstack-opencode/commit/e1e0ea2ef604b06c33ef359212f38e7a5669af89))
* **skill-adapter:** add content transformer and placeholder system ([e0e8149](https://github.com/nntoan/gstack-opencode/commit/e0e8149ab16a1134c4b8e129dad9652e05da50b7))
* **skill-mcp-manager:** add skill MCP connection manager ([7efb586](https://github.com/nntoan/gstack-opencode/commit/7efb5864c951271c15d98d05ad287146b4a1d995))
* **skills:** add 25 gstack builtin skills with factory system ([cf47d4b](https://github.com/nntoan/gstack-opencode/commit/cf47d4bffd9a2118c3fd658de0fc65e308b66bce))
* **sprint-backlog:** add Backlog.md sprint management integration ([ac139fa](https://github.com/nntoan/gstack-opencode/commit/ac139fa7dc8eef06d7294ab62ded1c206a58270e))
* **types:** add TypeScript type definitions for gstack plugin ([2997bc3](https://github.com/nntoan/gstack-opencode/commit/2997bc3aefaba909f7b05b2643dd8e43b678021b))
* **workspace:** add workspace state management system ([509bc88](https://github.com/nntoan/gstack-opencode/commit/509bc882b1d9e1c152e6fbf218024d39bb08792f))


### Bug Fixes

* **gitignore:** correctly ignore researchs/ directory ([1db607f](https://github.com/nntoan/gstack-opencode/commit/1db607f840d97464c46567ff160142387b579ec9))
* **lint:** update eslint config with browser globals and rule overrides ([4e33ba4](https://github.com/nntoan/gstack-opencode/commit/4e33ba4fe4360dbe8b9617edaa61c2fff97c8261))
* **testing:** resolve lint no-console and test exit-code leak ([f6499b7](https://github.com/nntoan/gstack-opencode/commit/f6499b7292b232ac3f4243cca2b5e6dce134ca3a))
* **types:** preserve process.exitCode union type in doctor tests ([c69b2bd](https://github.com/nntoan/gstack-opencode/commit/c69b2bd02542c040790c3aebb6114aa8a4a69c15))

## Changelog

All notable changes to this project will be documented here by Release Please.
