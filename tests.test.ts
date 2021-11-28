import {
  composeProviders,
  createContext,
  createOptionalContext,
  NoProviderError,
} from ".";

describe("createContext()", () => {
  describe("When trying to consume value without providing one first", () => {
    const context = createContext();

    const a = () => {
      context.consume();
    };

    it("Throws an error", () => {
      expect(a).toThrowError(NoProviderError);
    });
  });

  describe("When trying to consume value without providing a matching one", () => {
    const context1 = createContext();
    const context2 = createContext();

    const a = () => {
      context1.provide(1, () => {
        b();
      });
    };

    const b = () => {
      context2.consume();
    };

    it("Throws an error", () => {
      expect(a).toThrowError(NoProviderError);
    });
  });

  describe("When consuming context value 1 level deep", () => {
    const context = createContext();

    const a = () => {
      const contextValue = 10;
      return context.provide(contextValue, () => {
        return b();
      });
    };

    const b = () => {
      const contextValue = context.consume();
      return contextValue;
    };

    it("Works as expected", () => {
      expect(a()).toBe(10);
    });
  });

  describe("When consuming context value multiple levels deep", () => {
    const context = createContext<number>();
    let dValue: number;

    const a = () => {
      const contextValue = 10;
      context.provide(contextValue, () => {
        b();
      });
    };

    const b = () => {
      c();
    };

    const c = () => {
      d();
    };

    const d = () => {
      dValue = context.consume();
    };

    a();

    it("Works as expected", () => {
      expect(dValue).toBe(10);
    });
  });

  describe("When using different providers for each call stack", () => {
    const context = createContext<number>();
    const values: Array<number> = [];

    const a = () => {
      context.provide(10, () => {
        b();
      });

      context.provide(20, () => {
        c();
      });
    };

    const b = () => {
      d();
    };

    const c = () => {
      d();
    };

    const d = () => {
      values.push(context.consume());
    };

    a();

    it("Works as expected", () => {
      expect(values).toStrictEqual([10, 20]);
    });
  });

  describe("When overriding providers", () => {
    const context = createContext<number>();
    const values: Array<number> = [];

    const a = () => {
      context.provide(10, () => {
        b();
        c();
      });
    };

    const b = () => {
      d();
    };

    const c = () => {
      context.provide(20, () => {
        d();
      });
    };

    const d = () => {
      values.push(context.consume());
    };

    a();

    it("Works as expected", () => {
      expect(values).toStrictEqual([10, 20]);
    });
  });

  describe("When using multiple contexts", () => {
    const context1 = createContext<number>();
    const context2 = createContext<string>();
    let value1: number;
    let value2: string;

    const a = () => {
      context1.provide(10, () => {
        context2.provide("HA", () => {
          b();
        });
      });

      context2.provide("HA", () => {
        context1.provide(10, () => {
          b();
        });
      });
    };

    const b = () => {
      value1 = context1.consume();
      value2 = context2.consume();
    };

    a();

    it("Works as expected", () => {
      expect(value1).toBe(10);
      expect(value2).toBe("HA");
    });
  });

  describe("When dealing with unrelated call stacks", () => {
    const context = createContext();

    const a = () => {
      context.provide(10, () => {});
    };

    const b = () => {
      context.consume();
    };

    a();

    it("Context value is cleaned properly", () => {
      expect(b).toThrowError(NoProviderError);
    });
  });

  describe("When using curried version of provider", () => {
    const context = createContext<number>();
    const values: Array<number> = [];

    const a = () => {
      const loadedProvider = context.provide(10);
      loadedProvider(() => {
        b();
        c();
      });
    };

    const b = () => {
      d();
    };

    const c = () => {
      const loadedProvider = context.provide(20);
      loadedProvider(() => {
        d();
      });
    };

    const d = () => {
      values.push(context.consume());
    };

    a();

    it("Works as expected", () => {
      expect(values).toStrictEqual([10, 20]);
    });
  });
});

