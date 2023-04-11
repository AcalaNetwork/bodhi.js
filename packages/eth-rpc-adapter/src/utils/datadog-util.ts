import { performance } from 'perf_hooks';
import tracer, { Span } from 'dd-trace';

/**
 * Get the current active span with tags or undefined if [none|disabled].
 * @returns {DataDogTracerSpan} The active spanTags with span.
 */
export const buildTracerSpan = (): DataDogTracerSpan | undefined => {
  // Get datadog span from the context
  const span = process.env.EXTENSIVE_DD_INSTRUMENTATION === 'true' ? tracer.scope().active() : null;
  // Initialize datadog span tags
  const spanTags = span
    ? {
        body: {},
        enterTime: performance.now(),
        exitTime: -1,
        elapsedTime: -1,
        spanRef: span
      }
    : undefined;
  return spanTags;
};

/**
 * Updates exitTime and elapsedTime of the spanTags
 * and assigns the keyValueMap spanTags to the datadog span.
 */
export const assignTracerSpan = (
  spanTags: DataDogTracerSpan | undefined,
  keyValueMap?: { [key: string]: any },
  flattenKeyValues = true
) => {
  if (spanTags && spanTags.spanRef) {
    const span = spanTags.spanRef;
    spanTags.spanRef = undefined;
    spanTags.body = keyValueMap || {};
    if (flattenKeyValues) {
      Object.assign(spanTags, keyValueMap || {});
    }
    // Update datadog span tags
    spanTags.exitTime = performance.now();
    spanTags.elapsedTime = spanTags.exitTime - spanTags.enterTime;
    // Assign datadog tags to span
    span.addTags(spanTags);
  }
};

export interface DataDogTracerSpan {
  body: { [key: string]: any };
  enterTime: number;
  exitTime: number;
  elapsedTime: number;
  spanRef: Span | undefined;
}

export const DataDogUtil = {
  buildTracerSpan,
  assignTracerSpan
};
