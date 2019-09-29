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
    await logger.log(new Error(), log_level.error, [ 'reporting', 'api' ]);
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
    time : AsyncIterator<string>,
    infer : (loggable:any) => loggable_type,
    parsers : { [P in loggable_type]? : parse<P> },
    decorate : (tokens:LogTokens, context:LogContext) => LogTokens,
    handle : (tokens:LogTokens, context:LogContext) => Promise<void>
});
```
