
import { filterTags } from './tags.js';

export function tagShareByBucket(levels, options = {}) {
  const bucketSize = options.bucketSize ?? 150;
  const groups = options.groups;

  const buckets = new Map();

  for (const level of levels) {
    const bucketIndex = Math.floor((level.position - 1) / bucketSize);

    if (!buckets.has(bucketIndex)) {
      const bucketStart = bucketIndex * bucketSize + 1;

      buckets.set(bucketIndex, {
        index: bucketIndex,
        start: bucketStart,
        end: level.position,
        total: 0,
        counts: {},
      });
    }

    const bucket = buckets.get(bucketIndex);

    // Update the bucket's level count and position range.
    bucket.total++;
    bucket.end = Math.max(bucket.end, level.position);

    // Count each tag at most once per level.
    const tags = filterTags(level.tags, groups);
    const uniqueTags = new Set(tags);

    for (const tag of uniqueTags) {
      const currentCount = bucket.counts[tag] ?? 0;
      bucket.counts[tag] = currentCount + 1;
    }
  }

  // Sort the buckets and calculate each tag's share.
  const sortedBuckets = [...buckets.values()]
    .sort((a, b) => a.index - b.index);

  return sortedBuckets.map((bucket) => {
    const shares = {};

    for (const [tag, count] of Object.entries(bucket.counts)) {
      shares[tag] = count / bucket.total;
    }

    return {
      ...bucket,
      shares,
    };
  });
}
