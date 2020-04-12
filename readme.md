[![Tests](https://github.com/chkt/onceupon/workflows/tests/badge.svg)](https://github.com/chkt/onceupon/actions)
[![Version](https://img.shields.io/npm/v/@chkt/onceupon)](https://www.npmjs.com/package/@chkt/onceupon)
![Node](https://img.shields.io/node/v/@chkt/onceupon)
![Dependencies](https://img.shields.io/librariesio/release/npm/@chkt/onceupon)
![Licence](https://img.shields.io/npm/l/@chkt/onceupon)
![Language](https://img.shields.io/github/languages/top/chkt/onceupon)
![Size](https://img.shields.io/bundlephobia/min/@chkt/onceupon)

# onceupon
## Logging without compromises

onceupon is a fully configurable logging system for all javascript platforms.
It is written in typescript. All major components use Promises.

## Install
```sh
npm install @chkt/onceupon
```

## Use
Initialize the logger by importing the default export and calling it:

```typescript
import { createLogger, log_level } from '@chkt/onceupon';

const logger = createLogger();

async () => {
  await logger
    .log('foo')
    .log([1, 2, 3], log_level.warn)
    .log(new Error(), log_level.error, 'reporting api')
    .settle();
}
```

The initializer supports extensive configuration:

```typescript
import { createLogger, log_level } from '@chkt/onceupon';
import { getTime} from "@chkt/onceupon/dist/time";
import { inferType } from "@chkt/onceupon/dist/type";
import { Parsers } from "@chkt/onceupon/dist/parse";
import { createAggregator } from "@chkt/onceupon/dist/aggregate";
import { decorateTokens } from "@chkt/onceupon/dist/decorate";
import { handleLog } from "@chkt/onceupon/dist/handler";

const logger = createLogger({
  threshold : log_level,
  tags : string,
  time : getTime,
  infer : inferType,
  parsers : Parsers,
  aggregate : createAggregator,
  decorate : decorateTokens,
  handle : handleLog
});
```

## Public api
```typescript
const enum log_level {
  fatal,
  error,
  warn,
  notice,
  info,
  verbose,
  debug
}

export interface LoggerConfig {
  readonly threshold : log_level;
  readonly tags : string;
  readonly infer : inferType;
  readonly parsers : Parsers;
  readonly time : getTime;
  readonly aggregate : createAggregator;
  readonly decorate : decorateTokens;
  readonly handle : handleLog;
}

interface Logger {
  message(message:string|Composition, level?:log_level, tags?:string) : Logger;
  value(value:any, level?:log_level, tags?:string) : Logger;
  failure(reason:any, level?:log_level, tags?:string) : Logger;
  threshold(threshold:log_level) : Logger;
  settings(settings:Partial<LoggerConfig>) : Logger;
  settle() : Promise<void>;
}

type createLogger = (settings?:Partial<LoggerConfig>) => Logger;
```