describe("createOptionalContext()", () => {
  describe("When trying to consume value without providing one first", () => {
    const context = createOptionalContext();

    const a = () => {
      return context.consume();
    };

    it("Doesn't throw an error", () => {
      expect(a).not.toThrow();
    });

    it("Returns undefined", () => {
      expect(a()).toBeUndefined();
    });
  });

  describe("When trying to consume value without providing a matching one", () => {
    const context1 = createOptionalContext();
    const context2 = createOptionalContext();

    const a = () => {
      return context1.provide(1, () => {
        return b();
      });
    };

    const b = () => {
      return context2.consume();
    };

    it("Doesn't throw an error", () => {
      expect(a).not.toThrow();
    });

    it("Returns undefined", () => {
      expect(a()).toBeUndefined();
    });
  });

  describe("When consuming context value 1 level deep", () => {
    const context = createOptionalContext();

    const a = () => {
      const contextValue = 10;
      return context.provide(contextValue, () => {
        return b();
      });
    };

    const b = () => {
      const contextValue = context.consume();
      return contextValue;
    };

    it("Works as expected", () => {
      expect(a()).toBe(10);
    });
  });

  describe("When consuming context value multiple levels deep", () => {
    const context = createOptionalContext<number>();
    let dValue: number;

    const a = () => {
      const contextValue = 10;
      context.provide(contextValue, () => {
        b();
      });
    };

    const b = () => {
      c();
    };

    const c = () => {
      d();
    };

    const d = () => {
      dValue = context.consume()!;
    };

    a();

    it("Works as expected", () => {
      expect(dValue).toBe(10);
    });
  });

  describe("When using different providers for each call stack", () => {
    const context = createOptionalContext<number>();
    const values: Array<number> = [];

    const a = () => {
      context.provide(10, () => {
        b();
      });

      context.provide(20, () => {
        c();
      });
    };

    const b = () => {
      d();
    };

    const c = () => {
      d();
    };

    const d = () => {
      values.push(context.consume()!);
    };

    a();

    it("Works as expected", () => {
      expect(values).toStrictEqual([10, 20]);
    });
  });

  describe("When overriding providers", () => {
    const context = createOptionalContext<number>();
    const values: Array<number> = [];

    const a = () => {
      context.provide(10, () => {
        b();
        c();
      });
    };

    const b = () => {
      d();
    };

    const c = () => {
      context.provide(20, () => {
        d();
      });
    };

    const d = () => {
      values.push(context.consume()!);
    };

    a();

    it("Works as expected", () => {
      expect(values).toStrictEqual([10, 20]);
    });
  });

  describe("When using multiple contexts", () => {
    const context1 = createOptionalContext<number>();
    const context2 = createOptionalContext<string>();
    let value1: number;
    let value2: string;

    const a = () => {
      context1.provide(10, () => {
        context2.provide("HA", () => {
          b();
        });
      });

      context2.provide("HA", () => {
        context1.provide(10, () => {
          b();
        });
      });
    };

    const b = () => {
      value1 = context1.consume()!;
      value2 = context2.consume()!;
    };

    a();

    it("Works as expected", () => {
      expect(value1).toBe(10);
      expect(value2).toBe("HA");
    });
  });
});

describe("composeProviders()", () => {
  it("Works as expected", () => {
    const context1 = createContext<number>();
    const context2 = createOptionalContext<string>();
    const context3 = createContext<boolean>();

    const a = () => {
      const loadedProvider1 = context1.provide(10);
      const loadedProvider2 = context2.provide("asdas");
      const loadedProvider3 = context3.provide(true);

      const finalProvider = composeProviders(
        loadedProvider1,
        loadedProvider2,
        loadedProvider3
      );

      return finalProvider(() => {
        return b();
      });
    };

    const b = () => {
      const value1 = context1.consume();
      const value2 = context2.consume();
      const value3 = context3.consume();

      return {
        value1,
        value2,
        value3,
      };
    };

    expect(a()).toStrictEqual({
      value1: 10,
      value2: "asdas",
      value3: true,
    });
  });
});
