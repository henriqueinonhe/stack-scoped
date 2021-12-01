# Stack Scoped

Like React Context API but with ordinary functions.

Create scopes that encompass slices of your call stack.

## Table of Contents

- [Installing](#installing)
- [Example](#example)
- [API](#api)
  - [createContext](#createcontext)
  - [createOptionalContext](#createoptionalcontext)
  - [composeProviders](#composeproviders)
- [Testing](#testing)
- [Limitations](#limitations)
- [Advanced Usage](#advanced-usage)
- [Motivation](#motivation)
- [Intended Use Case](#intended-use-case)

## Installing

```sh
npm install stack-scoped
```

Types are already included.

## Example

```js
// Create a context
const context = createContext();

// Context exposes two methods: provide and consume
const { provide, consume } = context;

const a = () => {
  provide({ value: 10 }, () => {
    // Anything that is called
    // inside this function can retrieve
    // this value by calling consume().
    b();
  });
};

const b = () => {
  // Notice how there's no mention
  // of the value provided in this function.
  // It is completely unaware of it.

  c();
};

const c = () => {
  // Even though this function takes no
  // parameters it is able to access
  // the value provided by function "a".
  const { value } = consume();
  console.log(value);
};

// Call
a();

// Logs 10
```

Providers are overridable:

```js
const context = createContext();

const { consume, provide } = context;

const a = () => {
  provide(10, () => {
    b();
  });
};

const b = () => {
  provide(20, () => {
    c();
  });
};

const c = () => {
  console.log(consume());
};

a();
// Logs 20
```

You may also have multiple contexts:

```js
const context1 = createContext();
const context2 = createContext();

const a = () => {
  context1.provide(10, () => {
    context2.provide("A", () => {
      b();
    });
  });
};

const b = () => {
  c();
};

const c = () => {
  console.log(context1.consume());
  console.log(context2.consume());
};

// Logs:
// 10
// A
```

## API

### **createContext()**

Creates a context object that exposes two methods, `provide` and `consume`.

Contexts created using this function are considered **required**, so trying to consume a value without first providing one result in an error being thrown.

```js
const context = createContext();
const { consume, provide } = context;
```

Typescript:

```ts
type ContextValue = {
  a: number;
  b: string;
  c: boolean;
};

// Inform the context value "shape" to createContext
// so that provide and consume are properly typed.
const context = createContext<ContextValue>();

const {
  consume, // () => ContextValue
  provide, // (value: T): <U>(subRoutine: () => U) => U or <U>(value: T, subRoutine?: () => U): U;
};
```

**provide(contextValue[, subRoutine])**

This method has two versions, a curried one where you provide just the `contextValue` and then receives a provider loaded with that value, and a non-curried one where you must pass both parameters at once.

Note that `provide` returns the value returned by `subRoutine`.

```js
// Non-curried
const context = createContext();

const {
  provide,
  consume
};

const a = provide(10, () => {
  return consume();
});

console.log(a);
// Logs 10

// Curried
const loadedProvider = provide(10);
const b = loadedProvider(() => {
  return consume();
});

console.log(b);
// Logs 10
```

**consume()**

Returns the value provided by the most "recent" provider in the stack.

```js
const { provide, consume } = createContext();

provide(10, () => {
  provide(20, () => {
    console.log(consume());
    // Logs 20
  });

  console.log(consume());
  // Logs 10
});
```

### **createOptionalContext()**

Just like `createContext`, but with **optional** contexts it is not mandatory to first provide a value before consuming it, so `consume` may return `undefined`, which is encoded in its type signature as well.

Optional contexts are useful for representing default value semantics for contexts, but in a more flexible and explicit way, so that instead of providing a default value for the context itself, which forces this default value on every consumer, we place the responsability of choosing the default value on the consumer.

```js
const { provide, consume } = createContext();

const a = () => {
  b();
};

const b = () => {
  const value = consume() ?? defaultValue;
};

a();
```

```ts
const {
  provide,
  consume, // () => number | undefined
} = createContext<number>();
```

### **composeProviders()**

Whenever you have many providers and want to avoid readability issues that arise from nesting these providers, you may use `composeProviders`, which take an array of loaded providers and return a resulting composite provider:

```js
const context1 = createContext();
const context2 = createContext();
const context3 = createContext();

const a = () => {
  const loadedProvider1 = context1.provide(10);
  const loadedProvider2 = context2.provide("A");
  const loadedProvider3 = context3.provide(true);

  /**
   * Instead of:
   * loadedProvider1(() => {
   *   loadedProvider2(() => {
   *     loadedProvider3(() => {
   *       b();
   *     })
   *   })
   * });
   */

  const compositeProvider = composeProviders(
    loadedProvider1,
    loadedProvider2,
    loadedProvider3
  );

  compositeProvider(() => {
    b();
  });
};

const b = () => {
  console.log(context1.consume());
  console.log(context2.consume());
  console.log(context3.consume());
  // Logs:
  // 10
  // A
  // true
};
```

## Testing

Functions that **provide** values can be tested just the same as any other function.

For functions that **consume** values, however, you need to provide these values before calling them.

Fortunatelly this is quite easy, we just need to wrap the consumer function into another function that provides whatever value we wish to "inject":

```js
const context = createContext();

const foo = () => {
  return context.consume();
};

it("Some test", () => {
  const wrappedFoo = () => {
    context.provide(10, foo);
  };

  expect(wrappedFoo()).toBe(10);
});
```

## Limitations

As this library intends to be used both on node and on the browser there's an important limitation regarding asynchronous functions/callbacks.

Let's see, for instance, what happens when we try to use context with `setTimeout`:

```js
const context = createContext();

const a = () => {
  context.provide(10, () => {
    setTimeout(b, 1000);
  });
};

const b = () => {
  // Oops! No value provided!
  console.log(context.consume());
};
```

This happens because even though when we are **calling** `setTimeout` we on the same call stack as `a` is, calling `setTimeout` just schedules its callback, and when the callback is **actually** executed, the call stack is a completely different one, therefore we don't have access to the execution context anymore.

The same thing happens with async functions:

```js
const context = createContext();

const a = () => {
  context.provide(10, async () => {
    // This is fine, as this part runs
    // synchronously
    console.log(context.consume());

    await Promise.resolve();

    // Oops! No value provided!
    console.log(context.consume());
  });
};
```

This might seem weird, but it becomes clearer when we recall that async/await are basically promises under the hood, so the last example is functionally equivalent to this one:

```js
const context = createContext();

const a = () => {
  context.provide(10, () => {
    console.log(context.consume());

    return Promise.resolve().then(() => {
      // This runs on another execution context
      console.log(context.consume());
    });
  });
};
```

Each time we use `await` we are using a `.then(value => next(value))` under the hood, where `next` is the code that comes right after the `await`.

In Node, there's an API called `async_hooks` that allows us to intercept every asynchronous operation in each phase of its lifecycle, thus enabling us to "propagate" contexts through asynchronous callbacks, as if the callback could remember the original execution context from which it originated.

However this is a Node only API and so far there's no remedy for this situation on the browser.

This doesn't mean that you can't use context with asynchronous operations, but you'll need to manually _bridge_ contexts between asynchronous operations, which could still be ok as long as you use context mainly for long chains of synchronous functions with only a few asynchronous ones in between.

```js
const context = createContext();

const a = () => {
  context.provide(10, () => {
    b();
  });
};

const b = () => {
  const contextValue = context.consume();

  setTimeout(() => {
    // We have to provide the context value
    // for this execution context

    context.provide(contextValue, () => {
      c();
    });
  }, 1000);
};

const c = () => {
  console.log(context.consume());
};
```

## Advanced Usage

The `provide` method may also be used in a curried manner, where by providing only a single argument (value) it returns a loaded provider:

```js
const context = createContext();

const a = () => {
  const loadedProvider = context.provide(10);

  loadedProvider(() => {
    //Logs 10
    console.log(context.consume());
  });
};
```

Whenever you have many providers and want to avoid readability issues that arise from nesting these providers, you may use `composeProviders`, which take an array of loaded providers and return a resulting composite provider:

```js
const context1 = createContext();
const context2 = createContext();
const context3 = createContext();

const a = () => {
  const loadedProvider1 = context1.provide(10);
  const loadedProvider2 = context2.provide("A");
  const loadedProvider3 = context3.provide(true);

  /**
   * Instead of:
   * loadedProvider1(() => {
   *   loadedProvider2(() => {
   *     loadedProvider3(() => {
   *       b();
   *     })
   *   })
   * });
   */

  const compositeProvider = composeProviders(
    loadedProvider1,
    loadedProvider2,
    loadedProvider3
  );

  compositeProvider(() => {
    b();
  });
};

const b = () => {
  console.log(context1.consume());
  console.log(context2.consume());
  console.log(context3.consume());
  // Logs:
  // 10
  // A
  // true
};
```

## Motivation

Originally we have two kinds of scope:

- Global Scope
- Local Scope

If there was a "scope spectrum" these two kinds would be at the extreme points, because in a sense **global scope** is the least restrictive scope possible, as it is accessible everywhere.

On the other hand, **local scope** is the most restrictive scope possible as it is accessible only from within a single function/stack frame.

Of course we can _transform_ variables in one scope into _other variables_ in another scope by passing them as parameters from one function to another, but still, this is not the same as actually enlarging the scope, as when we pass a variable as a parameter to a function, we are actually passing a value/reference/pointer, not the variable itself as it may even have a "different name" under the other scope.

So what if we wanted to have some kind of scope that was somewhere in between?

In a sense **closures** could be considered to be this "in between" scope, given that we're able to have variables that encompass multiple functions, however there's a critical restriction where for that to happen functions must be **defined in the same place**.

But what if we could make it such that scope and the place where a function is defined were orthogonal to each other? So that we could split a single function into multiple smaller ones both for readability and testability reasons and yet wanted them to share the same scope?

This library offers another possible answer to this question by implementing a scope that spans not only one, but **multiple adjacent stack frames**, so that a function can create a scope which is then accessible by every other function that is called either directly or indirectly from it.

Also, as variables in an inner scope shadow/override variables from an outer scope, so does this _"in between scope"_, such that scopes created deeper in the call tree override scopes (originated from the same context) created higher up in the tree.

## Intended Use Case

Suppose you are developing a social network where **users** can create **pages**, these pages have **posts**, and each post has **comments**.

In this social network app there's a feature where you can see a user's feed, where this feed features some posts of this user's pages.

To build this feed for you need to fetch and deserialize the feed's user along with some of their pages, posts and comments.

After fetching you'd have an object like this:

```js
const user = {
  id: 1,
  name: "John Doe",
  pages: [
    {
      id: 1,
      name: "John's Family"
      posts: [
        {
          id: 1,
          title: "Things that need repair"
          comments: [
            //...
          ]
        }
        //...
      ]
    },
    {
      id: 2,
      name: "Work Group",
      posts: [
        //...
      ]
    }
  ]
};
```

And then you need to deserialize this structure, so you create a function to do this job:

```js
function deserializeUser(user) {
  // In this example the deserialization is very simple
  // as it is just "forwarding" attributes, but it could
  // potentially be doing more stuff, like adding
  // client-side only attributes, normalizing this structure,
  // transforming some fields, and so on

  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) => ({
      id: page.id,
      name: page.name,
      posts: page.posts.map((post) => ({
        id: post.id,
        title: post.title,
        //...
        comments: post.comments.map((comment) => ({
          //...
        })),
      })),
    })),
  };
}
```

So far so good, but then you notice that maybe there's too much logic in this function and you notice that there's a very clear way of breaking this deserialization into smaller functions, by creating a function for the deserialization of each entity:

```js
function deserializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) => deserializePage(page)),
  };
}

function deserializePage(page) {
  return {
    id: page.id,
    name: page.name,
    posts: page.posts.map((post) => deserializePost(post)),
  };
}

function deserializePost(post) {
  return {
    id: post.id,
    title: post.title,
    comments: post.comments.map((comment) => deserializeComment(comment)),
  };
}

function deserializeComment(comment) {
  return {
    id: comment.id,
    authorId: comment.authorId,
    //...
  };
}
```

Now things are much more readable and testable!

All is good and fine until there's a request for the following feature:

_Whenever there's a comment whose author is the owner of the page where the comment is located, this comment must be highlighted_.

To achieve this, you decide to create a client-side attribute in the comment that indicates whether it is highlighted or not.

So now the code is something like this:

```js
function deserializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) => deserializePage(page, user.id)),
  };
}

function deserializePage(page, userId) {
  return {
    id: page.id,
    name: page.name,
    posts: page.posts.map((post) => deserializePost(post, userId)),
  };
}

function deserializePost(post, userId) {
  return {
    id: post.id,
    title: post.title,
    comments: post.comments.map((comment) =>
      deserializeComment(comment, userId)
    ),
  };
}

function deserializeComment(comment, userId) {
  return {
    id: comment.id,
    authorId: comment.authorId,
    isHighlighted: userId === comment.author,
    //...
  };
}
```

Notice that as the `deserializeComment` now needs a `userId` to decide whether the comment is highlighted or not, you need to pass this `userId` all the way down from `deserializeUser`, passing through every other function even though it is only used at the "end of the chain".

Suppose there's yet another feature request where there's a setting for each user that determines whether this comment hightlighting should be turned on or off:

```js
function deserializeUser(user, showHighlighting) {
  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) =>
      deserializePage(page, user.id, showHighlighting)
    ),
  };
}

function deserializePage(page, userId, showHighlighting) {
  return {
    id: page.id,
    name: page.name,
    posts: page.posts.map((post) =>
      deserializePost(post, userId, showHighlighting)
    ),
  };
}

function deserializePost(post, userId, showHighlighting) {
  return {
    id: post.id,
    title: post.title,
    comments: post.comments.map((comment) =>
      deserializeComment(comment, userId, showHighlighting)
    ),
  };
}

function deserializeComment(comment, userId, showHighlighting) {
  return {
    id: comment.id,
    authorId: comment.authorId,
    isHighlighted: userId === comment.author && showHighlighting,
    //...
  };
}
```

Yet again you need to modify the whole chain of functions just so that this new parameter can reach the last link in the chain.

Here we have an interesting situation where these functions are highly cohesive, yet for readability and testability purposes we want to keep them separated (possibily even in different files), so in a certain sense it's like they belong to the same **context**.

One possible but sub-optimal solution would be to aggregate these parameters that aren't used by the intermediate functions in a single object, so that at least it would have greater stability whenever we needed to add or modify variables in this object.

```js
function deserializeUser(user, showHighlighting) {
  const context = {
    userId: user.id,
    showHighlighting,
  };

  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) => deserializePage(context, page)),
  };
}

function deserializePage(page, userId, showHighlighting) {
  return {
    id: page.id,
    name: page.name,
    posts: page.posts.map((post) => deserializePost(context, post)),
  };
}

function deserializePost(post, userId, showHighlighting) {
  return {
    id: post.id,
    title: post.title,
    comments: post.comments.map((comment) =>
      deserializeComment(context, comment)
    ),
  };
}

function deserializeComment(context, comment) {
  const { userId, showHighlighting } = context;

  return {
    id: comment.id,
    authorId: comment.authorId,
    isHighlighted: userId === comment.author && showHighlighting,
    //...
  };
}
```

However these intermediate functions still have to know about this context in which they have in interest at all.

By using the solution this library proposes we can improve this situation significantly.

```js
const context = createContext();

function deserializeUser(user, showHighlighting) {
  const contextValue = {
    userId: user.id,
    showHighlighting,
  };

  return {
    id: user.id,
    name: user.name,
    pages: user.pages.map((page) =>
      context.provider(contextValue, () => deserializePage(page))
    ),
  };
}

function deserializePage(page) {
  return {
    id: page.id,
    name: page.name,
    posts: page.posts.map((post) => deserializePost(post)),
  };
}

function deserializePost(post) {
  return {
    id: post.id,
    title: post.title,
    comments: post.comments.map((comment) => deserializeComment(comment)),
  };
}

function deserializeComment(comment) {
  const { userId, showHighlighting } = context.consume();

  return {
    id: comment.id,
    authorId: comment.authorId,
    isHighlighted: userId === comment.author && showHighlighting,
    //...
  };
}
```

Notice that now the only functions that are aware of the parameters held in the context are the functions that either provide or consume these values and all functions "in between" can remain completely ignorant of them.
