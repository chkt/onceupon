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
import onceupon from '@chkt/onceupon';
import { log_level } from '@chkt/onceupon/dist/level';

const logger = onceupon();

async () => {
  logger.log('foo');
  logger.log([1, 2, 3], log_level.warn);
  await logger
        .log(new Error(), log_level.error, 'reporting api')
        .settle();
}
```

The initializer supports extensive configuration:

```typescript
import onceupon from '@chkt/onceupon';

import { log_level } from '@chkt/onceupon/dist/level';
import { loggable_type } from '@chkt/onceupon/dist/type';
import { LogContext } from '@chkt/onceupon/dist/context';
import { LogTokens } from '@chkt/onceupon/dist/token';
import { parse } from '@chkt/onceuppn/dist/parse';

const logger = onceupon({
    threshold : log_level,
    tags : string,
    time : () => Promise<string>,
    infer : (loggable:any) => loggable_type,
    parsers : { [P in loggable_type]? : parse<P> },
    aggregate : (emit:processLog<AggregatedContext>) => Aggregator,
    decorate : (tokens:LogTokens, context:LogContext) => LogTokens,
    handle : (tokens:LogTokens, context:LogContext) => Promise<void>
});
```
