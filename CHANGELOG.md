# Changelog

## [0.7.0](https://github.com/nntoan/gstack-opencode/compare/v0.6.0...v0.7.0) (2026-04-11)


### Features

* **01-01:** add agent_surface schema and typing ([7d8e849](https://github.com/nntoan/gstack-opencode/commit/7d8e849f5646fa677eedd4f4675a0cf68fc8d253))
* **01-01:** add company agent and registry wiring ([df11c04](https://github.com/nntoan/gstack-opencode/commit/df11c0451a556399f699c3574889eb6879d59d1d))
* **01-02:** add company fallback chain defaults ([c57d600](https://github.com/nntoan/gstack-opencode/commit/c57d600b941845998e4ad0f95100dbca132446c9))
* **01-02:** apply company overrides through runtime registry ([e2b3d4c](https://github.com/nntoan/gstack-opencode/commit/e2b3d4c46c88177a6037bf76eb52a18361387266))
* **01-03:** preserve legacy-multi projection path ([dae4f8e](https://github.com/nntoan/gstack-opencode/commit/dae4f8e57f46938315148d5e579884e58e3dc64c))
* **01-03:** project only company in company mode ([eef0c93](https://github.com/nntoan/gstack-opencode/commit/eef0c93cc6045131478faa3747b1e1ee4ff1eec1))
* **02-01:** add company snapshot log and checkpoint storage ([ed8d9c9](https://github.com/nntoan/gstack-opencode/commit/ed8d9c97d9c41ffaf27c524fac214e6c9ef47496))
* **02-01:** define company runtime artifact contracts ([e7da73d](https://github.com/nntoan/gstack-opencode/commit/e7da73d734c17924c00c1c5156046384ba01ef72))
* **02-02:** add boulder to company migration logic ([6e1c22e](https://github.com/nntoan/gstack-opencode/commit/6e1c22e0d54e2260c3dba433544af886e40db3b8))
* **02-02:** expose canonical company state through workspaceState ([a5d8803](https://github.com/nntoan/gstack-opencode/commit/a5d8803d59c69c3fb5fff0db6a2b1bcc4772f8b0))
* **02-03:** initialize and report canonical company state ([18e3e48](https://github.com/nntoan/gstack-opencode/commit/18e3e48d4c8708bb4e903e4fbc2ef3b7a4b763b2))
* **02-03:** switch continuity hooks to company state ([97daed9](https://github.com/nntoan/gstack-opencode/commit/97daed97daada1c10211c97ecea57f7c3c84d666))
* **03-01:** add company prompt projection ([1362ef8](https://github.com/nntoan/gstack-opencode/commit/1362ef8a920279204de09ec923e689c66f3c8018))
* **03-02:** extend company workflow state ([d34f098](https://github.com/nntoan/gstack-opencode/commit/d34f098b39b2efa3203449ad6419ec39ae461999))
* **03-03:** add company ambiguity policy ([065826c](https://github.com/nntoan/gstack-opencode/commit/065826c5eb8acadd9f4c373da331b27e5f8839ce))
* **03-04:** wire company orchestration runtime ([10396f8](https://github.com/nntoan/gstack-opencode/commit/10396f8b8df781dfe3020248e5a7c57298e3d1ac))
* **03-05:** add company recovery and trace hooks ([95fa5cb](https://github.com/nntoan/gstack-opencode/commit/95fa5cbc2802ad25c79fdeb0ca1838a479c16943))
* **04-01:** extend decision-wait contract for stale and replay-safe lifecycle ([150544d](https://github.com/nntoan/gstack-opencode/commit/150544d874d65ca301c8663011cea87d8cdd680d))
* **04-01:** persist stale and replay-safe decision helpers ([1546161](https://github.com/nntoan/gstack-opencode/commit/1546161e115b0daa297d10550578790bd6d1c5f6))
* **04-02:** add pre-classification stale and replay gate ([5b7f154](https://github.com/nntoan/gstack-opencode/commit/5b7f1548246a22d951930c83b582311063e97b4b))
* **04-02:** preserve deterministic retry ownership through stale gating ([7511bdf](https://github.com/nntoan/gstack-opencode/commit/7511bdf0304916e4dfaa5fcdb47ac2ee85646c41))
* **04-03:** add company blocker prompt builder ([d1635d5](https://github.com/nntoan/gstack-opencode/commit/d1635d55ec36e9963b62430659d2fa3a12b83f51))
* **04-03:** bind Company blocker prompts to fresh checkpoints ([c895dae](https://github.com/nntoan/gstack-opencode/commit/c895dae6a5653bdea8da0c970c2e791f63d9118c))
* **04-04:** add canonical Company resume helpers ([d209df4](https://github.com/nntoan/gstack-opencode/commit/d209df4a8cf3bce615da335324ef21b0c8d742e5))
* **04-04:** restore checkpoint-backed Company resume flow ([2546380](https://github.com/nntoan/gstack-opencode/commit/2546380b3f32dc8d0f16a2a6e5bcd14a8194a2f9))
* **04-05:** project Company continuity guidance through hooks ([5d1aa95](https://github.com/nntoan/gstack-opencode/commit/5d1aa954e77ca7a0b1e56d220ef91caf2dbd6461))
* **cli:** add new subcommand memoir:refresh ([ef41a78](https://github.com/nntoan/gstack-opencode/commit/ef41a78db6a14c97369572e4ace8743bb0a7442c))

## [0.6.0](https://github.com/nntoan/gstack-opencode/compare/v0.5.0...v0.6.0) (2026-04-06)


### Features

* **config:** default to curated agent suppression and category presets ([2b791e6](https://github.com/nntoan/gstack-opencode/commit/2b791e652e2ed4a1ba1d74e0e880646a7f66a7a6))
* **hooks:** add lifecycle hooks infrastructure with registry, truncator, and AGENTS.md injector ([daa94ef](https://github.com/nntoan/gstack-opencode/commit/daa94efb7afda6f25a23ad7b40787362d4263263))
* implement Phase 2 — interview mode, quality gates, token budget, and slim mode ([5ea523d](https://github.com/nntoan/gstack-opencode/commit/5ea523ddbf0a3f0271edb26626456420cdadb878))
* implement Phases 3-6 — wire brain, tools, session continuity, quality scorecards ([974df8b](https://github.com/nntoan/gstack-opencode/commit/974df8bac0a124fe49b50b95aa8c35c26a667460))
* Phase 7 — close the loop on data pipelines, fix orchestration overbreadth ([f42bdfc](https://github.com/nntoan/gstack-opencode/commit/f42bdfc4d2302aeadd3b9f4b39a6b95a93d0daa4))


### Bug Fixes

* Phase 8A+8C — fix MCP config passthrough chain, clean dead SkillMcpManager scaffolding ([1953e86](https://github.com/nntoan/gstack-opencode/commit/1953e86502e4f9d1b0ba5b8c12297473a94499d7))

## [0.5.0](https://github.com/nntoan/gstack-opencode/compare/v0.4.3...v0.5.0) (2026-04-05)


### Features

* **orchestrator:** persist delegation context across plugin flow ([44869b0](https://github.com/nntoan/gstack-opencode/commit/44869b02ff5627f4928c5e86564e16804f168224))


### Bug Fixes

* **mcp:** support local MCP command arrays ([956dde6](https://github.com/nntoan/gstack-opencode/commit/956dde694a9e2485b07c26ed46fdd6a91a30ddf3))

## [0.4.3](https://github.com/nntoan/gstack-opencode/compare/v0.4.2...v0.4.3) (2026-04-03)


### Bug Fixes

* **cli:** apply installer model presets consistently ([cf7dda1](https://github.com/nntoan/gstack-opencode/commit/cf7dda105822179f87449e51b016355517b12746))

## [0.4.2](https://github.com/nntoan/gstack-opencode/compare/v0.4.1...v0.4.2) (2026-04-02)


### Bug Fixes

* **cli:** bind install prompt writer to stdout stream ([5a7a890](https://github.com/nntoan/gstack-opencode/commit/5a7a8904315557be5ce1d0ff99431a65bcf8d927))

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
