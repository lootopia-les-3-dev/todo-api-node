# Changelog

## [1.1.1](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.1.0...v1.1.1) (2026-02-27)


### Bug Fixes

* expert ci ([#42](https://github.com/lootopia-les-3-dev/todo-api-node/issues/42)) ([e06e2df](https://github.com/lootopia-les-3-dev/todo-api-node/commit/e06e2dffff2cbbcb687c8e4d20e8a26d37783685))
* fast ci ([#46](https://github.com/lootopia-les-3-dev/todo-api-node/issues/46)) ([df35dac](https://github.com/lootopia-les-3-dev/todo-api-node/commit/df35dac5dfa274518a1a7e908daa8550f5a38ce4))
* improve health check logic in reusable deploy workflow ([0aaecb6](https://github.com/lootopia-les-3-dev/todo-api-node/commit/0aaecb637af88ae90e0f1ea41842b4329cae23d5))
* simplify node_modules installation in CI workflow ([605cd3e](https://github.com/lootopia-les-3-dev/todo-api-node/commit/605cd3e2731065dcbd6bb438f12aeef3b6ef5f66))

## [1.1.0](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.0.4...v1.1.0) (2026-02-25)


### Features

* **api:** add X-Request-ID middleware for log correlation ([4de12b4](https://github.com/lootopia-les-3-dev/todo-api-node/commit/4de12b4facea8469efaf644f3459b01dcc2fddf7))


### Bug Fixes

* **api:** import randomUUID from crypto to fix lint error ([89f9e9b](https://github.com/lootopia-les-3-dev/todo-api-node/commit/89f9e9be8a0ac5831b356a918c7139508d84eaac))
* **ci:** chmod before rm to handle read-only pnpm cache, add NODE_OPTIONS for ESM jest ([5509b6b](https://github.com/lootopia-les-3-dev/todo-api-node/commit/5509b6bd88b1af764aecd41827d0c80978411d44))
* fast ci v6 ([#38](https://github.com/lootopia-les-3-dev/todo-api-node/issues/38)) ([f12d564](https://github.com/lootopia-les-3-dev/todo-api-node/commit/f12d5646796efd9931749b6d3c2b49d2c11de6f0))
* fast ci v7 ([ca55b2f](https://github.com/lootopia-les-3-dev/todo-api-node/commit/ca55b2fc35784d41e23a8904560ab58c0f0a4b35))
* **husky:** skip prepare script in CI and production Docker build ([82e0d85](https://github.com/lootopia-les-3-dev/todo-api-node/commit/82e0d858ab7e0897816b84cbc5d3e29b16253a5b))

## [1.0.4](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.0.3...v1.0.4) (2026-02-25)


### Bug Fixes

* changelog in ci for 1 trigger ([#36](https://github.com/lootopia-les-3-dev/todo-api-node/issues/36)) ([29b2231](https://github.com/lootopia-les-3-dev/todo-api-node/commit/29b2231142a855cc9d6b7a0e0f8bd19de8e3b350))

## [1.0.3](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.0.2...v1.0.3) (2026-02-25)


### Bug Fixes

* **ci:** restore node_modules in perf job, required to start server ([4b00df3](https://github.com/lootopia-les-3-dev/todo-api-node/commit/4b00df3bc5a02f470b657867fadb758f35f9aa47))
* **ci:** restore setup-node in perf job, RUNNER_TOOL_CACHE handles caching ([00c1180](https://github.com/lootopia-les-3-dev/todo-api-node/commit/00c1180bd4e8b3dce736385cc8d2b59450fe5b9e))
* **ci:** revert to docker-container driver, export image as tar for reuse ([f92d6b1](https://github.com/lootopia-les-3-dev/todo-api-node/commit/f92d6b1d187d43212e260daf8e365aa6ca5bc004))
* **ci:** use cached Node 20 in perf job instead of system Node ([05175f3](https://github.com/lootopia-les-3-dev/todo-api-node/commit/05175f398f7aed09fd6120bc63219fbad1a27d8c))


### Performance Improvements

* **ci:** add Jest cache on shared volume and run tests in band ([0468aee](https://github.com/lootopia-les-3-dev/todo-api-node/commit/0468aee1128c063d17929f3a834ab317744c7184))
* **ci:** drop setup-node from perf job, use docker daemon for builds ([55c7985](https://github.com/lootopia-les-3-dev/todo-api-node/commit/55c79858b2d925c81da43137476171dc91f9d8f6))
* **ci:** merge 4 test shards into one job, drop test-merge job ([d93b582](https://github.com/lootopia-les-3-dev/todo-api-node/commit/d93b5829c37064639ecfb9f5284ccf8e10bb982f))
* **ci:** run perf and docker-build immediately at pipeline start ([094a68b](https://github.com/lootopia-les-3-dev/todo-api-node/commit/094a68b8024355c7a0c7cad20a6878bdb1f476b4))
* remove pnpm/setup-node/node_modules steps — node is already in ([55c7985](https://github.com/lootopia-les-3-dev/todo-api-node/commit/55c79858b2d925c81da43137476171dc91f9d8f6))
* **sonar:** exclude test files from analysis ([6614a74](https://github.com/lootopia-les-3-dev/todo-api-node/commit/6614a74cc65abe0b1bb69682d5eeef4f92669bcb))
* **tests:** share single app instance across all todo tests ([6da80c2](https://github.com/lootopia-les-3-dev/todo-api-node/commit/6da80c23f852248918da504d7832ab81a93b9311))

## [1.0.2](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.0.1...v1.0.2) (2026-02-24)


### Bug Fixes

* ci fast v3 ([97cac26](https://github.com/lootopia-les-3-dev/todo-api-node/commit/97cac260cce8f50c525c5d4112d46c3092e9d404))

## [1.0.1](https://github.com/lootopia-les-3-dev/todo-api-node/compare/v1.0.0...v1.0.1) (2026-02-24)


### Bug Fixes

* **ci:** disable coverage threshold per shard to avoid false failures ([59d9cfc](https://github.com/lootopia-les-3-dev/todo-api-node/commit/59d9cfc09a65c65acbfee64884b91258391aaae4))
* **ci:** replace cp -al with cp -a to fix cross-device hardlink error ([0919f47](https://github.com/lootopia-les-3-dev/todo-api-node/commit/0919f47488ac3c9364b95992a58982cfb63f3a43))
* **ci:** use /. suffix in cp to correctly restore node_modules from cache ([c5ab184](https://github.com/lootopia-les-3-dev/todo-api-node/commit/c5ab184fd796353f66de899bae4e2e22f23e5df6))
* **ci:** validate cache with sentinel file to prevent corrupted cache restores ([d46bac5](https://github.com/lootopia-les-3-dev/todo-api-node/commit/d46bac560d138a762f7b8f34cc5f8d6ebc97a05d))


### Performance Improvements

* **ci:** add eslint cache on shared volume ([e9dfce8](https://github.com/lootopia-les-3-dev/todo-api-node/commit/e9dfce8ccf5f536cb69de703961487f82f441b28))
* **ci:** cache sonar Node.js runtime and sonar cache on shared volume ([6ab8902](https://github.com/lootopia-les-3-dev/todo-api-node/commit/6ab890251005801d7233baefe191c89c1bd59644))
* **ci:** parallelize security, local docker cache, prefer-offline pnpm ([b98e846](https://github.com/lootopia-les-3-dev/todo-api-node/commit/b98e846408f6d8fbf38bd8f0fc66981e2199df2b))
* **ci:** parallelize tests with matrix strategy ([808c9d2](https://github.com/lootopia-les-3-dev/todo-api-node/commit/808c9d27aea3fdf2ad5b335394df1612f45993dc))
* **ci:** use shared volume cache across all runner replicas ([94919c4](https://github.com/lootopia-les-3-dev/todo-api-node/commit/94919c4b1a4f1d0be413cd47a59fe050c8ca1a9a))

## 1.0.0 (2026-02-24)


### Features

* **ci:** add SonarCloud integration for code quality analysis ([#11](https://github.com/lootopia-les-3-dev/todo-api-node/issues/11)) ([29d1cd6](https://github.com/lootopia-les-3-dev/todo-api-node/commit/29d1cd6f0ed40feb109ea7610321613b88b6a0ca))
* dependabot ([#4](https://github.com/lootopia-les-3-dev/todo-api-node/issues/4)) ([2afb28f](https://github.com/lootopia-les-3-dev/todo-api-node/commit/2afb28fd2f94944df40f30e8176e432b131c5cff))
* perf tests ([#21](https://github.com/lootopia-les-3-dev/todo-api-node/issues/21)) ([8bac2d2](https://github.com/lootopia-les-3-dev/todo-api-node/commit/8bac2d25c2f567992127ede9de6cdb03b85ed1c5))


### Bug Fixes

* fast ci v1 ([#27](https://github.com/lootopia-les-3-dev/todo-api-node/issues/27)) ([8b7205f](https://github.com/lootopia-les-3-dev/todo-api-node/commit/8b7205fdb046a05fb06612b8d560419c582bb2f5))
* git history ([#17](https://github.com/lootopia-les-3-dev/todo-api-node/issues/17)) ([b1ae559](https://github.com/lootopia-les-3-dev/todo-api-node/commit/b1ae559e4208e769fd1968d67c3b6c38be7dc5fb))
* swagger from js-doc ([#19](https://github.com/lootopia-les-3-dev/todo-api-node/issues/19)) ([bad9259](https://github.com/lootopia-les-3-dev/todo-api-node/commit/bad9259ac6a0e856967aa49dd4f565e4249b5cda))
