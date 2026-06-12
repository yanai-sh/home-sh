/* @ts-self-types="./canvas.d.ts" */

export class SystemsFieldRenderer {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    SystemsFieldRendererFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_systemsfieldrenderer_free(ptr, 0);
  }
  dispose() {
    wasm.systemsfieldrenderer_dispose(this.__wbg_ptr);
  }
  /**
   * @returns {any}
   */
  metrics() {
    const ret = wasm.systemsfieldrenderer_metrics(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} seed
   * @param {number} quality
   */
  constructor(canvas, seed, quality) {
    const ret = wasm.systemsfieldrenderer_new(canvas, seed, quality);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0];
    SystemsFieldRendererFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {number} time_ms
   * @returns {number}
   */
  render(time_ms) {
    const ret = wasm.systemsfieldrenderer_render(this.__wbg_ptr, time_ms);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} dpr
   */
  resize(width, height, dpr) {
    const ret = wasm.systemsfieldrenderer_resize(this.__wbg_ptr, width, height, dpr);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} progress
   */
  set_boot_progress(progress) {
    wasm.systemsfieldrenderer_set_boot_progress(this.__wbg_ptr, progress);
  }
  /**
   * @param {number} state
   */
  set_doc_state(state) {
    wasm.systemsfieldrenderer_set_doc_state(this.__wbg_ptr, state);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} strength
   */
  set_focus(x, y, strength) {
    wasm.systemsfieldrenderer_set_focus(this.__wbg_ptr, x, y, strength);
  }
  /**
   * @param {number} intensity
   */
  set_form_intensity(intensity) {
    wasm.systemsfieldrenderer_set_form_intensity(this.__wbg_ptr, intensity);
  }
  /**
   * @param {number} state
   */
  set_form_state(state) {
    wasm.systemsfieldrenderer_set_form_state(this.__wbg_ptr, state);
  }
  /**
   * @param {number} phase
   */
  set_page_phase(phase) {
    wasm.systemsfieldrenderer_set_page_phase(this.__wbg_ptr, phase);
  }
  /**
   * @param {number} x
   * @param {number} y
   */
  set_pointer(x, y) {
    wasm.systemsfieldrenderer_set_pointer(this.__wbg_ptr, x, y);
  }
  /**
   * @param {number} progress
   */
  set_reveal(progress) {
    wasm.systemsfieldrenderer_set_reveal(this.__wbg_ptr, progress);
  }
  /**
   * @param {number} progress
   */
  set_split_progress(progress) {
    wasm.systemsfieldrenderer_set_split_progress(this.__wbg_ptr, progress);
  }
  /**
   * @param {number} target
   */
  set_split_target(target) {
    wasm.systemsfieldrenderer_set_split_target(this.__wbg_ptr, target);
  }
  /**
   * @param {number} theme
   */
  set_theme(theme) {
    wasm.systemsfieldrenderer_set_theme(this.__wbg_ptr, theme);
  }
}
if (Symbol.dispose)
  SystemsFieldRenderer.prototype[Symbol.dispose] = SystemsFieldRenderer.prototype.free;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_throw_9c75d47bf9e7731e: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_addColorStop_ba4aad6fba5ad929: function () {
      return handleError(function (arg0, arg1, arg2, arg3) {
        arg0.addColorStop(arg1, getStringFromWasm0(arg2, arg3));
      }, arguments);
    },
    __wbg_beginPath_d31f98e44cba3be0: function (arg0) {
      arg0.beginPath();
    },
    __wbg_clearRect_4c8837d514ced7c2: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.clearRect(arg1, arg2, arg3, arg4);
    },
    __wbg_createRadialGradient_370efd7ef3903eef: function () {
      return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        const ret = arg0.createRadialGradient(arg1, arg2, arg3, arg4, arg5, arg6);
        return ret;
      }, arguments);
    },
    __wbg_fillRect_9219f775d7e8e73e: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.fillRect(arg1, arg2, arg3, arg4);
    },
    __wbg_getContext_f17252002286474d: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
      }, arguments);
    },
    __wbg_height_f036cb27636625f6: function (arg0) {
      const ret = arg0.height;
      return ret;
    },
    __wbg_instanceof_CanvasRenderingContext2d_b433938013de3a1e: function (arg0) {
      let result;
      try {
        result = arg0 instanceof CanvasRenderingContext2D;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_lineTo_fe5522fbbf79a59d: function (arg0, arg1, arg2) {
      arg0.lineTo(arg1, arg2);
    },
    __wbg_moveTo_89e84c82679f8ac9: function (arg0, arg1, arg2) {
      arg0.moveTo(arg1, arg2);
    },
    __wbg_new_2fad8ca02fd00684: function () {
      const ret = new Object();
      return ret;
    },
    __wbg_now_4f457f10f864aec5: function () {
      const ret = Date.now();
      return ret;
    },
    __wbg_setTransform_f25014a0bb3cb050: function () {
      return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        arg0.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
      }, arguments);
    },
    __wbg_set_5337f8ac82364a3f: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        return ret;
      }, arguments);
    },
    __wbg_set_fillStyle_6564a82b72a38a9c: function (arg0, arg1) {
      arg0.fillStyle = arg1;
    },
    __wbg_set_fillStyle_a3656c7c5d4ad803: function (arg0, arg1, arg2) {
      arg0.fillStyle = getStringFromWasm0(arg1, arg2);
    },
    __wbg_set_height_89a4ecd0f9cc3dfa: function (arg0, arg1) {
      arg0.height = arg1 >>> 0;
    },
    __wbg_set_lineCap_c6d038d4ea8817be: function (arg0, arg1, arg2) {
      arg0.lineCap = getStringFromWasm0(arg1, arg2);
    },
    __wbg_set_lineWidth_da5d8942373f2ea0: function (arg0, arg1) {
      arg0.lineWidth = arg1;
    },
    __wbg_set_strokeStyle_cee0bcfd92da6363: function (arg0, arg1, arg2) {
      arg0.strokeStyle = getStringFromWasm0(arg1, arg2);
    },
    __wbg_set_width_d2ec5d6689655fa9: function (arg0, arg1) {
      arg0.width = arg1 >>> 0;
    },
    __wbg_stroke_38f034c148fd63eb: function (arg0) {
      arg0.stroke();
    },
    __wbg_width_73079be53f70e8ba: function (arg0) {
      const ret = arg0.width;
      return ret;
    },
    __wbindgen_cast_0000000000000001: function (arg0) {
      // Cast intrinsic for `F64 -> Externref`.
      const ret = arg0;
      return ret;
    },
    __wbindgen_cast_0000000000000002: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: function () {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return {
    __proto__: null,
    './canvas_bg.js': import0,
  };
}

const SystemsFieldRendererFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_systemsfieldrenderer_free(ptr, 1));

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}

async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);

        if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }

  function expectedResponseType(type) {
    switch (type) {
      case 'basic':
      case 'cors':
      case 'default':
        return true;
    }
    return false;
  }
}

function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
    }
  }

  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;

  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        'using deprecated parameters for the initialization function; pass a single object instead',
      );
    }
  }

  if (module_or_path === undefined) {
    module_or_path = new URL('canvas_bg.wasm', import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === 'string' ||
    (typeof Request === 'function' && module_or_path instanceof Request) ||
    (typeof URL === 'function' && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
